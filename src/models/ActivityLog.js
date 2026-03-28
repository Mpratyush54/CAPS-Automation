const BaseModel = require('./BaseModel');

class ActivityLog extends BaseModel {}

ActivityLog.collectionName = 'activityLogs';
ActivityLog.schema = {
    userId: { type: 'objectId', required: true },
    action: { type: 'string', required: true },
    entityType: { type: 'string', enum: ['workLog', 'event', 'notification', 'user', 'report', 'mom'] },
    entityId: { type: 'objectId' },
    summary: { type: 'string', required: true },
    metadata: { type: 'object' },
};

module.exports = ActivityLog;
