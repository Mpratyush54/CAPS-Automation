function ok(res, data, meta) {
    const payload = { data };
    if (meta) {
        payload.meta = meta;
    }
    return res.json(payload);
}

function created(res, data, meta) {
    const payload = { data };
    if (meta) {
        payload.meta = meta;
    }
    return res.status(201).json(payload);
}

function fail(res, status, code, message, fields) {
    return res.status(status).json({
        error: {
            code,
            message,
            ...(fields ? { fields } : {}),
        },
    });
}

function parsePagination(query, defaults = {}) {
    const page = Math.max(Number(query.page || defaults.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || defaults.pageSize || 20), 1), 100);
    const skip = (page - 1) * pageSize;
    return { page, pageSize, skip };
}

module.exports = {
    ok,
    created,
    fail,
    parsePagination,
};
