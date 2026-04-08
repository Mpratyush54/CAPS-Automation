const express = require('express');
const { getDB } = require('../config/database');
const { sendSystemNotification, notifyAdmins } = require('../utils/notifications');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, requireRoles, cacheResponse } = require('../middleware/api');
const { parseObjectId, getWeekKey } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const { cacheSet, cacheDel } = require('../config/redis');
const { enqueue, QUEUES } = require('../utils/queue');

const router = express.Router();

/**
 * @swagger
 * /api/notifications/public-key:
 *   get:
 *     summary: Get VAPID public key for Web Push
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.get('/public-key', asyncHandler(async (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || 'BFZ_pW_L6L-j8m-vB_S_V8_p5_L8_p_R_U_l_W2U_U_V8_p_U_V8_p_U_V';
    ok(res, { publicKey });
}));

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
    return ok(res, { value: result });
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
router.post('/', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const { type, title, body, audienceType, wingId, committeeId, recipientUserIds = [], targetRole } = req.body;
    
    if (!type || !title || !body) {
        return fail(res, 400, 'VALIDATION_ERROR', 'type, title, and body are required.');
    }

    const db = getDB();
    const isAdmin = ['Admin', 'Super Admin'].includes(req.user.role);
    let recipients = [];

    // --- SECURITY & SCOPE CHECK ---
    if (!isAdmin) {
        // Team Lead Scope Check
        const myTeam = await db.collection('teamDirectories').findOne({
            $or: [
                { leadUserId: parseObjectId(req.user._id) },
                { leadUserIds: parseObjectId(req.user._id) }
            ]
        });

        if (!myTeam) {
            return fail(res, 403, 'FORBIDDEN', 'You are not assigned as a lead to any unit.');
        }

        // Restrict audience to their team only
        if (audienceType === 'specific_member') {
            const requestedIds = recipientUserIds.map(id => parseObjectId(id));
            // Verify all members are in their team
            const allowedMembers = (myTeam.memberIds || []).map(id => String(id));
            const isAuthorized = requestedIds.every(id => allowedMembers.includes(String(id)));
            if (!isAuthorized) {
                return fail(res, 403, 'FORBIDDEN', 'One or more selected members are not in your unit.');
            }
            recipients = requestedIds;
        } else {
            // Default to whole team broadcast for Leads
            recipients = myTeam.memberIds || [];
        }
    } else {
        // Admin / Super Admin Logic (Unrestricted)
        if (audienceType === 'specific_member') {
            recipients = (recipientUserIds || []).map((id) => parseObjectId(id, 'recipientUserIds'));
        } else if (audienceType === 'specific_role' && targetRole) {
            recipients = (await db.collection('users').find({ role: targetRole, isActive: { $ne: false } }).toArray()).map((user) => user._id);
        } else if (audienceType === 'wing' && wingId) {
            recipients = (await db.collection('users').find({ primaryWingId: parseObjectId(wingId), isActive: { $ne: false } }).toArray()).map((user) => user._id);
        } else if (audienceType === 'committee' && committeeId) {
            recipients = (await db.collection('users').find({ primaryCommitteeId: parseObjectId(committeeId), isActive: { $ne: false } }).toArray()).map((user) => user._id);
        } else if (audienceType === 'all') {
            recipients = (await db.collection('users').find({ isActive: { $ne: false } }).toArray()).map((user) => user._id);
        }
    }

    // De-duplicate recipients
    const uniqueRecipients = [...new Set(recipients.filter(Boolean).map(id => String(id)))].map(id => parseObjectId(id, 'recipientId'));

    if (uniqueRecipients.length > 0) {
        // Uniform delivery via loop (ensures consistency for each user)
        await Promise.all(uniqueRecipients.map(recipientId => 
            sendSystemNotification(recipientId, {
                title,
                body,
                type,
                fromLabel: req.user.name || 'System',
                fromRoleLabel: req.user.role,
                meta: { 
                    audienceType, 
                    targetRole,
                    sourceType: 'manual',
                    sentBy: req.user._id
                }
            })
        ));
    }

    return created(res, { count: uniqueRecipients.length });
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

        const notificationId = await sendSystemNotification(lead._id, {
            title: 'Weekly report missing',
            body: `Weekly report for ${weekKey} has not been submitted.`,
            type: 'compliance',
            fromLabel: 'System',
            fromRoleLabel: 'Compliance',
            meta: { weekKey, sourceType: 'report_job' }
        });

        if (notificationId) {
            created.push({ id: notificationId, recipient: lead.name });
        }
    }

    const queueResult = await enqueue(QUEUES.REPORT_REMINDERS, { weekKey, createdCount: created.length, triggeredBy: req.user._id });
    ok(res, { weekKey, createdCount: created.length, items: created, queue: queueResult });
}));

/**
 * @swagger
 * /api/notifications/devices:
 *   get:
 *     summary: List registered notification devices for the current user
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/devices', asyncHandler(async (req, res) => {
    const db = getDB();
    const devices = await db.collection('pushSubscriptions').find({ userId: parseObjectId(req.user._id, '_id') }).toArray();
    ok(res, { devices });
}));

/**
 * @swagger
 * /api/notifications/devices:
 *   post:
 *     summary: Register a notification device (Push Subscription)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *               platform: { type: string }
 *               deviceName: { type: string }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/devices', asyncHandler(async (req, res) => {
    const { token, platform = 'web', deviceName = 'Unknown Device', fingerprint } = req.body;
    if (!token) return fail(res, 400, 'VALIDATION_ERROR', 'token is required.');

    const db = getDB();
    const userId = parseObjectId(req.user._id, '_id');

    // UPSERT LOGIC: Fingerprint is the the true unique ID for the the the device hardware/browser combo.
    // If a new user logs in, they 'claim' this fingerprint for their notifications.
    const matchQuery = fingerprint ? { fingerprint } : { token: typeof token === 'string' ? token : (token.endpoint || 'unknown') };
    
    // Check if this is a NEW device or an existing one
    const existingDevice = await db.collection('pushSubscriptions').findOne(matchQuery);
    const isNewDevice = !existingDevice;

    const doc = {
        userId,
        token, 
        platform,
        deviceName,
        fingerprint: fingerprint || null,
        updatedAt: new Date(),
        isActive: true,
        type: typeof token === 'object' && token.endpoint ? 'web-push' : 'simple'
    };

    const result = await db.collection('pushSubscriptions').findOneAndUpdate(
        matchQuery,
        {
            $set: doc,
            $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
    );

    // ONLY TRIGGER SECURITY NOTIFICATION for genuinely new device registrations
    if (isNewDevice) {
        await sendSystemNotification(userId, {
            title: 'New Device Authorized! 🛡️',
            body: `You have successfully linked a new ${deviceName} to your account.`,
            type: 'security',
            fromLabel: 'Security',
            fromRoleLabel: 'System'
        });
    }

    created(res, { value: result, isNew: isNewDevice });
}));

/**
 * @swagger
 * /api/notifications/devices/{id}:
 *   delete:
 *     summary: Unregister a notification device
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
router.delete('/devices/:id', asyncHandler(async (req, res) => {
    const db = getDB();
    const result = await db.collection('pushSubscriptions').deleteOne({
        _id: parseObjectId(req.params.id, 'id'),
        userId: parseObjectId(req.user._id, '_id'),
    });

    if (result.deletedCount === 0) {
        return fail(res, 404, 'NOT_FOUND', 'Device subscription not found.');
    }
    ok(res, { deleted: true });
}));

module.exports = router;
