const PeriodReport = require('../../../src/models/PeriodReport');
const { ObjectId } = require('mongodb');

describe('PeriodReport Model Unit Tests', () => {
    const validReport = {
        periodType: 'monthly',
        periodKey: '2023-06',
        status: 'generated',
        hours: 100,
        sourceWeeklyReportIds: [new ObjectId()]
    };

    describe('Schema Validation', () => {
        it('should pass for valid report', () => {
            expect(PeriodReport.validate(validReport).valid).toBe(true);
        });

        it('should fail if periodType is missing', () => {
             const res = PeriodReport.validate({ ...validReport, periodType: null });
             expect(res.valid).toBe(false);
        });

        it('should validate status enum', () => {
             const res = PeriodReport.validate({ ...validReport, status: 'Invalid' });
             expect(res.valid).toBe(false);
        });

        it('should validate hours as number', () => {
            const res = PeriodReport.validate({ ...validReport, hours: '100' });
            expect(res.valid).toBe(false);
        });

        it('should validate sourceWeeklyReportIds as array', () => {
             const res = PeriodReport.validate({ ...validReport, sourceWeeklyReportIds: 'not-array' });
             expect(res.valid).toBe(false);
        });

        it('should pass for multiple valid status values', () => {
            ['Generated', 'Published', 'generated', 'published'].forEach(status => {
                expect(PeriodReport.validate({ ...validReport, status }).valid).toBe(true);
            });
        });

        it('should allow extra fields', () => {
             expect(PeriodReport.validate({ ...validReport, extra: 'meta' }).valid).toBe(true);
        });
    });
});
