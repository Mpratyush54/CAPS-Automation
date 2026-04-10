import { api, unwrap } from '../lib/api';
import { normalizeLog } from '../lib/adapters';

export const logService = {
  getLogs: async (filter, userId) => {
    const params = {};
    if (filter !== 'all') params.status = filter;
    const response = await api.get('/api/logs', { params });
    const rows = unwrap(response).rows || [];
    return rows.map(row => normalizeLog(row, userId));
  },

  saveLog: async (data, userId) => {
    const isEdit = !!data.id;
    const endpoint = isEdit ? `/api/logs/${data.id}` : '/api/logs';
    const method = isEdit ? 'patch' : 'post';

    const workDate = new Date(data.date || data.workDate);
    const payload = {
      title: data.title,
      description: data.description || data.notes,
      workDate: !Number.isNaN(workDate.getTime()) ? workDate.toISOString() : new Date().toISOString(),
      durationMinutes: Number(data.hours || 0) * 60 + Number(data.minutes || 0),
      teamId: data.teamId || undefined,
      status: data.status,
    };

    const response = await api[method](endpoint, payload);
    return normalizeLog(unwrap(response), userId);
  },

  deleteLog: async (id) => {
    await api.delete(`/api/logs/${id}`);
  },

  reviewLog: async ({ id, action, comment = '' }, userId) => {
    const response = await api.post(`/api/logs/${id}/${action}`, { comment });
    return normalizeLog(unwrap(response), userId);
  }
};
