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
 * Supports up to 5 parallel uploads.
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
    const MAX_CONCURRENT = 5;
    const activeJobs = new Set();

    console.log(`👷 Photo Sync Worker: Connecting to ${queueKey} (Concurrency: ${MAX_CONCURRENT})`);

    // Monitor for connection
    workerRedis.on('connect', async () => {
        const len = await workerRedis.llen(queueKey);
        console.log(`📡 [worker] Connected to Redis. Initial queue depth: ${len}`);
    });

    while (true) {
        try {
            // If we have reached max concurrency, wait for at least one job to finish
            if (activeJobs.size >= MAX_CONCURRENT) {
                await Promise.race(activeJobs);
                continue; // Re-check concurrency and queue
            }

            // BRPOP: Block until a job is available (timeout 5s to keep loop alive for checks)
            const result = await workerRedis.blpop(queueKey, 5);
            
            if (result) {
                const [_, jobStr] = result;
                const job = JSON.parse(jobStr);
                const payload = job.payload || job;
                
                console.log('⚡ [worker] Popped job:', job.id);
                
                // Process job asynchronously to allow parallelism
                const jobPromise = (async () => {
                    try {
                        await processDriveSyncJob(payload);
                    } catch (procErr) {
                        // RETRY LOGIC: Re-queue the job at the tail of the list
                        const retryCount = (payload.retryCount || 0) + 1;
                        if (retryCount <= 3) {
                            console.warn(`🕒 [sync-worker] Retrying job ${job.id} (${retryCount}/3) in 10s...`);
                            setTimeout(async () => {
                                const { enqueue } = require('../utils/queue');
                                await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, { ...payload, retryCount });
                            }, 10000);
                        } else {
                            console.error(`🛑 [sync-worker] Max retries (3) reached for job ${job.id}. Abandoning.`);
                        }
                    } finally {
                        activeJobs.delete(jobPromise);
                    }
                })();

                activeJobs.add(jobPromise);
            }
        } catch (err) {
            console.error('❌ Photo Sync Worker Error:', err.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

/**
 * Helper to find or create a folder in Drive
 */
async function findOrCreateFolder(drive, folderName, parentId = null) {
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    // Create it
    const createRes = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : [],
        },
        fields: 'id',
    });

    return createRes.data.id;
}

/**
 * Process a single drive sync job
 */
async function processDriveSyncJob(payload) {
    const { eventId, photoId, localPath, uploadedBy } = payload;
    const db = getDB();
    const drive = await getDriveClient();

    if (!drive) {
        throw new Error('Google Drive client not initialized');
    }

    if (!fs.existsSync(localPath)) {
        console.error(`❌ [sync-worker] Local file not found: ${localPath}`);
        return; // Don't throw for missing file, it's a permanent error
    }

    try {
        // 1. Fetch event and uploader details to prepare folder/file names
        const event = await db.collection('events').findOne({ _id: parseObjectId(eventId, 'eventId') });
        if (!event) throw new Error(`Event ${eventId} not found.`);

        const user = await db.collection('users').findOne({ _id: parseObjectId(uploadedBy, 'uploadedBy') });
        const username = user?.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown_user';

        // 2. Folder management: Root -> event-photos -> eventName/Id
        const driveRootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID; // Optional root from EV
        const photoRootId = await findOrCreateFolder(drive, 'event-photos', driveRootId);
        
        // Event specific subfolder
        const eventFolderName = `${event.title} (${eventId})`;
        const eventFolderId = await findOrCreateFolder(drive, eventFolderName, photoRootId);

        // 3. Prepare target filename: username_date_photoId.ext
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const ext = path.extname(localPath) || '.jpg';
        const targetFileName = `${username}_${dateStr}_${photoId}${ext}`;

        // 4. Upload to Drive
        console.log(`📤 [sync-worker] Uploading "${targetFileName}" (Folder: ${eventFolderName})...`);
        const response = await drive.files.create({
            requestBody: {
                name: targetFileName,
                parents: [eventFolderId],
            },
            media: {
                mimeType: payload.mimeType || 'image/jpeg',
                body: fs.createReadStream(localPath),
            },
            uploadType: 'resumable',
            fields: 'id',
        });

        const googleFileId = response.data.id;
        console.log(`✅ [sync-worker] Created file on Drive: ${googleFileId}`);

        // 5. Set Public Read Permission (required for proxying)
        try {
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

        // 6. Update Database
        await db.collection('driveFiles').updateOne(
            { _id: parseObjectId(photoId, 'photoId') },
            {
                $set: {
                    status: 'synced',
                    googleFileId,
                    folderId: eventFolderId,
                    fileName: targetFileName,
                    syncedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        // 7. Update Event record if it doesn't have the folder info yet
        if (!event.photoSync?.folderId) {
            await db.collection('events').updateOne(
                { _id: event._id },
                { $set: { 'photoSync.folderId': eventFolderId, 'photoSync.status': 'active', 'photoSync.folderName': eventFolderName } }
            );
        }

        // 8. Cleanup local file
        fs.unlinkSync(localPath);
        console.log(`✨ [sync-worker] Sync complete for ${targetFileName}.`);

    } catch (err) {
        console.error(`❌ [sync-worker] Drive upload failed for ${eventId}/${photoId}:`, err.message);
        throw err; // Throwing triggers retry logic in the worker
    }
}

module.exports = {
    startPhotoSyncWorker
};
