import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import Logs from '../../src/pages/Logs';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';

import { renderWithAll } from '../test-utils';

/* ─── Shared mock data ─── */
const MOCK_LOGS = [
  { _id: '1', title: 'Feature Fix', workDate: '2026-03-25T00:00:00Z', durationMinutes: 90, status: 'approved', userId: 'U1' },
  { _id: '2', title: 'Draft Task', workDate: '2026-03-26T00:00:00Z', durationMinutes: 45, status: 'draft', userId: 'U1' },
];

/** Install MSW handlers that serve the given log rows. */
const installHandlers = (rows = MOCK_LOGS) => {
  server.use(
    http.get(/\/api\/logs/, () =>
      HttpResponse.json({ status: 'success', data: { rows } })
    ),
    http.get(/\/api\/profile\/me/, () =>
      HttpResponse.json({ status: 'success', data: { user: { id: 'U1', name: 'Alok', teamId: 'T1' } } })
    ),
    http.get(/\/api\/organization\/teams/, () =>
      HttpResponse.json({ status: 'success', data: { rows: [{ _id: 'T1', name: 'DSC' }] } })
    ),
  );
};

describe('Integration: Logs Page', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'U1', name: 'Alok' },
      token: 'valid-token',
      role: ROLES.VOLUNTEER,
    });
  });

  /* ─── Rendering ─── */

  it('renders the page title "Work Logs"', () => {
    installHandlers();
    renderWithAll(<Logs />);
    expect(screen.getByText('Work Logs')).toBeInTheDocument();
  });

  it('shows skeleton cells while data is loading', () => {
    installHandlers();
    renderWithAll(<Logs />);
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
  });

  /* ─── Data loading ─── */
  // NOTE: Logs.jsx renders both .desktop-log-table and .mobile-log-list,
  //       so every log title appears TWICE in the DOM. Use getAllByText.

  it('displays log entries returned by the API', async () => {
    installHandlers();
    renderWithAll(<Logs />);

    await waitFor(() => {
      expect(screen.getAllByText('Feature Fix').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Draft Task').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 4000 });

    // Duration computed by normalizeLog → formatDurationLabel
    expect(screen.getAllByText('1h 30m').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0h 45m').length).toBeGreaterThanOrEqual(1);
  });

  /* ─── Empty state ─── */

  it('shows "No logs" message when the API returns zero rows', async () => {
    // Reset ALL existing handlers, then install fresh empty-data ones
    server.resetHandlers();
    installHandlers([]);

    renderWithAll(<Logs />);

    await waitFor(() => {
      expect(screen.getAllByText(/No logs found|Quiet Roster/i).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 6000 });
  });

  /* ─── Filter chips ─── */

  it('renders filter chips and "All" is active by default', () => {
    installHandlers();
    renderWithAll(<Logs />);

    const allChip = screen.getByText('All');
    const draftChip = screen.getByText('Draft');
    expect(allChip).toBeInTheDocument();
    expect(draftChip).toBeInTheDocument();
    expect(allChip.closest('button')).toHaveClass('active');
  });

  /* ─── New Entry button ─── */

  it('renders the "New Entry" button', () => {
    installHandlers();
    renderWithAll(<Logs />);
    expect(screen.getByText(/New Entry/i)).toBeInTheDocument();
  });

  /* ─── Search bar ─── */

  it('renders the search input', () => {
    installHandlers();
    renderWithAll(<Logs />);
    expect(screen.getByPlaceholderText(/Search activities/i)).toBeInTheDocument();
  });

  /* ─── Status badges ─── */

  it('renders status badges after data loads', async () => {
    installHandlers();
    renderWithAll(<Logs />);

    await waitFor(() => {
      expect(screen.getAllByText('Feature Fix').length).toBeGreaterThanOrEqual(1);
    }, { timeout: 4000 });

    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
  });

  /* ─── Error handling ─── */

  it('shows an error message when the API request fails', async () => {
    server.resetHandlers();
    server.use(
      http.get(/\/api\/logs/, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      ),
      http.get(/\/api\/profile\/me/, () =>
        HttpResponse.json({ status: 'success', data: { user: { id: 'U1', name: 'Alok' } } })
      ),
      http.get(/\/api\/organization\/teams/, () =>
        HttpResponse.json({ status: 'success', data: { rows: [] } })
      ),
    );

    renderWithAll(<Logs />);

    await waitFor(() => {
      expect(screen.getByText(/Request failed|Server error|Failed to load/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
