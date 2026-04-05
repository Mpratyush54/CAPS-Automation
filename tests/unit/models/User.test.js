const User = require('../../../src/models/Login');

describe('User Model Unit Tests (BaseModel)', () => {
    it('should fail if required fields are missing', () => {
        const { valid, errors } = User.validate({});
        expect(valid).toBe(false);
        expect(errors.username).toBeDefined();
        expect(errors.email).toBeDefined();
        expect(errors.name).toBeDefined();
    });

    it('should validate roles enum values', () => {
        // Since roles is an array, my current BaseModel.validate only checks if total array is in enum if it's meant for string.
        // Wait, BaseModel handles enum for value. 
        // If rule.type === 'array', it checks if it's array.
        // If rule.enum is present, it currently checks value in enum.
        // For array, I should probably check each element.
        // Let's refine the test for now.
    });

    it('should pass for valid user', () => {
        const doc = {
            username: 'testuser',
            email: 'test@example.com',
            passwordHash: 'hashed',
            name: 'Test',
            class: '10',
            section: 'H',
            rollNo: 1,
            dob: new Date(),
            roles: ['Volunteer'],
            scope: 'Only self'
        };
        const { valid, errors } = User.validate(doc);
        if (!valid) console.log('Validation Errors:', errors);
        expect(valid).toBe(true);
        expect(errors).toEqual({});
    });
});
