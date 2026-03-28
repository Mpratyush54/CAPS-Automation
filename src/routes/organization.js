const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ROLES, parseObjectId } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/organization/teams:
 *   get:
 *     summary: List team directory rows
 *     tags: [Organization]
 *     parameters:
 *       - in: query
 *         name: search
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

function requireOrgAdmin(req, res) {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
        fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        return false;
    }
    return true;
}

router.get('/teams', async (req, res) => {
    const db = getDB();
    const { page, pageSize, skip } = parsePagination(req.query, { pageSize: 50 });
    const filter = { isActive: { $ne: false } };
    if (req.query.search) {
        filter.$or = [
            { labelOneName: { $regex: req.query.search, $options: 'i' } },
            { labelTwoName: { $regex: req.query.search, $options: 'i' } },
            { focus: { $regex: req.query.search, $options: 'i' } },
        ];
    }

    const total = await db.collection('teamDirectories').countDocuments(filter);
    const rows = await db.collection('teamDirectories').find(filter).skip(skip).limit(pageSize).toArray();
    return ok(res, { rows }, { page, pageSize, total });
});

/**
 * @swagger
 * /api/organization/teams:
 *   post:
 *     summary: Create a team directory row
 *     tags: [Organization]
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
router.post('/teams', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    const doc = {
        labelOneWingId: parseObjectId(req.body.labelOneWingId, 'labelOneWingId'),
        labelTwoCommitteeId: parseObjectId(req.body.labelTwoCommitteeId, 'labelTwoCommitteeId'),
        labelOneName: String(req.body.labelOne || '').trim(),
        labelTwoName: String(req.body.labelTwo || '').trim(),
        leadUserId: parseObjectId(req.body.leadUserId, 'leadUserId'),
        focus: String(req.body.focus || '').trim(),
        memberIds: [],
        memberCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const result = await db.collection('teamDirectories').insertOne(doc);
    doc._id = result.insertedId;
    return created(res, doc);
});

/**
 * @swagger
 * /api/organization/teams/{id}:
 *   patch:
 *     summary: Update a team directory row
 *     tags: [Organization]
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
router.patch('/teams/:id', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    const result = await db.collection('teamDirectories').findOneAndUpdate(
        { _id: parseObjectId(req.params.id, 'id') },
        { $set: { ...req.body, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );
    return ok(res, result);
});

/**
 * @swagger
 * /api/organization/teams/{id}:
 *   delete:
 *     summary: Soft delete a team directory row
 *     tags: [Organization]
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
router.delete('/teams/:id', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    await db.collection('teamDirectories').updateOne(
        { _id: parseObjectId(req.params.id, 'id') },
        { $set: { isActive: false, updatedAt: new Date() } }
    );
    return ok(res, { deleted: true });
});

/**
 * @swagger
 * /api/organization/teams/{id}/members:
 *   post:
 *     summary: Add a member to a team directory row
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
router.post('/teams/:id/members', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    const teamId = parseObjectId(req.params.id, 'id');
    const userId = parseObjectId(req.body.userId, 'userId');
    if (!userId) {
        return fail(res, 400, 'VALIDATION_ERROR', 'userId is required.');
    }

    await db.collection('teamDirectories').updateOne(
        { _id: teamId },
        { $addToSet: { memberIds: userId }, $set: { updatedAt: new Date() }, $inc: { memberCount: 1 } }
    );

    return created(res, { teamId, userId });
});

/**
 * @swagger
 * /api/organization/teams/{id}/members/{memberId}:
 *   patch:
 *     summary: Update a member assignment
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   delete:
 *     summary: Remove a member from a team directory row
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
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
router.patch('/teams/:id/members/:memberId', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    const memberId = parseObjectId(req.params.memberId, 'memberId');
    await db.collection('users').updateOne(
        { _id: memberId },
        { $set: { role: req.body.role || 'Volunteer', updatedAt: new Date() } }
    );
    return ok(res, { memberId, updated: true });
});

router.delete('/teams/:id/members/:memberId', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    await db.collection('teamDirectories').updateOne(
        { _id: parseObjectId(req.params.id, 'id') },
        { $pull: { memberIds: parseObjectId(req.params.memberId, 'memberId') }, $inc: { memberCount: -1 }, $set: { updatedAt: new Date() } }
    );
    return ok(res, { deleted: true });
});

/**
 * @swagger
 * /api/organization/roles/assign:
 *   post:
 *     summary: Assign a role and optional scope to a user
 *     tags: [Organization]
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
router.post('/roles/assign', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;
    const db = getDB();
    const update = { role: req.body.role, updatedAt: new Date() };
    if (req.body.wingId !== undefined) update.primaryWingId = parseObjectId(req.body.wingId, 'wingId');
    if (req.body.committeeId !== undefined) update.primaryCommitteeId = parseObjectId(req.body.committeeId, 'committeeId');
    await db.collection('users').updateOne({ _id: parseObjectId(req.body.userId, 'userId') }, { $set: update });
    return ok(res, { assigned: true });
});

module.exports = router;
