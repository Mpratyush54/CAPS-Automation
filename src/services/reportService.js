import { api, unwrap } from '../lib/api';

export const reportService = {
  getSummary: async () => {
    const response = await api.get('/api/stats/overview');
    return unwrap(response);
  },

  getReports: async (params) => {
    const response = await api.get('/api/reports', { params });
    return unwrap(response).rows || [];
  },

  getWorkLogs: async (params) => {
    const response = await api.get('/api/reports/worklogs', { params });
    return unwrap(response).rows || [];
  },

  getAnalytics: async (scope = 'global', teamId) => {
    const params = {};
    if (scope === 'team' && teamId) params.labelTwoId = teamId;
    if (scope === 'global') params.period = 'all';

    const [overviewRes, breakdownRes, contributionsRes] = await Promise.all([
      api.get('/api/stats/overview', { params }),
      api.get('/api/stats/breakdown', { params }),
      api.get('/api/stats/contributions', { params }),
    ]);

    return {
      overview: unwrap(overviewRes)?.data || unwrap(overviewRes),
      breakdown: unwrap(breakdownRes)?.data || unwrap(breakdownRes),
      contributions: unwrap(contributionsRes)?.data || unwrap(contributionsRes),
    };
  },

  exportReport: async (type, params) => {
    const response = await api.get(`/api/reports/export/${type}`, { params, responseType: 'blob' });
    return response.data;
  },

  submitWeeklyReport: async (data) => {
    const response = await api.post('/api/reports/weekly', data);
    return unwrap(response);
  }
};
