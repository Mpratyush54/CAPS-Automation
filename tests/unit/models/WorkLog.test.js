const WorkLog = require('../../../src/models/WorkLog');
const { ObjectId } = require('mongodb');

describe('WorkLog Model - Exhaustive Validation', () => {
    describe('Individual Field Validation', () => {
        Object.entries(WorkLog.schema).forEach(([field, rule]) => {
            describe(`Field: ${field}`, () => {
                if (rule.required) {
                    it(`should fail when ${field} is missing`, () => {
                        const doc = {};
                        const res = WorkLog.validate(doc);
                        expect(res.errors[field]).toBeDefined();
                    });
                }

                if (rule.type === 'string' && !rule.enum) {
                    it(`should fail when ${field} is not a string`, () => {
                        const res = WorkLog.validate({ [field]: 123 }, { partial: true });
                        expect(res.errors[field]).toContain('must be a string');
                    });
                }

                if (rule.type === 'number') {
                    it(`should fail when ${field} is not a number`, () => {
                        const res = WorkLog.validate({ [field]: '123' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a number');
                    });
                }

                if (rule.type === 'date') {
                    it(`should fail when ${field} is not a valid date`, () => {
                        const res = WorkLog.validate({ [field]: 'invalid' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a valid date');
                    });
                }

                if (rule.type === 'objectId') {
                    it(`should fail when ${field} is not a valid ObjectId`, () => {
                        const res = WorkLog.validate({ [field]: 'bad-id' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a valid ObjectId');
                    });
                }

                if (rule.enum) {
                    rule.enum.forEach(val => {
                        it(`should pass when ${field} is enum value: ${val}`, () => {
                            const res = WorkLog.validate({ [field]: val }, { partial: true });
                            expect(res.errors[field]).toBeUndefined();
                        });
                    });

                    it(`should fail when ${field} is not in enum`, () => {
                        const res = WorkLog.validate({ [field]: 'unknown' }, { partial: true });
                        expect(res.errors[field]).toContain('must be one of');
                    });
                }
            });
        });
    });

    it('should validate a complete valid worklog document', () => {
        const doc = {
            userId: new ObjectId(),
            title: 'Reporting',
            workDate: new Date(),
            durationMinutes: 45,
            status: 'draft'
        };
        expect(WorkLog.validate(doc).valid).toBe(true);
    });
});
