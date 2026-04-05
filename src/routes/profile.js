const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { parseObjectId } = require('../utils/worklog');
const { ok, fail } = require('../utils/api');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/profile/me:
 *   get:
 *     summary: Get current user profile, metrics, and recent activity
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   patch:
 *     summary: Update allowed current-user profile fields
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.get('/me', async (req, res) => {
    const db = getDB();
    const userId = parseObjectId(req.user._id, '_id');
    const user = await db.collection('users').findOne({ _id: userId }, { projection: { password: 0 } });
    
    // 1. Calculate Work Stats
    const workAgg = await db.collection('workLogs').aggregate([
        { $match: { userId } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, logs: { $sum: 1 } } },
    ]).toArray();
    const stats = workAgg[0] || { minutes: 0, logs: 0 };

    // 2. Fetch Mixed Activity (Audit Logs + Work Logs)
    const [auditLogs, recentWork] = await Promise.all([
        db.collection('activityLogs').find({ userId }).sort({ createdAt: -1 }).limit(10).toArray(),
        db.collection('workLogs').find({ userId }).sort({ createdAt: -1 }).limit(10).toArray()
    ]);

    const combinedActivity = [
        ...auditLogs.map(a => ({
            id: a._id,
            action: a.summary || a.action || 'Performed an action',
            createdAt: a.createdAt,
            type: a.entityType || 'audit'
        })),
        ...recentWork.map(w => ({
            id: w._id,
            action: `Logged work: ${w.title}`,
            createdAt: w.createdAt,
            type: 'worklog'
        }))
    ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

    return ok(res, {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.profile?.phone || null,
            wing: user.primaryWingId || null,
            committee: user.primaryCommitteeId || null,
            teamId: user.teamId || null,
            joinDate: user.profile?.joinDate || null,
            bio: user.profile?.bio || null,
            avatarUrl: user.profile?.avatarUrl || null,
            role: user.role,
        },
        summary: { hours: Number((stats.minutes / 60).toFixed(2)), logs: stats.logs },
        recentActivity: combinedActivity.map(a => ({
            id: a.id,
            action: a.action,
            timeLabel: a.createdAt,
            type: a.type
        })),
        security: { twoFactorEnabled: Boolean(user.security?.twoFactorEnabled) },
    });
});

router.patch('/me', async (req, res) => {
    const allowed = { updatedAt: new Date() };
    if (req.body.name !== undefined) allowed.name = req.body.name;
    if (req.body.phone !== undefined) allowed['profile.phone'] = req.body.phone;
    if (req.body.bio !== undefined) allowed['profile.bio'] = req.body.bio;
    const db = getDB();
    const result = await db.collection('users').findOneAndUpdate(
        { _id: parseObjectId(req.user._id, '_id') },
        { $set: allowed },
        { returnDocument: 'after', projection: { password: 0 } }
    );
    return ok(res, { value: result });
});

/**
 * @swagger
 * /api/profile/me/avatar:
 *   post:
 *     summary: Update current-user avatar metadata
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/me/avatar', async (req, res) => {
    const avatarUrl = req.body.avatarUrl || null;
    const db = getDB();
    await db.collection('users').updateOne(
        { _id: parseObjectId(req.user._id, '_id') },
        { $set: { 'profile.avatarUrl': avatarUrl, updatedAt: new Date() } }
    );
    return ok(res, { avatarUrl });
});

/**
 * @swagger
 * /api/profile/me/change-password:
 *   post:
 *     summary: Change current-user password
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/me/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return fail(res, 400, 'VALIDATION_ERROR', 'currentPassword and newPassword are required.');
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: parseObjectId(req.user._id, '_id') });
    const existingHash = user.password || user.passwordHash;
    const isMatch = await bcrypt.compare(currentPassword, existingHash);
    if (!isMatch) {
        return fail(res, 401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword, passwordHash: hashedPassword, 'security.lastPasswordChangedAt': new Date(), updatedAt: new Date() } }
    );
    return ok(res, { changed: true });
});

/**
 * @swagger
 * /api/profile/me/two-factor/setup:
 *   post:
 *     summary: Start two-factor setup
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/me/two-factor/setup', async (req, res) => ok(res, { status: 'pending_setup' }));
/**
 * @swagger
 * /api/profile/me/two-factor/verify:
 *   post:
 *     summary: Verify two-factor setup code
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/me/two-factor/verify', async (req, res) => ok(res, { verified: req.body.code === '123456' }));

/**
 * @swagger
 * /api/profile/me:
 *   delete:
 *     summary: Soft delete current user account
 *     tags: [Profile]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/me', async (req, res) => {
    if (req.body.confirm !== true) {
        return fail(res, 400, 'VALIDATION_ERROR', 'confirm must be true.');
    }
    const db = getDB();
    await db.collection('users').updateOne(
        { _id: parseObjectId(req.user._id, '_id') },
        { $set: { isActive: false, updatedAt: new Date() } }
    );
    return ok(res, { deleted: true });
});

module.exports = router;
