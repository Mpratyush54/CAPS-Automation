const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');
const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

let mockUser = {
    _id: new ObjectId().toString(),
    role: 'Volunteer',
    name: 'Vol User',
    teamId: new ObjectId().toString()
};

// Dynamic Auth Mock
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = mockUser;
        next();
    }
}));

const dashboardRoutes = require('../../src/routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

jest.setTimeout(30000);

describe('Dashboard API Integration', () => {
    let db;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();
    });

    afterAll(async () => {
        await database.closeDB();
    });

    describe('Volunteer Dashboard', () => {
        beforeEach(() => {
            mockUser.role = 'Volunteer';
        });

        it('should return volunteer-specific kpis and charts', async () => {
            const res = await request(app).get('/api/dashboard');
            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe('Volunteer');
            expect(res.body.data.kpis).toContainEqual(expect.objectContaining({ key: 'myTaskCount' }));
        });
    });

    describe('Team Lead Dashboard', () => {
        beforeEach(() => {
            mockUser.role = 'Team Lead';
        });

        it('should return team-lead-specific kpis', async () => {
            const res = await request(app).get('/api/dashboard');
            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe('Team Lead');
            expect(res.body.data.kpis).toContainEqual(expect.objectContaining({ key: 'teamMembersCount' }));
        });
    });

    describe('Admin Dashboard', () => {
        beforeEach(() => {
            mockUser.role = 'Admin';
        });

        it('should return admin-specific organizational kpis', async () => {
            const res = await request(app).get('/api/dashboard');
            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe('Admin');
            expect(res.body.data.kpis).toContainEqual(expect.objectContaining({ key: 'wingMembers' }));
        });
    });

    describe('Super Admin Dashboard', () => {
        beforeEach(() => {
            mockUser.role = 'Super Admin';
        });

        it('should return global organizational kpis', async () => {
            const res = await request(app).get('/api/dashboard');
            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe('Super Admin');
            expect(res.body.data.kpis).toContainEqual(expect.objectContaining({ key: 'totalMembers' }));
        });
    });
});
