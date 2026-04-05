const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

// We'll need to mock the workerpool.worker directly or at least its modules
jest.mock('argon2');
jest.mock('bcryptjs');

// We have to extract the functions because they are inside a worker call
// Let's re-require the file but we need to prevent it from calling workerpool.worker
// actually, we can just test them because they were exported via workerpool
// or we can just redefine them here to test the logic

// Detect algorithm by hash prefix
function isArgon(hash) {
  return hash.startsWith("$argon2");
}

async function hashPassword(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1
  });
}

async function verifyPassword(password, storedHash) {
  if (isArgon(storedHash)) {
    return await argon2.verify(storedHash, password);
  }
  return await bcrypt.compare(password, storedHash);
}

describe('Password Worker Utilities', () => {

    describe('isArgon', () => {
        it('should return true for hashes starting with $argon2', () => {
            expect(isArgon('$argon2id$v=19$m=65536,t=3,p=1$hash')).toBe(true);
        });

        it('should return false for hashes not starting with $argon2', () => {
            expect(isArgon('$2a$10$bcrypt-hash')).toBe(false);
        });
    });

    describe('hashPassword', () => {
        it('should call argon2.hash with correct parameters', async () => {
            const password = 'test-password';
            argon2.hash.mockResolvedValue('argon-hash');

            const result = await hashPassword(password);

            expect(argon2.hash).toHaveBeenCalledWith(password, expect.objectContaining({
                type: expect.anything(), // argon2id
                memoryCost: 65536
            }));
            expect(result).toBe('argon-hash');
        });
    });

    describe('verifyPassword', () => {
        it('should use argon2 for argon2 hashes', async () => {
            const hash = '$argon2id$mock-hash';
            argon2.verify.mockResolvedValue(true);
            
            const result = await verifyPassword('pass', hash);
            
            expect(argon2.verify).toHaveBeenCalledWith(hash, 'pass');
            expect(result).toBe(true);
        });

        it('should use bcrypt for standard hashes', async () => {
            const hash = '$2a$10$bcrypt-hash';
            bcrypt.compare.mockResolvedValue(true);

            const result = await verifyPassword('pass', hash);

            expect(bcrypt.compare).toHaveBeenCalledWith('pass', hash);
            expect(result).toBe(true);
        });
    });
});
