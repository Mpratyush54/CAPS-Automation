const { ObjectId } = require('mongodb');
const { 
    parseObjectId, 
    parseDate, 
    getWeekKey 
} = require('../../src/utils/worklog');

describe('Worklog Utility', () => {
    describe('parseObjectId', () => {
        it('should return null for null/undefined/empty input', () => {
            expect(parseObjectId(null)).toBeNull();
            expect(parseObjectId(undefined)).toBeNull();
            expect(parseObjectId('')).toBeNull();
        });

        it('should return existing ObjectId directly', () => {
            const id = new ObjectId();
            expect(parseObjectId(id)).toBe(id);
        });

        it('should convert valid hex string to ObjectId', () => {
            const hex = '660f7e84f5d5b74a34b9d8a1';
            const result = parseObjectId(hex);
            expect(result).toBeInstanceOf(ObjectId);
            expect(result.toString()).toBe(hex);
        });

        it('should throw error for invalid hex string', () => {
            expect(() => parseObjectId('invalid', 'testField')).toThrow(/testField must be a valid ObjectId/);
        });
    });

    describe('parseDate', () => {
        it('should convert valid date string to Date object', () => {
            const dateStr = '2024-04-05';
            const result = parseDate(dateStr);
            expect(result).toBeInstanceOf(Date);
            expect(isNaN(result.getTime())).toBe(false);
        });

        it('should throw error for invalid date input', () => {
            expect(() => parseDate('not-a-date', 'testDate')).toThrow(/testDate must be a valid date/);
        });
    });

    describe('getWeekKey', () => {
        it('should return correct ISO week key for a given date', () => {
            const date = new Date(Date.UTC(2024, 0, 1)); // 2024-01-01 is a Monday
            const result = getWeekKey(date);
            expect(result).toBe('2024-W01');
        });

        it('should handle last week of year correctly', () => {
            const date = new Date(Date.UTC(2023, 11, 31)); // 2023-12-31 is Sunday, week 52
            const result = getWeekKey(date);
            expect(result).toBe('2023-W52');
        });
    });
});
