const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const database = require('../../src/config/database');
const { loadSecrets } = require('../../src/config/infisical');
const redis = require('../../src/config/redis');
const authRoutes = require('../../src/routes/auth');

app.use('/api/auth', authRoutes);

jest.setTimeout(30000);

describe('Auth API Integration', () => {
    let db;
    const testUser = {
        name: 'Test Integration User',
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'Volunteer'
    };

    beforeAll(async () => {
        await loadSecrets();
        process.env.JWT_SECRET = 'test-secret';
        await database.connectDB();
        db = database.getDB();
    });

    afterAll(async () => {
        if (db) {
            await db.collection('users').deleteMany({ email: testUser.email.toLowerCase() });
        }
        await database.closeDB();
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe(testUser.email.toLowerCase());
            expect(res.body.token).toBeDefined();
        });

        it('should fail if email is already registered', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('Email already registered');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrong-password'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid email or password');
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should refresh token using refresh token', async () => {
            // First login to get a refresh token
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            
            const refreshToken = loginRes.body.refreshToken;

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
    });
});
