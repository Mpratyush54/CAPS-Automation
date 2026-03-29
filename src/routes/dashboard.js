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

async function getWeeklyChart(db, match) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);

    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, workDate: { $gte: start }, status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: { $dateToString: { format: '%m-%d', date: '$workDate' } }, hours: { $sum: { $divide: ['$durationMinutes', 60] } }, tasks: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - (6 - i));
        const key = d.toISOString().slice(5, 10);
        const matchRow = rows.find(r => r._id === key);
        result.push({
            day: days[d.getUTCDay()],
            hours: matchRow ? Number(matchRow.hours.toFixed(1)) : 0,
            tasks: matchRow ? matchRow.tasks : 0
        });
    }
    return result;
}

async function countHours(db, match, period = 'weekly') {
    const bounds = getPeriodBounds(period);
    const rows = await db.collection('workLogs').aggregate([
        { $match: { ...match, status: { $in: ['approved', 'Completed'] }, workDate: { $gte: bounds.start, $lte: bounds.end } } },
        { $group: { _id: null, minutes: { $sum: '$durationMinutes' }, logs: { $sum: 1 } } },
    ]).toArray();
    const first = rows[0] || { minutes: 0, logs: 0 };
    return { hours: Number((first.minutes / 60).toFixed(1)), logs: first.logs };
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
        const weeklyHoursChart = await getWeeklyChart(db, { userId });
        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: 'Ready to log your work today?' },
            kpis: [
                { key: 'myHoursWeek', label: 'My Hours (Week)', value: weekly.hours, unit: 'h' },
                { key: 'myTaskCount', label: 'My Tasks', value: weekly.logs },
                { key: 'assignedEventsCount', label: 'Events Assigned', value: assignedEventsCount },
            ],
            sections: { 
                myTasks: [], // For future implementation of a task management system
                weeklyHoursChart 
            },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    if (role === ROLES.TEAM_LEAD) {
        const teamMembersCount = await db.collection('users').countDocuments({ primaryCommitteeId: req.user.primaryCommitteeId || null, isActive: { $ne: false } });
        const teamHoursWeek = await countHours(db, { committeeId: req.user.primaryCommitteeId || null }, 'weekly');
        const pendingApprovalsCount = await db.collection('workLogs').countDocuments({ committeeId: req.user.primaryCommitteeId || null, status: { $in: ['pending_review', 'Pending Review'] } });
        const committeeHoursWeekChart = await getWeeklyChart(db, { committeeId: req.user.primaryCommitteeId || null });
        
        const teamLogsToday = await db.collection('workLogs').aggregate([
            { $match: { committeeId: req.user.primaryCommitteeId || null, createdAt: { $gte: new Date(new Date().setUTCHours(0,0,0,0)) } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { member: '$user.name', task: '$title', time: { $concat: [{ $toString: { $floor: { $divide: ['$durationMinutes', 60] } } }, 'h ', { $toString: { $mod: ['$durationMinutes', 60] } }, 'm'] }, status: '$status' } },
            { $limit: 5 }
        ]).toArray();

        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: "Your team's daily report is waiting." },
            kpis: [
                { key: 'teamMembersCount', label: 'Team Members', value: teamMembersCount },
                { key: 'teamHoursWeek', label: 'Team Hours (Week)', value: teamHoursWeek.hours, unit: 'h' },
                { key: 'pendingApprovalsCount', label: 'Pending Approvals', value: pendingApprovalsCount },
                { key: 'logsSubmittedCount', label: 'Logs Submitted', value: teamHoursWeek.logs },
            ],
            sections: { teamLogsToday, committeeHoursWeekChart },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    if (role === ROLES.ADMIN) {
        const wingId = req.user.primaryWingId || null;
        const wingMembers = await db.collection('users').countDocuments({ primaryWingId: wingId, isActive: { $ne: false } });
        const committeesCount = await db.collection('committees').countDocuments({ wingId, isActive: { $ne: false } });
        const wingHoursWeek = await countHours(db, { wingId }, 'weekly');
        const activeEvents = await db.collection('events').countDocuments({ wingId, status: { $in: ['upcoming', 'ongoing', 'Upcoming', 'Ongoing'] } });
        
        const committeePerformanceRows = await db.collection('workLogs').aggregate([
            { $match: { wingId, status: { $in: ['approved', 'Completed'] } } },
            { $group: { _id: '$committeeId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 } } },
            { $lookup: { from: 'committees', localField: '_id', foreignField: '_id', as: 'committee' } },
            { $unwind: { path: '$committee', preserveNullAndEmptyArrays: true } },
            { $project: { wing: { $ifNull: ['$committee.name', 'Unassigned'] }, members: { $literal: 0 }, hours: { $round: ['$hours', 0] }, logs: 1, completion: { $literal: '100%' } } }
        ]).toArray();

        const payload = {
            role,
            hero: { greeting: 'Good morning', subtitle: 'Wing performance and pending actions are ready.' },
            kpis: [
                { key: 'wingMembers', label: 'Wing Members', value: wingMembers },
                { key: 'committeesCount', label: 'Committees', value: committeesCount },
                { key: 'wingHoursWeek', label: 'Wing Hours (Week)', value: wingHoursWeek.hours, unit: 'h' },
                { key: 'activeEvents', label: 'Active Events', value: activeEvents },
            ],
            sections: { committeePerformanceRows },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    const totalMembers = await db.collection('users').countDocuments({ isActive: { $ne: false } });
    const totalHoursWeek = await countHours(db, {}, 'weekly');
    const activeWings = await db.collection('wings').countDocuments({ isActive: { $ne: false } });
    const globalEvents = await db.collection('events').countDocuments({ status: { $in: ['upcoming', 'ongoing', 'Upcoming', 'Ongoing'] } });
    const organizationWideHoursWeekChart = await getWeeklyChart(db, {});

    const wingOverviewRows = await db.collection('workLogs').aggregate([
        { $match: { status: { $in: ['approved', 'Completed'] } } },
        { $group: { _id: '$wingId', hours: { $sum: { $divide: ['$durationMinutes', 60] } } } },
        { $lookup: { from: 'wings', localField: '_id', foreignField: '_id', as: 'wing' } },
        { $unwind: { path: '$wing', preserveNullAndEmptyArrays: true } },
        { $project: { wing: { $ifNull: ['$wing.name', 'Unassigned'] }, members: { $literal: 0 }, completion: { $literal: '100%' } } }
    ]).toArray();

    const payload = {
        role,
        hero: { greeting: 'Good morning', subtitle: 'Organization-wide visibility is up to date.' },
        kpis: [
            { key: 'totalMembers', label: 'Total Members', value: totalMembers },
            { key: 'totalHoursWeek', label: 'Total Hours (Week)', value: totalHoursWeek.hours, unit: 'h' },
            { key: 'activeWings', label: 'Active Wings', value: activeWings },
            { key: 'globalEvents', label: 'Global Events', value: globalEvents },
        ],
        sections: { organizationWideHoursWeekChart, wingOverviewRows },
    };
    await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
    return ok(res, payload);
}));

module.exports = router;

