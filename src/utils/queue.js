const { getRedis } = require('../config/redis');

const QUEUES = {
    REPORT_GENERATE: 'report-generate',
    REPORT_REMINDERS: 'report-reminders',
    NOTIFICATION_SEND: 'notification-send',
    GOOGLE_DRIVE_SYNC: 'google-drive-sync',
};

async function enqueue(queueName, payload) {
    const redis = getRedis();
    const job = {
        id: `${queueName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        queue: queueName,
        payload,
        createdAt: new Date().toISOString(),
    };

    if (!redis) {
        return { queued: false, fallback: true, job };
    }

    await redis.rpush(`queue:${queueName}`, JSON.stringify(job));
    await redis.publish(`queue:${queueName}:events`, JSON.stringify({ type: 'queued', id: job.id }));
    return { queued: true, fallback: false, job };
}

module.exports = {
    QUEUES,
    enqueue,
};
