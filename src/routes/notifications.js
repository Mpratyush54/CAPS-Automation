const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, requireRoles, cacheResponse } = require('../middleware/api');
const { parseObjectId, getWeekKey } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const { cacheSet, cacheDel } = require('../config/redis');
const { enqueue, QUEUES } = require('../utils/queue');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List notifications for the current user
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PaginatedOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', cacheResponse((req) => `notifications:inbox:${req.user?._id}:${req.query.filter || 'All'}:${req.query.page || 1}:${req.query.pageSize || 50}`, 120), asyncHandler(async (req, res) => {
    const db = getDB();
    const { page, pageSize, skip } = parsePagination(req.query, { pageSize: 50 });
    const filter = { recipientUserId: parseObjectId(req.user._id, '_id') };
    if (req.query.filter === 'Unread') filter.isRead = false;
    if (req.query.filter === 'Read') filter.isRead = true;
    const total = await db.collection('notifications').countDocuments(filter);
    const unreadCount = await db.collection('notifications').countDocuments({ recipientUserId: filter.recipientUserId, isRead: false });
    const items = await db.collection('notifications').find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray();
    const payload = { rows: items, unreadCount };
    const meta = { page, pageSize, total };
    await cacheSet(req.cacheKey, { data: payload, meta }, req.cacheTTL || 120);
    ok(res, payload, meta);
}));

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read or unread
 *     tags: [Notifications]
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const db = getDB();
    const result = await db.collection('notifications').findOneAndUpdate(
        { _id: parseObjectId(req.params.id, 'id'), recipientUserId: parseObjectId(req.user._id, '_id') },
        { $set: { isRead: req.body.read !== false, read: req.body.read !== false } },
        { returnDocument: 'after' }
    );
    await cacheDel(`notifications:inbox:${req.user._id}:*`);
    return ok(res, result);
}));

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for the current user
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/read-all', asyncHandler(async (req, res) => {
    const db = getDB();
    await db.collection('notifications').updateMany(
        { recipientUserId: parseObjectId(req.user._id, '_id') },
        { $set: { isRead: true, read: true } }
    );
    await cacheDel(`notifications:inbox:${req.user._id}:*`);
    return ok(res, { updated: true });
}));

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Send manual notifications to a targeted audience
 *     tags: [Notifications]
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requireRoles('Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const { type, title, body, audienceType, wingId, committeeId, recipientUserIds = [], targetRole } = req.body;
    if (!type || !title || !body) {
        return fail(res, 400, 'VALIDATION_ERROR', 'type, title, and body are required.');
    }

    const db = getDB();
    let recipients = [];
    if (audienceType === 'specific_member') {
        recipients = recipientUserIds.map((id) => parseObjectId(id, 'recipientUserIds'));
    } else if (audienceType === 'specific_role' && targetRole) {
        recipients = (await db.collection('users').find({ role: targetRole, isActive: { $ne: false } }).toArray()).map((user) => user._id);
    } else {
        const filter = { isActive: { $ne: false } };
        if (audienceType === 'wing' && wingId) filter.primaryWingId = parseObjectId(wingId, 'wingId');
        if (audienceType === 'committee' && committeeId) filter.primaryCommitteeId = parseObjectId(committeeId, 'committeeId');
        recipients = (await db.collection('users').find(filter).toArray()).map((user) => user._id);
    }

    const docs = recipients.map((recipientUserId) => ({
        type,
        title,
        body,
        recipientUserId,
        isRead: false,
        read: false,
        fromUserId: parseObjectId(req.user._id, '_id'),
        fromLabel: req.user.name || 'System',
        fromRoleLabel: req.user.role,
        audienceLabel: audienceType,
        sourceType: 'manual',
        sourceRef: { entityType: null, entityId: null },
        createdAt: new Date(),
    }));

    if (docs.length > 0) await db.collection('notifications').insertMany(docs);
    await Promise.all(recipients.map((id) => cacheDel(`notifications:inbox:${id}:*`)));
    await enqueue(QUEUES.NOTIFICATION_SEND, {
        sentBy: req.user._id,
        audienceType,
        count: docs.length,
        type,
        title,
    });
    return created(res, { count: docs.length });
}));

/**
 * @swagger
 * /api/notifications/weekly-reminders/run:
 *   post:
 *     summary: Run the weekly missing-report reminder flow
 *     tags: [Notifications]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weekKey: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/weekly-reminders/run', requireRoles('Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const db = getDB();
    const weekKey = req.body.weekKey || getWeekKey();
    const leads = await db.collection('users').find({
        role: 'Team Lead',
        isActive: { $ne: false },
    }).toArray();

    const created = [];
    for (const lead of leads) {
        const existing = await db.collection('weeklyReports').findOne({
            weekKey,
            $or: [
                { committeeId: lead.primaryCommitteeId || null },
                { wingId: lead.primaryWingId || null },
            ],
        });

        if (existing) {
            continue;
        }

        const notification = {
            type: 'compliance',
            title: 'Weekly report missing',
            body: `Weekly report for ${weekKey} has not been submitted.`,
            recipientUserId: parseObjectId(lead._id, '_id'),
            sourceType: 'report_job',
            sourceRef: {
                entityType: 'weeklyReport',
                entityId: null,
            },
            isRead: false,
            read: false,
            createdAt: new Date(),
        };

        const result = await db.collection('notifications').insertOne(notification);
        notification._id = result.insertedId;
        created.push(notification);
        await cacheDel(`notifications:inbox:${lead._id}:*`);
    }

    const queueResult = await enqueue(QUEUES.REPORT_REMINDERS, { weekKey, createdCount: created.length, triggeredBy: req.user._id });
    ok(res, { weekKey, createdCount: created.length, items: created, queue: queueResult });
}));

module.exports = router;
