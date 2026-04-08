const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, requireRoles } = require('../middleware/api');
const { ROLES, parseObjectId, parseDate, resolveScopedFields, buildScopeMatch } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const { enqueue, QUEUES } = require('../utils/queue');
const Event = require('../models/Event');
const EventReport = require('../models/EventReport');
const DriveFile = require('../models/DriveFile');
const { getDriveClient } = require('../config/google');
const { enrichEventWithTeams, enrichEventsWithTeams } = require('../utils/event');
const uuid = require('uuid');

const router = express.Router();

/**
 * @swagger
 * /api/events/{id}/photos/{photoId}/view:
 *   get:
 *     summary: Get photographic content (Image Proxy)
 *     tags: [Events]
 *     description: Streams content from Drive or local storage with high-TTL caching. Publicly accessible.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Image binary stream
 *         content:
 *           image/*:
 *             schema: { type: string, format: binary }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/photos/:photoId/view', async (req, res) => {
    try {
        const photoId = parseObjectId(req.params.photoId, 'photoId');
        const db = getDB();

        const photo = await db.collection('driveFiles').findOne({ _id: photoId });
        if (!photo) return res.status(404).json({ error: 'Photo not found' });

        // Cache strategy: 7 days
        res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
        res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin caching
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Explicitly allow cross-origin

        // 1. If we have a local path and the sync to Drive hasn't finished (or failed), serve local
        if (photo.localPath && fs.existsSync(photo.localPath)) {
            console.log(`[proxy] Serving local file: ${photo.localPath}`);
            return fs.createReadStream(photo.localPath).pipe(res);
        }

        // 2. If synced to Drive, stream from Google
        if (photo.googleFileId) {
            const drive = await getDriveClient();
            if (!drive) return res.status(503).json({ error: 'Drive service unavailable' });

            console.log(`[proxy] Streaming from Google Drive: ${photo.googleFileId}`);
            const driveRes = await drive.files.get(
                { fileId: photo.googleFileId, alt: 'media' },
                { responseType: 'stream' }
            );

            return driveRes.data
                .on('error', (err) => {
                    console.error('[proxy] stream error:', err.message);
                    if (!res.headersSent) res.status(500).end();
                })
                .pipe(res);
        }

        return res.status(404).json({ error: 'Media asset not available' });

    } catch (error) {
        console.error('[proxy] error:', error.message);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/events/{id}/photos/{photoId}/resumable:
 *   patch:
 *     summary: Resumable binary photo upload (Stream)
 *     tags: [Events]
 *     description: Accepts raw binary data in chunks. Use `x-offset` and `x-total-size` headers.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-offset
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: x-total-size
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/octet-stream:
 *           schema: { type: string, format: binary }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.patch('/:id/photos/:photoId/resumable', async (req, res) => {
    try {
        const db = getDB();
        const eventId = parseObjectId(req.params.id, 'id');
        const photoId = parseObjectId(req.params.photoId, 'photoId');

        const fileMeta = await db.collection('driveFiles').findOne({ _id: photoId, eventId });
        if (!fileMeta) return res.status(404).json({ error: 'Photo record not found.' });

        const offset = parseInt(req.headers['x-offset'] || '0', 10);
        const totalSize = parseInt(req.headers['x-total-size'] || String(fileMeta.sizeBytes), 10);

        const uploadDir = path.join(__dirname, '../../temp/uploads', String(eventId));
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileMeta.fileName);
        const writeStream = fs.createWriteStream(filePath, { flags: offset === 0 ? 'w' : 'a', start: offset });

        req.pipe(writeStream);

        writeStream.on('finish', async () => {
            const stats = fs.statSync(filePath);

            // Check if upload is complete
            if (stats.size >= totalSize) {
                console.log(`✅ [upload] Finished streaming: ${fileMeta.fileName} (${stats.size} bytes)`);

                await db.collection('driveFiles').updateOne(
                    { _id: photoId },
                    { $set: { status: 'ready_to_sync', updatedAt: new Date(), localPath: filePath } }
                );

                await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
                    eventId: eventId.toString(),
                    photoId: String(photoId),
                    fileName: fileMeta.fileName,
                    localPath: filePath,
                    uploadedBy: String(fileMeta.uploadedBy),
                });

                res.json({ success: true, status: 'complete', size: stats.size });
            } else {
                res.json({ success: true, status: 'partial', received: stats.size, total: totalSize });
            }
        });

        writeStream.on('error', (err) => {
            console.error('[upload] Stream error:', err.message);
            res.status(500).json({ error: 'Stream write error' });
        });

    } catch (error) {
        console.error('[upload] error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

router.use(authenticate);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create an event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, eventDate]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               eventDate: { type: string, format: date-time }
 *               startTime: { type: string }
 *               location: { type: string }
 *               scope:
 *                 type: string
 *                 enum: [committee, wing, mixed, global]
 *               status:
 *                 type: string
 *                 enum: [upcoming, ongoing, completed, cancelled]
 *               attendeeCount: { type: number }
 *               wingId: { type: string, nullable: true }
 *               committeeId: { type: string, nullable: true }
 *               teamIds: { type: array, items: { type: string } }
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
    const {
        title, description, eventDate, date, startTime, time,
        location, scope = 'global', status = 'Upcoming',
        attendeeCount = 0, attendees, teamIds = []
    } = req.body;

    if (!title || !(eventDate || date)) {
        return fail(res, 400, 'VALIDATION_ERROR', 'title and date are required.');
    }

    const doc = {
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        eventDate: parseDate(eventDate || date, 'eventDate'),
        startTime: String(startTime || time || ''),
        location: location ? String(location).trim() : '',
        teamIds: teamIds.map(id => parseObjectId(id, 'teamIds')),
        scope,
        status,
        createdBy: parseObjectId(req.user._id, '_id'),
        attendeeCount: Number(attendeeCount || attendees || 0),
        assignedRoleVisibility: ['Volunteer', 'Team Lead', 'Admin', 'Super Admin'],
        photoSync: {
            provider: 'google_drive',
            folderId: null,
            folderUrl: null,
            status: 'pending',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const result = await Event.insertOne(doc);
    doc._id = result.insertedId;

    const enriched = await enrichEventWithTeams(doc);
    created(res, enriched);
}));

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List events filtered by role and squad
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PaginatedOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
    try {
        const { page, pageSize, skip } = parsePagination(req.query);
        const filter = {};

        // Security Scope: Super Admin sees all. Others see what they created or where their team is involved.
        if (req.user.role !== ROLES.SUPER_ADMIN) {
            const userFilters = [{ createdBy: parseObjectId(req.user._id) }];
            if (req.user.teamId) {
                userFilters.push({ teamIds: parseObjectId(req.user.teamId) });
            }
            filter.$or = userFilters;
        }

        if (req.query.status) filter.status = req.query.status;

        const total = await Event.countDocuments(filter);
        const items = await Event.find(filter).sort({ eventDate: -1 }).skip(skip).limit(pageSize).toArray();

        const rows = await enrichEventsWithTeams(items);

        ok(res, { rows }, { page, pageSize, total });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

const EventReportTemplate = require('../models/EventReportTemplate');

/**
 * @swagger
 * /api/events/templates:
 *   get:
 *     summary: List report templates
 *     tags: [Events]
 *   post:
 *     summary: Create or update a template
 *     tags: [Events]
 */
router.get('/templates', requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), asyncHandler(async (req, res) => {
    const templates = await EventReportTemplate.find({}).sort({ createdAt: -1 }).toArray();
    ok(res, { items: templates });
}));

router.post('/templates', requireRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), asyncHandler(async (req, res) => {
    const { name, description, fields, defaultContent, version, docxFileId } = req.body;
    
    const doc = {
        name,
        description,
        fields: fields || [],
        defaultContent,
        version: version || 1,
        docxFileId,
        createdBy: req.user._id,
        updatedAt: new Date()
    };

    let result;
    const existing = await EventReportTemplate.findOne({ name });
    if (existing) {
        result = await EventReportTemplate.findOneAndUpdate({ _id: existing._id }, { $set: doc }, { returnDocument: 'after' });
    } else {
        doc.createdAt = new Date();
        result = await EventReportTemplate.insertOne(doc);
        doc._id = result.insertedId;
    }

    ok(res, existing ? result : doc);
}));

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event workspace detail
 *     tags: [Events]
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
 *   patch:
 *     summary: Update an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               eventDate: { type: string, format: date-time }
 *               startTime: { type: string }
 *               location: { type: string }
 *               status: { type: string }
 *               scope: { type: string }
 *               attendeeCount: { type: number }
 *               teamIds: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
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
 */
router.get('/:id', async (req, res) => {
    try {
        const _id = parseObjectId(req.params.id, 'id');
        const event = await Event.findOne({ _id });
        if (!event) return fail(res, 404, 'NOT_FOUND', 'Event not found.');

        const enriched = await enrichEventWithTeams(event);

        const report = await EventReport.findOne({ eventId: _id });
        const photos = await DriveFile.find({ eventId: _id }).sort({ createdAt: -1 }).toArray();
        return ok(res, { event: enriched, report, photos });
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const _id = parseObjectId(req.params.id, 'id');
        const update = { updatedAt: new Date() };

        if (req.body.title !== undefined) update.title = req.body.title;
        if (req.body.description !== undefined) update.description = req.body.description;
        if (req.body.date !== undefined || req.body.eventDate !== undefined) update.eventDate = parseDate(req.body.date || req.body.eventDate, 'eventDate');
        if (req.body.time !== undefined || req.body.startTime !== undefined) update.startTime = req.body.time || req.body.startTime;
        if (req.body.location !== undefined) update.location = req.body.location;
        if (req.body.status !== undefined) update.status = req.body.status;
        if (req.body.scope !== undefined) update.scope = req.body.scope;
        if (req.body.wingId !== undefined) update.wingId = parseObjectId(req.body.wingId, 'wingId');
        if (req.body.committeeId !== undefined) update.committeeId = parseObjectId(req.body.committeeId, 'committeeId');

        if (req.body.attendees !== undefined || req.body.attendeeCount !== undefined) {
            update.attendeeCount = Number(req.body.attendees || req.body.attendeeCount || 0);
        }

        if (req.body.teamIds !== undefined && Array.isArray(req.body.teamIds)) {
            update.teamIds = req.body.teamIds.map(id => parseObjectId(id, 'teamIds'));
        }

        console.log(`[PATCH /api/events/${req.params.id}] Updating with:`, update);

        const result = await Event.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: 'after' });

        if (!result) {
            console.warn(`[PATCH /api/events/${req.params.id}] Event not found for update.`);
            return fail(res, 404, 'NOT_FOUND', 'Event not found.');
        }

        const enriched = await enrichEventWithTeams(result);

        return ok(res, enriched);
    } catch (error) {
        console.error(`[PATCH /api/events/${req.params.id}] Error:`, error.message);
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Event.deleteOne({ _id: parseObjectId(req.params.id, 'id') });
        return ok(res, { deleted: true });
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/events/{id}/report:
 *   put:
 *     summary: Save an event report draft or ready state
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/:id/report', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const eventId = parseObjectId(req.params.id, 'id');
    const result = await EventReport.findOneAndUpdate(
        { eventId },
        {
            $set: {
                eventId,
                summary: req.body.summary || '',
                status: req.body.status || 'Draft',
                ownerUserId: parseObjectId(req.user._id, '_id'),
                lastUpdatedAt: new Date(),
                updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, returnDocument: 'after' }
    );
    return ok(res, result);
}));

/**
 * @swagger
 * /api/events/{id}/report/publish:
 *   post:
 *     summary: Publish an event report
 *     tags: [Events]
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/:id/report/publish', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const result = await EventReport.findOneAndUpdate(
        { eventId: parseObjectId(req.params.id, 'id') },
        { $set: { status: 'Published', publishedAt: new Date(), publishedBy: parseObjectId(req.user._id, '_id'), updatedAt: new Date() } },
        { returnDocument: 'after' }
    );
    return ok(res, result);
}));

/**
 * @swagger
 * /api/events/{id}/photos/upload-url:
 *   post:
 *     summary: Queue event photo upload metadata
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [fileName, mimeType, sizeBytes]
 *                   properties:
 *                     fileName: { type: string }
 *                     mimeType: { type: string }
 *                     sizeBytes: { type: number }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/photos/upload-url', asyncHandler(async (req, res) => {
    const eventId = parseObjectId(req.params.id, 'id');
    const event = await Event.findOne({ _id: eventId });

    if (!event) return fail(res, 404, 'NOT_FOUND', 'Event not found.');

    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (files.length === 0) return fail(res, 400, 'VALIDATION_ERROR', 'files are required.');

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff']);
    const existingToday = await DriveFile.countDocuments({
        uploadedBy: parseObjectId(req.user._id, '_id'),
        createdAt: { $gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) },
    });

    if (existingToday + files.length > 100) {
        return fail(res, 429, 'RATE_LIMIT', 'Daily upload limit (50 photos) exceeded.');
    }

    const docs = files.map((file) => {
        if (!allowedTypes.has(file.mimeType)) throw new Error(`mimeType ${file.mimeType} is not allowed.`);
        if (Number(file.sizeBytes || 0) > 50 * 1024 * 1024) throw new Error(`file ${file.fileName} exceeds 50MB.`);

        return {
            eventId,
            uploadedBy: parseObjectId(req.user._id, '_id'),
            googleFileId: null,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: Number(file.sizeBytes || 0),
            folderId: event.photoSync?.folderId || null,
            status: 'pending_upload',
            createdAt: new Date(),
        };
    });

    await DriveFile.collection().insertMany(docs);

    created(res, {
        items: docs.map((doc) => ({
            id: doc._id,
            fileName: doc.fileName,
            status: doc.status,
            uploadUrl: `/api/events/${eventId.toString()}/photos/${doc._id}/resumable`
        }))
    });
}));

/**
 * @swagger
 * /api/events/{id}/photos/content:
 *   post:
 *     summary: Upload photo content via Base64 fallback
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, content]
 *             properties:
 *               fileName: { type: string }
 *               content: { type: string, description: "Base64 encoded file content" }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/photos/content', asyncHandler(async (req, res) => {
    const eventId = parseObjectId(req.params.id, 'id');
    const { fileName, content } = req.body; // content is base64

    if (!fileName || !content) return fail(res, 400, 'VALIDATION_ERROR', 'fileName and content are required.');

    const uploadDir = path.join(__dirname, '../../temp/uploads', String(eventId));
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, content, 'base64');

    const fileMeta = await DriveFile.findOneAndUpdate(
        { eventId, fileName, status: 'pending_upload' },
        { $set: { status: 'ready_to_sync', updatedAt: new Date(), localPath: filePath } },
        { returnDocument: 'after' }
    );

    if (!fileMeta) return fail(res, 404, 'NOT_FOUND', 'Upload intent not found or already processed.');

    await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
        eventId: eventId.toString(),
        photoId: String(fileMeta._id),
        fileName,
        localPath: filePath,
        uploadedBy: String(req.user._id),
    });

    ok(res, { success: true, fileName, photoId: fileMeta._id });
}));



/**
 * @swagger
 * /api/events/{id}/photos:
 *   get:
 *     summary: List event photo metadata
 *     tags: [Events]
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
 */
router.get('/:id/photos', async (req, res) => {
    try {
        const eventId = parseObjectId(req.params.id, 'id');
        const db = getDB();

        const items = await db.collection('driveFiles')
            .find({ eventId })
            .sort({ createdAt: -1 })
            .toArray();

        // Get uploader names
        const userIds = [...new Set(items.map(i => i.uploadedBy))].filter(Boolean);
        const users = await db.collection('users')
            .find({ _id: { $in: userIds } })
            .project({ name: 1 })
            .toArray();
        const userMap = users.reduce((acc, u) => ({ ...acc, [String(u._id)]: u.name }), {});

        const enriched = items.map(p => ({
            ...p,
            uploadedByName: userMap[String(p.uploadedBy)] || 'Unknown',
            // construct display URL using our local proxy (CF Cacheable)
            displayUrl: (p.googleFileId || p.localPath) ? `/api/events/${req.params.id}/photos/${p._id}/view` : null
        }));

        ok(res, { rows: enriched });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/events/{id}/photos/summary:
 *   get:
 *     summary: Get photographic contribution stats for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.get('/:id/photos/summary', requireRoles('Team Lead', 'Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const eventId = parseObjectId(req.params.id, 'id');
    const db = getDB();

    const photos = await db.collection('driveFiles')
        .find({ eventId })
        .project({ uploadedBy: 1, teamId: 1 })
        .toArray();

    // Get user details for names
    const userIds = [...new Set(photos.map(p => p.uploadedBy).filter(Boolean).map(id => String(id)))].map(id => parseObjectId(id, 'uploadedBy'));
    const users = await db.collection('users')
        .find({ _id: { $in: userIds } })
        .project({ name: 1, role: 1, teamId: 1 })
        .toArray();

    // Get team names
    const teamIds = [...new Set(users.map(u => u.teamId).filter(Boolean).map(id => String(id)))].map(id => parseObjectId(id, 'teamIds'));
    const teams = await db.collection('teamDirectories')
        .find({ _id: { $in: teamIds } })
        .project({ name: 1 })
        .toArray();

    const userMap = users.reduce((acc, u) => ({ ...acc, [String(u._id)]: u }), {});
    const teamMap = teams.reduce((acc, t) => ({ ...acc, [String(t._id)]: t }), {});

    // People-wise
    const people = Object.values(photos.reduce((acc, p) => {
        const uid = String(p.uploadedBy);
        if (!acc[uid]) {
            acc[uid] = {
                userId: uid,
                name: userMap[uid]?.name || 'Unknown',
                role: userMap[uid]?.role || 'Volunteer',
                teamName: teamMap[String(userMap[uid]?.teamId)]?.name || 'No Team',
                count: 0
            };
        }
        acc[uid].count++;
        return acc;
    }, {}));

    // Team-wise
    const teamCounts = Object.values(photos.reduce((acc, p) => {
        const user = userMap[String(p.uploadedBy)];
        if (!user || !user.teamId) return acc;
        const tid = String(user.teamId);
        if (!acc[tid]) {
            acc[tid] = {
                teamId: tid,
                name: teamMap[tid]?.name || 'Unknown Team',
                count: 0
            };
        }
        acc[tid].count++;
        return acc;
    }, {}));

    return ok(res, { people, teams: teamCounts });
}));

/**
 * @swagger
 * /api/events/{id}/photos/track:
 *   post:
 *     summary: Manually track an externally uploaded photo
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.post('/:id/photos/track', asyncHandler(async (req, res) => {
    const eventId = parseObjectId(req.params.id, 'id');
    const { googleFileId, fileName, mimeType, sizeBytes } = req.body;

    if (!googleFileId || !fileName) {
        return fail(res, 400, 'VALIDATION_ERROR', 'googleFileId and fileName are required.');
    }

    const event = await Event.findOne({ _id: eventId });
    if (!event) return fail(res, 404, 'NOT_FOUND', 'Event not found.');

    const doc = {
        eventId,
        uploadedBy: parseObjectId(req.user._id, '_id'),
        googleFileId,
        fileName,
        mimeType: mimeType || 'image/jpeg',
        sizeBytes: Number(sizeBytes || 0),
        folderId: event.photoSync?.folderId || null,
        status: 'synced', // Already in Drive
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const result = await DriveFile.insertOne(doc);
    ok(res, { tracked: true, id: result.insertedId });
}));

/**
 * @swagger
 * /api/events/{id}/photos/{photoId}/retry-sync:
 *   post:
 *     summary: Retry syncing a failed photo upload
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/:id/photos/:photoId/retry-sync', requireRoles('Admin', 'Super Admin'), asyncHandler(async (req, res) => {
    const result = await DriveFile.findOneAndUpdate(
        { _id: parseObjectId(req.params.photoId, 'photoId'), eventId: parseObjectId(req.params.id, 'id') },
        { $set: { status: 'Pending Sync', updatedAt: new Date() }, $inc: { retryCount: 1 } },
        { returnDocument: 'after' }
    );
    const queue = await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
        eventId: req.params.id,
        photoId: req.params.photoId,
        retry: true,
        triggeredBy: String(req.user._id),
    });
    return ok(res, { item: result, queue });
}));

/**
 * @swagger
 * /api/events/templates:
 *   get:
 *     summary: List report templates
 */
router.get('/templates', async (req, res) => {
    try {
        const db = getDB();
        const items = await db.collection('eventReportTemplates').find({ isActive: true }).toArray();
        ok(res, { items });
    } catch (error) {
        fail(res, 400, 'ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/events/templates:
 *   post:
 *     summary: Create report template (Admin)
 */
router.post('/templates', requireRoles([ROLES.ADMIN, ROLES.SUPER_ADMIN]), async (req, res) => {
    try {
        const { name, description, fields, defaultContent } = req.body;
        const db = getDB();
        const doc = {
            name,
            description,
            fields,
            defaultContent: defaultContent || '',
            isActive: true,
            createdBy: parseObjectId(req.user._id),
            createdAt: new Date()
        };
        const result = await db.collection('eventReportTemplates').insertOne(doc);
        doc._id = result.insertedId;
        created(res, doc);
    } catch (error) {
        fail(res, 400, 'ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/events/{id}/report:
 *   get:
 *     summary: Get or create event report
 */
router.get('/:id/report', async (req, res) => {
    try {
        const eventId = parseObjectId(req.params.id, 'id');
        const db = getDB();
        
        let report = await db.collection('eventReports').findOne({ eventId });
        if (!report) {
            // Auto-create initial report draft
            const result = await db.collection('eventReports').insertOne({
                eventId,
                status: 'Draft',
                ownerUserId: parseObjectId(req.user._id),
                lastUpdatedAt: new Date()
            });
            report = await db.collection('eventReports').findOne({ _id: result.insertedId });
        }
        ok(res, report);
    } catch (error) {
        fail(res, 400, 'ERROR', error.message);
    }
});

router.patch('/:id/report', async (req, res) => {
    try {
        const eventId = parseObjectId(req.params.id, 'id');
        const { templateId, formData, content, blocks, status } = req.body;
        const db = getDB();

        const update = { lastUpdatedAt: new Date() };
        if (templateId) update.templateId = parseObjectId(templateId);
        if (formData) update.formData = formData;
        if (content) update.content = content;
        if (blocks) update.blocks = blocks;
        if (status) update.status = status;

        await db.collection('eventReports').updateOne(
            { eventId },
            { $set: update },
            { upsert: true }
        );
        ok(res, { success: true });
    } catch (error) {
        fail(res, 400, 'ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/events/{id}/concept-note/upload-url:
 *   post:
 *     summary: Request upload metadata for concept note
 */
router.post('/:id/concept-note/upload-url', async (req, res) => {
    try {
        const eventId = parseObjectId(req.params.id, 'id');
        const { fileName, mimeType, sizeBytes } = req.body;
        
        const doc = {
            eventId,
            uploadedBy: parseObjectId(req.user._id),
            fileName,
            mimeType,
            sizeBytes: Number(sizeBytes),
            status: 'pending_upload',
            type: 'concept_note',
            createdAt: new Date(),
        };

        const db = getDB();
        const result = await db.collection('driveFiles').insertOne(doc);
        
        ok(res, {
            id: result.insertedId,
            uploadUrl: `/api/events/${eventId}/concept-note/${result.insertedId}/resumable`
        });
    } catch (error) {
        fail(res, 400, 'ERROR', error.message);
    }
});

router.patch('/:id/concept-note/:fileId/resumable', async (req, res) => {
    try {
        const db = getDB();
        const eventId = parseObjectId(req.params.id, 'id');
        const fileId = parseObjectId(req.params.fileId, 'fileId');

        const fileMeta = await db.collection('driveFiles').findOne({ _id: fileId, eventId });
        if (!fileMeta) return res.status(404).json({ error: 'File not found' });

        const offset = parseInt(req.headers['x-offset'] || '0', 10);
        const totalSize = parseInt(req.headers['x-total-size'] || String(fileMeta.sizeBytes), 10);
        
        const uploadDir = path.join(__dirname, '../../temp/uploads/events', String(eventId), 'docs');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileMeta.fileName);
        const writeStream = fs.createWriteStream(filePath, { flags: offset === 0 ? 'w' : 'a', start: offset });

        req.pipe(writeStream);

        writeStream.on('finish', async () => {
            const stats = fs.statSync(filePath);
            if (stats.size >= totalSize) {
                await db.collection('driveFiles').updateOne(
                    { _id: fileId },
                    { $set: { status: 'ready_to_sync', localPath: filePath, updatedAt: new Date() } }
                );

                // Update event record to point to this note
                await db.collection('events').updateOne(
                    { _id: eventId },
                    { $set: { conceptNoteFileId: fileId } }
                );

                await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
                    eventId: String(eventId),
                    photoId: String(fileId), // The sync worker uses photoId as general fileId
                    fileName: fileMeta.fileName,
                    localPath: filePath,
                    uploadedBy: String(req.user._id),
                });

                res.json({ success: true, status: 'complete' });
            } else {
                res.json({ success: true, status: 'partial', received: stats.size });
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --------------------------------------------------------------------------
// REPORT TEMPLATE DOCX STORAGE
// --------------------------------------------------------------------------

/**
 * @swagger
 * /api/events/template-docx/upload-url:
 *   post:
 *     summary: Get upload URL for report template DOCX
 *     tags: [Events]
 */
router.post('/template-docx/upload-url', authenticate, requireRoles([ROLES.ADMIN, ROLES.SUPER_ADMIN]), asyncHandler(async (req, res) => {
    const { fileName, mimeType, sizeBytes } = req.body;
    
    // We reuse the drive storage logic
    const fileId = uuid.v4();
    const uploadUrl = `/api/events/template-docx/stream/${fileId}`;
    
    // Store metadata temporarily
    const db = getDB();
    await db.collection('driveFiles').insertOne({
        _id: fileId,
        fileName,
        mimeType,
        sizeBytes,
        status: 'pending_template',
        type: 'report_template',
        uploadedBy: req.user._id,
        createdAt: new Date()
    });

    ok(res, { uploadUrl, fileId });
}));

/**
 * Stream handler for template DOCX
 */
router.patch('/template-docx/stream/:fileId', authenticate, requireRoles([ROLES.ADMIN, ROLES.SUPER_ADMIN]), (req, res) => {
    const fileId = req.params.fileId;
    const db = getDB();
    const uploadDir = path.join(process.cwd(), 'uploads', 'templates');
    
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, `${fileId}.docx`);
    const writeStream = fs.createWriteStream(filePath);
    
    req.pipe(writeStream);
    
    writeStream.on('finish', async () => {
        await db.collection('driveFiles').updateOne(
            { _id: fileId },
            { $set: { status: 'uploaded', path: filePath, updatedAt: new Date() } }
        );
        res.status(200).send({ status: 'OK' });
    });

    writeStream.on('error', (err) => {
        res.status(500).send({ error: err.message });
    });
});

/**
 * Image Proxy Route (Cloudflare Cacheable)
 * Fetches content from Google Drive and streams it with high-TTL cache headers.
 */
router.get('/:id/photos/:photoId/view', asyncHandler(async (req, res) => {
    const db = getDB();
    const photo = await db.collection('driveFiles').findOne({ 
        _id: parseObjectId(req.params.photoId), 
        eventId: parseObjectId(req.params.id) 
    });

    if (!photo) return res.status(404).send('Photo not found');

    if (photo.localPath && fs.existsSync(photo.localPath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
        return fs.createReadStream(photo.localPath).pipe(res);
    }

    return res.status(404).send('Photo content not available locally.');
}));

module.exports = router;
