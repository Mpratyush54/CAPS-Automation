const { getDB } = require('../config/database');
const { getRedis } = require('../config/redis');
const { QUEUES } = require('../utils/queue');
const { parseObjectId } = require('../utils/worklog');

/**
 * Notification Worker
 * Processes the 'notification-send' queue to dispatch push notifications
 * to all registered devices of the target recipients.
 */
async function startNotificationWorker() {
    // IMPORTANT: Blocking commands (BLPOP) MUST use their own Redis client
    // otherwise they block all other Redis operations for the main client.
    const Redis = require('ioredis');
    const workerRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Critical for long blocking calls
    });

    console.log('👷 Notification Worker: Started and listening on', QUEUES.NOTIFICATION_SEND);

    while (true) {
        try {
            // BRPOP: Block until a job is available (timeout 30s)
            const result = await workerRedis.blpop(`queue:${QUEUES.NOTIFICATION_SEND}`, 30);
            
            if (result) {
                const [_, jobStr] = result;
                const job = JSON.parse(jobStr);
                const { payload } = job;
                
                await processNotificationJob(payload);
            }
        } catch (err) {
            console.error('❌ Notification Worker Error:', err.message);
            // Sleep briefly on error to avoid tight loops
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

/**
 * Process a single notification job
 * 1. Find the notifications or the aggregate info
 * 2. Find device subscriptions for the recipients
 * 3. Send the push notification
 */
async function processNotificationJob(payload) {
    const db = getDB();
    const { notificationIds, audienceRecord } = payload;
    
    // 1. Fetch notifications
    const filter = {};
    if (notificationIds && notificationIds.length > 0) {
        filter._id = { $in: notificationIds.map(id => parseObjectId(id, 'notificationIds')) };
    } else if (audienceRecord) {
        // Fallback for general broadcast if no specific IDs
        filter.sourceType = audienceRecord.sourceType;
        filter.createdAt = { $gte: new Date(Date.now() - 60000) }; // Recent
    }

    const notifications = await db.collection('notifications').find(filter).toArray();
    
    if (notifications.length === 0) {
        console.log('ℹ️ Notification Worker: No matching notifications found to send.');
        return;
    }

    console.log(`👷 Notification Worker: Processing ${notifications.length} push notification(s)...`);

    for (const notif of notifications) {
        try {
            const userId = parseObjectId(notif.recipientUserId, 'recipientUserId');
            const redis = getRedis();

            // 2. CHECK ACTIVITY: If user is active via socket, skip push delivery
            if (redis) {
                const isActive = await redis.get(`user:active:${userId}`);
                if (isActive) {
                    console.log(`👷 Notification Worker: User ${userId} is ACTIVE. Skipping push delivery.`);
                    continue;
                }
            }

            // 3. Find all active push subscriptions for this user
            const subscriptions = await db.collection('pushSubscriptions').find({
                userId,
                isActive: true
            }).toArray();

            if (subscriptions.length === 0) {
                console.log(`ℹ️ User ${userId} has no registered push devices.`);
                continue;
            }

            console.log(`🚀 Sending notification "${notif.title}" to ${subscriptions.length} device(s) for user ${userId}`);

            for (const sub of subscriptions) {
                try {
                    // DISPATCH LOGIC (e.g. Firebase, Web Push, etc.)
                    // This is where the actual push happens.
                    await dispatchPush(sub, notif);
                } catch (pushErr) {
                    console.error(`❌ Failed to send push to device ${sub._id}:`, pushErr.message);
                    // Optionally mark subscription as inactive if it's an "Expired Token" error
                }
            }
        } catch (err) {
            console.error(`❌ Error processing notification ${notif._id}:`, err.message);
        }
    }
}

/**
 * Dispatch logic for the actual push
 * Uses web-push for browser delivery if VAPID keys are configured.
 */
async function dispatchPush(subscription, notification) {
    const { platform, token, deviceName, type } = subscription;
    const { title, body } = notification;

    if (type === 'web-push' && typeof token === 'object') {
        try {
            const webpush = require('web-push');
            
            // Configure VAPID from environment
            const publicKey = process.env.VAPID_PUBLIC_KEY || 'BCW6_lH9i-A4R87Jq0m7S_p45K2I_S_LwN_2YvN8_pU4V_rU-C2_l_U8';
            const privateKey = process.env.VAPID_PRIVATE_KEY;
            const email = process.env.VAPID_EMAIL || 'admin@pratyushes.dev';

            if (!privateKey) {
                console.warn('⚠️ Push Dispatch: VAPID_PRIVATE_KEY is missing. Skipping real delivery.');
                return;
            }

            webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

            await webpush.sendNotification(token, JSON.stringify({
                title,
                body,
                icon: '/logo192.png',
                url: `/notifications/${notification._id || ''}`
            }));
            
            console.log(`✅ [WEB-PUSH] Delivered to ${deviceName}`);
        } catch (err) {
            console.error(`❌ [WEB-PUSH] Error for ${deviceName}:`, err.message);
            // If the the push service returns 410 (Gone) or 404, we should mark the the sub as inactive
            if (err.statusCode === 410 || err.statusCode === 404) {
                const db = getDB();
                await db.collection('pushSubscriptions').updateOne(
                    { _id: subscription._id },
                    { $set: { isActive: false, updatedAt: new Date() } }
                );
                console.log(`🧹 [CLEANUP] Marked device ${deviceName} as INACTIVE due to expiry.`);
            }
        }
    } else {
        // FOR NOW: Log the "Action" for simple tokens (e.g. legacy or testing)
        console.log(`[PUSH LOG] Target: ${deviceName} (${platform}) | Title: ${title} | Body: ${body}`);
    }
}

module.exports = {
    startNotificationWorker
};
