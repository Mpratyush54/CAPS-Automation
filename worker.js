require('dotenv').config();
const fs = require('fs');
const { ObjectId } = require('mongodb');

const { connectDB, closeDB, getDB } = require('./src/config/database');
const { connectRedis, closeRedis, getRedis } = require('./src/config/redis');
const { QUEUES } = require('./src/utils/queue');
const { parseObjectId, ROLES } = require('./src/utils/worklog');
const Notification = require('./src/models/Notification');
const WeeklyReport = require('./src/models/WeeklyReport');
const DriveFile = require('./src/models/DriveFile');
const { sendSystemNotification, notifyAdmins } = require('./src/utils/notifications');
const { getDriveClient } = require('./src/config/google');

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
const STALL_CHECK_INTERVAL_MS = 1000 * 60 * 15; // Every 15 minutes
let timer = null;
let stallTimer = null;

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
    console.log('📦 [worker] Received sync job:', JSON.stringify(job.payload));
    const { eventId, photoId, fileName, localPath } = job.payload;
    const db = getDB();
    const drive = getDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not initialized (missing googleapis or credentials)');
    }

    console.log(`[worker] Syncing photo ${fileName} for event ${eventId}...`);

    if (photoId) {
        await db.collection('driveFiles').updateOne(
            { _id: parseObjectId(photoId, 'photoId') },
            { $set: { status: 'Syncing', updatedAt: new Date() } }
        ).catch(() => null);
    }

    if (!localPath || !fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
    }

    try {
        const event = await db.collection('events').findOne({ _id: parseObjectId(eventId, 'eventId') });
        const folderId = event?.photoSync?.folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: folderId ? [folderId] : [],
            },
            media: {
                mimeType: 'image/jpeg',
                body: fs.createReadStream(localPath),
            },
            fields: 'id',
        });

        const googleFileId = response.data.id;
        console.log(`✅ [worker] Created file on Drive: ${googleFileId}`);

        // Set Public Read Permission (required for proxying)
        try {
            console.log(`🔗 [worker] Setting public permission for ${googleFileId}...`);
            await drive.permissions.create({
                fileId: googleFileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (pErr) {
            console.warn('[worker] Could not set public permissions:', pErr.message);
        }

        console.log(`📝 [worker] Updating DB for photoId: ${photoId}`);
        await db.collection('driveFiles').updateOne(
            { _id: parseObjectId(photoId, 'photoId') },
            {
                $set: {
                    status: 'synced',
                    googleFileId,
                    syncedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );
        console.log('✨ [worker] Sync complete.');

        fs.unlinkSync(localPath);
        return { processed: true, type: 'google-drive-sync', googleFileId };
    } catch (err) {
        console.error('[worker] Drive create error:', err.message);
        throw err;
    }
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

/**
 * SCAN FOR STALLED LOGS
 * - Pending Review for > limit -> Notify Lead
 * - Needs Revision for > limit -> Notify Volunteer
 * - Any stalled for > 2x limit -> Notify Admin
 */
async function checkStalledLogs() {
    console.log('👷 [STALL-CHECK] Scanning for unreviewed or unrevised logs...');
    const db = getDB();

    // Default limit: 24 hours. Can be customized via systemSettings later.
    const settings = await db.collection('systemSettings').findOne({ key: 'stall_limit_hours' }) || { value: 24 };
    const limitHours = settings.value;
    const now = new Date();
    const stallLimit = new Date(now.getTime() - (limitHours * 60 * 60 * 1000));
    const criticalLimit = new Date(now.getTime() - (limitHours * 2 * 60 * 60 * 1000));

    // 1. Find logs PENDING REVIEW for too long
    const pendingStalled = await db.collection('workLogs').find({
        status: { $in: ['pending_review', 'Pending Review'] },
        updatedAt: { $lt: stallLimit },
        $or: [
            { stallNotifiedAt: { $exists: false } },
            { stallNotifiedAt: { $lt: new Date(now.getTime() - (12 * 60 * 60 * 1000)) } } // Re-notify every 12h
        ]
    }).toArray();

    for (const log of pendingStalled) {
        const isCritical = log.updatedAt < criticalLimit;
        const submitter = await db.collection('users').findOne({ _id: log.userId });
        const team = log.teamId ? await db.collection('teamDirectories').findOne({ _id: parseObjectId(log.teamId) }) : null;

        if (isCritical) {
            console.log(`🔔 [STALL-CRITICAL] Log "${log.title}" is overdue for > ${limitHours * 2}h. Alerting Admins.`);
            await notifyAdmins({
                title: 'CRITICAL: Stalled Log 🚨',
                body: `Log "${log.title}" by ${submitter?.name || 'User'} has been pending for over ${limitHours * 2} hours!`,
                type: 'log',
                url: `/logs?search=${encodeURIComponent(log.title)}`
            });
        } else {
            // Notify Team Lead
            const leadIds = new Set();
            if (team) {
                if (team.leadUserId) leadIds.add(String(team.leadUserId));
                if (Array.isArray(team.leadUserIds)) team.leadUserIds.forEach(id => leadIds.add(String(id)));
            }

            if (leadIds.size > 0) {
                console.log(`🔔 [STALL-REMINDER] Notifying leads of team ${team?.name} about log "${log.title}"`);
                for (const leadId of leadIds) {
                    await sendSystemNotification(leadId, {
                        title: 'Review Reminder ⏳',
                        body: `Log "${log.title}" from ${submitter?.name} has been pending for over ${limitHours} hours.`,
                        type: 'log',
                        url: `/logs?search=${encodeURIComponent(log.title)}`
                    });
                }
            } else {
                // Fallback to Admins if no lead
                await notifyAdmins({
                    title: 'Stalled Log (No Lead) ⏳',
                    body: `Log "${log.title}" is stalling and has no lead assigned to review it.`,
                    type: 'log',
                    url: `/logs?search=${encodeURIComponent(log.title)}`
                });
            }
        }
        await db.collection('workLogs').updateOne({ _id: log._id }, { $set: { stallNotifiedAt: new Date() } });
    }

    // 2. Find logs NEEDS REVISION for too long (Notify Volunteer)
    const revisionStalled = await db.collection('workLogs').find({
        status: { $in: ['needs_revision', 'Needs Revision'] },
        updatedAt: { $lt: stallLimit },
        $or: [
            { stallNotifiedAt: { $exists: false } },
            { stallNotifiedAt: { $lt: new Date(now.getTime() - (12 * 60 * 60 * 1000)) } }
        ]
    }).toArray();

    for (const log of revisionStalled) {
        console.log(`🔔 [REVISION-STALL] Notifying volunteer ${log.userId} about stalled revision for "${log.title}"`);
        await sendSystemNotification(log.userId, {
            title: 'Revision Reminder ✍️',
            body: `Your log "${log.title}" still needs revision (pending for over ${limitHours}h).`,
            type: 'log',
            url: `/logs?search=${encodeURIComponent(log.title)}`
        });
        await db.collection('workLogs').updateOne({ _id: log._id }, { $set: { stallNotifiedAt: new Date() } });
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

    // Normal Queue Processing
    timer = setInterval(() => {
        tick().catch((error) => console.error('[worker] tick error:', error.message));
    }, POLL_INTERVAL_MS);

    // Stalled Log Check (Run immediately then every interval)
    checkStalledLogs().catch(e => console.error('[worker] stall-check error:', e.message));
    stallTimer = setInterval(() => {
        checkStalledLogs().catch(e => console.error('[worker] stall-check error:', e.message));
    }, STALL_CHECK_INTERVAL_MS);
}

async function shutdown() {
    if (timer) clearInterval(timer);
    if (stallTimer) clearInterval(stallTimer);
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
