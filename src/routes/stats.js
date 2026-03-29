const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, cacheResponse } = require('../middleware/api');
const { getPeriodBounds, parseObjectId } = require('../utils/worklog');
const { ok, fail } = require('../utils/api');
const { cacheSet } = require('../config/redis');

const router = express.Router();

router.use(authenticate);

/* -------------------- HELPERS -------------------- */

// Resolves a list of team IDs based on wing (labelOne) and committee (labelTwo) filters
async function getTargetTeamIds(db, labelOneId, labelTwoId) {
    if (labelTwoId) {
        return [parseObjectId(labelTwoId, 'labelTwoId')];
    }
    if (labelOneId) {
        const wingId = parseObjectId(labelOneId, 'labelOneId');
        const children = await db.collection('teamDirectories')
            .find({ wingId, isActive: { $ne: false } })
            .project({ _id: 1 })
            .toArray();
        return [wingId, ...children.map(c => c._id)];
    }
    return null; // All
}

async function aggregateLogs(db, match, period = 'monthly') {
    const bounds = getPeriodBounds(period);
    return db.collection('workLogs').aggregate([
        { $match: { ...match, status: { $in: ['approved', 'Completed'] }, workDate: { $gte: bounds.start, $lte: bounds.end } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, logs: { $sum: 1 } } },
    ]).toArray();
}

async function getPieBreakdown(db, match, view) {
    // In the unified model, we group by teamId
    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: '$teamId', value: { $sum: '$durationMinutes' } } }
    ]).toArray();

    const total = rows.reduce((acc, r) => acc + r.value, 0);
    if (total === 0) return [];

    const teamIds = rows.map(r => r._id).filter(Boolean);
    const lookup = await db.collection('teamDirectories').find({ _id: { $in: teamIds } }).toArray();

    return rows.map(r => {
        const doc = lookup.find(l => String(l._id) === String(r._id));
        return {
            name: doc ? doc.name : 'Unassigned',
            value: Math.round((r.value / total) * 100)
        };
    });
}

async function getTrends(db, match, months = 6) {
    const start = new Date();
    start.setUTCMonth(start.getUTCMonth() - (months - 1));
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, workDate: { $gte: start }, status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$workDate' } }, hours: { $sum: { $divide: ['$durationMinutes', 60] } } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    const result = [];
    for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() - (months - 1 - i));
        const key = d.toISOString().slice(0, 7);
        const matchRow = rows.find(r => r._id === key);
        result.push(matchRow ? Number(matchRow.hours.toFixed(0)) : 0);
    }
    return result;
}

/* -------------------- ROUTES -------------------- */

router.get('/overview', cacheResponse((req) => `stats:overview:${req.user?._id}:${req.query.view || ''}:${req.query.labelOneId || ''}:${req.query.labelTwoId || ''}:${req.query.period || 'monthly'}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const teamIds = await getTargetTeamIds(db, req.query.labelOneId, req.query.labelTwoId);
    const match = teamIds ? { teamId: { $in: teamIds } } : {};
    const view = req.query.view || 'team';

    const stats = (await aggregateLogs(db, match, req.query.period === '6m' ? '6m' : 'monthly'))[0] || { minutes: 0, logs: 0 };
    const events = await db.collection('events').countDocuments(match);
    
    const startWeekly = new Date();
    startWeekly.setUTCDate(startWeekly.getUTCDate() - 28);
    const weeklyAggregation = await db.collection('workLogs').aggregate([
        { $match: { ...match, workDate: { $gte: startWeekly }, status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: { $concat: ['W', { $toString: { $week: '$workDate' } }] }, hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    const payload = {
        scopeLabel: view === 'global' ? 'Organization' : (req.query.labelTwoId ? 'Committee' : 'Wing'),
        kpi: {
            hours: Number((stats.minutes / 60).toFixed(0)),
            logs: stats.logs,
            events,
            efficiency: stats.logs === 0 ? '0%' : Math.min(100, Math.round((stats.logs / Math.max(events, 1)) * 10)) + '%',
        },
        weekly: weeklyAggregation.map(r => ({ week: r._id, hours: Math.round(r.hours), logs: r.logs })),
        pie: await getPieBreakdown(db, match, view),
        monthly: await getTrends(db, match, 6),
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

router.get('/breakdown', cacheResponse((req) => `stats:breakdown:${req.user?._id}:${req.query.view || ''}:${req.query.labelOneId || ''}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const teamIds = await getTargetTeamIds(db, req.query.labelOneId, null);
    const match = teamIds ? { teamId: { $in: teamIds } } : {};

    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: '$teamId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 } } },
        { $sort: { hours: -1 } },
    ]).toArray();

    const lookup = await db.collection('teamDirectories').find({ _id: { $in: rows.map(r => r._id).filter(Boolean) } }).toArray();

    const payload = {
        rows: rows.map((row) => {
            const doc = lookup.find(l => String(l._id) === String(row._id));
            return {
                name: doc ? doc.name : 'Unassigned',
                hours: Number(row.hours.toFixed(0)),
                logs: row.logs,
                events: 0,
                efficiency: '90%',
            };
        }),
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

router.get('/contributions', cacheResponse((req) => `stats:contrib:${req.user?._id}:${req.query.labelOneId || ''}:${req.query.labelTwoId || ''}:${req.query.period || 'monthly'}`, 600), asyncHandler(async (req, res) => {
    const db = getDB();
    const teamIds = await getTargetTeamIds(db, req.query.labelOneId, req.query.labelTwoId);
    const match = { status: { $in: ['approved', 'Completed'] } };
    if (teamIds) match.teamId = { $in: teamIds };

    const rows = await db.collection('workLogs').aggregate([
        { $match: match },
        { $group: { _id: '$userId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 }, teamId: { $first: '$teamId' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'teamDirectories', localField: 'teamId', foreignField: '_id', as: 'team' } },
        { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
        { $sort: { hours: -1 } },
    ]).toArray();

    const payload = {
        rows: rows.map((row) => ({
            id: row._id,
            volunteer: row.user?.name || 'Unknown',
            labelOne: row.team?.type === 'wing' ? row.team?.name : '-', // Simplified for new model
            labelTwo: row.team?.name || 'Unassigned',
            hours: Number(row.hours.toFixed(1)),
            logs: row.logs,
        })),
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
    return ok(res, payload);
}));

router.get('/export', async (req, res) => ok(res, { format: req.query.format || 'csv', status: 'ready', downloadUrl: '#' }));

module.exports = router;
