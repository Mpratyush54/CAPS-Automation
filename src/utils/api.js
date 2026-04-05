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

function parsePagination(query = {}, defaults = {}) {
    let page = Number(query.page) || Number(defaults.page) || 1;
    let pageSize = Number(query.pageSize) || Number(defaults.pageSize) || 20;

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    const skip = (page - 1) * pageSize;
    return { page, pageSize, skip };
}

module.exports = {
    ok,
    created,
    fail,
    parsePagination,
};
