import { api, unwrap } from '../lib/api';

export const dashboardService = {
  getDashboardData: async (role) => {
    const roleView = role === 'Team Lead' ? 'team-lead' : role === 'Super Admin' ? 'super-admin' : role?.toLowerCase() || 'auto';
    const response = await api.get('/api/dashboard', { params: { roleView } });
    return unwrap(response);
  }
};
