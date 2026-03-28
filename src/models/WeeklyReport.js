const BaseModel = require('./BaseModel');

class WeeklyReport extends BaseModel {}

WeeklyReport.collectionName = 'weeklyReports';
WeeklyReport.schema = {
    weekKey: { type: 'string', required: true },
    teamDirectoryId: { type: 'objectId' },
    wingId: { type: 'objectId' },
    committeeId: { type: 'objectId' },
    title: { type: 'string', required: true },
    submittedBy: { type: 'objectId', required: true },
    status: { type: 'string', enum: ['Draft', 'Submitted', 'Approved', 'Missing', 'draft', 'submitted', 'approved', 'missing'] },
    source: { type: 'string' },
    hours: { type: 'number' },
    highlights: { type: 'string' },
    generatedFrom: { type: 'string' },
    submittedAt: { type: 'date' },
};

module.exports = WeeklyReport;
