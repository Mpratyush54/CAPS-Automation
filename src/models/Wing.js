const BaseModel = require('./BaseModel');

class Wing extends BaseModel {}

Wing.collectionName = 'wings';
Wing.schema = {
    name: { type: 'string', required: true },
    description: { type: 'string' },
    leadUserId: { type: 'objectId' },
    isActive: { type: 'boolean' },
};

module.exports = Wing;
