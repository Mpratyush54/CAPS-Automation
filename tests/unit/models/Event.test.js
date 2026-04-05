const Event = require('../../../src/models/Event');
const { ObjectId } = require('mongodb');

describe('Event Model - Exhaustive Validation', () => {
    describe('Individual Field Validation', () => {
        Object.entries(Event.schema).forEach(([field, rule]) => {
            describe(`Field: ${field}`, () => {
                if (rule.required) {
                    it(`should fail when ${field} is missing`, () => {
                        const doc = {};
                        const res = Event.validate(doc);
                        expect(res.errors[field]).toBeDefined();
                    });
                    
                    it(`should fail when ${field} is null`, () => {
                        const res = Event.validate({ [field]: null });
                        expect(res.errors[field]).toBeDefined();
                    });
                }

                if (rule.type === 'string' && !rule.enum) {
                    it(`should fail when ${field} is not a string`, () => {
                        const res = Event.validate({ [field]: 123 }, { partial: true });
                        expect(res.errors[field]).toContain('must be a string');
                    });
                }

                if (rule.type === 'number') {
                    it(`should fail when ${field} is not a number`, () => {
                        const res = Event.validate({ [field]: '123' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a number');
                    });
                }

                if (rule.type === 'date') {
                    it(`should fail when ${field} is not a valid date`, () => {
                        const res = Event.validate({ [field]: 'not-a-date' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a valid date');
                    });
                }

                if (rule.type === 'objectId') {
                    it(`should fail when ${field} is not a valid ObjectId`, () => {
                        const res = Event.validate({ [field]: 'invalid-id' }, { partial: true });
                        expect(res.errors[field]).toContain('must be a valid ObjectId');
                    });
                }

                if (rule.type === 'array') {
                    it(`should fail when ${field} is not an array`, () => {
                        const res = Event.validate({ [field]: {} }, { partial: true });
                        expect(res.errors[field]).toContain('must be an array');
                    });
                }

                if (rule.enum) {
                    rule.enum.forEach(val => {
                        it(`should pass when ${field} is enum value: ${val}`, () => {
                            const res = Event.validate({ [field]: val }, { partial: true });
                            expect(res.errors[field]).toBeUndefined();
                        });
                    });

                    it(`should fail when ${field} is not in enum`, () => {
                        const res = Event.validate({ [field]: 'disallowed-value' }, { partial: true });
                        expect(res.errors[field]).toContain('must be one of');
                    });
                }
            });
        });
    });

    describe('Full Document Validation', () => {
        it('should validate a complete valid event document', () => {
             const doc = {
                 title: 'Full Event',
                 eventDate: new Date(),
                 createdBy: new ObjectId(),
                 status: 'Upcoming',
                 wingId: new ObjectId(),
                 committeeId: new ObjectId(),
                 scope: 'wing',
                 attendeeCount: 100,
                 teamIds: [new ObjectId()]
             };
             expect(Event.validate(doc).valid).toBe(true);
        });

        it('should aggregate multiple validation errors', () => {
            const doc = {
                title: 123,
                eventDate: 'bad',
                status: 'bad'
            };
            const res = Event.validate(doc);
            expect(Object.keys(res.errors).length).toBeGreaterThan(1);
        });
    });
});

