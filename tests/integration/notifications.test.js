const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');
const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

const mockUserId = new ObjectId();

// Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            _id: mockUserId.toString(),
            role: 'Super Admin',
            name: 'Test Notif Admin'
        };
        next();
    }
}));


const notificationRoutes = require('../../src/routes/notifications');
app.use('/api/notifications', notificationRoutes);

jest.setTimeout(30000);

describe('Notifications API Integration', () => {
    let db;
    let notifId;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();

        // Seed notification
        const res = await db.collection('notifications').insertOne({
            recipientUserId: mockUserId,
            title: 'Test Notif',
            body: 'Hello',
            isRead: false,
            createdAt: new Date()
        });
        notifId = res.insertedId;
    });

    afterAll(async () => {
        if (db) {
            await db.collection('notifications').deleteMany({});
            await db.collection('pushSubscriptions').deleteMany({});
        }
        await database.closeDB();
    });

    describe('GET /api/notifications', () => {
        it('should return paginated notifications', async () => {
            const res = await request(app).get('/api/notifications');
            
            expect(res.status).toBe(200);
            expect(res.body.data.rows).toHaveLength(1);
            expect(res.body.data.unreadCount).toBe(1);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            const res = await request(app)
                .patch(`/api/notifications/${notifId}/read`)
                .send({ read: true });
            
            expect(res.status).toBe(200);
            expect(res.body.data.value.isRead).toBe(true);
        });
    });

    describe('POST /api/notifications', () => {
        it('should create manual notifications for audience', async () => {
            const res = await request(app)
                .post('/api/notifications')
                .send({
                    type: 'system',
                    title: 'System Alert',
                    body: 'Test broadcast',
                    audienceType: 'all'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.count).toBeDefined();
        });
    });

    describe('POST /api/notifications/devices', () => {
        it('should register a push subscription', async () => {
            const res = await request(app)
                .post('/api/notifications/devices')
                .send({
                    token: 'test-token',
                    platform: 'web',
                    deviceName: 'Test Chrome'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.value.token).toBe('test-token');
        });
    });

    describe('GET /api/notifications/public-key', () => {
        it('should return VAPID public key', async () => {
            const res = await request(app).get('/api/notifications/public-key');
            expect(res.status).toBe(200);
            expect(res.body.data.publicKey).toBeDefined();
        });
    });
});
