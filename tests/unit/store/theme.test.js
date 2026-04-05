import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../../../src/store/theme';

describe('Unit: Theme Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ theme: 'light' });
  });

  it('initialises with light theme', () => {
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('toggles from light to dark', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles back from dark to light', () => {
    useThemeStore.getState().toggleTheme(); // light → dark
    useThemeStore.getState().toggleTheme(); // dark → light
    expect(useThemeStore.getState().theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('sets the data-theme attribute on the document', () => {
    useThemeStore.getState().toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
