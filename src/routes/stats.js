const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, cacheResponse } = require('../middleware/api');
const { getPeriodBounds, parseObjectId } = require('../utils/worklog');
const { ok } = require('../utils/api');
const { cacheSet } = require('../config/redis');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/stats/overview:
 *   get:
 *     summary: Get KPI and chart data for the stats page
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [team, wing, global]
 *       - in: query
 *         name: labelOneId
 *         schema: { type: string }
 *       - in: query
 *         name: labelTwoId
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, 6m]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

async function aggregateLogs(db, match, period = 'monthly') {
    const bounds = getPeriodBounds(period);
    return db.collection('workLogs').aggregate([
        { $match: { ...match, workDate: { $gte: bounds.start, $lte: bounds.end } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, logs: { $sum: 1 } } },
    ]).toArray();
}

router.get('/overview', cacheResponse((req) => `stats:overview:${req.user?._id}:${req.query.view || ''}:${req.query.labelOneId || ''}:${req.query.labelTwoId || ''}:${req.query.period || 'monthly'}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const match = {};
    if (req.query.labelOneId) match.wingId = parseObjectId(req.query.labelOneId, 'labelOneId');
    if (req.query.labelTwoId) match.committeeId = parseObjectId(req.query.labelTwoId, 'labelTwoId');
    const stats = (await aggregateLogs(db, match, req.query.period === '6m' ? '6m' : 'monthly'))[0] || { minutes: 0, logs: 0 };
    const events = await db.collection('events').countDocuments(match);
    const payload = {
        scopeLabel: 'Scoped View',
        kpi: {
            hours: Number((stats.minutes / 60).toFixed(2)),
            logs: stats.logs,
            events,
            efficiency: stats.logs === 0 ? 0 : Math.min(100, Math.round((stats.logs / Math.max(events, 1)) * 10)),
        },
        weekly: [],
        pie: [],
        monthly: [],
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

/**
 * @swagger
 * /api/stats/breakdown:
 *   get:
 *     summary: Get grouped analytics breakdown rows
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [admin-related-labels, global-label-one]
 *       - in: query
 *         name: labelOneId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/breakdown', cacheResponse((req) => `stats:breakdown:${req.user?._id}:${req.query.view || ''}:${req.query.labelOneId || ''}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const rows = await db.collection('workLogs').aggregate([
        { $group: { _id: req.query.view === 'global-label-one' ? '$wingId' : '$committeeId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 } } },
        { $sort: { hours: -1 } },
    ]).toArray();
    const payload = {
        rows: rows.map((row) => ({
            name: row._id ? String(row._id) : 'Unscoped',
            hours: Number(row.hours.toFixed(2)),
            logs: row.logs,
            events: 0,
            efficiency: row.logs === 0 ? 0 : 90,
        })),
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

/**
 * @swagger
 * /api/stats/contributions:
 *   get:
 *     summary: Get contribution tracker rows
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: labelOneId
 *         schema: { type: string }
 *       - in: query
 *         name: labelTwoId
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, 3m, 6m, yearly]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/contributions', cacheResponse((req) => `stats:contrib:${req.user?._id}:${req.query.labelOneId || ''}:${req.query.labelTwoId || ''}:${req.query.period || 'monthly'}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const match = {};
    if (req.query.labelOneId) match.wingId = parseObjectId(req.query.labelOneId, 'labelOneId');
    if (req.query.labelTwoId) match.committeeId = parseObjectId(req.query.labelTwoId, 'labelTwoId');
    const rows = await db.collection('workLogs').aggregate([
        { $match: match },
        { $group: { _id: '$userId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 }, wingId: { $first: '$wingId' }, committeeId: { $first: '$committeeId' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $sort: { hours: -1 } },
    ]).toArray();
    const payload = {
        rows: rows.map((row) => ({
            userId: row._id,
            volunteer: row.user?.name || 'Unknown',
            labelOne: row.wingId ? String(row.wingId) : null,
            labelTwo: row.committeeId ? String(row.committeeId) : null,
            hours: Number(row.hours.toFixed(2)),
            logs: row.logs,
        })),
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

/**
 * @swagger
 * /api/stats/export:
 *   get:
 *     summary: Get export metadata for analytics exports
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/export', async (req, res) => ok(res, { format: req.query.format || 'csv', status: 'not_implemented', downloadUrl: null }));

module.exports = router;
