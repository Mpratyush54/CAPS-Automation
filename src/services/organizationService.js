import { api, unwrap } from '../lib/api';
import { normalizeTeam, normalizeUser } from '../lib/adapters';

export const organizationService = {
  getTeams: async (search) => {
    const params = search ? { search } : {};
    const response = await api.get('/api/organization/teams', { params });
    const data = unwrap(response);
    const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
    return rows.map(normalizeTeam);
  },

  getAllUsers: async (teamId) => {
    const params = teamId ? { teamId } : {};
    const response = await api.get('/api/organization/users/all', { params });
    const data = unwrap(response);
    const users = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
    return users.map(normalizeUser);
  },

  createTeam: async (data) => {
    const response = await api.post('/api/organization/teams', data);
    return normalizeTeam(unwrap(response));
  },

  updateTeam: async (id, data) => {
    const response = await api.patch(`/api/organization/teams/${id}`, data);
    return normalizeTeam(unwrap(response));
  },

  deleteTeam: async (id) => {
    await api.delete(`/api/organization/teams/${id}`);
  },

  addMember: async (teamId, memberData) => {
    const response = await api.post(`/api/organization/teams/${teamId}/members`, memberData);
    return unwrap(response);
  },

  removeMember: async (teamId, userId) => {
    await api.delete(`/api/organization/teams/${teamId}/members/${userId}`);
  }
};
