import { create } from 'zustand';

/**
 * Sidebar open/close state — decoupled from AppLayout so any page
 * can open the sidebar without prop drilling.
 */
export const useSidebarStore = create((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
