import { create } from 'zustand';

const saved = localStorage.getItem('theme') || 'light';
if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-mode', saved);

export const useThemeStore = create((set) => ({
  theme: saved,
  mode: saved,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.setAttribute('data-mode', next);
      return { theme: next, mode: next };
    }),
  setMode: (nextMode) => set(() => {
    const next = nextMode === 'dark' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.setAttribute('data-mode', next);
    return { theme: next, mode: next };
  }),
}));
