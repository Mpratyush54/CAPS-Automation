const express = require('express');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, cacheResponse } = require('../middleware/api');
const { ROLES, parseObjectId, getPeriodBounds } = require('../utils/worklog');
const { ok } = require('../utils/api');
const { cacheSet, flushCache } = require('../config/redis');

const router = express.Router();

router.use(authenticate);

/* -------------------- HELPERS -------------------- */

// Returns an array of team IDs the user is authorized to oversee
async function getAuthorizedTeamIds(db, user) {
    if (user.role === ROLES.SUPER_ADMIN) return null; // Null means "All"
    
    if (!user.teamId) return [];

    const userTeamId = parseObjectId(user.teamId, 'user.teamId');
    const userTeam = await db.collection('teamDirectories').findOne({ _id: userTeamId });
    if (!userTeam) return [userTeamId];

    // If Admin/Super and it's a wing, include all child committees
    if ((user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) && userTeam.type === 'wing') {
        const children = await db.collection('teamDirectories')
            .find({ wingId: userTeamId, isActive: { $ne: false } })
            .project({ _id: 1 })
            .toArray();
        return [userTeamId, ...children.map(c => c._id)];
    }

    return [userTeamId];
}

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

/* -------------------- ROUTE -------------------- */

router.get('/', cacheResponse((req) => `dashboard:user:${req.user?._id}:${req.query.roleView || 'auto'}:${req.query.dateFrom || ''}:${req.query.dateTo || ''}`, 300), asyncHandler(async (req, res) => {
    const db = getDB();
    const user = req.user;
    const userId = parseObjectId(user._id, '_id');
    const role = user.role;

    const authTeamIds = await getAuthorizedTeamIds(db, user);
    const scopeMatch = authTeamIds ? { teamId: { $in: authTeamIds } } : {};

    // ──────────────── VOLUNTEER ────────────────
    if (role === ROLES.VOLUNTEER) {
        const weekly = await countHours(db, { userId }, 'weekly');
        const assignedEventsCount = await db.collection('events').countDocuments({
            $or: [
                { teamId: user.teamId ? parseObjectId(user.teamId) : null },
                { userId } // Events specifically assigned to them
            ]
        });
        const weeklyHoursChart = await getWeeklyChart(db, { userId });
        const payload = {
            role,
            hero: { greeting: 'Welcome Back', subtitle: 'Ready to log your work today?' },
            kpis: [
                { key: 'myHoursWeek', label: 'My Hours (Week)', value: weekly.hours, unit: 'h' },
                { key: 'myTaskCount', label: 'My Tasks', value: weekly.logs },
                { key: 'assignedEventsCount', label: 'Events Assigned', value: assignedEventsCount },
            ],
            sections: { myTasks: [], weeklyHoursChart },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    // ──────────────── TEAM LEAD ────────────────
    if (role === ROLES.TEAM_LEAD) {
        const teamId = user.teamId ? parseObjectId(user.teamId) : null;
        const teamMembersCount = await db.collection('users').countDocuments({ teamId, isActive: { $ne: false } });
        const teamHoursWeek = await countHours(db, { teamId }, 'weekly');
        const pendingApprovalsCount = await db.collection('workLogs').countDocuments({
            teamId,
            status: { $in: ['pending_review', 'Pending Review'] }
        });
        const committeeHoursWeekChart = await getWeeklyChart(db, { teamId });
        
        const teamLogsToday = await db.collection('workLogs').aggregate([
            { $match: { teamId, createdAt: { $gte: new Date(new Date().setUTCHours(0,0,0,0)) } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { member: '$user.name', task: '$title', time: { $concat: [{ $toString: { $floor: { $divide: ['$durationMinutes', 60] } } }, 'h ', { $toString: { $mod: ['$durationMinutes', 60] } }, 'm'] }, status: '$status' } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 }
        ]).toArray();

        const payload = {
            role,
            hero: { greeting: 'Team Dashboard', subtitle: "Your team's performance at a glance." },
            kpis: [
                { key: 'teamMembersCount', label: 'Team Members', value: teamMembersCount },
                { key: 'teamHoursWeek', label: 'Team Hours (Week)', value: teamHoursWeek.hours, unit: 'h' },
                { key: 'pendingTasksCount', label: 'Pending Approvals', value: pendingApprovalsCount },
                { key: 'logsSubmittedCount', label: 'Logs Submitted', value: teamHoursWeek.logs },
            ],
            sections: { teamLogsToday, committeeHoursWeekChart },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    // ──────────────── ADMIN / SUPER ADMIN ────────────────
    if (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) {
        const membersCount = await db.collection('users').countDocuments({ ...scopeMatch, isActive: { $ne: false } });
        const subUnitsCount = await db.collection('teamDirectories').countDocuments({ ...scopeMatch, isActive: { $ne: false } });
        const orgHoursWeek = await countHours(db, scopeMatch, 'weekly');
        const activeEvents = await db.collection('events').countDocuments({ ...scopeMatch, status: { $in: ['upcoming', 'ongoing', 'Upcoming', 'Ongoing'] } });
        
        const performanceMatch = { ...scopeMatch, status: { $in: ['approved', 'Completed'] } };
        const unitPerformanceRows = await db.collection('workLogs').aggregate([
            { $match: performanceMatch },
            { $group: { _id: '$teamId', hours: { $sum: { $divide: ['$durationMinutes', 60] } }, logs: { $sum: 1 } } },
            { $lookup: { from: 'teamDirectories', localField: '_id', foreignField: '_id', as: 'unit' } },
            { $unwind: { path: '$unit', preserveNullAndEmptyArrays: true } },
            { $project: { 
                wing: { $ifNull: ['$unit.name', 'Unassigned'] }, 
                members: { $literal: 0 }, 
                hours: { $round: ['$hours', 0] }, 
                logs: 1, 
                completion: { $literal: '100%' } 
            } }
        ]).toArray();

        const chart = await getWeeklyChart(db, scopeMatch);

        const payload = {
            role,
            hero: { greeting: role === ROLES.SUPER_ADMIN ? 'Organization HQ' : 'Wing Dashboard', subtitle: 'Overview of all activities and performance.' },
            kpis: [
                { key: role === ROLES.SUPER_ADMIN ? 'totalMembers' : 'wingMembers', label: 'Members', value: membersCount },
                { key: role === ROLES.SUPER_ADMIN ? 'activeWings' : 'committeesCount', label: role === ROLES.SUPER_ADMIN ? 'Wings' : 'Committees', value: subUnitsCount },
                { key: role === ROLES.SUPER_ADMIN ? 'totalHoursWeek' : 'wingHoursWeek', label: 'Hours (Week)', value: orgHoursWeek.hours, unit: 'h' },
                { key: role === ROLES.SUPER_ADMIN ? 'globalEvents' : 'activeEvents', label: 'Active Events', value: activeEvents },
            ],
            sections: { 
                unitPerformanceRows, 
                organizationWideHoursWeekChart: chart,
                wingOverviewRows: unitPerformanceRows // For backward compatibility with some UI views
            },
        };
        await cacheSet(req.cacheKey, { data: payload }, req.cacheTTL || 300);
        return ok(res, payload);
    }

    return fail(res, 400, 'INTERNAL_ERROR', 'Unknown role configuration.');
}));

module.exports = router;
