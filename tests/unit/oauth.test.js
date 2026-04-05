const request = require('supertest');
const express = require('express');
const { google } = require('googleapis');
const GoogleToken = require('../../src/models/GoogleToken');

// Mock Google API
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                generateAuthUrl: jest.fn().mockReturnValue('https://google.com/auth'),
                getToken: jest.fn().mockResolvedValue({
                    tokens: { access_token: 'at', refresh_token: 'rt', scope: 's', token_type: 'Bearer', expiry_date: 123 }
                })
            }))
        }
    }
}));

// Mock GoogleToken model
jest.mock('../../src/models/GoogleToken', () => ({
    findOne: jest.fn(),
    updateOne: jest.fn(),
    insertOne: jest.fn()
}));

const app = express();
const oauthRoutes = require('../../src/utils/oauth');
app.use('/oauth', oauthRoutes);

describe('OAuth Utility Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /oauth/google', () => {
        it('should redirect to Google Auth URL', async () => {
            const res = await request(app).get('/oauth/google');
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('https://google.com/auth');
        });
    });

    describe('GET /oauth/google/callback', () => {
        it('should exchange code for tokens and save to DB', async () => {
            GoogleToken.findOne.mockResolvedValue(null); // New token
            
            const res = await request(app).get('/oauth/google/callback?code=test-code');
            
            expect(res.status).toBe(200);
            expect(res.text).toContain('OAuth success');
            expect(GoogleToken.insertOne).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'admin',
                access_token: 'at'
            }));
        });

        it('should update existing token if it already exists', async () => {
            GoogleToken.findOne.mockResolvedValue({ userId: 'admin', refresh_token: 'old-rt' });
            
            const res = await request(app).get('/oauth/google/callback?code=test-code');
            
            expect(res.status).toBe(200);
            expect(GoogleToken.updateOne).toHaveBeenCalledWith(
                { userId: 'admin' },
                expect.objectContaining({ $set: expect.anything() })
            );
        });
    });
});
