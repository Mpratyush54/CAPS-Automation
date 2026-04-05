const { enqueue, QUEUES } = require('../../src/utils/queue');
const redis = require('../../src/config/redis');

jest.mock('../../src/config/redis');

describe('Queue Utility', () => {
    let mockRedis;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis = {
            rpush: jest.fn().mockResolvedValue(1),
            publish: jest.fn().mockResolvedValue(1)
        };
        redis.getRedis.mockReturnValue(mockRedis);
    });

    describe('enqueue', () => {
        it('should push a job to redis and publish an event', async () => {
            const queueName = QUEUES.NOTIFICATION_SEND;
            const payload = { test: 'true' };

            const result = await enqueue(queueName, payload);

            expect(result.queued).toBe(true);
            expect(mockRedis.rpush).toHaveBeenCalledWith(`queue:${queueName}`, expect.stringContaining(queueName));
            expect(mockRedis.publish).toHaveBeenCalledWith(`queue:${queueName}:events`, expect.stringContaining('queued'));
        });

        it('should handle missing redis gracefully', async () => {
            redis.getRedis.mockReturnValue(null);
            
            const result = await enqueue('test-queue', { some: 'payload' });
            
            expect(result.queued).toBe(false);
            expect(result.fallback).toBe(true);
            expect(result.job).toBeDefined();
        });
    });
});
