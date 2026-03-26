import { create } from 'zustand';

const saved = localStorage.getItem('theme') || 'light';
if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

export const useThemeStore = create((set) => ({
  theme: saved,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
}));
