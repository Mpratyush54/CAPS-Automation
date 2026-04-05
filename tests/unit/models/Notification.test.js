const Notification = require('../../../src/models/Notification');
const { ObjectId } = require('mongodb');

describe('Notification Model Unit Tests', () => {
    const validNotif = {
        type: 'info',
        title: 'Hi',
        body: 'There',
        recipientUserId: new ObjectId(),
        isRead: false,
        sourceType: 'manual'
    };

    describe('Schema Validation', () => {
        it('should pass for valid notification', () => {
            expect(Notification.validate(validNotif).valid).toBe(true);
        });

        it('should fail if type is missing', () => {
            const res = Notification.validate({ ...validNotif, type: null });
            expect(res.valid).toBe(false);
            expect(res.errors.type).toBeDefined();
        });

        it('should fail if type is invalid enum', () => {
            const res = Notification.validate({ ...validNotif, type: 'bad' });
            expect(res.valid).toBe(false);
            expect(res.errors.type).toContain('must be one of');
        });

        it('should fail if title is missing', () => {
            const res = Notification.validate({ ...validNotif, title: '' });
            expect(res.valid).toBe(false);
        });

        it('should fail if body is missing', () => {
            const res = Notification.validate({ ...validNotif, body: '' });
            expect(res.valid).toBe(false);
        });

        it('should validate isRead as boolean', () => {
            const res = Notification.validate({ ...validNotif, isRead: 'no' });
            expect(res.valid).toBe(false);
            expect(res.errors.isRead).toContain('must be a boolean');
        });

        it('should validate recipeintUserId as objectId', () => {
            const res = Notification.validate({ ...validNotif, recipientUserId: '123' });
            expect(res.valid).toBe(false);
            expect(res.errors.recipientUserId).toContain('must be a valid ObjectId');
        });

        it('should validate sourceType enum', () => {
            const res = Notification.validate({ ...validNotif, sourceType: 'hacker' });
            expect(res.valid).toBe(false);
            expect(res.errors.sourceType).toContain('must be one of');
        });
        
        it('should allow extra fields', () => {
            const res = Notification.validate({ ...validNotif, extra: 'data' });
            expect(res.valid).toBe(true);
        });

        it('should pass for all valid types', () => {
            ['info', 'warning', 'success', 'event', 'compliance'].forEach(type => {
                expect(Notification.validate({ ...validNotif, type }).valid).toBe(true);
            });
        });

        it('should pass for all valid sourceTypes', () => {
            ['manual', 'system', 'report_job', 'media_sync', 'log_review', 'user'].forEach(sourceType => {
                expect(Notification.validate({ ...validNotif, sourceType }).valid).toBe(true);
            });
        });
    });
});
