let google = null;
try {
    const g = require('googleapis');
    google = g.google;
} catch (e) {
    console.warn('⚠️ googleapis is NOT installed. Google Drive features will be inactive.');
}

/**
 * GOOGLE DRIVE CONFIGURATION GUIDE
 * -------------------------------
 * To enable photo synchronization, you need to provide a Google Service Account key.
 * 
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Enable "Google Drive API"
 * 3. Create a "Service Account" and download the JSON key.
 * 4. Add the JSON content to your environment/Infisical as 'GOOGLE_SERVICE_ACCOUNT_KEY'.
 * 5. Share your target Drive folder with the service account email.
 */

function getDriveClient() {
    if (!google) {
        console.warn('⚠️ googleapis missing. Skipping client initialization.');
        return null;
    }

    const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
        console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_KEY is missing. Drive sync will be skipped.');
        return null;
    }

    try {
        const credentials = JSON.parse(keyString);
        
        const auth = google.auth.fromJSON(credentials);
        auth.scopes = [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file'
        ];

        return google.drive({ version: 'v3', auth });
    } catch (err) {
        console.error('❌ Failed to initialize Google Drive client:', err.message);
        return null;
    }
}

module.exports = { getDriveClient };
