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
            name: 'Test Report Admin'
        };
        next();
    }
}));

const reportRoutes = require('../../src/routes/reports');
app.use('/api/reports', reportRoutes);

jest.setTimeout(30000);

describe('Reports API Integration', () => {
    let db;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();

        // Seed some data for reports
        await db.collection('weeklyReports').insertOne({
            weekKey: '2023-W01',
            title: 'Test Weekly',
            status: 'submitted',
            metrics: { volunteerHours: 40 }
        });
    });

    afterAll(async () => {
        if (db) {
            await db.collection('weeklyReports').deleteMany({});
            await db.collection('periodReports').deleteMany({});
            await db.collection('workLogs').deleteMany({});
        }
        await database.closeDB();
    });

    describe('GET /api/reports', () => {
        it('should return combined list of reports', async () => {
            const res = await request(app).get('/api/reports');
            expect(res.status).toBe(200);
            expect(res.body.data.rows.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/reports/contributions', () => {
        it('should return contribution summary', async () => {
            const res = await request(app).get('/api/reports/contributions?period=monthly');
            expect(res.status).toBe(200);
            expect(res.body.data.totals).toBeDefined();
        });
    });

    describe('POST /api/reports/weekly', () => {
        it('should create a weekly report', async () => {
            const res = await request(app)
                .post('/api/reports/weekly')
                .send({
                    weekKey: '2023-W02',
                    title: 'New Week Report',
                    status: 'draft',
                    metrics: { attendancePct: 90 },
                    wingId: new ObjectId()
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.value.weekKey).toBe('2023-W02');
        });
    });
});
