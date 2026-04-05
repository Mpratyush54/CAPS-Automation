const database = require('../config/database');

/**
 * Enriches a list of event documents with team information.
 * @param {Array} events - The event documents to enrich.
 * @returns {Promise<Array>} - The enriched event documents.
 */
async function enrichEventsWithTeams(events) {
    if (!events || !Array.isArray(events) || events.length === 0) {
        return events;
    }

    const db = database.getDB();
    const allTeamIds = [...new Set(events.flatMap(e => e.teamIds || []))].filter(Boolean);
    
    if (allTeamIds.length === 0) {
        return events.map(e => ({ ...e, teams: [] }));
    }

    const teams = await db.collection('teamDirectories')
        .find({ _id: { $in: allTeamIds } })
        .project({ name: 1 })
        .toArray();
    
    const teamMap = teams.reduce((acc, t) => ({ ...acc, [String(t._id)]: t.name }), {});

    return events.map(e => ({
        ...e,
        teams: (e.teamIds || []).map(tid => ({
            id: tid,
            name: teamMap[String(tid)] || 'Unknown Team'
        }))
    }));
}

/**
 * Enriches a single event document with team information.
 * @param {Object} event - The event document to enrich.
 * @returns {Promise<Object>} - The enriched event document.
 */
async function enrichEventWithTeams(event) {
    const results = await enrichEventsWithTeams([event]);
    return results[0];
}

module.exports = {
    enrichEventsWithTeams,
    enrichEventWithTeams
};
