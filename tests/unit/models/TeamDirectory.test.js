const TeamDirectory = require('../../../src/models/TeamDirectory');
const { ObjectId } = require('mongodb');

describe('TeamDirectory Model Unit Tests', () => {
    const validTeam = {
        labelOneName: 'Wing A',
        labelTwoName: 'Committee B',
        leadUserId: new ObjectId(),
        isActive: true,
        memberIds: [],
        memberCount: 0
    };

    describe('Schema Validation', () => {
        it('should pass for valid team', () => {
            expect(TeamDirectory.validate(validTeam).valid).toBe(true);
        });

        it('should fail if labelOneName is missing', () => {
             const res = TeamDirectory.validate({ ...validTeam, labelOneName: null });
             expect(res.valid).toBe(false);
        });

        it('should fail if labelTwoName is missing', () => {
             const res = TeamDirectory.validate({ ...validTeam, labelTwoName: '' });
             expect(res.valid).toBe(false);
        });

        it('should validate memberCount as number', () => {
            const res = TeamDirectory.validate({ ...validTeam, memberCount: 'zero' });
            expect(res.valid).toBe(false);
            expect(res.errors.memberCount).toContain('must be a number');
        });

        it('should validate isActive as boolean', () => {
            const res = TeamDirectory.validate({ ...validTeam, isActive: 1 });
            expect(res.valid).toBe(false);
        });

        it('should validate ObjectIds for wing and committee', () => {
            const res = TeamDirectory.validate({ ...validTeam, labelOneWingId: 'abc', labelTwoCommitteeId: 'def' });
            expect(res.valid).toBe(false);
            expect(res.errors.labelOneWingId).toBeDefined();
            expect(res.errors.labelTwoCommitteeId).toBeDefined();
        });

        it('should validate memberIds as array', () => {
            const res = TeamDirectory.validate({ ...validTeam, memberIds: 'none' });
            expect(res.valid).toBe(false);
        });
    });
});
