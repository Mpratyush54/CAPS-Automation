const BaseModel = require('./BaseModel');

class WorkLog extends BaseModel {}

WorkLog.collectionName = 'workLogs';
WorkLog.schema = {
    userId: { type: 'objectId', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string' },
    workDate: { type: 'date', required: true },
    durationMinutes: { type: 'number', required: true },
    tag: { type: 'string' },
    status: { type: 'string', required: true, enum: ['Draft', 'In Progress', 'Pending Review', 'Needs Revision', 'Completed', 'draft', 'in_progress', 'pending_review', 'needs_revision', 'approved'] },
    wingId: { type: 'objectId' },
    committeeId: { type: 'objectId' },
    scopeSource: { type: 'string', enum: ['inherited_user_scope', 'manually_selected_scope'] },
    submittedAt: { type: 'date' },
    approvedAt: { type: 'date' },
    approvedBy: { type: 'objectId' },
    revisionComment: { type: 'string' },
};

module.exports = WorkLog;
