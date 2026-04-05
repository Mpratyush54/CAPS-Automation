const BaseModel = require('./BaseModel');

class User extends BaseModel {}

User.collectionName = 'users';
User.schema = {
    username: { type: 'string', required: true },
    email: { type: 'string', required: true }, // Simple validation for now, BaseModel doesn't support regex currently
    passwordHash: { type: 'string', required: true },
    name: { type: 'string', required: true },
    class: { type: 'string', required: true },
    section: { type: 'string', required: true },
    rollNo: { type: 'number', required: true },
    failedLoginAttempts: { type: 'number' },
    lockUntil: { type: 'date' },
    roles: { 
        type: 'array', 
        required: true, 
        enum: ['Super Admin', 'Admin', 'Team Lead', 'Volunteer', 'student'] 
    },
    teamId: { type: 'objectId' },
    scope: { 
        type: 'string', 
        required: true, 
        enum: ['Entire CAPS', 'Their wing', 'Their committee', 'Only self'] 
    },
    dob: { type: 'date', required: true },
    resetOtp: { type: 'string' },
    resetOtpExpiresAt: { type: 'date' },
};

module.exports = User;
