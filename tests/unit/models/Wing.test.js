const Wing = require('../../../src/models/Wing');
const { ObjectId } = require('mongodb');

describe('Wing Model Unit Tests', () => {
    describe('Schema Validation', () => {
        it('should pass for valid wing', () => {
            const doc = {
                name: 'Training Wing',
                leadUserId: new ObjectId(),
                isActive: true
            };
            expect(Wing.validate(doc).valid).toBe(true);
        });

        it('should fail if name is missing', () => {
            const res = Wing.validate({ description: 'Test' });
            expect(res.valid).toBe(false);
            expect(res.errors.name).toBeDefined();
        });

        it('should validate isActive as boolean', () => {
            const res = Wing.validate({ name: 'Test', isActive: 1 });
            expect(res.valid).toBe(false);
            expect(res.errors.isActive).toContain('must be a boolean');
        });

        it('should validate leadUserId as ObjectId', () => {
            const res = Wing.validate({ name: 'Test', leadUserId: 'abc-123' });
            expect(res.valid).toBe(false);
            expect(res.errors.leadUserId).toContain('must be a valid ObjectId');
        });
    });
});
