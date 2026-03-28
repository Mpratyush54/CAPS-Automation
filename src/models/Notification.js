const BaseModel = require('./BaseModel');

class Notification extends BaseModel {}

Notification.collectionName = 'notifications';
Notification.schema = {
    type: { type: 'string', required: true, enum: ['info', 'warning', 'success', 'event', 'compliance'] },
    title: { type: 'string', required: true },
    body: { type: 'string', required: true },
    recipientUserId: { type: 'objectId' },
    isRead: { type: 'boolean' },
    read: { type: 'boolean' },
    fromUserId: { type: 'objectId' },
    fromLabel: { type: 'string' },
    fromRoleLabel: { type: 'string' },
    audienceLabel: { type: 'string' },
    sourceType: { type: 'string', enum: ['manual', 'system', 'report_job', 'media_sync', 'log_review', 'user'] },
};

module.exports = Notification;
