const GoogleToken = require('../../../src/models/GoogleToken');

describe('GoogleToken Model Unit Tests', () => {
    describe('Schema Validation', () => {
        it('should pass for valid token', () => {
             const doc = {
                 userId: 'user123',
                 access_token: 'abc',
                 expiry_date: Date.now()
             };
             expect(GoogleToken.validate(doc).valid).toBe(true);
        });

        it('should fail if userId is missing', () => {
             expect(GoogleToken.validate({ access_token: 'abc' }).valid).toBe(false);
        });

        it('should validate expiry_date as number', () => {
             const res = GoogleToken.validate({ userId: 'u1', expiry_date: 'date' });
             expect(res.valid).toBe(false);
             expect(res.errors.expiry_date).toContain('must be a number');
        });

        it('should allow extra fields', () => {
             expect(GoogleToken.validate({ userId: 'u1', id_token: 'xyz' }).valid).toBe(true);
        });
    });
});
