require('dotenv').config();

const { connectDB, closeDB } = require('./src/config/database');
const { connectRedis, closeRedis, getRedis } = require('./src/config/redis');
const { QUEUES } = require('./src/utils/queue');
const { parseObjectId } = require('./src/utils/worklog');
const Notification = require('./src/models/Notification');
const WeeklyReport = require('./src/models/WeeklyReport');
const DriveFile = require('./src/models/DriveFile');

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
let timer = null;

async function processReportGenerate(job) {
    const weeklyReport = await WeeklyReport.findOne({ _id: parseObjectId(job.payload.weeklyReportId, 'weeklyReportId') }).catch(() => null);
    return { processed: true, type: 'report-generate', weeklyReportId: job.payload.weeklyReportId, found: Boolean(weeklyReport) };
}

async function processReminder(job) {
    await Notification.insertOne({
        type: 'info',
        title: 'Reminder workflow processed',
        body: `Weekly reminder batch processed for ${job.payload.weekKey}.`,
        recipientUserId: null,
        isRead: false,
        read: false,
        sourceType: 'system',
        sourceRef: { entityType: null, entityId: null },
        createdAt: new Date(),
    });
    return { processed: true, type: 'report-reminders', weekKey: job.payload.weekKey };
}

async function processNotificationSend(job) {
    return { processed: true, type: 'notification-send', count: job.payload.count || 0 };
}

async function processDriveSync(job) {
    if (job.payload.photoId) {
        await DriveFile.updateOne(
            { _id: parseObjectId(job.payload.photoId, 'photoId') },
            { $set: { status: 'Syncing', updatedAt: new Date() } }
        ).catch(() => null);
    }
    return { processed: true, type: 'google-drive-sync', eventId: job.payload.eventId };
}

const handlers = {
    [QUEUES.REPORT_GENERATE]: processReportGenerate,
    [QUEUES.REPORT_REMINDERS]: processReminder,
    [QUEUES.NOTIFICATION_SEND]: processNotificationSend,
    [QUEUES.GOOGLE_DRIVE_SYNC]: processDriveSync,
};

async function drainQueue(queueName) {
    const redis = getRedis();
    if (!redis) return;

    const raw = await redis.lpop(`queue:${queueName}`);
    if (!raw) return;

    const job = JSON.parse(raw);
    const handler = handlers[queueName];
    if (!handler) return;

    try {
        const result = await handler(job);
        await redis.publish(`queue:${queueName}:events`, JSON.stringify({ type: 'processed', id: job.id, result }));
        console.log(`[worker] processed ${queueName}`, result);
    } catch (error) {
        await redis.rpush(`queue:${queueName}:failed`, JSON.stringify({ job, error: error.message, failedAt: new Date().toISOString() }));
        console.error(`[worker] failed ${queueName}:`, error.message);
    }
}

async function tick() {
    for (const queueName of Object.values(QUEUES)) {
        await drainQueue(queueName);
    }
}

async function startWorker() {
    await connectDB();
    connectRedis();
    console.log('Automation-worker started');
    timer = setInterval(() => {
        tick().catch((error) => console.error('[worker] tick error:', error.message));
    }, POLL_INTERVAL_MS);
}

async function shutdown() {
    if (timer) clearInterval(timer);
    await closeRedis();
    await closeDB();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startWorker().catch((error) => {
    console.error('Automation-worker failed to start:', error);
    process.exit(1);
});
