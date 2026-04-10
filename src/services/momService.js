import { api, unwrap } from '../lib/api';

export const momService = {
  getMoms: async () => {
    const response = await api.get('/api/moms');
    const data = unwrap(response);
    return Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
  },

  getCategories: async () => {
    const response = await api.get('/api/moms/categories');
    const data = unwrap(response);
    return Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
  },

  createMom: async (data) => {
    const response = await api.post('/api/moms', data);
    return unwrap(response);
  },

  updateMomStatus: async (id, status) => {
    const response = await api.patch(`/api/moms/${id}`, { status });
    return unwrap(response);
  },

  createCategory: async (name) => {
    const response = await api.post('/api/moms/categories', { name });
    return unwrap(response);
  },

  getUploadUrl: async (momId, files) => {
    const response = await api.post(`/api/moms/${momId}/photos/upload-url`, { files });
    return unwrap(response);
  }
};
