const DriveFile = require('../../../src/models/DriveFile');
const { ObjectId } = require('mongodb');

describe('DriveFile Model Unit Tests', () => {
    const validFile = {
        eventId: new ObjectId(),
        uploadedBy: new ObjectId(),
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024,
        status: 'Synced'
    };

    describe('Schema Validation', () => {
        it('should pass for valid file', () => {
            expect(DriveFile.validate(validFile).valid).toBe(true);
        });

        it('should fail if eventId is missing', () => {
             const res = DriveFile.validate({ ...validFile, eventId: null });
             expect(res.valid).toBe(false);
        });

        it('should fail if sizeBytes is not a number', () => {
             const res = DriveFile.validate({ ...validFile, sizeBytes: '1024' });
             expect(res.valid).toBe(false);
             expect(res.errors.sizeBytes).toContain('must be a number');
        });

        it('should validate status enum', () => {
            const res = DriveFile.validate({ ...validFile, status: 'Invalid' });
            expect(res.valid).toBe(false);
        });

        it('should allow extra fields', () => {
             const res = DriveFile.validate({ ...validFile, metadata: { width: 1920 } });
             expect(res.valid).toBe(true);
        });

        it('should pass for all valid statuses', () => {
             ['Pending Sync', 'Syncing', 'Synced', 'Failed', 'uploaded', 'failed'].forEach(status => {
                expect(DriveFile.validate({ ...validFile, status }).valid).toBe(true);
            });
        });
    });
});
