const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
    ROLES,
    WORK_LOG_STATUSES,
    parseObjectId,
    parseDate,
    resolveScopedFields,
    buildScopeMatch,
    assertAllowedStatus,
} = require('../utils/worklog');
const { ok, created, fail, parsePagination } = require('../utils/api');
const WorkLog = require('../models/WorkLog');
const { getDB } = require('../config/database');
const { sendSystemNotification, notifyAdmins } = require('../utils/notifications');
const { parseObjectId: pId } = require('../utils/worklog');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/wings:
 *   get:
 *     summary: List active wings
 *     tags: [Wings]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/wings', async (req, res) => {
    const db = getDB();
    const items = await db.collection('teamDirectories').find({ type: 'wing', isActive: { $ne: false } }).sort({ name: 1 }).toArray();
    res.json({ items });
});

/**
 * @swagger
 * /api/wings:
 *   post:
 *     summary: Create a wing
 *     tags: [Wings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               leadUserId: { type: string, nullable: true }
 *               isActive: { type: boolean }
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
router.post('/wings', async (req, res) => {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    try {
        const { name, description, leadUserId, isActive = true } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'name is required.' });
        }

        const doc = {
            name: String(name).trim(),
            description: description ? String(description).trim() : '',
            leadUserId: parseObjectId(leadUserId, 'leadUserId'),
            isActive: Boolean(isActive),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await Wing.insertOne(doc);
        doc._id = result.insertedId;
        res.status(201).json({ item: doc });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/committees:
 *   get:
 *     summary: List active committees
 *     tags: [Committees]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/committees', async (req, res) => {
    const db = getDB();
    const items = await db.collection('teamDirectories').find({ type: 'committee', isActive: { $ne: false } }).sort({ name: 1 }).toArray();
    res.json({ items });
});

/**
 * @swagger
 * /api/committees:
 *   post:
 *     summary: Create a committee
 *     tags: [Committees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               leadUserId: { type: string, nullable: true }
 *               isActive: { type: boolean }
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
router.post('/committees', async (req, res) => {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    try {
        const { name, description, leadUserId, isActive = true } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'name is required.' });
        }

        const doc = {
            name: String(name).trim(),
            description: description ? String(description).trim() : '',
            leadUserId: parseObjectId(leadUserId, 'leadUserId'),
            isActive: Boolean(isActive),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await Committee.insertOne(doc);
        doc._id = result.insertedId;
        res.status(201).json({ item: doc });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: List work logs visible to the current user
 *     tags: [Work Logs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated logs with status counters
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         rows: { type: array, items: { $ref: '#/components/schemas/WorkLog' } }
 *                         counters: { type: object, additionalProperties: { type: integer } }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/logs', async (req, res) => {
    try {
        const { page, pageSize, skip } = parsePagination(req.query);
        const filter = buildScopeMatch(req.user, { allowSelf: true });

        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { tag: { $regex: req.query.search, $options: 'i' } },
            ];
        }
        if (req.query.dateFrom || req.query.dateTo) {
            filter.workDate = {};
            if (req.query.dateFrom) filter.workDate.$gte = parseDate(req.query.dateFrom, 'dateFrom');
            if (req.query.dateTo) filter.workDate.$lte = parseDate(req.query.dateTo, 'dateTo');
        }

        if (req.query.userId && [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
            filter.userId = parseObjectId(req.query.userId, 'userId');
        }

        const total = await WorkLog.countDocuments(filter);
        const items = await WorkLog.find(filter).sort({ workDate: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray();

        const db = getDB();
        const userIds = [...new Set(items.map(i => i.userId).filter(Boolean))];
        const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
        const userMap = users.reduce((acc, u) => { acc[String(u._id)] = u.name; return acc; }, {});

        const rows = await Promise.all(items.map(async (item) => {
            let teamName = null;
            if (item.teamId) {
                const team = await db.collection('teamDirectories').findOne({ _id: item.teamId });
                teamName = team?.name || 'Unknown Unit';
            }

            return {
                id: item._id,
                submitter: { id: item.userId, name: userMap[String(item.userId)] || 'Unknown User' },
                title: item.title,
                date: item.workDate,
                hours: Math.floor(item.durationMinutes / 60),
                minutes: item.durationMinutes % 60,
                durationLabel: `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`,
                tag: item.tag,
                team: item.teamId ? { id: item.teamId, name: teamName } : null,
                status: item.status,
                description: item.description,
                tlComment: item.revisionComment,
                isOwn: String(item.userId) === String(req.user._id),
            };
        }));

        const countersRows = await WorkLog.aggregate([
            { $match: buildScopeMatch(req.user, { allowSelf: true }) },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]).toArray();
        const counters = countersRows.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
        }, {});

        ok(res, { rows, counters }, { page, pageSize, total });
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Create a work log
 *     tags: [Work Logs]
 *     description: Volunteer and Team Lead requests ignore client-supplied `wingId` and `committeeId` and inherit scope from the authenticated user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, workDate, durationMinutes]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               workDate: { type: string, format: date-time }
 *               durationMinutes: { type: number }
 *               hours: { type: number }
 *               minutes: { type: number }
 *               status:
 *                 type: string
 *                 enum: [draft, in_progress, pending_review, needs_revision, approved]
 *               tag: { type: string }
 *               wingId: { type: string, nullable: true }
 *               committeeId: { type: string, nullable: true }
 *               teamId: { type: string, nullable: true }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logs', async (req, res) => {
    try {
        const { title, description, workDate, durationMinutes, hours, minutes, status = 'draft', tag, teamId } = req.body;
        const totalMinutes = Number(durationMinutes || 0) || ((Number(hours || 0) * 60) + Number(minutes || 0));

        if (!title || !workDate || totalMinutes < 1) {
            return fail(res, 400, 'VALIDATION_ERROR', 'title, workDate, and duration are required.');
        }

        assertAllowedStatus(status, WORK_LOG_STATUSES, 'status');

        const scoped = resolveScopedFields(req.user, { teamId });
        const doc = {
            userId: parseObjectId(req.user._id, '_id'),
            title: String(title).trim(),
            description: description ? String(description).trim() : '',
            workDate: parseDate(workDate, 'workDate'),
            durationMinutes: totalMinutes,
            status,
            tag: tag ? String(tag).trim() : '',
            teamId: scoped.teamId,
            scopeSource: scoped.scopeSource,
            submittedAt: status === 'pending_review' ? new Date() : null,
            approvedAt: status === 'approved' ? new Date() : null,
            approvedBy: null,
            revisionComment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await WorkLog.insertOne(doc);
        doc._id = result.insertedId;

        // FIRE AUTOMATED NOTIFICATIONS if submitted immediately
        if (status === 'pending_review') {
            console.log(`📝 [LOG-SUBMIT-DIRECT] User: ${req.user.name} (${req.user.role}) | Log: ${doc.title}`);
            const { sendSystemNotification, notifyAdmins } = require('../utils/notifications');
            const db = getDB();

            if (req.user.role === ROLES.TEAM_LEAD) {
                console.log('👷 [LOG-SUBMIT] Role is Team Lead. Notifying Admins...');
                await notifyAdmins({
                    title: 'Unit Submission 📋',
                    body: `${req.user.name} (Lead) has created and submitted a work log for review.`,
                    type: 'log',
                    url: `/logs`
                });
            } else if (doc.teamId) {
                console.log(`👷 [LOG-SUBMIT] Role is Volunteer. Looking for Lead of Team: ${doc.teamId}...`);
                const team = await db.collection('teamDirectories').findOne({ _id: parseObjectId(doc.teamId) });
                if (team) {
                    const leads = new Set();
                    if (team.leadUserId) leads.add(String(team.leadUserId));
                    if (Array.isArray(team.leadUserIds)) team.leadUserIds.forEach(id => leads.add(String(id)));

                    console.log(`👷 [LOG-SUBMIT] Found Team: ${team.name} | Total Leads: ${leads.size}`);
                    
                    if (leads.size > 0) {
                        for (const leadId of leads) {
                            await sendSystemNotification(leadId, {
                                title: 'New Log Submission 📝',
                                body: `${req.user.name} submitted a new log: "${doc.title}"`,
                                type: 'log',
                                url: `/logs`
                            });
                        }
                    } else {
                        // FALLBACK TO ADMINS if team has no lead
                        console.log('👷 [LOG-SUBMIT] Team has NO lead. Alerting Admins as catch-all...');
                        await notifyAdmins({
                            title: 'Unassigned Unit Submission 📋',
                            body: `${req.user.name} submitted a log for "${team.name}", but the team has NO lead assigned.`,
                            type: 'log',
                            url: `/logs`
                        });
                    }
                } else {
                    console.log(`⚠️ [LOG-SUBMIT] Team ${doc.teamId} not found in directory.`);
                }
            } else {
                console.log('⚠️ [LOG-SUBMIT] No teamId found for user. Skipping lead notification.');
            }
        }

        // Populate team info for frontend
        if (doc.teamId) {
            const db = getDB();
            const team = await db.collection('teamDirectories').findOne({ _id: doc.teamId });
            doc.team = team ? { id: team._id, name: team.name } : null;
        }

        created(res, doc);
    } catch (error) {
        fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Get a single work log
 *     tags: [Work Logs]
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
 */
router.get('/logs/:id', async (req, res) => {
    try {
        const item = await WorkLog.findOne({ _id: parseObjectId(req.params.id, 'id') });
        if (!item) return fail(res, 404, 'NOT_FOUND', 'Log not found.');
        return ok(res, item);
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}:
 *   patch:
 *     summary: Update an existing work log
 *     tags: [Work Logs]
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
 *               workDate: { type: string, format: date }
 *               tag: { type: string }
 *               hours: { type: integer }
 *               minutes: { type: integer }
 *               durationMinutes: { type: integer }
 *               status: { type: string }
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
router.patch('/logs/:id', async (req, res) => {
    try {
        const _id = parseObjectId(req.params.id, 'id');
        const existing = await WorkLog.findOne({ _id });
        if (!existing) return fail(res, 404, 'NOT_FOUND', 'Log not found.');
        
        const isOwner = String(existing.userId) === String(req.user._id);
        const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);
        
        if (!isOwner && !isAdmin) {
            return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        }

        const update = { updatedAt: new Date() };
        if (req.body.title !== undefined) update.title = req.body.title.trim();
        if (req.body.description !== undefined) update.description = req.body.description;
        if (req.body.workDate !== undefined) update.workDate = parseDate(req.body.workDate, 'workDate');
        if (req.body.tag !== undefined) update.tag = req.body.tag;
        if (req.body.status !== undefined) update.status = req.body.status;
        
        if (req.body.hours !== undefined || req.body.minutes !== undefined || req.body.durationMinutes !== undefined) {
             const h = Number(req.body.hours || 0);
             const m = Number(req.body.minutes || 0);
             const totalMins = req.body.durationMinutes !== undefined ? Number(req.body.durationMinutes) : (h * 60 + m);
             update.durationMinutes = totalMins;
        }

        const result = await WorkLog.findOneAndUpdate(
            { _id }, 
            { $set: update }, 
            { returnDocument: 'after' }
        );
        return ok(res, result);
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}/submit:
 *   post:
 *     summary: Submit a work log for review
 *     tags: [Work Logs]
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
 */
router.post('/logs/:id/submit', async (req, res) => {
    try {
        const _id = parseObjectId(req.params.id, 'id');
        const userId = parseObjectId(req.user._id, '_id');
        const db = getDB();

        const result = await db.collection('workLogs').findOneAndUpdate(
            { _id, userId },
            { $set: { status: 'Pending Review', submittedAt: new Date(), updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!result) return fail(res, 404, 'NOT_FOUND', 'Log not found.');

        // FIRE AUTOMATED NOTIFICATIONS
        const { sendSystemNotification, notifyAdmins } = require('../utils/notifications');

        console.log(`📝 [LOG-SUBMIT-MANUAL] User: ${req.user.name} (${req.user.role}) | Log ID: ${_id}`);

        if (req.user.role === ROLES.TEAM_LEAD) {
            console.log('👷 [LOG-SUBMIT] Role is Team Lead. Notifying Admins...');
            await notifyAdmins({
                title: 'Unit Submission 📋',
                body: `${req.user.name} (Lead) has submitted a work log for review.`,
                type: 'log',
                url: `/logs`
            });
        } else {
            // Member/Volunteer submits -> Notify Unit Lead(s)
            const teamId = result.teamId || req.user.teamId;
            console.log(`👷 [LOG-SUBMIT] Role is Volunteer. Target Team ID: ${teamId}...`);

            if (teamId) {
                const team = await db.collection('teamDirectories').findOne({ _id: parseObjectId(teamId) });
                if (team) {
                    const leads = new Set();
                    if (team.leadUserId) leads.add(String(team.leadUserId));
                    if (Array.isArray(team.leadUserIds)) {
                        team.leadUserIds.forEach(id => leads.add(String(id)));
                    }

                    console.log(`👷 [LOG-SUBMIT] Found Team: ${team.name} | Total Leads identified: ${leads.size}`);

                    if (leads.size > 0) {
                        for (const leadId of leads) {
                            await sendSystemNotification(leadId, {
                                title: 'New Log Submission 📝',
                                body: `${req.user.name} submitted a new log: "${result.title}"`,
                                type: 'log',
                                url: `/logs`
                            });
                        }
                    } else {
                        // FALLBACK TO ADMINS
                        console.log('👷 [LOG-SUBMIT] Team has NO lead. Alerting Admins as catch-all...');
                        await notifyAdmins({
                            title: 'Unassigned Unit Submission 📋',
                            body: `${req.user.name} submitted a log for "${team.name}", but the team has NO lead assigned.`,
                            type: 'log',
                            url: `/logs`
                        });
                    }
                } else {
                    console.log(`⚠️ [LOG-SUBMIT] Team ${teamId} not found in directory.`);
                }
            } else {
                console.log('⚠️ [LOG-SUBMIT] No teamId found in log or user profile.');
            }
        }

        return ok(res, result);
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}/approve:
 *   post:
 *     summary: Approve a work log
 *     tags: [Work Logs]
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
router.post('/logs/:id/approve', async (req, res) => {
    try {
        if (![ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
            return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        }

        const result = await WorkLog.findOneAndUpdate(
            { _id: parseObjectId(req.params.id, 'id') },
            { $set: { status: 'Completed', approvedAt: new Date(), approvedBy: parseObjectId(req.user._id, '_id'), revisionComment: req.body.comment || null, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (result) {
            const { sendSystemNotification } = require('../utils/notifications');
            await sendSystemNotification(result.userId, {
                title: 'Log Approved! ✅',
                body: `Your log "${result.title}" has been approved by ${req.user.name}.`,
                type: 'approval',
                url: `/logs`
            });
        }

        return ok(res, result);
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}/reject:
 *   post:
 *     summary: Reject a work log and request revision
 *     tags: [Work Logs]
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
router.post('/logs/:id/reject', async (req, res) => {
    try {
        if (![ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
            return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        }
        if (!req.body.comment) {
            return fail(res, 400, 'VALIDATION_ERROR', 'comment is required.');
        }
        const result = await WorkLog.findOneAndUpdate(
            { _id: parseObjectId(req.params.id, 'id') },
            { $set: { status: 'Needs Revision', revisionComment: req.body.comment, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (result) {
            const { sendSystemNotification } = require('../utils/notifications');
            await sendSystemNotification(result.userId, {
                title: 'Revision Requested ⚠️',
                body: `Action required on "${result.title}": ${req.body.comment}`,
                type: 'revision',
                url: `/logs`
            });
        }

        return ok(res, result);
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

/**
 * @swagger
 * /api/logs/{id}:
 *   delete:
 *     summary: Delete an eligible work log
 *     tags: [Work Logs]
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
router.delete('/logs/:id', async (req, res) => {
    try {
        const _id = parseObjectId(req.params.id, 'id');
        const item = await WorkLog.findOne({ _id });
        if (!item) return fail(res, 404, 'NOT_FOUND', 'Log not found.');
        if (String(item.userId) !== String(req.user._id)) return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        if (!['draft', 'Draft', 'needs_revision', 'Needs Revision'].includes(item.status)) return fail(res, 400, 'INVALID_STATE', 'Only draft or needs revision logs can be deleted.');
        await WorkLog.deleteOne({ _id });
        return ok(res, { deleted: true });
    } catch (error) {
        return fail(res, 400, 'VALIDATION_ERROR', error.message);
    }
});

module.exports = router;
