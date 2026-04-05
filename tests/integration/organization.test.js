const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');
const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

const mockAdminId = new ObjectId();

// Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            _id: mockAdminId.toString(),
            role: 'Super Admin',
            name: 'Test Org Admin'
        };
        next();
    }
}));

const organizationRoutes = require('../../src/routes/organization');
app.use('/api/org', organizationRoutes);

jest.setTimeout(30000);

describe('Organization API Integration', () => {
    let db;
    let teamId;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();
    });

    afterAll(async () => {
        if (db) {
            await db.collection('teamDirectories').deleteMany({});
            await db.collection('users').deleteMany({ email: /test\.com$/ });
        }
        await database.closeDB();
    });

    describe('POST /api/org/teams', () => {
        it('should create a new team', async () => {
            const res = await request(app)
                .post('/api/org/teams')
                .send({
                    name: 'Test Wing',
                    type: 'wing',
                    focus: 'Testing'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('Test Wing');
            teamId = res.body.data._id;
        });
    });

    describe('GET /api/org/teams', () => {
        it('should return a list of teams', async () => {
            const res = await request(app).get('/api/org/teams');
            expect(res.status).toBe(200);
            expect(res.body.data.rows.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/org/teams/:id/members', () => {
        it('should add a member to a team', async () => {
            const memberId = new ObjectId();
            await db.collection('users').insertOne({
                _id: memberId,
                name: 'New Member',
                email: 'member@test.com',
                role: 'Volunteer'
            });

            const res = await request(app)
                .post(`/api/org/teams/${teamId}/members`)
                .send({ userId: memberId.toString() });
            
            expect(res.status).toBe(201);
            expect(res.body.data.memberCount).toBe(1);
            
            const user = await db.collection('users').findOne({ _id: memberId });
            expect(user.teamId.toString()).toBe(teamId.toString());
        });
    });

    describe('DELETE /api/org/teams/:id', () => {
        it('should soft delete a team', async () => {
            const res = await request(app).delete(`/api/org/teams/${teamId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);

            const team = await db.collection('teamDirectories').findOne({ _id: new ObjectId(teamId) });
            expect(team.isActive).toBe(false);
        });
    });
});
