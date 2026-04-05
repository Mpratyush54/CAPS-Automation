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
            name: 'Test MOM Admin'
        };
        next();
    }
}));

const momRoutes = require('../../src/routes/moms');
app.use('/api/moms', momRoutes);

jest.setTimeout(30000);

describe('MOMs API Integration', () => {
    let db;
    let momId;

    beforeAll(async () => {
        await loadSecrets();
        await database.connectDB();
        db = database.getDB();
    });

    afterAll(async () => {
        if (db) {
            await db.collection('moms').deleteMany({});
        }
        await database.closeDB();
    });

    describe('POST /api/moms', () => {
        it('should create a new MOM draft', async () => {
            const res = await request(app)
                .post('/api/moms')
                .send({
                    title: 'Strategic Sync',
                    meetingDate: new Date().toISOString(),
                    status: 'draft',
                    notes: ['Agenda item 1'],
                    agenda: ['Note 1']
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.title).toBe('Strategic Sync');
            momId = res.body.data._id;
        });

        it('should fail if required fields are missing', async () => {
            const res = await request(app).post('/api/moms').send({ title: 'Only title' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/moms', () => {
        it('should list MOMs', async () => {
            const res = await request(app).get('/api/moms');
            expect(res.status).toBe(200);
            expect(res.body.data.items.length).toBeGreaterThan(0);
        });
    });

    describe('PATCH /api/moms/:id', () => {
        it('should update MOM content', async () => {
            const res = await request(app)
                .patch(`/api/moms/${momId}`)
                .send({ title: 'Updated Strategic Sync' });
            
            expect(res.status).toBe(200);
            expect(res.body.data.value.title).toBe('Updated Strategic Sync');
        });
    });

    describe('POST /api/moms/:id/publish', () => {
        it('should publish a MOM', async () => {
            const res = await request(app).post(`/api/moms/${momId}/publish`);
            expect(res.status).toBe(200);
            expect(res.body.data.value.status).toBe('published');
        });
    });
});
