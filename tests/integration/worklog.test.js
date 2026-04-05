const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');

const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

// Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            _id: '69d28d09856a81e00b2a0f29', // Fixed string ID for stability in tests
            role: 'Volunteer',
            name: 'Test Volunteer',
            teamId: '69d28d09856a81e00b2a0f30'
        };
        next();
    }
}));

const worklogRoutes = require('../../src/routes/worklog');

app.use('/api', worklogRoutes);

jest.setTimeout(30000);

describe('Worklog API Integration', () => {
    let db;
    let logId;
    let testTeamId;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();
        testTeamId = new ObjectId();
        await db.collection('teamDirectories').insertOne({
            _id: testTeamId,
            name: 'Test Wing',
            type: 'wing',
            isActive: true
        });
    });

    afterAll(async () => {
        if (db) {
            await db.collection('workLogs').deleteMany({});
            await db.collection('teamDirectories').deleteMany({ _id: testTeamId });
        }
        await database.closeDB();
    });

    describe('POST /api/logs', () => {
        it('should create a work log', async () => {
            const res = await request(app)
                .post('/api/logs')
                .send({
                    title: 'Testing Integration',
                    workDate: new Date(),
                    durationMinutes: 120,
                    status: 'draft',
                    tag: 'Development'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.title).toBe('Testing Integration');
            logId = res.body.data._id;
        });

        it('should fail if title is missing', async () => {
            const res = await request(app)
                .post('/api/logs')
                .send({
                    workDate: new Date(),
                    durationMinutes: 120
                });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/logs', () => {
        it('should return paginated logs', async () => {
            const res = await request(app).get('/api/logs');

            expect(res.status).toBe(200);
            expect(res.body.data.rows).toBeDefined();
            expect(Array.isArray(res.body.data.rows)).toBe(true);
        });
    });

    describe('PATCH /api/logs/:id', () => {
        it('should update the log title', async () => {
            const res = await request(app)
                .patch(`/api/logs/${logId}`)
                .send({ title: 'Updated Integration Title' });

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe('Updated Integration Title');
        });
    });

    describe('DELETE /api/logs/:id', () => {
        it('should delete a draft log', async () => {
            const res = await request(app).delete(`/api/logs/${logId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });
    });
});
