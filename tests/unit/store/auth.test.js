import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../../src/store/auth';

describe('Unit: Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, refreshToken: null, user: null, role: null });
  });

  it('login action updates state and storage', () => {
    const mockUser = { id: '123', name: 'Alok' };
    const mockToken = 'jwt-token';
    const mockRole = 'Admin';
    
    useAuthStore.getState().login({ token: mockToken, user: mockUser, role: mockRole });
    
    const state = useAuthStore.getState();
    expect(state.token).toBe(mockToken);
    expect(state.user).toEqual(mockUser);
    expect(state.role).toBe(mockRole);
    
    expect(localStorage.getItem('authToken')).toBe(mockToken);
    expect(localStorage.getItem('authUser')).toContain('123');
    expect(localStorage.getItem('authRole')).toBe(mockRole);
  });

  it('logout cleans up state and storage', () => {
    useAuthStore.getState().login({ token: 't', user: {id:1}, role: 'r' });
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(localStorage.getItem('authRole')).toBeNull();
  });

  it('setRole and setRefreshToken update individual items', () => {
    useAuthStore.getState().setRole('Volunteer');
    expect(useAuthStore.getState().role).toBe('Volunteer');
    expect(localStorage.getItem('authRole')).toBe('Volunteer');

    useAuthStore.getState().setRefreshToken('refresh-token');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });
});
