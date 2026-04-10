import { api, unwrap } from '../lib/api';
import { normalizeUser } from '../lib/adapters';

export const profileService = {
  getProfile: async () => {
    const response = await api.get('/api/profile/me');
    const payload = unwrap(response);
    return {
      ...payload,
      user: normalizeUser(payload.user)
    };
  },

  updateProfile: async (data) => {
    const response = await api.patch('/api/profile/me', data);
    return normalizeUser(unwrap(response));
  }
};
