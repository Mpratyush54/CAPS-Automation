const BaseModel = require('./BaseModel');

class DriveFile extends BaseModel {}

DriveFile.collectionName = 'driveFiles';
DriveFile.schema = {
    eventId: { type: 'objectId', required: true },
    uploadedBy: { type: 'objectId', required: true },
    fileName: { type: 'string', required: true },
    mimeType: { type: 'string', required: true },
    sizeBytes: { type: 'number', required: true },
    storageProvider: { type: 'string' },
    googleFileId: { type: 'string' },
    folderId: { type: 'string' },
    folderUrl: { type: 'string' },
    status: { type: 'string', enum: ['Pending Sync', 'Syncing', 'Synced', 'Failed', 'uploaded', 'failed'] },
    retryCount: { type: 'number' },
    uploadedAt: { type: 'date' },
};

module.exports = DriveFile;
