import { create } from 'zustand';

const storedToken = localStorage.getItem('authToken');
const storedUser  = (() => { try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; } })();
const storedRole  = localStorage.getItem('authRole');

export const useAuthStore = create((set) => ({
  token: storedToken || null,
  user:  storedUser  || null,
  role:  storedRole  || null,
  setToken: (token) => set({ token }),
  setUser:  (user)  => {
    localStorage.setItem('authUser', JSON.stringify(user));
    set({ user });
  },
  setRole:  (role)  => set({ role }),
  login: ({ token, user, role }) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser',  JSON.stringify(user));
    localStorage.setItem('authRole',  role);
    set({ token, user, role });
  },
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authRole');
    set({ token: null, user: null, role: null });
  },
}));
