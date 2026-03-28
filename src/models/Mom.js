const BaseModel = require('./BaseModel');

class Mom extends BaseModel {}

Mom.collectionName = 'moms';
Mom.schema = {
    title: { type: 'string', required: true },
    meetingDate: { type: 'date', required: true },
    teamDirectoryId: { type: 'objectId' },
    wingId: { type: 'objectId' },
    committeeId: { type: 'objectId' },
    preparedBy: { type: 'objectId', required: true },
    status: { type: 'string', enum: ['Draft', 'Under Review', 'Published', 'draft', 'under_review', 'published'] },
    attendees: { type: 'array' },
    agenda: { type: 'array' },
    notes: { type: 'array' },
    actionItems: { type: 'array' },
};

module.exports = Mom;
