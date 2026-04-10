import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Events from '../../src/pages/Events';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';
import { renderWithAll } from '../test-utils';

const MOCK_EVENTS = [
  { _id: 'E1', title: 'Annual Launch', eventDate: '2026-05-10T10:00:00Z', status: 'upcoming', location: 'Hall A', teams: [{ _id: 'T1', name: 'DSC' }] },
  { _id: 'E2', title: 'Tech Meetup', eventDate: '2026-04-15T15:00:00Z', status: 'completed', location: 'Lab 1', teams: [] },
];

const installHandlers = (rows = MOCK_EVENTS) => {
  server.use(
    http.get(/\/api\/events/, () => HttpResponse.json({ status: 'success', data: { rows } })),
    http.get(/\/api\/organization\/teams/, () => HttpResponse.json({ status: 'success', data: { rows: [{ _id: 'T1', name: 'DSC' }] } })),
  );
};

describe('Integration: Events Page', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: ROLES.ADMIN, token: 'mock-token', user: { id: 'U1', name: 'Alok' } });
  });

  it('renders the page title for Admin', () => {
    installHandlers();
    renderWithAll(<Events />);
    expect(screen.getByText('Strategic Command Center')).toBeInTheDocument();
  });

  it('renders the page title for Volunteer', () => {
    useAuthStore.setState({ role: ROLES.VOLUNTEER });
    installHandlers();
    renderWithAll(<Events />);
    expect(screen.getByText('Mission Manifest')).toBeInTheDocument();
  });

  it('displays events loaded from the API with team names', async () => {
    installHandlers();
    renderWithAll(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Annual Launch')).toBeInTheDocument();
      expect(screen.getByText('Tech Meetup')).toBeInTheDocument();
      expect(screen.getByText(/DSC/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('shows empty message when no events are returned', async () => {
    server.resetHandlers();
    installHandlers([]);

    renderWithAll(<Events />);

    await waitFor(() => {
      expect(screen.getByText(/Zero Signals Detected/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('renders status filter chips', () => {
    installHandlers();
    renderWithAll(<Events />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows create button for Admin role', () => {
    installHandlers();
    renderWithAll(<Events />);
    expect(screen.getByText(/Initialize Operation/i)).toBeInTheDocument();
  });

  it('hides create button for Volunteer role', () => {
    useAuthStore.setState({ role: ROLES.VOLUNTEER });
    installHandlers();
    renderWithAll(<Events />);
    expect(screen.queryByText(/Initialize Operation/i)).not.toBeInTheDocument();
  });

  it('shows location data next to event titles', async () => {
    installHandlers();
    renderWithAll(<Events />);

    await waitFor(() => {
      expect(screen.getByText('Lab 1')).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
