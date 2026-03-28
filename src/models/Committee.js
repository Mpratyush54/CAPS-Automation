const BaseModel = require('./BaseModel');

class Committee extends BaseModel {}

Committee.collectionName = 'committees';
Committee.schema = {
    name: { type: 'string', required: true },
    description: { type: 'string' },
    leadUserId: { type: 'objectId' },
    isActive: { type: 'boolean' },
};

module.exports = Committee;
