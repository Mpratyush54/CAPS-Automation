let google = null;
try {
    const g = require('googleapis');
    google = g.google;
} catch (e) {
    console.warn('⚠️ googleapis is NOT installed. Google Drive features will be inactive.');
}

const GoogleToken = require("../models/GoogleToken");

async function getDriveClient() {
    if (!google) return null;

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        console.warn('⚠️ OAuth env missing.');
        return null;
    }

    try {
        const tokenData = await GoogleToken.findOne({ userId: "admin" });

        if (!tokenData || !tokenData.refresh_token) {
            console.warn('⚠️ No refresh token found.');
            return null;
        }

        const oauth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URI
        );

        oauth2Client.setCredentials({
            refresh_token: tokenData.refresh_token,
        });

        return google.drive({ version: 'v3', auth: oauth2Client });

    } catch (err) {
        console.error('❌ Drive init failed:', err.message);
        return null;
    }
}
module.exports = { getDriveClient };