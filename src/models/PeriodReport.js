const BaseModel = require('./BaseModel');

class PeriodReport extends BaseModel {}

PeriodReport.collectionName = 'periodReports';
PeriodReport.schema = {
    periodType: { type: 'string', required: true, enum: ['Monthly', '3 Months', '6 Months', 'Yearly', 'monthly', 'quarterly_3', 'half_yearly_6', 'yearly'] },
    periodKey: { type: 'string' },
    teamDirectoryId: { type: 'objectId' },
    wingId: { type: 'objectId' },
    committeeId: { type: 'objectId' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['Generated', 'Published', 'generated', 'published'] },
    source: { type: 'string' },
    generatedFrom: { type: 'string' },
    hours: { type: 'number' },
    sourceWeeklyReportIds: { type: 'array' },
    generatedAt: { type: 'date' },
};

module.exports = PeriodReport;
