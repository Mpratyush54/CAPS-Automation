const BaseModel = require('./BaseModel');

class EventReportTemplate extends BaseModel {}

EventReportTemplate.collectionName = 'eventReportTemplates';
EventReportTemplate.schema = {
    name: { type: 'string', required: true },
    description: { type: 'string' },
    isActive: { type: 'boolean', default: true },
    version: { type: 'number', default: 1 },
    docxFileId: { type: 'string' }, // The original DOCX from Drive/Storage
    fields: { 
        type: 'array', 
        // placeholders which need manual input
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                tag: { type: 'string' }, // e.g. {{budget_amount}}
                label: { type: 'string' },
                type: { type: 'string' },
                source: { type: 'string', enum: ['manual', 'event_data', 'calculated'] }
            }
        }
    },
    placeholderMap: { type: 'object' }, // e.g. { "title": "event.title" }
    defaultContent: { type: 'string' },
    createdBy: { type: 'objectId' },
    createdAt: { type: 'date' }
};

module.exports = EventReportTemplate;
