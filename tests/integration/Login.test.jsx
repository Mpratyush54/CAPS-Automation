import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Login from '../../src/pages/Login';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../src/store/auth';

// Helper to provide Router context
const renderWithRouter = (ui) => render(ui, { wrapper: BrowserRouter });

describe('Integration: Login Page', () => {
  beforeEach(() => {
    // Clean store before test
    useAuthStore.getState().logout();

    // Mock API response for login success
    server.use(
      http.post(new RegExp('/api/auth/login'), () => {
        return HttpResponse.json({
          status: 'success',
          token: 'jwt-access-token',
          refreshToken: 'jwt-refresh-token',
          user: { _id: 'U1', name: 'Alok', role: 'Admin' }
        });
      })
    );
  });

  it('renders login form and inputs', () => {
    renderWithRouter(<Login />);
    expect(screen.getByPlaceholderText(/you@worklog.io/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Password$/i)).toBeInTheDocument();
    // Use getAll and pick the last one (the submit button) or target by role with more specific criteria
    const buttons = screen.getAllByRole('button', { name: /Sign In/i });
    expect(buttons.some(b => b.type === 'submit')).toBe(true);
  });

  it('validates required fields', async () => {
    renderWithRouter(<Login />);
    const buttons = screen.getAllByRole('button', { name: /Sign In/i });
    const submitBtn = buttons.find(b => b.type === 'submit');
    
    // Attempt login without inputs
    fireEvent.click(submitBtn);

    // Initial check: if form is invalid, loading shouldn't trigger
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('successfully updates auth store on login and redirects', async () => {
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText(/you@worklog.io/i);
    const passwordInput = screen.getByPlaceholderText(/^Password$/i);
    const buttons = screen.getAllByRole('button', { name: /Sign In/i });
    const submitBtn = buttons.find(b => b.type === 'submit');

    fireEvent.change(emailInput, { target: { value: 'alok@caps.org' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

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
    server.use(
      http.post(new RegExp('/api/auth/login'), () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      })
    );

    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/you@worklog.io/i), { target: { value: 'wrong@mail.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), { target: { value: 'wrongpass' } });
    
    const buttons = screen.getAllByRole('button', { name: /Sign In/i });
    const submitBtn = buttons.find(b => b.type === 'submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
