const { authenticate, authorize, verifyToken } = require('../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const { getDB } = require('../../src/config/database');
const { cacheGet, cacheSet } = require('../../src/config/redis');
const { ObjectId } = require('mongodb');

jest.mock('jsonwebtoken');
jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');

describe('Auth Middleware Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test';
    });

    describe('authenticate()', () => {
        it('should return 401 if no auth header', async () => {
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/No token/) }));
        });

        it('should return 401 if invalid token format', async () => {
            req.headers.authorization = 'Wrong format';
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 if token is expired', async () => {
            req.headers.authorization = 'Bearer token';
            jwt.verify.mockImplementation(() => {
                const err = new Error('Expired');
                err.name = 'TokenExpiredError';
                throw err;
            });
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/expired/) }));
        });

        it('should attach user to req and call next on success', async () => {
            req.headers.authorization = 'Bearer token';
            const decoded = { id: new ObjectId().toHexString() };
            const user = { _id: decoded.id, name: 'Test' };
            jwt.verify.mockReturnValue(decoded);
            cacheGet.mockResolvedValue(user);

            await authenticate(req, res, next);
            expect(req.user).toEqual(user);
            expect(next).toHaveBeenCalled();
        });

        it('should return 403 if user is banned', async () => {
            req.headers.authorization = 'Bearer token';
            const decoded = { id: new ObjectId().toHexString() };
            const user = { _id: decoded.id, banned: true };
            jwt.verify.mockReturnValue(decoded);
            cacheGet.mockResolvedValue(user);

            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/suspended/) }));
        });
    });

    describe('authorize()', () => {
        it('should return 401 if req.user is missing', () => {
            const middleware = authorize('Admin');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 if user role is not allowed', () => {
            req.user = { role: 'Volunteer' };
            const middleware = authorize('Admin');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should call next if role is allowed', () => {
            req.user = { role: 'Admin' };
            const middleware = authorize('Admin', 'Super Admin');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
