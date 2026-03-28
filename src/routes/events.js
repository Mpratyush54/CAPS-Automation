const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, requireRoles } = require('../middleware/api');
const { ROLES, parseObjectId, parseDate, resolveScopedFields, buildScopeMatch } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const { enqueue, QUEUES } = require('../utils/queue');
const Event = require('../models/Event');
const EventReport = require('../models/EventReport');
const DriveFile = require('../models/DriveFile');

const router = express.Router();

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

        const { title, description, eventDate, date, startTime, time, location, scope = 'global', status = 'Upcoming', attendeeCount = 0, attendees, wingId, committeeId } = req.body;
        if (!title || !(eventDate || date)) {
            return fail(res, 400, 'VALIDATION_ERROR', 'title and date are required.');
        }

        const scoped = resolveScopedFields(req.user, { wingId, committeeId });
        const doc = {
            title: String(title).trim(),
            description: description ? String(description).trim() : '',
            eventDate: parseDate(eventDate || date, 'eventDate'),
            startTime: String(startTime || time || ''),
            location: location ? String(location).trim() : '',
            wingId: scoped.wingId,
            committeeId: scoped.committeeId,
            scopeSource: scoped.scopeSource,
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
        created(res, doc);
}));

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List events visible to the current user
 *     tags: [Events]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/PaginatedOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
    try {
        const { page, pageSize, skip } = parsePagination(req.query);
        const filter = buildScopeMatch(req.user, { allowSelf: true, userField: 'createdBy' });
        if (req.query.status) filter.status = req.query.status;
        const total = await Event.countDocuments(filter);
        const items = await Event.find(filter).sort({ eventDate: -1 }).skip(skip).limit(pageSize).toArray();
        ok(res, { rows: items }, { page, pageSize, total });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

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
        const report = await EventReport.findOne({ eventId: _id });
        const photos = await DriveFile.find({ eventId: _id }).sort({ createdAt: -1 }).toArray();
        return ok(res, { event, report, photos });
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
        if (req.body.attendees !== undefined || req.body.attendeeCount !== undefined) update.attendeeCount = Number(req.body.attendees || req.body.attendeeCount || 0);
        const result = await Event.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: 'after' });
        return ok(res, result);
    } catch (error) {
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

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        const files = Array.isArray(req.body.files) ? req.body.files : [];
        if (files.length === 0) {
            return res.status(400).json({ error: 'files are required.' });
        }

        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        const existingToday = await DriveFile.countDocuments({
            uploadedBy: parseObjectId(req.user._id, '_id'),
            createdAt: { $gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) },
        });

        if (existingToday + files.length > 25) {
            return res.status(429).json({ error: 'Daily upload limit exceeded.' });
        }

        const docs = files.map((file) => {
            if (!allowedTypes.has(file.mimeType)) {
                throw new Error(`mimeType ${file.mimeType} is not allowed.`);
            }
            if (Number(file.sizeBytes || 0) > 10 * 1024 * 1024) {
                throw new Error(`file ${file.fileName} exceeds the 10MB size cap.`);
            }

            return {
                eventId,
                uploadedBy: parseObjectId(req.user._id, '_id'),
                googleFileId: null,
                fileName: file.fileName,
                mimeType: file.mimeType,
                sizeBytes: Number(file.sizeBytes || 0),
                folderId: event.photoSync?.folderId || null,
                status: 'uploaded',
                createdAt: new Date(),
            };
        });

        await DriveFile.collection().insertMany(docs);
        await Event.updateOne(
            { _id: eventId },
            { $set: { 'photoSync.status': 'syncing', updatedAt: new Date() } }
        );
        const queue = await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
            eventId: eventId.toString(),
            uploadedBy: String(req.user._id),
            files: docs.map((doc) => ({ fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes })),
        });

        created(res, {
            queued: true,
            queue,
            items: docs.map((doc) => ({
                fileName: doc.fileName,
                mimeType: doc.mimeType,
                sizeBytes: doc.sizeBytes,
                status: doc.status,
                uploadUrl: `/api/events/${eventId.toString()}/photos`,
            })),
        });
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
        const items = await DriveFile.find({ eventId }).sort({ createdAt: -1 }).toArray();
        ok(res, { rows: items });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

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

module.exports = router;
