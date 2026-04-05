const Mom = require('../../../src/models/Mom');
const { ObjectId } = require('mongodb');

describe('Mom Model Unit Tests', () => {
    const validMom = {
        title: 'Weekly Sync',
        meetingDate: new Date(),
        preparedBy: new ObjectId(),
        status: 'draft',
        attendees: [],
        agenda: []
    };

    describe('Schema Validation', () => {
        it('should pass for valid mom', () => {
            expect(Mom.validate(validMom).valid).toBe(true);
        });

        it('should fail if title is missing', () => {
            const res = Mom.validate({ ...validMom, title: null });
            expect(res.valid).toBe(false);
            expect(res.errors.title).toBeDefined();
        });

        it('should fail if meetingDate is invalid', () => {
             const res = Mom.validate({ ...validMom, meetingDate: 'invalid' });
             expect(res.valid).toBe(false);
             expect(res.errors.meetingDate).toContain('must be a valid date');
        });

        it('should fail if preparedBy is missing', () => {
            const res = Mom.validate({ ...validMom, preparedBy: undefined });
            expect(res.valid).toBe(false);
        });

        it('should validate status enum', () => {
             const res = Mom.validate({ ...validMom, status: 'Invalid' });
             expect(res.valid).toBe(false);
        });

        it('should validate attendees as array', () => {
            const res = Mom.validate({ ...validMom, attendees: {} });
            expect(res.valid).toBe(false);
            expect(res.errors.attendees).toContain('must be an array');
        });

        it('should allow multiple valid statuses', () => {
            ['Draft', 'Under Review', 'Published', 'draft', 'under_review', 'published'].forEach(status => {
                expect(Mom.validate({ ...validMom, status }).valid).toBe(true);
            });
        });

        it('should allow wingId and committeeId as ObjectId', () => {
            const res = Mom.validate({ ...validMom, wingId: new ObjectId(), committeeId: new ObjectId() });
            expect(res.valid).toBe(true);
        });
    });
});
