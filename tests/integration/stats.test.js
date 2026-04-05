const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');
const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

const testUserId = new ObjectId();
const testTeamId = new ObjectId();

// Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            _id: '69c7e1234567890abcdef123', // Hardcoded mock ID
            role: 'Admin',
            name: 'Test Stat User'
        };
        next();
    }
}));

const statsRoutes = require('../../src/routes/stats');
app.use('/api/stats', statsRoutes);

jest.setTimeout(30000);

describe('Stats API Integration', () => {
    let db;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();

        // Seed data for stats
        await db.collection('teamDirectories').insertOne({
            _id: testTeamId,
            name: 'Test Team',
            isActive: true
        });

        await db.collection('workLogs').insertMany([
            {
                userId: testUserId,
                teamId: testTeamId,
                durationMinutes: 120,
                workDate: new Date(),
                status: 'approved'
            },
            {
                userId: testUserId,
                teamId: testTeamId,
                durationMinutes: 60,
                workDate: new Date(),
                status: 'approved'
            }
        ]);
    });

    afterAll(async () => {
        if (db) {
            await db.collection('workLogs').deleteMany({});
            await db.collection('teamDirectories').deleteMany({});
        }
        await database.closeDB();
    });

    describe('GET /api/stats/overview', () => {
        it('should return overview statistics', async () => {
            const res = await request(app).get('/api/stats/overview');
            expect(res.status).toBe(200);
            expect(res.body.data.kpi.hours).toBe(3); // (120+60)/60
            expect(res.body.data.kpi.logs).toBe(2);
        });
    });

    describe('GET /api/stats/breakdown', () => {
        it('should return team breakdown', async () => {
            const res = await request(app).get('/api/stats/breakdown');
            expect(res.status).toBe(200);
            expect(res.body.data.rows[0].name).toBe('Test Team');
        });
    });

    describe('GET /api/stats/contributions', () => {
        it('should return user contributions', async () => {
            const res = await request(app).get('/api/stats/contributions');
            expect(res.status).toBe(200);
            expect(res.body.data.rows[0].volunteer).toBeDefined();
        });
    });

    describe('GET /api/stats/export', () => {
        it('should return export status', async () => {
            const res = await request(app).get('/api/stats/export?format=csv');
            expect(res.status).toBe(200);
            expect(res.body.data.format).toBe('csv');
        });
    });
});
