const BaseModel = require('./BaseModel');

class EventReport extends BaseModel {}

EventReport.collectionName = 'eventReports';
EventReport.schema = {
    eventId: { type: 'objectId', required: true },
    templateId: { type: 'objectId' },
    status: { type: 'string', enum: ['Not Started', 'Draft', 'Ready', 'Published', 'draft', 'ready', 'published'] },
    summary: { type: 'string' },
    formData: { type: 'object' }, 
    content: { type: 'string' },  
    blocks: { type: 'array' },    // Modular blocks for Tables, Images, Text
    lastUpdatedAt: { type: 'date' },
    publishedAt: { type: 'date' },
    publishedBy: { type: 'objectId' },
};

module.exports = EventReport;
