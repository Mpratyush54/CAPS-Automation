const EventReport = require('../../../src/models/EventReport');
const { ObjectId } = require('mongodb');

describe('EventReport Model Unit Tests', () => {
    describe('Schema Validation', () => {
        it('should pass for valid report', () => {
             const doc = {
                 eventId: new ObjectId(),
                 status: 'draft',
                 ownerUserId: new ObjectId()
             };
             expect(EventReport.validate(doc).valid).toBe(true);
        });

        it('should fail if eventId is missing', () => {
             expect(EventReport.validate({ status: 'ready' }).valid).toBe(false);
        });

        it('should validate status enum', () => {
             const res = EventReport.validate({ eventId: new ObjectId(), status: 'Invalid' });
             expect(res.valid).toBe(false);
        });

        it('should validate lastUpdatedAt as date', () => {
             const res = EventReport.validate({ eventId: new ObjectId(), lastUpdatedAt: 'some-date' });
             expect(res.valid).toBe(false);
        });

        it('should allow multiple valid statuses', () => {
            ['Not Started', 'Draft', 'Ready', 'Published', 'draft', 'ready', 'published'].forEach(status => {
                expect(EventReport.validate({ eventId: new ObjectId(), status }).valid).toBe(true);
            });
        });
    });
});
