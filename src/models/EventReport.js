const BaseModel = require('./BaseModel');

class EventReport extends BaseModel {}

EventReport.collectionName = 'eventReports';
EventReport.schema = {
    eventId: { type: 'objectId', required: true },
    status: { type: 'string', enum: ['Not Started', 'Draft', 'Ready', 'Published', 'draft', 'ready', 'published'] },
    ownerUserId: { type: 'objectId' },
    summary: { type: 'string' },
    lastUpdatedAt: { type: 'date' },
    publishedAt: { type: 'date' },
    publishedBy: { type: 'objectId' },
};

module.exports = EventReport;
