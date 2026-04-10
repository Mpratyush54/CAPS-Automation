import { api, unwrap } from '../lib/api';
import { normalizeUser } from '../lib/adapters';

const readAuthPayload = (payload) => {
  const data = payload?.data ? payload.data : payload;
  const user = normalizeUser(data?.user || payload?.user);
  return {
    token: data?.accessToken || data?.token || payload?.accessToken || payload?.token,
    refreshToken: data?.refreshToken || payload?.refreshToken || null,
    user,
    role: user?.role || data?.role || payload?.role || null,
  };
};

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const auth = readAuthPayload(unwrap(response));
    if (!auth.token || !auth.user || !auth.role) {
      throw new Error('Login response is missing auth data.');
    }
    return auth;
  },

  signup: async (signupData) => {
    const response = await api.post('/api/auth/signup', signupData);
    return unwrap(response);
  }
};
