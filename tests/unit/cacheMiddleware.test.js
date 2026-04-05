const cacheMiddleware = require('../../src/utils/cache');
const { getRedis } = require('../../src/config/redis');

jest.mock('../../src/config/redis', () => ({
    getRedis: jest.fn()
}));

jest.mock('../../src/utils/timer', () => {
    return jest.fn().mockReturnValue(() => {});
});

describe('Cache Middleware Utility', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockRedisClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient = {
            get: jest.fn(),
            setex: jest.fn()
        };
        getRedis.mockReturnValue(mockRedisClient);
        mockReq = {
            method: 'GET',
            url: '/test'
        };
        mockRes = {
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    it('should skip caching for non-GET methods', async () => {
        mockReq.method = 'POST';
        const middleware = cacheMiddleware(() => 'key');
        
        await middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return cached data if hit', async () => {
        const data = { foo: 'bar' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(data));
        const middleware = cacheMiddleware(() => 'test-key');

        await middleware(mockReq, mockRes, mockNext);

        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
        expect(mockRes.json).toHaveBeenCalledWith(data);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next and capture response for cache miss', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        const middleware = cacheMiddleware(() => 'miss-key');

        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        
        // Simulate response.json call
        const responseBody = { result: 'fresh' };
        await mockRes.json(responseBody);
        
        expect(mockRedisClient.setex).toHaveBeenCalledWith('miss-key', 60, JSON.stringify(responseBody));
    });
});
