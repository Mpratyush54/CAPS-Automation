const passwordUtils = require('../../src/utils/password');
const workerpool = require('workerpool');

// Mock workerpool
jest.mock('workerpool', () => ({
    pool: jest.fn().mockReturnValue({
        exec: jest.fn()
    })
}));

describe('Password Utility', () => {
    let mockPool;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPool = workerpool.pool();
    });

    describe('hashPassword', () => {
        it('should call pool.exec with hashPassword and the provided password', async () => {
            const password = 'test-password';
            const expectedHash = 'hashed-password';
            mockPool.exec.mockResolvedValue(expectedHash);

            const result = await passwordUtils.hashPassword(password);

            expect(mockPool.exec).toHaveBeenCalledWith('hashPassword', [password]);
            expect(result).toBe(expectedHash);
        });
    });

    describe('verifyPassword', () => {
        const username = 'testuser';
        const password = 'test-password';
        const storedHash = 'stored-hash';

        it('should return true when the pool verification succeeds', async () => {
            mockPool.exec.mockResolvedValue(true);

            const result = await passwordUtils.verifyPassword(username, password, storedHash);

            expect(mockPool.exec).toHaveBeenCalledWith('verifyPassword', [password, storedHash]);
            expect(result).toBe(true);
        });

        it('should return false and cache failure on incorrect password', async () => {
            mockPool.exec.mockResolvedValue(false);

            const result = await passwordUtils.verifyPassword(username, password, storedHash);

            expect(mockPool.exec).toHaveBeenCalledTimes(1);
            expect(result).toBe(false);

            // Second attempt for same user/pass should be cached (skip exec)
            const result2 = await passwordUtils.verifyPassword(username, password, storedHash);
            expect(mockPool.exec).toHaveBeenCalledTimes(1); // Still 1
            expect(result2).toBe(false);
        });

        it('should not skip verification for different credentials', async () => {
            mockPool.exec.mockResolvedValue(false);
            await passwordUtils.verifyPassword('user1', 'pass1', 'hash1');
            
            mockPool.exec.mockResolvedValue(true);
            const result = await passwordUtils.verifyPassword('user2', 'pass1', 'hash1');
            
            expect(mockPool.exec).toHaveBeenCalledTimes(2);
            expect(result).toBe(true);
        });
    });
});
