const { analyzeContent, SEVERITY, moderateContent } = require('../../src/middleware/moderation');
const { getDB } = require('../../src/config/database');
const { cacheGet, cacheSet } = require('../../src/config/redis');

jest.mock('../../src/config/database', () => ({
    getDB: jest.fn()
}));
jest.mock('../../src/config/redis', () => ({
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    cacheDel: jest.fn()
}));

describe('Moderation Middleware Unit Tests', () => {
    let mockDB;

    beforeEach(() => {
        mockDB = {
            collection: jest.fn().mockReturnThis(),
            insertOne: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue([]),
            updateOne: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue({})
        };
        getDB.mockReturnValue(mockDB);
        cacheGet.mockResolvedValue([]);
        jest.clearAllMocks();
    });

    describe('analyzeContent()', () => {
        it('should return CLEAN for normal text', () => {
            const res = analyzeContent('This is a normal message');
            expect(res.severity).toBe(SEVERITY.CLEAN);
        });

        it('should return BLOCKED for spam phrases', () => {
            const res = analyzeContent('click here to buy cheap stuff');
            expect(res.severity).toBe(SEVERITY.BLOCKED);
            expect(res.reasons).toContain('Contains spam-like content');
        });

        it('should return BLOCKED for repeated characters', () => {
            const res = analyzeContent('aaaaaaaaaaaaaaaaaaaaa');
            expect(res.severity).toBe(SEVERITY.BLOCKED);
        });

        it('should return WARNING for excessive caps', () => {
            const res = analyzeContent('NOTICE ME RIGHT NOW I AM SHOUTING AT YOU');
            expect(res.severity).toBe(SEVERITY.WARNING);
            expect(res.reasons).toContain('Excessive use of capital letters');
        });
    });

    describe('moderateContent() middleware', () => {
        let req, res, next;

        beforeEach(() => {
            req = { body: {}, user: { _id: '507f1f77bcf86cd799439011' }, ip: '127.0.0.1' };
            res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            next = jest.fn();
        });

        it('should allow clean content', async () => {
            req.body.title = 'Hello World';
            const middleware = moderateContent(['title']);
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should block bad content and return 400', async () => {
            req.body.title = 'click here to buy cheap stuff';
            const middleware = moderateContent(['title']);
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/material/) }));
        });
    });
});
