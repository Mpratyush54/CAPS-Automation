const { asyncHandler, requireRoles, cacheResponse } = require('../../src/middleware/api');
const { cacheGet } = require('../../src/config/redis');
const { fail, ok } = require('../../src/utils/api');

jest.mock('../../src/config/redis', () => ({
    cacheGet: jest.fn()
}));

jest.mock('../../src/utils/api', () => ({
    fail: jest.fn(),
    ok: jest.fn()
}));

describe('API Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {};
        mockRes = {
            set: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('asyncHandler', () => {
        it('should call the handler and catch errors', async () => {
            const error = new Error('Async Error');
            const handler = async () => { throw error; };
            const wrapped = asyncHandler(handler);
            
            await wrapped(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('should call the handler successfully', async () => {
            const handler = jest.fn().mockResolvedValue('success');
            const wrapped = asyncHandler(handler);
            
            await wrapped(mockReq, mockRes, mockNext);
            expect(handler).toHaveBeenCalled();
        });
    });

    describe('requireRoles', () => {
        it('should fail if user is not authenticated', () => {
            const middleware = requireRoles('Admin');
            middleware(mockReq, mockRes, mockNext);
            expect(fail).toHaveBeenCalledWith(mockRes, 401, 'UNAUTHENTICATED', expect.any(String));
        });

        it('should fail if user role is not allowed', () => {
            mockReq.user = { role: 'Volunteer' };
            const middleware = requireRoles('Admin');
            middleware(mockReq, mockRes, mockNext);
            expect(fail).toHaveBeenCalledWith(mockRes, 403, 'FORBIDDEN', expect.any(String));
        });

        it('should call next if role matches', () => {
            mockReq.user = { role: 'Admin' };
            const middleware = requireRoles('Admin');
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('cacheResponse', () => {
        it('should return cached data if hit', async () => {
            const keyBuilder = () => 'test-key';
            const cachedData = { data: { foo: 'bar' }, meta: {} };
            cacheGet.mockResolvedValue(cachedData);
            
            const middleware = cacheResponse(keyBuilder);
            await middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'HIT');
            expect(ok).toHaveBeenCalledWith(mockRes, cachedData.data, cachedData.meta);
        });

        it('should proceed to next if cache miss', async () => {
            const keyBuilder = () => 'test-key';
            cacheGet.mockResolvedValue(null);
            
            const middleware = cacheResponse(keyBuilder);
            await middleware(mockReq, mockRes, mockNext);
            
            expect(mockReq.cacheKey).toBe('test-key');
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
