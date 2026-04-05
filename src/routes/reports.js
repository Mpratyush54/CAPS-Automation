const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, requireRoles, cacheResponse } = require('../middleware/api');
const {
    ROLES,
    WEEKLY_REPORT_STATUSES,
    PERIOD_REPORT_TYPES,
    EVENT_REPORT_STATUSES,
    parseObjectId,
    parseDate,
    getWeekKey,
    getPeriodBounds,
    isLeadLike,
    isAdminLike,
    resolveScopedFields,
    buildScopeMatch,
    assertAllowedStatus,
} = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const { cacheSet, cacheDel } = require('../config/redis');
const { enqueue, QUEUES } = require('../utils/queue');

const router = express.Router();

router.use(authenticate);

async function buildContributionSummary(db, match, period) {
    const bounds = getPeriodBounds(period);
    const pipeline = [
        {
            $match: {
                ...match,
                status: 'approved',
                workDate: { $gte: bounds.start, $lte: bounds.end },
            },
        },
        {
            $group: {
                _id: '$userId',
                hours: { $sum: { $divide: ['$durationMinutes', 60] } },
                logs: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                userId: '$_id',
                name: '$user.name',
                hours: { $round: ['$hours', 2] },
                logs: 1,
            },
        },
        { $sort: { hours: -1, logs: -1, name: 1 } },
    ];

    const contributors = await db.collection('workLogs').aggregate(pipeline).toArray();
    const totals = contributors.reduce((acc, item) => {
        acc.hours += item.hours;
        acc.logs += item.logs;
        return acc;
    }, { hours: 0, logs: 0 });

    return {
        totals: { hours: Number(totals.hours.toFixed(2)), logs: totals.logs },
        contributors,
    };
}

/**
 * @swagger
 * /api/reports/contributions:
 *   get:
 *     summary: Get contribution summaries for volunteer hours
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: wingId
 *         schema: { type: string }
 *       - in: query
 *         name: committeeId
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/contributions', cacheResponse((req) => `reports:contrib:${req.user?._id}:${req.query.wingId || ''}:${req.query.committeeId || ''}:${req.query.period || 'monthly'}`, 600), asyncHandler(async (req, res) => {
    if (!isAdminLike(req.user.role)) {
        return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
    }

        const db = getDB();
        const period = req.query.period || 'monthly';
        const match = {};

        if (req.query.wingId) {
            match.wingId = parseObjectId(req.query.wingId, 'wingId');
        } else if (req.user.role === ROLES.ADMIN && req.user.primaryWingId) {
            match.wingId = parseObjectId(req.user.primaryWingId, 'primaryWingId');
        }

        if (req.query.committeeId) {
            match.committeeId = parseObjectId(req.query.committeeId, 'committeeId');
        }

        const summary = await buildContributionSummary(db, match, period);
        const payload = {
            scope: {
                wingId: match.wingId || null,
                committeeId: match.committeeId || null,
                period,
            },
            ...summary,
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 600);
        ok(res, payload);
}));

router.get('/', asyncHandler(async (req, res) => {
        const db = getDB();
        const { page, pageSize, skip } = parsePagination(req.query);
        const weeklyRows = await db.collection('weeklyReports').find({}).toArray();
        const periodRows = await db.collection('periodReports').find({}).toArray();
        let rows = [
            ...weeklyRows.map((item) => ({
                id: item._id,
                team: item.committeeId ? String(item.committeeId) : null,
                labelOne: item.wingId ? String(item.wingId) : null,
                period: 'Weekly',
                periodKey: item.weekKey,
                title: item.title,
                status: item.status,
                owner: item.submittedBy,
                source: 'Manual',
                generatedFrom: '-',
                hours: item.hours || item.metrics?.volunteerHours || 0,
            })),
            ...periodRows.map((item) => ({
                id: item._id,
                team: item.committeeId ? String(item.committeeId) : null,
                labelOne: item.wingId ? String(item.wingId) : null,
                period: item.periodType,
                periodKey: item.periodKey || null,
                title: item.title || `${item.periodType} summary`,
                status: item.status,
                owner: item.generatedBy,
                source: 'Auto',
                generatedFrom: item.generatedFrom || null,
                hours: item.hours || item.snapshot?.totalHours || 0,
            })),
        ];
        const total = rows.length;
        rows = rows.slice(skip, skip + pageSize);
        return ok(res, {
            rows,
            summary: {
                weeklyStreams: weeklyRows.length,
                openEscalations: 0,
                autoGeneratedSummaries: periodRows.length,
                annualReports: periodRows.filter((item) => item.periodType === 'yearly').length,
            },
        }, { page, pageSize, total });
}));

/**
 * @swagger
 * /api/reports/weekly:
 *   post:
 *     summary: Create or update a weekly report draft/submission
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               weekKey: { type: string }
 *               title: { type: string }
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, approved, missing]
 *               highlights: { type: string }
 *               wingId: { type: string, nullable: true }
 *               committeeId: { type: string, nullable: true }
 *               metrics:
 *                 type: object
 *                 properties:
 *                   attendancePct: { type: number }
 *                   volunteerHours: { type: number }
 *                   eventCount: { type: number }
 *                   logCount: { type: number }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/weekly', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
        const { id, weekKey = getWeekKey(), title, status = 'draft', highlights = '', metrics = {}, wingId, committeeId } = req.body;
        assertAllowedStatus(status, WEEKLY_REPORT_STATUSES, 'status');

        const db = getDB();
        const scoped = resolveScopedFields(req.user, { wingId, committeeId });
        if (!scoped.wingId && !scoped.committeeId) {
            return fail(res, 400, 'VALIDATION_ERROR', 'Weekly reports require at least one scope reference.');
        }

        const doc = {
            weekKey,
            title: title ? String(title).trim() : 'Weekly report',
            wingId: scoped.wingId,
            committeeId: scoped.committeeId,
            scopeSource: scoped.scopeSource,
            submittedBy: parseObjectId(req.user._id, '_id'),
            status,
            highlights: String(highlights || '').trim(),
            metrics: {
                attendancePct: Number(metrics.attendancePct || 0),
                volunteerHours: Number(metrics.volunteerHours || 0),
                eventCount: Number(metrics.eventCount || 0),
                logCount: Number(metrics.logCount || 0),
            },
            updatedAt: new Date(),
            submittedAt: status === 'submitted' ? new Date() : null,
        };

        if (id) {
            const result = await db.collection('weeklyReports').findOneAndUpdate(
                { _id: parseObjectId(id, 'id') },
                { $set: doc },
                { returnDocument: 'after' }
            );
            await cacheDel('reports:contrib:*');
            return ok(res, { value: result });
        }

        const result = await db.collection('weeklyReports').findOneAndUpdate(
            { weekKey, wingId: scoped.wingId, committeeId: scoped.committeeId },
            { $set: doc, $setOnInsert: { createdAt: new Date() } },
            { upsert: true, returnDocument: 'after' }
        );

        await cacheDel('reports:contrib:*');
        created(res, { value: result });
    }));

/**
 * @swagger
 * /api/reports/weekly/{id}/submit:
 *   post:
 *     summary: Submit a weekly report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/weekly/:id/submit', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
        const db = getDB();
        const updated = await db.collection('weeklyReports').findOneAndUpdate(
            { _id: parseObjectId(req.params.id, 'id') },
            { $set: { status: 'submitted', submittedAt: new Date(), updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return fail(res, 404, 'NOT_FOUND', 'Weekly report not found.');
        }

        const queue = await enqueue(QUEUES.REPORT_GENERATE, { weeklyReportId: req.params.id, triggeredBy: req.user._id });
        ok(res, { item: updated, derivedGenerationQueued: true, queue });
}));

/**
 * @swagger
 * /api/reports/weekly/{id}/generate-derived:
 *   post:
 *     summary: Generate derived period reports from a weekly report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/weekly/:id/generate-derived', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
        const db = getDB();
        const weeklyReport = await db.collection('weeklyReports').findOne({ _id: parseObjectId(req.params.id, 'id') });
        if (!weeklyReport) {
            return fail(res, 404, 'NOT_FOUND', 'Weekly report not found.');
        }

        const generated = [];
        for (const periodType of ['monthly', 'quarterly_3', 'half_yearly_6', 'yearly']) {
            const contribution = await buildContributionSummary(db, {
                ...(weeklyReport.wingId ? { wingId: weeklyReport.wingId } : {}),
                ...(weeklyReport.committeeId ? { committeeId: weeklyReport.committeeId } : {}),
            }, periodType === 'quarterly_3' ? '3m' : periodType === 'half_yearly_6' ? '6m' : periodType);

            const payload = {
                periodType,
                rangeStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
                rangeEnd: new Date(),
                wingId: weeklyReport.wingId || null,
                committeeId: weeklyReport.committeeId || null,
                scopeSource: weeklyReport.scopeSource,
                sourceWeeklyReportIds: [weeklyReport._id],
                status: 'generated',
                snapshot: {
                    totalHours: contribution.totals.hours,
                    totalLogs: contribution.totals.logs,
                    events: weeklyReport.metrics.eventCount || 0,
                    topContributors: contribution.contributors.slice(0, 5).map((item) => ({
                        userId: item.userId,
                        hours: item.hours,
                    })),
                },
                generatedAt: new Date(),
                generatedBy: parseObjectId(req.user._id, '_id'),
            };

            const result = await db.collection('periodReports').findOneAndUpdate(
                {
                    periodType,
                    wingId: payload.wingId,
                    committeeId: payload.committeeId,
                },
                { $set: payload },
                { upsert: true, returnDocument: 'after' }
            );
            generated.push(result);
        }

        await enqueue(QUEUES.REPORT_GENERATE, { weeklyReportId: req.params.id, periodTypes: req.body.periodTypes || null, triggeredBy: req.user._id });
        ok(res, { items: generated });
}));

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: List report center rows across weekly and derived reports
 *     tags: [Reports]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PaginatedOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/reports/weekly:
 *   get:
 *     summary: List weekly reports
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: weekKey
 *         schema: { type: string }
 *       - in: query
 *         name: wingId
 *         schema: { type: string }
 *       - in: query
 *         name: committeeId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/weekly', async (req, res) => {
    try {
        const db = getDB();
        const filter = buildScopeMatch(req.user);
        if (req.query.weekKey) filter.weekKey = req.query.weekKey;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.wingId) filter.wingId = parseObjectId(req.query.wingId, 'wingId');
        if (req.query.committeeId) filter.committeeId = parseObjectId(req.query.committeeId, 'committeeId');

        const items = await db.collection('weeklyReports').find(filter).sort({ weekKey: -1, updatedAt: -1 }).toArray();
        ok(res, { items });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/reports/moms:
 *   get:
 *     summary: List MOM entries for the report center
 *     tags: [Reports]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Create a MOM entry from the report center flow
 *     tags: [Reports]
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/reports/period:
 *   get:
 *     summary: List period reports
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: periodType
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly_3, half_yearly_6, yearly]
 *       - in: query
 *         name: wingId
 *         schema: { type: string }
 *       - in: query
 *         name: committeeId
 *         schema: { type: string }
 *       - in: query
 *         name: rangeStart
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: rangeEnd
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/period', async (req, res) => {
    try {
        const db = getDB();
        const filter = buildScopeMatch(req.user);

        if (req.query.periodType) {
            assertAllowedStatus(req.query.periodType, PERIOD_REPORT_TYPES, 'periodType');
            filter.periodType = req.query.periodType;
        }
        if (req.query.wingId) filter.wingId = parseObjectId(req.query.wingId, 'wingId');
        if (req.query.committeeId) filter.committeeId = parseObjectId(req.query.committeeId, 'committeeId');
        if (req.query.rangeStart) filter.rangeStart = { $gte: parseDate(req.query.rangeStart, 'rangeStart') };
        if (req.query.rangeEnd) {
            filter.rangeEnd = { $lte: parseDate(req.query.rangeEnd, 'rangeEnd') };
        }

        const items = await db.collection('periodReports').find(filter).sort({ generatedAt: -1 }).toArray();
        ok(res, { items });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/reports/events:
 *   get:
 *     summary: List event reports
 *     tags: [Reports]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/events', async (req, res) => {
    const db = getDB();
    const items = await db.collection('eventReports').aggregate([
        {
            $lookup: {
                from: 'events',
                localField: 'eventId',
                foreignField: '_id',
                as: 'event',
            },
        },
        { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
        { $sort: { updatedAt: -1 } },
    ]).toArray();
    ok(res, { items });
});

/**
 * @swagger
 * /api/reports/events/{eventId}/generate:
 *   post:
 *     summary: Create or refresh an event report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, ready, published]
 *               summary: { type: string }
 *               outcomes:
 *                 type: array
 *                 items: { type: string }
 *               metrics:
 *                 type: object
 *                 properties:
 *                   attendance: { type: number }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/events/:eventId/generate', async (req, res) => {
    if (!isLeadLike(req.user.role)) {
        return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
    }

    try {
        const db = getDB();
        const eventId = parseObjectId(req.params.eventId, 'eventId');
        const event = await db.collection('events').findOne({ _id: eventId });
        if (!event) {
            return fail(res, 404, 'NOT_FOUND', 'Event not found.');
        }

        const photosUploaded = await db.collection('driveFiles').countDocuments({ eventId, status: 'uploaded' });
        const contribution = await buildContributionSummary(db, {
            ...(event.wingId ? { wingId: event.wingId } : {}),
            ...(event.committeeId ? { committeeId: event.committeeId } : {}),
        }, 'monthly');

        const status = req.body.status || 'ready';
        assertAllowedStatus(status, EVENT_REPORT_STATUSES, 'status');

        const report = {
            eventId,
            status,
            summary: req.body.summary || event.description || '',
            outcomes: Array.isArray(req.body.outcomes) ? req.body.outcomes : [],
            metrics: {
                attendance: Number(req.body.metrics?.attendance || event.attendeeCount || 0),
                photosUploaded,
                hoursLogged: contribution.totals.hours,
            },
            generatedBy: parseObjectId(req.user._id, '_id'),
            publishedBy: status === 'published' ? parseObjectId(req.user._id, '_id') : null,
            updatedAt: new Date(),
        };

        const result = await db.collection('eventReports').findOneAndUpdate(
            { eventId },
            { $set: report, $setOnInsert: { createdAt: new Date() } },
            { upsert: true, returnDocument: 'after' }
        );

        ok(res, result);
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

module.exports = router;
