const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ROLES, parseObjectId } = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');

const router = express.Router();

router.use(authenticate);

/* -------------------- HELPERS -------------------- */

function requireOrgAdmin(req, res) {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
        fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        return false;
    }
    return true;
}

/* -------------------- GET TEAMS -------------------- */

router.get('/teams', async (req, res) => {
    const db = getDB();
    const { page, pageSize, skip } = parsePagination(req.query, { pageSize: 50 });

    const filter = { isActive: { $ne: false } };

    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { focus: { $regex: req.query.search, $options: 'i' } },
            { type: { $regex: req.query.search, $options: 'i' } },
        ];
    }

    const total = await db.collection('teamDirectories').countDocuments(filter);

    const rows = await db.collection('teamDirectories')
        .find(filter)
        .skip(skip)
        .limit(pageSize)
        .toArray();

    const enhanced = await Promise.all(
        rows.map(async (row) => {
            const memberIds = row.memberIds || [];
            const leadIds = (row.leadUserIds || []).map(id => String(id));
            
            const members = await db.collection('users')
                .find({ _id: { $in: memberIds } })
                .project({ name: 1, email: 1, role: 1 })
                .toArray();

            const populatedMembers = members.map(m => ({
                ...m,
                id: m._id,
                isLead: leadIds.includes(String(m._id))
            }));

            return { ...row, members: populatedMembers };
        })
    );

    return ok(res, { rows: enhanced }, { page, pageSize, total });
});

/* -------------------- CREATE TEAM -------------------- */

router.post('/teams', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;

    const db = getDB();

    const doc = {
        name: String(req.body.name || '').trim(),   // 🔥 single name
        type: req.body.type === 'committee' ? 'committee' : 'wing', // 🔥 type
        focus: String(req.body.focus || '').trim(),

        leadUserIds: Array.isArray(req.body.leadUserIds)
            ? req.body.leadUserIds.map(id => parseObjectId(id))
            : [],

        memberIds: [],
        memberCount: 0,

        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    if (!doc.name) {
        return fail(res, 400, 'VALIDATION_ERROR', 'Team name is required.');
    }

    const result = await db.collection('teamDirectories').insertOne(doc);
    doc._id = result.insertedId;

    return created(res, doc);
});

/* -------------------- UPDATE TEAM -------------------- */

router.patch('/teams/:id', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;

    const db = getDB();
    const { name, type, focus, leadUserId, leadUserIds } = req.body;
    
    const upd = {
        updatedAt: new Date()
    };
    
    if (name) upd.name = name;
    if (type) upd.type = type;
    if (focus) upd.focus = focus;
    
    // Support both singular and plural lead fields
    if (leadUserId !== undefined) upd.leadUserId = leadUserId ? parseObjectId(leadUserId) : null;
    if (Array.isArray(leadUserIds)) upd.leadUserIds = leadUserIds.map(id => parseObjectId(id));

    const result = await db.collection('teamDirectories').findOneAndUpdate(
        { _id: parseObjectId(req.params.id) },
        { $set: upd },
        { returnDocument: 'after' }
    );

    return ok(res, result);
});

/* -------------------- DELETE TEAM -------------------- */

router.delete('/teams/:id', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;

    const db = getDB();

    await db.collection('teamDirectories').updateOne(
        { _id: parseObjectId(req.params.id) },
        { $set: { isActive: false, updatedAt: new Date() } }
    );

    return ok(res, { deleted: true });
});

/* -------------------- ADD MEMBER -------------------- */

router.post('/teams/:id/members', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;

    const db = getDB();
    const teamId = parseObjectId(req.params.id);
    const userId = parseObjectId(req.body.userId);

    if (!userId) {
        return fail(res, 400, 'VALIDATION_ERROR', 'userId is required.');
    }

    const existingUser = await db.collection('users').findOne({ _id: userId });

    if (!existingUser) {
        return fail(res, 404, 'USER_NOT_FOUND', 'User not found.');
    }

    if (existingUser.teamId) {
        return fail(
            res,
            400,
            'USER_ALREADY_IN_TEAM',
            'User already belongs to a team. Remove first.'
        );
    }

    const updTeam = {
        $addToSet: { memberIds: userId },
        $inc: { memberCount: 1 },
        $set: { updatedAt: new Date() }
    };

    const updUser = {
        $set: { teamId: teamId, updatedAt: new Date() }
    };

    // If a role was provided, sync it
    if (req.body.role) {
        updUser.$set.role = req.body.role;
        // If role is Team Lead, add to team leads list
        if (req.body.role === 'Team Lead') {
            if (!updTeam.$addToSet) updTeam.$addToSet = {};
            updTeam.$addToSet.leadUserIds = userId;
            // Also sync singular field for legacy support
            updTeam.$set.leadUserId = userId; 
        }
    }

    const result = await db.collection('teamDirectories').updateOne({ _id: teamId }, updTeam);

    if (result.matchedCount === 0) {
        return fail(res, 404, 'TEAM_NOT_FOUND', 'Team not found.');
    }

    await db.collection('users').updateOne({ _id: userId }, updUser);

    const team = await db.collection('teamDirectories').findOne({ _id: teamId });

    const members = await db.collection('users')
        .find({ _id: { $in: team.memberIds || [] } })
        .project({ name: 1, email: 1, role: 1 })
        .toArray();

    return created(res, { ...team, members });
});

/* -------------------- REMOVE MEMBER -------------------- */

router.delete('/teams/:id/members/:memberId', async (req, res) => {
    if (!requireOrgAdmin(req, res)) return;

    const db = getDB();
    const teamId = parseObjectId(req.params.id);
    const memberId = parseObjectId(req.params.memberId);

    await db.collection('teamDirectories').updateOne(
        { _id: teamId },
        {
            $pull: { memberIds: memberId },
            $inc: { memberCount: -1 },
            $set: { updatedAt: new Date() }
        }
    );

    await db.collection('users').updateOne(
        { _id: memberId },
        {
            $set: { teamId: null, updatedAt: new Date() }
        }
    );

    return ok(res, { deleted: true });
});

/* -------------------- USERS -------------------- */

router.get('/users/all', async (req, res) => {
    const db = getDB();
    const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);
    
    let filter = { isActive: { $ne: false } };

    // Security: Non-admins can only see members of their own team
    if (!isAdmin) {
        if (!req.user.teamId) {
            return ok(res, { rows: [] }); // No team, no members to see
        }
        filter.teamId = parseObjectId(req.user.teamId);
    }

    const rows = await db.collection('users')
        .find(filter)
        .project({ name: 1, email: 1, role: 1, teamId: 1 })
        .toArray();

    return ok(res, { rows });
});

module.exports = router;
