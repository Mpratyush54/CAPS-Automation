const BaseModel = require('../../src/models/BaseModel');
const { ObjectId } = require('mongodb');

// Dummy model for testing
class TestModel extends BaseModel {}
TestModel.schema = {
    name: { type: 'string', required: true },
    age: { type: 'number' },
    active: { type: 'boolean' },
    tags: { type: 'array' },
    joinedAt: { type: 'date' },
    refId: { type: 'objectId' },
    role: { type: 'string', enum: ['User', 'Admin'] }
};

describe('BaseModel Validation Unit Tests', () => {
    describe('Required Check', () => {
        it('should fail if required field is missing (null/undefined/empty)', () => {
            expect(TestModel.validate({}).valid).toBe(false);
            expect(TestModel.validate({ name: null }).valid).toBe(false);
            expect(TestModel.validate({ name: '' }).valid).toBe(false);
            expect(TestModel.validate({ name: 'Valid' }).valid).toBe(true);
        });

        it('should pass if required field is missing in partial validation', () => {
            expect(TestModel.validate({}, { partial: true }).valid).toBe(true);
        });
    });

    describe('Type Checks - String', () => {
        it('should fail if string field is not a string', () => {
            const res = TestModel.validate({ name: 123 });
            expect(res.valid).toBe(false);
            expect(res.errors.name).toContain('must be a string');
        });
    });

    describe('Type Checks - Number', () => {
        it('should fail if number field is not a number', () => {
            const res = TestModel.validate({ name: 'valid', age: '25' });
            expect(res.valid).toBe(false);
            expect(res.errors.age).toContain('must be a number');
        });

        it('should fail if number is NaN', () => {
            const res = TestModel.validate({ name: 'valid', age: NaN });
            expect(res.valid).toBe(false);
        });
    });

    describe('Type Checks - Boolean', () => {
        it('should fail if boolean is not a boolean', () => {
            const res = TestModel.validate({ name: 'val', active: 'true' });
            expect(res.valid).toBe(false);
        });
    });

    describe('Type Checks - Array', () => {
        it('should fail if array is not an array', () => {
            const res = TestModel.validate({ name: 'val', tags: {} });
            expect(res.valid).toBe(false);
        });
    });

    describe('Type Checks - Date', () => {
        it('should pass for Date objects', () => {
            const res = TestModel.validate({ name: 'val', joinedAt: new Date() });
            expect(res.valid).toBe(true);
        });

        it('should pass for valid date strings', () => {
            const res = TestModel.validate({ name: 'val', joinedAt: '2023-01-01' });
            expect(res.valid).toBe(true);
        });

        it('should fail for invalid date strings', () => {
            const res = TestModel.validate({ name: 'val', joinedAt: 'not-a-date' });
            expect(res.valid).toBe(false);
        });
    });

    describe('Type Checks - ObjectId', () => {
        it('should pass for ObjectId instances', () => {
            const res = TestModel.validate({ name: 'val', refId: new ObjectId() });
            expect(res.valid).toBe(true);
        });

        it('should pass for valid ObjectId hex strings', () => {
            const res = TestModel.validate({ name: 'val', refId: '507f1f77bcf86cd799439011' });
            expect(res.valid).toBe(true);
        });

        it('should fail for invalid strings', () => {
            const res = TestModel.validate({ name: 'val', refId: 'invalid-id' });
            expect(res.valid).toBe(false);
        });
    });

    describe('Enum Check', () => {
        it('should pass if value is in enum', () => {
            expect(TestModel.validate({ name: 'val', role: 'User' }).valid).toBe(true);
        });

        it('should fail if value is not in enum', () => {
            expect(TestModel.validate({ name: 'val', role: 'Guest' }).valid).toBe(false);
        });
    });
});
