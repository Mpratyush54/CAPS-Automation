import { describe, it, expect, beforeEach } from 'vitest';
import { useSidebarStore } from '../../../src/store/sidebar';

describe('Unit: Sidebar Store', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isOpen: false });
  });

  it('starts closed', () => {
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it('opens on open()', () => {
    useSidebarStore.getState().open();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it('closes on close()', () => {
    useSidebarStore.getState().open();
    useSidebarStore.getState().close();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it('toggles correctly', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(true);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });
});
