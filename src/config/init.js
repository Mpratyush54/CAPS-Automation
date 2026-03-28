const { getDB } = require('./database');

async function ensureCollection(db, name, indexes = []) {
    const existing = await db.listCollections({ name }).toArray();
    if (existing.length === 0) {
        await db.createCollection(name);
    }

    if (indexes.length > 0) {
        await db.collection(name).createIndexes(indexes);
    }
}

async function initCollections() {
    const db = getDB();

    await Promise.all([
        ensureCollection(db, 'users', [
            { key: { email: 1 }, name: 'users_email_unique', unique: true },
            { key: { role: 1, primaryWingId: 1 }, name: 'users_role_primaryWingId' },
            { key: { primaryCommitteeId: 1 }, name: 'users_primaryCommitteeId' },
        ]),
        ensureCollection(db, 'wings'),
        ensureCollection(db, 'committees'),
        ensureCollection(db, 'scopeMappings'),
        ensureCollection(db, 'teamDirectories'),
        ensureCollection(db, 'workLogs', [
            { key: { userId: 1, workDate: -1 }, name: 'workLogs_userId_workDate' },
            { key: { committeeId: 1, workDate: -1 }, name: 'workLogs_committeeId_workDate' },
            { key: { wingId: 1, workDate: -1 }, name: 'workLogs_wingId_workDate' },
            { key: { status: 1, submittedAt: -1 }, name: 'workLogs_status_submittedAt' },
        ]),
        ensureCollection(db, 'events'),
        ensureCollection(db, 'eventReports', [
            { key: { eventId: 1 }, name: 'eventReports_eventId_unique', unique: true },
        ]),
        ensureCollection(db, 'weeklyReports', [
            { key: { weekKey: 1, committeeId: 1, wingId: 1 }, name: 'weeklyReports_scope_unique', unique: true },
            { key: { status: 1, submittedAt: 1 }, name: 'weeklyReports_status_submittedAt' },
        ]),
        ensureCollection(db, 'periodReports'),
        ensureCollection(db, 'moms'),
        ensureCollection(db, 'notifications', [
            { key: { recipientUserId: 1, isRead: 1, createdAt: -1 }, name: 'notifications_recipient_read_createdAt' },
        ]),
        ensureCollection(db, 'driveFiles'),
        ensureCollection(db, 'contributionRollups'),
        ensureCollection(db, 'activityLogs', [
            { key: { userId: 1, createdAt: -1 }, name: 'activityLogs_userId_createdAt' },
        ]),
    ]);

    console.log('Collections initialized');
}

module.exports = { initCollections };
