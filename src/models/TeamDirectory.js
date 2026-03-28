const BaseModel = require('./BaseModel');

class TeamDirectory extends BaseModel {}

TeamDirectory.collectionName = 'teamDirectories';
TeamDirectory.schema = {
    labelOneWingId: { type: 'objectId' },
    labelTwoCommitteeId: { type: 'objectId' },
    labelOneName: { type: 'string', required: true },
    labelTwoName: { type: 'string', required: true },
    leadUserId: { type: 'objectId' },
    focus: { type: 'string' },
    memberIds: { type: 'array' },
    memberCount: { type: 'number' },
    isActive: { type: 'boolean' },
};

module.exports = TeamDirectory;
