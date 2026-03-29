const { getDB } = require('../config/database');
const { getRedis } = require('../config/redis');
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
async function sendSystemNotification(userId, { title, body, type = 'system', url = '/notifications', meta = {} }) {
    try {
        const db = getDB();
        const notification = {
            recipientUserId: userId,
            title,
            body,
            type,
            url,
            meta,
            status: 'unread',
            createdAt: new Date()
        };

        // 1. Save to MongoDB
        const result = await db.collection('notifications').insertOne(notification);
        const notificationId = result.insertedId;
        console.log(`🔔 [NOTIF] Created: ${notificationId} for User: ${userId} | Title: ${title}`);

        // 2. Clear user cache (if any)
        const redis = getRedis();
        if (redis) {
            await redis.del(`notifications:unread:${userId}`);
            
            // 3. Queue for PUSH DISPATCH (for when user is NOT online)
            await redis.lpush(`queue:${QUEUES.NOTIFICATION_SEND}`, JSON.stringify({
                payload: { notificationIds: [notificationId] }
            }));
            console.log(`📡 [NOTIF] Queued for Push: ${notificationId}`);
        }

        // 4. EMIT REAL-TIME SOCKET EVENT
        const socketBridge = require('../lib/socketBridge');
        const emitted = socketBridge.emitToUser(userId, 'notification:new', {
            ...notification,
            _id: notificationId
        });
        console.log(`⚡ [NOTIF] Socket Emission: ${emitted ? 'SENT 🟢' : 'SKIPPED ⚪ (No IO Instance)'} to User: ${userId}`);

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
        await sendSystemNotification(admin._id, { title, body, type, url, meta });
    }
}

module.exports = {
    sendSystemNotification,
    notifyAdmins
};
