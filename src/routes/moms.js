const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
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
        const { title, meetingDate, status = 'draft', attendees = [], agenda = [], notes = [], actionItems = [], wingId, committeeId } = req.body;
        if (!title || !meetingDate) {
            return fail(res, 400, 'VALIDATION_ERROR', 'title and meetingDate are required.');
        }
        if (agenda.length === 0 && notes.length === 0 && actionItems.length === 0) {
            return fail(res, 400, 'VALIDATION_ERROR', 'At least one of notes, agenda, or actionItems is required.');
        }
        assertAllowedStatus(status, MOM_STATUSES, 'status');

        const scoped = resolveScopedFields(req.user, { wingId, committeeId });
        const doc = {
            title: String(title).trim(),
            meetingDate: parseDate(meetingDate, 'meetingDate'),
            preparedBy: parseObjectId(req.user._id, '_id'),
            wingId: scoped.wingId,
            committeeId: scoped.committeeId,
            scopeSource: scoped.scopeSource,
            status,
            attendees: Array.isArray(attendees) ? attendees : [],
            agenda: Array.isArray(agenda) ? agenda : [],
            notes: Array.isArray(notes) ? notes : [],
            actionItems: Array.isArray(actionItems) ? actionItems.map((item) => ({
                text: item.text,
                ownerUserId: parseObjectId(item.ownerUserId, 'ownerUserId'),
                dueDate: item.dueDate ? parseDate(item.dueDate, 'dueDate') : null,
            })) : [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const db = getDB();
        const result = await db.collection('moms').insertOne(doc);
        doc._id = result.insertedId;
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

        const items = await db.collection('moms').find(filter).sort({ meetingDate: -1, updatedAt: -1 }).toArray();
        ok(res, { items });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

module.exports = router;
