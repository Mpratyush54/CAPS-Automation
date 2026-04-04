const BaseModel = require('./BaseModel');

class GoogleToken extends BaseModel { }

GoogleToken.collectionName = 'google_tokens';

GoogleToken.schema = {
    userId: { type: 'string', required: true },
    access_token: { type: 'string' },
    refresh_token: { type: 'string' },
    scope: { type: 'string' },
    token_type: { type: 'string' },
    expiry_date: { type: 'number' },
};

module.exports = GoogleToken;