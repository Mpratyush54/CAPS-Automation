const { getDB } = require('../config/database');
const { getRedis, cacheDel } = require('../config/redis');
const { QUEUES } = require('./queue');

/**
 * Send a notification to a specific user and queue it for push delivery.
 * @param {string|ObjectId} userId - Target user ID
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} [options.type='system'] - Type (system, log, approval, etc.)
 * @param {string} [options.url='/notifications'] - Direct link
 * @param {Object} [options.meta] - Additional metadata
 */
/**
 * Send a notification to a specific user and queue it for push delivery.
 */
async function sendSystemNotification(userId, {
    title,
    body,
    type = 'system',
    url = '/notifications',
    fromLabel = 'System',
    fromRoleLabel = 'Core',
    meta = {}
}) {
    try {
        const db = getDB();
        const { parseObjectId } = require('./worklog');
        const targetId = parseObjectId(userId);

        const notification = {
            recipientUserId: targetId,
            title,
            body,
            type,
            url,
            isRead: false,
            read: false,
            fromLabel,
            fromRoleLabel,
            meta,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // 1. Save to MongoDB
        const result = await db.collection('notifications').insertOne(notification);
        const notificationId = result.insertedId;
        console.log(`🔔 [NOTIF] Created: ${notificationId} for User: ${targetId} | Title: ${title}`);

        // 2. Clear user cache and state
        const redis = getRedis();
        const { enqueue, QUEUES: Q } = require('./queue');
        if (redis) {
            await redis.del(`user:active:${targetId}`); // Treat as new activity
            await cacheDel(`notifications:inbox:${targetId}:*`);

            // 3. Queue for PUSH DISPATCH
            await enqueue(Q.NOTIFICATION_SEND, { notificationIds: [notificationId] });
            console.log(`📡 [NOTIF] Queued for Push: ${notificationId}`);
        }

        // 4. EMIT REAL-TIME SOCKET EVENT
        const socketBridge = require('../lib/socketBridge');
        const { sent, roomSize } = socketBridge.emitToUser(targetId, 'notification:new', {
            ...notification,
            _id: notificationId,
            id: notificationId
        });

        let socketIcon = 'SKIPPED 🟡 (User Offline)';
        if (!sent) socketIcon = 'SKIPPED ⚪ (No IO Instance)';
        if (sent && roomSize > 0) socketIcon = 'SENT 🟢';

        console.log(`⚡ [NOTIF] Socket Emission: ${socketIcon} to User: ${targetId}`);

        return notificationId;
    } catch (err) {
        console.error('❌ [NOTIF] FAILED Helper:', err.message);
        return null;
    }
}

/**
 * Helper to notify all admins in the the system.
 */
async function notifyAdmins({ title, body, type, url, meta }) {
    const db = getDB();
    const admins = await db.collection('users').find({
        role: { $in: ['Admin', 'Super Admin'] }
    }).toArray();

    for (const admin of admins) {
        console.log({ title, body, type, url, meta })
        await sendSystemNotification(admin._id, { title, body, type, url, meta });
    }
}

module.exports = {
    sendSystemNotification,
    notifyAdmins
};
