const { ObjectId } = require('mongodb');
const worklog = require('../../src/utils/worklog');

describe('Worklog Utils Unit Tests', () => {
    describe('parseObjectId()', () => {
        it('should return null for empty values', () => {
            expect(worklog.parseObjectId(null, 'test')).toBeNull();
            expect(worklog.parseObjectId('', 'test')).toBeNull();
            expect(worklog.parseObjectId(undefined, 'test')).toBeNull();
        });

        it('should return ObjectId instance if already one', () => {
            const id = new ObjectId();
            expect(worklog.parseObjectId(id, 'test')).toBe(id);
        });

        it('should convert valid string to ObjectId', () => {
            const str = '507f1f77bcf86cd799439011';
            const result = worklog.parseObjectId(str, 'test');
            expect(result).toBeInstanceOf(ObjectId);
            expect(result.toString()).toBe(str);
        });

        it('should throw for invalid strings', () => {
            expect(() => worklog.parseObjectId('invalid', 'test')).toThrow('valid ObjectId');
        });
    });

    describe('parseDate()', () => {
        it('should return Date instance', () => {
            const now = new Date();
            expect(worklog.parseDate(now, 'test')).toEqual(now);
            expect(worklog.parseDate(now.toISOString(), 'test')).toBeInstanceOf(Date);
        });

        it('should throw for invalid dates', () => {
            expect(() => worklog.parseDate('not-a-date', 'test')).toThrow('valid date');
        });
    });

    describe('getWeekKey()', () => {
        it('should return correct week key (YYYY-Wnn)', () => {
            const d = new Date(Date.UTC(2023, 0, 1)); // Jan 1, 2023 (Sunday)
            // Week 52 of 2022 or Week 01 of 2023 depending on ISO week rules
            // The function uses math.ceil((d - yearStart)/86400000 + 1) / 7
            const key = worklog.getWeekKey(d);
            expect(key).toMatch(/^\d{4}-W\d{2}$/);
        });
    });

    describe('isAdminLike() and isLeadLike()', () => {
        it('should identify admin roles correctly', () => {
            expect(worklog.isAdminLike('Admin')).toBe(true);
            expect(worklog.isAdminLike('Super Admin')).toBe(true);
            expect(worklog.isAdminLike('Volunteer')).toBe(false);
        });

        it('should identify lead roles correctly', () => {
            expect(worklog.isLeadLike('Team Lead')).toBe(true);
            expect(worklog.isLeadLike('Admin')).toBe(true);
            expect(worklog.isLeadLike('Volunteer')).toBe(false);
        });
    });

    describe('resolveScopedFields()', () => {
        const teamId = new ObjectId().toString();
        const wingId = new ObjectId().toString();
        const committeeId = new ObjectId().toString();

        it('should return input fields for Admin', () => {
            const user = { role: 'Admin' };
            const input = { teamId, wingId, committeeId };
            const result = worklog.resolveScopedFields(user, input);
            expect(result.teamId.toString()).toBe(teamId);
            expect(result.scopeSource).toBe('manually_selected_scope');
        });

        it('should return user fields for Lead with teamId', () => {
            const user = { role: 'Team Lead', teamId, wingId, committeeId };
            const result = worklog.resolveScopedFields(user, {});
            expect(result.teamId.toString()).toBe(teamId);
            expect(result.scopeSource).toBe('inherited_user_score');
        });
    });

    describe('buildScopeMatch()', () => {
        const userId = new ObjectId();
        const teamId = new ObjectId();

        it('should return empty object for Super Admin', () => {
            const user = { role: 'Super Admin' };
            expect(worklog.buildScopeMatch(user)).toEqual({});
        });

        it('should filter by teamId for Lead/Admin with team', () => {
            const user = { role: 'Admin', teamId };
            const result = worklog.buildScopeMatch(user);
            expect(result.teamId).toEqual(teamId);
        });

        it('should include userId if allowSelf is true', () => {
            const user = { _id: userId, role: 'Volunteer' };
            const result = worklog.buildScopeMatch(user, { allowSelf: true });
            expect(result.userId).toEqual(userId);
        });

        it('should use OR for both user and team if applicable', () => {
            const user = { _id: userId, teamId, role: 'Volunteer' };
            const result = worklog.buildScopeMatch(user, { allowSelf: true });
            expect(result.$or).toBeDefined();
            expect(result.$or).toContainEqual({ userId });
            expect(result.$or).toContainEqual({ teamId });
        });
    });

    describe('assertAllowedStatus()', () => {
        it('should pass for allowed status', () => {
            const allowed = new Set(['draft', 'final']);
            expect(() => worklog.assertAllowedStatus('draft', allowed, 'status')).not.toThrow();
        });

        it('should throw for disallowed status', () => {
            const allowed = new Set(['draft', 'final']);
            expect(() => worklog.assertAllowedStatus('pending', allowed, 'status')).toThrow('status is invalid');
        });
    });
});
