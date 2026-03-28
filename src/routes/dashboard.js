const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, cacheResponse } = require('../middleware/api');
const { ROLES, parseObjectId, getPeriodBounds } = require('../utils/worklog');
const { ok } = require('../utils/api');
const { cacheSet } = require('../config/redis');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get role-aware dashboard data for the signed-in user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: roleView
 *         schema:
 *           type: string
 *           enum: [auto, volunteer, team-lead, admin, super-admin]
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

async function countHours(db, match, period = 'weekly') {
    const bounds = getPeriodBounds(period);
    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, status: { $in: ['approved', 'Completed'] }, workDate: { $gte: bounds.start, $lte: bounds.end } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, logs: { $sum: 1 } } },
    ]).toArray();
    const first = rows[0] || { minutes: 0, logs: 0 };
    return { hours: Number((first.minutes / 60).toFixed(2)), logs: first.logs };
}

router.get('/', cacheResponse((req) => `dashboard:user:${req.user?._id}:${req.query.roleView || 'auto'}:${req.query.dateFrom || ''}:${req.query.dateTo || ''}`, 300), asyncHandler(async (req, res) => {
    const db = getDB();
    const userId = parseObjectId(req.user._id, '_id');
    const role = req.user.role;

    if (role === ROLES.VOLUNTEER) {
        const weekly = await countHours(db, { userId }, 'weekly');
        const assignedEventsCount = await db.collection('events').countDocuments({
            $or: [{ committeeId: req.user.primaryCommitteeId || null }, { wingId: req.user.primaryWingId || null }],
        });
        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: 'Ready to log your work today?' },
            kpis: [
                { key: 'myHoursWeek', label: 'My Hours (Week)', value: weekly.hours, unit: 'h' },
                { key: 'myTaskCount', label: 'My Tasks', value: 0 },
                { key: 'assignedEventsCount', label: 'Events Assigned', value: assignedEventsCount },
            ],
            sections: { myTasks: [], weeklyHoursChart: [] },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    if (role === ROLES.TEAM_LEAD) {
        const teamMembersCount = await db.collection('users').countDocuments({ primaryCommitteeId: req.user.primaryCommitteeId || null, isActive: { $ne: false } });
        const teamHoursWeek = await countHours(db, { committeeId: req.user.primaryCommitteeId || null }, 'weekly');
        const pendingApprovalsCount = await db.collection('workLogs').countDocuments({ committeeId: req.user.primaryCommitteeId || null, status: { $in: ['pending_review', 'Pending Review'] } });
        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: "Your team's daily report is waiting." },
            kpis: [
                { key: 'teamMembersCount', label: 'Team Members', value: teamMembersCount },
                { key: 'teamHoursWeek', label: 'Team Hours (Week)', value: teamHoursWeek.hours, unit: 'h' },
                { key: 'pendingApprovalsCount', label: 'Pending Approvals', value: pendingApprovalsCount },
            ],
            sections: { teamLogsToday: [], committeeHoursWeekChart: [] },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    if (role === ROLES.ADMIN) {
        const wingMembers = await db.collection('users').countDocuments({ primaryWingId: req.user.primaryWingId || null, isActive: { $ne: false } });
        const committeesCount = await db.collection('committees').countDocuments({ isActive: { $ne: false } });
        const wingHoursWeek = await countHours(db, { wingId: req.user.primaryWingId || null }, 'weekly');
        const activeEvents = await db.collection('events').countDocuments({ wingId: req.user.primaryWingId || null, status: { $in: ['upcoming', 'ongoing', 'Upcoming', 'Ongoing'] } });
        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: 'Wing performance and pending actions are ready.' },
            kpis: [
                { key: 'wingMembers', label: 'Wing Members', value: wingMembers },
                { key: 'committeesCount', label: 'Committees', value: committeesCount },
                { key: 'wingHoursWeek', label: 'Wing Hours (Week)', value: wingHoursWeek.hours, unit: 'h' },
                { key: 'activeEvents', label: 'Active Events', value: activeEvents },
            ],
            sections: { committeePerformanceRows: [] },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    const totalMembers = await db.collection('users').countDocuments({ isActive: { $ne: false } });
    const totalHoursWeek = await countHours(db, {}, 'weekly');
    const activeWings = await db.collection('wings').countDocuments({ isActive: { $ne: false } });
    const globalEvents = await db.collection('events').countDocuments({ status: { $in: ['upcoming', 'ongoing', 'Upcoming', 'Ongoing'] } });
    const payload = {
        role,
        hero: { greeting: 'Good morning', subtitle: 'Organization-wide visibility is up to date.' },
        kpis: [
            { key: 'totalMembers', label: 'Total Members', value: totalMembers },
            { key: 'totalHoursWeek', label: 'Total Hours (Week)', value: totalHoursWeek.hours, unit: 'h' },
            { key: 'activeWings', label: 'Active Wings', value: activeWings },
            { key: 'globalEvents', label: 'Global Events', value: globalEvents },
        ],
        sections: { organizationWideHoursWeekChart: [], wingOverviewRows: [] },
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
    return ok(res, payload);
}));

module.exports = router;
