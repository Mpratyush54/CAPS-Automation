const { sendSystemNotification, notifyAdmins } = require('../../src/utils/notifications');
const database = require('../../src/config/database');
const redis = require('../../src/config/redis');
const socketBridge = require('../../src/lib/socketBridge');
const { ObjectId } = require('mongodb');

jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');
jest.mock('../../src/lib/socketBridge');

describe('Notifications Utility', () => {
    let mockCollection;
    let mockDb;
    let mockRedis;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockCollection = {
            insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
            find: jest.fn().mockReturnThis(),
            toArray: jest.fn()
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection)
        };

        database.getDB.mockReturnValue(mockDb);

        mockRedis = {
            del: jest.fn(),
            lpush: jest.fn()
        };
        redis.getRedis.mockReturnValue(mockRedis);
    });

    describe('sendSystemNotification', () => {
        it('should create a notification in DB and emit via socket', async () => {
            const userId = new ObjectId();
            const notificationTitle = 'Test Notif';
            const notificationBody = 'Test Body';

            const result = await sendSystemNotification(userId, { 
                title: notificationTitle, 
                body: notificationBody 
            });

            expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
                recipientUserId: userId,
                title: notificationTitle,
                body: notificationBody,
                status: 'unread'
            }));

            expect(socketBridge.emitToUser).toHaveBeenCalledWith(userId, 'notification:new', expect.anything());
            expect(result).toBeDefined();
        });

        it('should handle redis failures gracefully', async () => {
            redis.getRedis.mockReturnValue(null);
            const userId = new ObjectId();
            
            const result = await sendSystemNotification(userId, { title: 'T', body: 'B' });
            
            expect(mockCollection.insertOne).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('notifyAdmins', () => {
        it('should fetch all admins and send them notifications', async () => {
            const admin1 = { _id: new ObjectId(), role: 'Admin' };
            const admin2 = { _id: new ObjectId(), role: 'Super Admin' };
            
            mockCollection.toArray.mockResolvedValue([admin1, admin2]);

            await notifyAdmins({ title: 'System Alert', body: 'Error 500' });

            expect(mockCollection.find).toHaveBeenCalledWith({
                role: { $in: ['Admin', 'Super Admin'] }
            });
            
            // Should be called twice (once for each admin)
            expect(mockCollection.insertOne).toHaveBeenCalledTimes(2);
        });
    });
});
