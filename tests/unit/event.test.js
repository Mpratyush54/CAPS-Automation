const { ObjectId } = require('mongodb');
const database = require('../../src/config/database');
const { enrichEventsWithTeams, enrichEventWithTeams } = require('../../src/utils/event');

// Mock the database module
jest.mock('../../src/config/database');

describe('Event Utility - Enrichment', () => {
    let mockCollection;
    let mockDb;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockCollection = {
            find: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            toArray: jest.fn()
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection)
        };

        database.getDB.mockReturnValue(mockDb);
    });

    describe('enrichEventsWithTeams', () => {
        it('should return empty array if input is empty', async () => {
            const result = await enrichEventsWithTeams([]);
            expect(result).toEqual([]);
        });

        it('should enrich event with team names', async () => {
            const teamId1 = new ObjectId();
            const events = [
                { title: 'Event 1', teamIds: [teamId1] }
            ];

            mockCollection.toArray.mockResolvedValue([
                { _id: teamId1, name: 'Team Alpha' }
            ]);

            const result = await enrichEventsWithTeams(events);

            expect(result[0].teams).toHaveLength(1);
            expect(result[0].teams[0].name).toBe('Team Alpha');
            expect(String(result[0].teams[0].id)).toBe(String(teamId1));
        });

        it('should handle missing team names gracefully', async () => {
            const teamId1 = new ObjectId();
            const events = [
                { title: 'Event 1', teamIds: [teamId1] }
            ];

            mockCollection.toArray.mockResolvedValue([]); // No teams found

            const result = await enrichEventsWithTeams(events);

            expect(result[0].teams[0].name).toBe('Unknown Team');
        });

        it('should handle events without teamIds', async () => {
            const events = [{ title: 'Event 1' }];
            const result = await enrichEventsWithTeams(events);
            expect(result[0].teams).toEqual([]);
        });
    });

    describe('enrichEventWithTeams', () => {
        it('should enrich a single event', async () => {
            const teamId1 = new ObjectId();
            const event = { title: 'Single Event', teamIds: [teamId1] };

            mockCollection.toArray.mockResolvedValue([{ _id: teamId1, name: 'Team Bravo' }]);

            const result = await enrichEventWithTeams(event);
            expect(result.teams[0].name).toBe('Team Bravo');
        });
    });
});
