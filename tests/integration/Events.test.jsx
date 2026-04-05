import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Events from '../../src/pages/Events';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';

const renderWithRouter = (ui) => render(ui, { wrapper: BrowserRouter });

const MOCK_EVENTS = [
  { _id: 'E1', title: 'Annual Launch', eventDate: '2026-05-10T10:00:00Z', status: 'upcoming', location: 'Hall A', teams: [{ _id: 'T1', name: 'DSC' }] },
  { _id: 'E2', title: 'Tech Meetup', eventDate: '2026-04-15T15:00:00Z', status: 'completed', location: 'Lab 1', teams: [] },
];

const installHandlers = (rows = MOCK_EVENTS) => {
  server.use(
    http.get(/\/api\/events/, () =>
      HttpResponse.json({ status: 'success', data: { rows } })
    ),
    http.get(/\/api\/organization\/teams/, () =>
      HttpResponse.json({ status: 'success', data: { rows: [{ _id: 'T1', name: 'DSC' }] } })
    ),
  );
};

describe('Integration: Events Page', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: ROLES.ADMIN, token: 'mock-token', user: { id: 'U1', name: 'Alok' } });
  });

  /* ─── Core rendering ─── */

  it('renders the page title "Event Board" for Admin', () => {
    installHandlers();
    renderWithRouter(<Events />);
    // Events.jsx line 753: role !== VOLUNTEER → title = 'Event Board'
    expect(screen.getByText('Event Board')).toBeInTheDocument();
  });

  it('renders the page title "My Events" for Volunteer', () => {
    useAuthStore.setState({ role: ROLES.VOLUNTEER });
    installHandlers();
    renderWithRouter(<Events />);
    expect(screen.getByText('My Events')).toBeInTheDocument();
  });

  it('displays events loaded from the API with team names', async () => {
    installHandlers();
    renderWithRouter(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Annual Launch')).toBeInTheDocument();
      expect(screen.getByText('Tech Meetup')).toBeInTheDocument();
      expect(screen.getByText(/DSC/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  /* ─── Empty state ─── */

  it('shows empty message when no events are returned', async () => {
    server.resetHandlers();
    installHandlers([]);

    renderWithRouter(<Events />);

    await waitFor(() => {
      expect(screen.getByText(/No events found/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  /* ─── Filter chips ─── */

  it('renders status filter chips', () => {
    installHandlers();
    renderWithRouter(<Events />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  /* ─── RBAC: "Create" button visibility ─── */

  it('shows "Create" button for Admin role (manageCommitteeEvents)', () => {
    installHandlers();
    renderWithRouter(<Events />);
    // Events.jsx line 773: can(role, 'manageCommitteeEvents') → button text "Create"
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('hides "Create" button for Volunteer role', () => {
    useAuthStore.setState({ role: ROLES.VOLUNTEER });
    installHandlers();
    renderWithRouter(<Events />);
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });

  /* ─── Location display ─── */

  it('shows location data next to event titles', async () => {
    installHandlers();
    renderWithRouter(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Lab 1')).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
