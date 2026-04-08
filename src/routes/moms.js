const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { enqueue, QUEUES } = require('../utils/queue');
const DriveFile = require('../models/DriveFile');
const {
    MOM_STATUSES,
    isLeadLike,
    parseObjectId,
    parseDate,
    resolveScopedFields,
    buildScopeMatch,
    assertAllowedStatus,
} = require('../utils/worklog');
const { ok, created, fail } = require('../utils/api');

const router = express.Router();

router.use(authenticate);

// Default categories if collection is empty
const DEFAULT_CATEGORIES = ['Wings', 'Committees', 'Sr. Trainers', 'Projects', 'Clubs', 'EC'];

/**
 * @swagger
 * /api/moms/categories:
 *   get:
 *     summary: List meeting categories
 */
router.get('/categories', async (req, res) => {
    try {
        const db = getDB();
        const items = await db.collection('momCategories').find().toArray();
        const names = items.length > 0 ? items.map(i => i.name) : DEFAULT_CATEGORIES;
        ok(res, { items: names });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms/categories:
 *   post:
 *     summary: Add a meeting category
 */
router.post('/categories', async (req, res) => {
    if (![MOM_STATUSES.ADMIN, 'Admin', 'Super Admin'].includes(req.user.role)) {
        return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
    }
    try {
        const { name } = req.body;
        if (!name) return fail(res, 400, 'VALIDATION_ERROR', 'Category name is required.');
        
        const db = getDB();
        await db.collection('momCategories').updateOne(
            { name: String(name).trim() },
            { $set: { name: String(name).trim(), createdAt: new Date() } },
            { upsert: true }
        );
        ok(res, { success: true });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms:
 *   post:
 *     summary: Create a MOM draft
 *     tags: [MOMs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, meetingDate]
 *             properties:
 *               title: { type: string }
 *               meetingDate: { type: string, format: date-time }
 *               status:
 *                 type: string
 *                 enum: [draft, under_review, published]
 *               attendees:
 *                 type: array
 *                 items: { type: string }
 *               agenda:
 *                 type: array
 *                 items: { type: string }
 *               notes:
 *                 type: array
 *                 items: { type: string }
 *               actionItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text: { type: string }
 *                     ownerUserId: { type: string, nullable: true }
 *                     dueDate: { type: string, format: date-time, nullable: true }
 *               wingId: { type: string, nullable: true }
 *               committeeId: { type: string, nullable: true }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', async (req, res) => {
    try {
        const { 
            title, meetingDate, 
            category, meetingType, attendees, agenda, 
            pointsDiscussed, deadlinesSet, photos = [],
            wingId, committeeId, teamId 
        } = req.body;

        if (!title || !meetingDate || !category) {
            return fail(res, 400, 'VALIDATION_ERROR', 'title, meetingDate, and category are required.');
        }

        const scoped = resolveScopedFields(req.user, { wingId, committeeId, teamId: teamId || req.user.teamId });
        
        let finalStatus = 'approved';
        if (req.user.role === 'Volunteer' || req.user.role === 'Team Lead') {
            finalStatus = 'pending_approval';
        }
        // If user explicitly sent 'draft', respect it
        if (req.body.status === 'draft') finalStatus = 'draft';

        const doc = {
            title: String(title).trim(),
            meetingDate: parseDate(meetingDate, 'meetingDate'),
            category, // Wings, Committees, Sr. Trainers, Projects, Clubs, EC
            meetingType,
            attendees: String(attendees || '').trim(),
            agenda: String(agenda || '').trim(),
            pointsDiscussed: String(pointsDiscussed || '').trim(),
            deadlinesSet: String(deadlinesSet || '').trim(),
            photos: Array.isArray(photos) ? photos : [],
            preparedBy: parseObjectId(req.user._id, '_id'),
            preparedByName: req.user.name,
            preparedByRole: req.user.role,
            teamId: scoped.teamId,
            wingId: scoped.wingId,
            committeeId: scoped.committeeId,
            scopeSource: scoped.scopeSource,
            status: finalStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const db = getDB();
        const result = await db.collection('moms').insertOne(doc);
        doc._id = result.insertedId;

        // --- NOTIFICATION LOGIC ---
        // Same as for logs: Notify Team Lead if a Volunteer submits
        if (req.user.role === 'Volunteer' && (doc.teamId || doc.wingId || doc.committeeId)) {
            const { sendSystemNotification, notifyAdmins } = require('../utils/notifications');
            const targetTeamId = doc.teamId || doc.wingId || doc.committeeId;
            const team = await db.collection('teamDirectories').findOne({ _id: parseObjectId(targetTeamId) });
            
            if (team) {
                const leads = new Set();
                if (team.leadUserId) leads.add(String(team.leadUserId));
                if (Array.isArray(team.leadUserIds)) team.leadUserIds.forEach(id => leads.add(String(id)));

                if (leads.size > 0) {
                    for (const leadId of leads) {
                        await sendSystemNotification(leadId, {
                            title: 'New MOM Submitted 📝',
                            body: `${req.user.name} submitted a MOM for ${doc.title}`,
                            type: 'log',
                            url: `/moms`
                        });
                    }
                } else {
                    await notifyAdmins({
                        title: 'Unassigned Team MOM 📋',
                        body: `${req.user.name} submitted a MOM for ${team.name}, but no lead is assigned.`,
                        type: 'log',
                        url: `/moms`
                    });
                }
            }
        }

        created(res, doc);
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms/{id}:
 *   patch:
 *     summary: Update a MOM
 *     tags: [MOMs]
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
 *               meetingDate: { type: string, format: date-time }
 *               status: { type: string }
 *               attendees: { type: array, items: { type: string } }
 *               agenda: { type: array, items: { type: string } }
 *               notes: { type: array, items: { type: string } }
 *               actionItems: { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', async (req, res) => {
    try {
        const db = getDB();
        const _id = parseObjectId(req.params.id, 'id');
        const existing = await db.collection('moms').findOne({ _id });

        if (!existing) {
            return fail(res, 404, 'NOT_FOUND', 'MOM not found.');
        }

        const isAuthor = String(existing.preparedBy) === String(req.user._id);
        if (!isAuthor && !isLeadLike(req.user.role)) {
            return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        }

        const update = {
            ...req.body,
            updatedAt: new Date(),
        };
        delete update._id;
        delete update.preparedBy;

        const result = await db.collection('moms').findOneAndUpdate(
            { _id },
            { $set: update },
            { returnDocument: 'after' }
        );

        ok(res, { value: result });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms/{id}/publish:
 *   post:
 *     summary: Publish a MOM
 *     tags: [MOMs]
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/publish', async (req, res) => {
    if (!isLeadLike(req.user.role)) {
        return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
    }

    try {
        const db = getDB();
        const result = await db.collection('moms').findOneAndUpdate(
            { _id: parseObjectId(req.params.id, 'id') },
            { $set: { status: 'published', updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!result) {
            return fail(res, 404, 'NOT_FOUND', 'MOM not found.');
        }

        ok(res, { value: result });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms:
 *   get:
 *     summary: List MOMs visible to the current user
 *     tags: [MOMs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: wingId
 *         schema: { type: string }
 *       - in: query
 *         name: committeeId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res) => {
    try {
        const db = getDB();
        const filter = buildScopeMatch(req.user, { allowSelf: true, userField: 'preparedBy' });
        if (req.query.status) filter.status = req.query.status;
        if (req.query.wingId) filter.wingId = parseObjectId(req.query.wingId, 'wingId');
        if (req.query.committeeId) filter.committeeId = parseObjectId(req.query.committeeId, 'committeeId');

        const pipeline = [
            { $match: filter },
            { $sort: { meetingDate: -1, updatedAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'preparedBy',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $addFields: {
                    preparedByName: { $arrayElemAt: ['$user.name', 0] }
                }
            },
            {
                $project: { user: 0 }
            }
        ];

        const items = await db.collection('moms').aggregate(pipeline).toArray();
        ok(res, { items });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms/{id}/photos/upload-url:
 *   post:
 *     summary: Request upload metadata for MOM photos
 *     tags: [MOMs]
 */
router.post('/:id/photos/upload-url', async (req, res) => {
    try {
        const momId = parseObjectId(req.params.id, 'id');
        const files = Array.isArray(req.body.files) ? req.body.files : [];
        if (files.length === 0) return fail(res, 400, 'VALIDATION_ERROR', 'No files provided.');

        const docs = files.map(file => ({
            momId,
            uploadedBy: parseObjectId(req.user._id, '_id'),
            fileName: file.fileName,
            mimeType: file.mimeType || 'image/jpeg',
            sizeBytes: Number(file.sizeBytes || 0),
            status: 'pending_upload',
            createdAt: new Date(),
        }));

        const db = getDB();
        await db.collection('driveFiles').insertMany(docs);

        ok(res, {
            items: docs.map(doc => ({
                id: doc._id,
                fileName: doc.fileName,
                uploadUrl: `/api/moms/${momId}/photos/${doc._id}/resumable`
            }))
        });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/moms/{id}/photos/{photoId}/resumable:
 *   patch:
 *     summary: Stream photo content for MOM
 */
router.patch('/:id/photos/:photoId/resumable', async (req, res) => {
    try {
        const db = getDB();
        const momId = parseObjectId(req.params.id, 'id');
        const photoId = parseObjectId(req.params.photoId, 'photoId');

        const fileMeta = await db.collection('driveFiles').findOne({ _id: photoId, momId });
        if (!fileMeta) return res.status(404).json({ error: 'Photo record not found.' });

        const offset = parseInt(req.headers['x-offset'] || '0', 10);
        const totalSize = parseInt(req.headers['x-total-size'] || String(fileMeta.sizeBytes), 10);

        const uploadDir = path.join(__dirname, '../../temp/uploads/moms', String(momId));
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileMeta.fileName);
        const writeStream = fs.createWriteStream(filePath, { flags: offset === 0 ? 'w' : 'a', start: offset });

        req.pipe(writeStream);

        writeStream.on('finish', async () => {
            const stats = fs.statSync(filePath);
            if (stats.size >= totalSize) {
                await db.collection('driveFiles').updateOne(
                    { _id: photoId },
                    { $set: { status: 'ready_to_sync', localPath: filePath, updatedAt: new Date() } }
                );

                await enqueue(QUEUES.GOOGLE_DRIVE_SYNC, {
                    momId: String(momId),
                    photoId: String(photoId),
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

module.exports = router;
