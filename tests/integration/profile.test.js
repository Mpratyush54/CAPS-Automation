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
            role: 'Volunteer',
            name: 'Test Profile User'
        };
        next();
    }
}));

const profileRoutes = require('../../src/routes/profile');
app.use('/api/profile', profileRoutes);

jest.setTimeout(30000);

describe('Profile API Integration', () => {
    let db;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();

        // Seed user
        await db.collection('users').insertOne({
            _id: mockUserId,
            name: 'Test Profile User',
            email: 'profile@test.com',
            role: 'Volunteer',
            isActive: true,
            profile: { bio: 'Old Bio', phone: '1234567890' }
        });

        // Seed some work logs for stats
        await db.collection('workLogs').insertOne({
            userId: mockUserId,
            durationMinutes: 120,
            title: 'Worked on profile tests',
            createdAt: new Date()
        });
    });

    afterAll(async () => {
        if (db) {
            await db.collection('users').deleteMany({});
            await db.collection('workLogs').deleteMany({});
        }
        await database.closeDB();
    });

    describe('GET /api/profile/me', () => {
        it('should return the current user profile and stats', async () => {
            const res = await request(app).get('/api/profile/me');
            
            expect(res.status).toBe(200);
            expect(res.body.data.user.name).toBe('Test Profile User');
            expect(res.body.data.summary.hours).toBe(2);
            expect(res.body.data.summary.logs).toBe(1);
        });
    });

    describe('PATCH /api/profile/me', () => {
        it('should update profile fields', async () => {
            const res = await request(app)
                .patch('/api/profile/me')
                .send({ bio: 'New Bio', name: 'Updated Name' });
            
            expect(res.status).toBe(200);
            expect(res.body.data.value.name).toBe('Updated Name');
            expect(res.body.data.value.profile.bio).toBe('New Bio');
        });
    });

    describe('POST /api/profile/me/avatar', () => {
        it('should update avatar URL', async () => {
            const res = await request(app)
                .post('/api/profile/me/avatar')
                .send({ avatarUrl: 'http://image.com/avatar.png' });
            
            expect(res.status).toBe(200);
            expect(res.body.data.avatarUrl).toBe('http://image.com/avatar.png');
        });
    });

    describe('DELETE /api/profile/me', () => {
        it('should soft delete user account', async () => {
            const res = await request(app)
                .delete('/api/profile/me')
                .send({ confirm: true });
            
            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);

            const user = await db.collection('users').findOne({ _id: mockUserId });
            expect(user.isActive).toBe(false);
        });

        it('should fail if confirm is not true', async () => {
            const res = await request(app).delete('/api/profile/me').send({ confirm: false });
            expect(res.status).toBe(400);
        });
    });
});
