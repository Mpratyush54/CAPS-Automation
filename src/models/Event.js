const BaseModel = require('./BaseModel');

class Event extends BaseModel {}

Event.collectionName = 'events';
Event.schema = {
    title: { type: 'string', required: true },
    description: { type: 'string' },
    eventDate: { type: 'date', required: true },
    startTime: { type: 'string' },
    location: { type: 'string' },
    wingId: { type: 'objectId' },
    committeeId: { type: 'objectId' },
    scope: { type: 'string', enum: ['committee', 'wing', 'mixed', 'global'] },
    status: { type: 'string', enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'upcoming', 'ongoing', 'completed', 'cancelled'] },
    createdBy: { type: 'objectId', required: true },
    attendeeCount: { type: 'number' },
    assignedRoleVisibility: { type: 'array' },
    teamIds: { type: 'array' },
};

module.exports = Event;
