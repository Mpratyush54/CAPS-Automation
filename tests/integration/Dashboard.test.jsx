import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Dashboard from '../../src/pages/Dashboard';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';

import { renderWithAll } from '../test-utils';

const installHandlers = () => {
  server.use(
    http.get(/\/api\/dashboard/, () =>
      HttpResponse.json({ status: 'success', data: null })
    ),
  );
};

describe('Integration: Dashboard Page', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'U1', name: 'Alok' },
      token: 'valid-token',
      role: ROLES.VOLUNTEER,
    });
  });

  it('renders the page title "Dashboard"', () => {
    installHandlers();
    renderWithAll(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows skeleton loaders during initial load', () => {
    installHandlers();
    const { container } = renderWithAll(<Dashboard />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays the user name in the hero banner', () => {
    installHandlers();
    renderWithAll(<Dashboard />);
    // HeroBanner renders user.name immediately (no async)
    expect(screen.getByText('Alok')).toBeInTheDocument();
  });

  it('renders the role badge in the hero banner', () => {
    installHandlers();
    renderWithAll(<Dashboard />);
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
  });

  it('renders KPI cards with fallback data after loading finishes', async () => {
    installHandlers();
    const { container } = renderWithAll(<Dashboard />);

    await waitFor(() => {
      const cards = container.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThan(0);
    }, { timeout: 4000 });
  });

  it('renders a greeting based on time of day', () => {
    installHandlers();
    renderWithAll(<Dashboard />);
    // HeroBanner greeting: "Good morning", "Good afternoon", or "Good evening"
    expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
  });
});
