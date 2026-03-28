import { create } from 'zustand';

const storedToken = localStorage.getItem('authToken');
const storedRefreshToken = localStorage.getItem('refreshToken');
const storedUser  = (() => { try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; } })();
const storedRole  = localStorage.getItem('authRole');

export const useAuthStore = create((set) => ({
  token: storedToken || null,
  refreshToken: storedRefreshToken || null,
  user:  storedUser  || null,
  role:  storedRole  || null,
  setToken: (token) => set({ token }),
  setRefreshToken: (refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken);
    set({ refreshToken });
  },
  setUser:  (user)  => {
    localStorage.setItem('authUser', JSON.stringify(user));
    set({ user });
  },
  setRole:  (role)  => {
    localStorage.setItem('authRole', role);
    set({ role });
  },
  login: ({ token, refreshToken, user, role }) => {
    localStorage.setItem('authToken', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('authUser',  JSON.stringify(user));
    localStorage.setItem('authRole',  role);
    set({ token, refreshToken: refreshToken || null, user, role });
  },
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authRole');
    set({ token: null, refreshToken: null, user: null, role: null });
  },
}));
