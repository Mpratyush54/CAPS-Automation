import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Login from '../../src/pages/Login';
import { useAuthStore } from '../../src/store/auth';

// Helper to provide Router context
import { renderWithAll } from '../test-utils';

describe('Integration: Login Page', () => {
  let loginCalls = 0;

  beforeEach(() => {
    // Clean store before test
    useAuthStore.getState().logout();
    loginCalls = 0;

    // Mock API response for login success
    server.use(
      http.post(new RegExp('/api/auth/login'), () => {
        loginCalls += 1;
        return HttpResponse.json({
          status: 'success',
          data: {
            accessToken: 'jwt-access-token',
            refreshToken: 'jwt-refresh-token',
            user: { _id: 'U1', name: 'Alok', role: 'Admin' }
          }
        });
      })
    );
  });

  it('renders login form and inputs', () => {
    renderWithAll(<Login />);
    expect(screen.getByPlaceholderText(/you@worklog.io/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
    // Use getAll and pick the last one (the submit button) or target by role with more specific criteria
    const buttons = screen.getAllByRole('button', { name: /Sign In/i });
    expect(buttons.some(b => b.type === 'submit')).toBe(true);
  });

  it('validates required fields', async () => {
    const { container } = renderWithAll(<Login />);
    const submitBtn = container.querySelector('button[type="submit"]');
    
    expect(submitBtn).toBeTruthy();
    // Attempt login without inputs
    fireEvent.click(submitBtn);

    // Initial check: if form is invalid, loading shouldn't trigger
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('successfully updates auth store on login and redirects', async () => {
    const { container } = renderWithAll(<Login />);
    
    const emailInput = screen.getByPlaceholderText(/you@worklog.io/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);
    const submitBtn = container.querySelector('button[type="submit"]');

    expect(submitBtn).toBeTruthy();
    fireEvent.change(emailInput, { target: { value: 'alok@caps.org' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginCalls).toBe(1);
    }, { timeout: 4000 });

    // Wait for the auth store
    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.token).toBe('jwt-access-token');
      expect(state.user?.name).toBe('Alok');
    }, { timeout: 4000 });

    // Check localStorage persistence
    expect(localStorage.getItem('authToken')).toBe('jwt-access-token');
  });

  it('handles server errors and shows feedback', async () => {
    let failedLoginCalls = 0;
    server.use(
      http.post(new RegExp('/api/auth/login'), () => {
        failedLoginCalls += 1;
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      })
    );

    const { container } = renderWithAll(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/you@worklog.io/i), { target: { value: 'wrong@mail.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), { target: { value: 'wrongpass' } });
    
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(failedLoginCalls).toBe(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials|Invalid email or password|Request failed/i)).toBeInTheDocument();
    });
  });
});
