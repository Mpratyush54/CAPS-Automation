const readCache = require('../../src/utils/readCache');
const writeCache = require('../../src/utils/writeCache');
const { getRedis } = require('../../src/config/redis');
const zlib = require('zlib');
const { promisify } = require('util');

jest.mock('../../src/config/redis', () => ({
    getRedis: jest.fn()
}));

jest.mock('../../src/utils/timer', () => {
    return jest.fn().mockReturnValue(() => {});
});

describe('Cache Read/Write Utilities', () => {
    let mockRedis;
    const testKey = 'test-key';
    const testData = { hello: 'world' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis = {
            getBuffer: jest.fn(),
            setex: jest.fn(),
            set: jest.fn()
        };
        getRedis.mockReturnValue(mockRedis);
    });

    describe('readCache', () => {
        it('should return null if cache miss', async () => {
            mockRedis.getBuffer.mockResolvedValue(null);
            const result = await readCache(testKey);
            expect(result).toBeNull();
        });

        it('should decompress and parse data on cache hit', async () => {
            const compressed = zlib.gzipSync(JSON.stringify(testData));
            mockRedis.getBuffer.mockResolvedValue(compressed);

            const result = await readCache(testKey);
            expect(result).toEqual(testData);
        });
    });

    describe('writeCache', () => {
        it('should compress and store data with TTL', async () => {
            await writeCache(testKey, 60, testData);
            
            expect(mockRedis.setex).toHaveBeenCalledWith(testKey, 60, expect.any(Buffer));
            const compressed = mockRedis.setex.mock.calls[0][2];
            const decompressed = zlib.gunzipSync(compressed);
            expect(JSON.parse(decompressed.toString())).toEqual(testData);
        });

        it('should use set if TTL is 0', async () => {
            await writeCache(testKey, 0, testData);
            expect(mockRedis.set).toHaveBeenCalled();
        });
    });
});
