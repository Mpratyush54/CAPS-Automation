const { enrichEventsWithTeams, enrichEventWithTeams } = require('../../src/utils/event');
const database = require('../../src/config/database');
const { ObjectId } = require('mongodb');

jest.mock('../../src/config/database');

describe('Event Utils Unit Tests', () => {
    let mockDB;

    beforeEach(() => {
        mockDB = {
            collection: jest.fn().mockReturnThis(),
            find: jest.fn().mockReturnThis(),
            project: jest.fn().mockReturnThis(),
            toArray: jest.fn()
        };
        database.getDB.mockReturnValue(mockDB);
    });

    describe('enrichEventsWithTeams()', () => {
        it('should handle empty input', async () => {
            expect(await enrichEventsWithTeams([])).toEqual([]);
            expect(await enrichEventsWithTeams(null)).toEqual(null);
        });

        it('should handle events with no teamIds', async () => {
             const events = [{ title: 'E1' }, { title: 'E2', teamIds: [] }];
             const res = await enrichEventsWithTeams(events);
             expect(res[0].teams).toEqual([]);
             expect(res[1].teams).toEqual([]);
        });

        it('should enrich event with team names', async () => {
            const teamId = new ObjectId();
            const events = [{ title: 'E1', teamIds: [teamId] }];
            mockDB.toArray.mockResolvedValue([{ _id: teamId, name: 'Team A' }]);

            const res = await enrichEventsWithTeams(events);
            expect(res[0].teams[0].name).toBe('Team A');
            expect(res[0].teams[0].id).toEqual(teamId);
        });

        it('should handle missing team in DB', async () => {
            const teamId = new ObjectId();
            const events = [{ title: 'E1', teamIds: [teamId] }];
            mockDB.toArray.mockResolvedValue([]);

            const res = await enrichEventsWithTeams(events);
            expect(res[0].teams[0].name).toBe('Unknown Team');
        });
    });

    describe('enrichEventWithTeams()', () => {
        it('should enrich a single event', async () => {
             const teamId = new ObjectId();
             mockDB.toArray.mockResolvedValue([{ _id: teamId, name: 'Team A' }]);
             const res = await enrichEventWithTeams({ teamIds: [teamId] });
             expect(res.teams[0].name).toBe('Team A');
        });
    });
});
