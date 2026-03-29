const { ObjectId } = require('mongodb');

const ROLES = {
    VOLUNTEER: 'Volunteer',
    TEAM_LEAD: 'Team Lead',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
};

const WORK_LOG_STATUSES = new Set(['draft', 'in_progress', 'pending_review', 'needs_revision', 'approved']);
const WEEKLY_REPORT_STATUSES = new Set(['draft', 'submitted', 'approved', 'missing']);
const PERIOD_REPORT_TYPES = new Set(['monthly', 'quarterly_3', 'half_yearly_6', 'yearly']);
const MOM_STATUSES = new Set(['draft', 'under_review', 'published']);
const EVENT_REPORT_STATUSES = new Set(['draft', 'ready', 'published']);

function parseObjectId(value, fieldName) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (value instanceof ObjectId) {
        return value;
    }

    if (!ObjectId.isValid(value)) {
        throw new Error(`${fieldName} must be a valid ObjectId.`);
    }

    return new ObjectId(value);
}

function parseDate(value, fieldName) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldName} must be a valid date.`);
    }
    return date;
}

function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function getWeekKey(input = new Date()) {
    const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getPeriodBounds(period) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    if (period === 'weekly') {
        const startDate = new Date(now);
        startDate.setUTCDate(now.getUTCDate() - ((now.getUTCDay() || 7) - 1));
        return { start: startOfUtcDay(startDate), end: endOfUtcDay(new Date(startDate.getTime() + (6 * 86400000))) };
    }

    if (period === 'monthly') {
        return { start, end };
    }

    if (period === '3m') {
        return {
            start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)),
            end,
        };
    }

    if (period === '6m') {
        return {
            start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)),
            end,
        };
    }

    return {
        start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        end: new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)),
    };
}

function isAdminLike(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

function isLeadLike(role) {
    return role === ROLES.TEAM_LEAD || isAdminLike(role);
}

function resolveScopedFields(user, input = {}) {
    if (isAdminLike(user.role)) {
        return {
            teamId: parseObjectId(input.teamId, 'teamId'),
            scopeSource: 'manually_selected_scope',
        };
    }

    if (user.teamId) {
        return {
            teamId: parseObjectId(user.teamId, 'teamId'),
            scopeSource: 'inherited_user_score',
        };
    }

    return {
        teamId: parseObjectId(input.teamId, 'teamId'),
        scopeSource: 'self_selected_during_transition',
    };
}

function buildScopeMatch(user, { userField = 'userId', teamField = 'teamId', allowSelf = false } = {}) {
    if (user.role === ROLES.SUPER_ADMIN) {
        return {};
    }

    if (user.role === ROLES.ADMIN) {
        // Admins might still be filtered by their own team if needed, but usually see all in their wing
        // For simplicity with the new model, we just use teamId if they have one or return all
        return user.teamId ? { [teamField]: parseObjectId(user.teamId, 'teamId') } : {};
    }

    const filters = [];

    if (allowSelf) {
        filters.push({ [userField]: parseObjectId(user._id, '_id') });
    }

    if (user.teamId) {
        filters.push({ [teamField]: parseObjectId(user.teamId, 'teamId') });
    }

    if (filters.length === 0) {
        return allowSelf ? { [userField]: parseObjectId(user._id, '_id') } : {};
    }

    return filters.length === 1 ? filters[0] : { $or: filters };
}

function assertAllowedStatus(status, allowed, fieldName) {
    if (!allowed.has(status)) {
        throw new Error(`${fieldName} is invalid.`);
    }
}

module.exports = {
    ROLES,
    WORK_LOG_STATUSES,
    WEEKLY_REPORT_STATUSES,
    PERIOD_REPORT_TYPES,
    MOM_STATUSES,
    EVENT_REPORT_STATUSES,
    parseObjectId,
    parseDate,
    getWeekKey,
    getPeriodBounds,
    isAdminLike,
    isLeadLike,
    resolveScopedFields,
    buildScopeMatch,
    assertAllowedStatus,
};
