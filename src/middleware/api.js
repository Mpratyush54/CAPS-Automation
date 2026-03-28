const { cacheGet } = require('../config/redis');
const { ok, fail } = require('../utils/api');

function asyncHandler(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return fail(res, 401, 'UNAUTHENTICATED', 'Authentication required.');
        }
        if (!roles.includes(req.user.role)) {
            return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions.');
        }
        next();
    };
}

function cacheResponse(keyBuilder, ttlSeconds = 300) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            if (!key) return next();
            const cached = await cacheGet(key);
            if (cached) {
                res.set('X-Cache', 'HIT');
                return ok(res, cached.data, cached.meta);
            }
            req.cacheKey = key;
            req.cacheTTL = ttlSeconds;
            next();
        } catch {
            next();
        }
    };
}

module.exports = {
    asyncHandler,
    requireRoles,
    cacheResponse,
};
