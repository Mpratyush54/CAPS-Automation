const fs = require('fs');
const path = require('path');
const { getDB } = require('../config/database');
const { getRedis } = require('../config/redis');
const { QUEUES } = require('../utils/queue');
const { parseObjectId } = require('../utils/worklog');
const { getDriveClient } = require('../config/google');

/**
 * Photo Sync Worker
 * Processes the 'google-drive-sync' queue to upload local media to Google Drive.
 */
async function startPhotoSyncWorker() {
    const Redis = require('ioredis');
    const workerRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    });

    const queueKey = `queue:${QUEUES.GOOGLE_DRIVE_SYNC}`;
    console.log('👷 Photo Sync Worker: Connecting to', queueKey);

    // Monitor for connection
    workerRedis.on('connect', async () => {
        const len = await workerRedis.llen(queueKey);
        console.log(`📡 [worker] Connected to Redis. Initial queue depth: ${len}`);
    });

    while (true) {
        try {
            // BRPOP: Block until a job is available (timeout 30s)
            const result = await workerRedis.blpop(queueKey, 30);
            
            if (result) {
                const [_, jobStr] = result;
                const job = JSON.parse(jobStr);
                console.log('⚡ [worker] Popped job:', job.id);
                await processDriveSyncJob(job.payload || job);
            }
        } catch (err) {
            console.error('❌ Photo Sync Worker Error:', err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

/**
 * Process a single drive sync job
 */
async function processDriveSyncJob(payload) {
    const { eventId, photoId, fileName, localPath } = payload;
    const db = getDB();
    const drive = getDriveClient();

    console.log(`📦 [sync-worker] Processing job for photo: ${fileName} (${photoId})`);

    if (!drive) {
        console.warn('⚠️ [sync-worker] Google Drive client not initialized. Skipping.');
        return;
    }

    if (!fs.existsSync(localPath)) {
        console.error(`❌ [sync-worker] Local file not found: ${localPath}`);
        return;
    }

    try {
        // 1. Fetch event to get folderId
        const event = await db.collection('events').findOne({ _id: parseObjectId(eventId, 'eventId') });
        const folderId = event?.photoSync?.folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

        // 2. Upload to Drive
        console.log(`📤 [sync-worker] Uploading to Drive (Folder: ${folderId || 'Root'})...`);
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
        console.log(`✅ [sync-worker] Created file on Drive: ${googleFileId}`);

        // 3. Set Public Read Permission (required for proxying)
        try {
            console.log(`🔗 [sync-worker] Setting public permission for ${googleFileId}...`);
            await drive.permissions.create({
                fileId: googleFileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (pErr) {
            console.warn('[sync-worker] Could not set public permissions:', pErr.message);
        }

        // 4. Update Database
        console.log(`📝 [sync-worker] Updating DB for photoId: ${photoId}`);
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

        // 5. Cleanup local file
        fs.unlinkSync(localPath);
        console.log('✨ [sync-worker] Sync complete.');

    } catch (err) {
        console.error(`❌ [sync-worker] Drive upload failed for ${fileName}:`, err.message);
        throw err;
    }
}

module.exports = {
    startPhotoSyncWorker
};
