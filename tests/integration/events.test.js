const request = require('supertest');
const { ObjectId } = require('mongodb');
const express = require('express');

// We'll need a mock app to test the routes in isolation
const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');

// Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            _id: '69d28d09856a81e00b2a0f29', // Fixed string ID
            role: 'Super Admin',
            name: 'Test Admin'
        };
        next();
    }
}));

const eventRoutes = require('../../src/routes/events');

// Inject mock auth and routes
app.use('/api/events', eventRoutes);

jest.setTimeout(30000); // 30 seconds for long DB connections

describe('Events API Integration', () => {
    let db;
    let eventId;
    let teamId;

    beforeAll(async () => {
        // Load secrets from Infisical if available
        await loadSecrets();
        
        // Connect to a real or local test database
        await database.connectDB();
        db = database.getDB();
        
        // Setup test data
        teamId = new ObjectId();
        await db.collection('teamDirectories').insertOne({
            _id: teamId,
            name: 'Delta Force',
            type: 'wing'
        });
    });

    afterAll(async () => {
        // Cleanup test data
        if (db) {
            await db.collection('events').deleteMany({});
            await db.collection('teamDirectories').deleteMany({ name: 'Delta Force' });
        }
        await database.closeDB();
    });

    describe('POST /api/events', () => {
        it('should create an event and return enriched team names', async () => {
            const res = await request(app)
                .post('/api/events')
                .send({
                    title: 'New Integration Test Event',
                    eventDate: new Date(),
                    teamIds: [teamId.toString()]
                });

            expect(res.status).toBe(201);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.teams[0].name).toBe('Delta Force');
            eventId = res.body.data._id;
        });
    });

    describe('GET /api/events', () => {
        it('should return a list of enriched events', async () => {
            const res = await request(app).get('/api/events');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.rows)).toBe(true);
            const event = res.body.data.rows.find(e => e._id === eventId);
            expect(event.teams[0].name).toBe('Delta Force');
        });
    });

    describe('PATCH /api/events/:id', () => {
        it('should update event and return enriched teams', async () => {
            const res = await request(app)
                .patch(`/api/events/${eventId}`)
                .send({
                    title: 'Updated Test Event Title'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe('Updated Test Event Title');
            expect(res.body.data.teams[0].name).toBe('Delta Force');
        });
    });
});
