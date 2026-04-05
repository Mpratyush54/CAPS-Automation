const WeeklyReport = require('../../../src/models/WeeklyReport');
const { ObjectId } = require('mongodb');

describe('WeeklyReport Model Unit Tests', () => {
    const validReport = {
        weekKey: '2023-W01',
        title: 'Report 1',
        submittedBy: new ObjectId(),
        status: 'draft'
    };

    describe('Schema Validation', () => {
        it('should pass for valid report', () => {
            expect(WeeklyReport.validate(validReport).valid).toBe(true);
        });

        it('should fail if weekKey is missing', () => {
            const res = WeeklyReport.validate({ ...validReport, weekKey: '' });
            expect(res.valid).toBe(false);
            expect(res.errors.weekKey).toBeDefined();
        });

        it('should fail if submittedBy is missing', () => {
            const res = WeeklyReport.validate({ ...validReport, submittedBy: null });
            expect(res.valid).toBe(false);
            expect(res.errors.submittedBy).toBeDefined();
        });

        it('should validate status enum', () => {
            const res = WeeklyReport.validate({ ...validReport, status: 'Invalid' });
            expect(res.valid).toBe(false);
            expect(res.errors.status).toContain('must be one of');
        });

        it('should validate teamDirectoryId as ObjectId', () => {
            const res = WeeklyReport.validate({ ...validReport, teamDirectoryId: 'xxx' });
            expect(res.valid).toBe(false);
            expect(res.errors.teamDirectoryId).toContain('must be a valid ObjectId');
        });

        it('should validate hours as number', () => {
            const res = WeeklyReport.validate({ ...validReport, hours: '12.5' });
            expect(res.valid).toBe(false);
            expect(res.errors.hours).toContain('must be a number');
        });

        it('should pass for all valid statuses', () => {
             ['Draft', 'Submitted', 'Approved', 'Missing', 'draft', 'submitted', 'approved', 'missing'].forEach(status => {
                expect(WeeklyReport.validate({ ...validReport, status }).valid).toBe(true);
            });
        });

        it('should allow extra fields', () => {
            const res = WeeklyReport.validate({ ...validReport, notes: 'Some notes' });
            expect(res.valid).toBe(true);
        });
    });
});
