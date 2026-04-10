import { api, unwrap, formatDateTime } from '../lib/api';
import { normalizeEvent } from '../lib/adapters';

export const eventService = {
  getEvents: async () => {
    const response = await api.get('/api/events');
    const data = unwrap(response);
    const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
    return rows.map(normalizeEvent);
  },

  getTeams: async () => {
    const res = await api.get('/api/organization/teams');
    const data = unwrap(res);
    return Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
  },

  saveEvent: async (next) => {
    const isEdit = !!next.id;
    const endpoint = isEdit ? `/api/events/${next.id}` : '/api/events';
    const method = isEdit ? 'patch' : 'post';

    const payload = {
      ...next,
      eventDate: formatDateTime(next.date, next.time),
    };

    const response = await api[method](endpoint, payload);
    return normalizeEvent(unwrap(response));
  },

  deleteEvent: async (id) => {
    await api.delete(`/api/events/${id}`);
  }
};
