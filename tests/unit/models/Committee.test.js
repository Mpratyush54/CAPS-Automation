const Committee = require('../../../src/models/Committee');
const { ObjectId } = require('mongodb');

describe('Committee Model Unit Tests', () => {
    describe('Schema Validation', () => {
        it('should pass for valid committee', () => {
            const doc = {
                name: 'Events Committee',
                leadUserId: new ObjectId(),
                isActive: true
            };
            expect(Committee.validate(doc).valid).toBe(true);
        });

        it('should fail if name is missing', () => {
            const res = Committee.validate({ description: 'Test' });
            expect(res.valid).toBe(false);
            expect(res.errors.name).toBeDefined();
        });

        it('should validate isActive as boolean', () => {
            const res = Committee.validate({ name: 'Test', isActive: 'yes' });
            expect(res.valid).toBe(false);
            expect(res.errors.isActive).toContain('must be a boolean');
        });

        it('should validate leadUserId as ObjectId', () => {
            const res = Committee.validate({ name: 'Test', leadUserId: 'invalid' });
            expect(res.valid).toBe(false);
            expect(res.errors.leadUserId).toContain('must be a valid ObjectId');
        });
    });
});
