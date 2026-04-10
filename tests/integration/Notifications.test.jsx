import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import Notifications from '../../src/pages/Notifications';
import { server } from '../../src/setupTests';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';
import { renderWithAll } from '../test-utils';

const installHandlers = () => {
  server.use(
    http.get(/\/api\/notifications/, () => HttpResponse.json({
      status: 'success',
      data: {
        rows: [
          {
            id: 'N-1',
            subject: 'Server Broadcast',
            message: 'Payload from API rows format',
            seen: false,
            createdAtLabel: 'just now',
          },
        ],
      },
    })),
  );
};

describe('Integration: Notifications Page', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'U1', name: 'Alok' },
      token: 'valid-token',
      role: ROLES.TEAM_LEAD,
    });
  });

  it('renders notifications from API rows payload', async () => {
    installHandlers();
    renderWithAll(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Server Broadcast')).toBeInTheDocument();
    });

    expect(screen.getByText('Payload from API rows format')).toBeInTheDocument();
  });

  it('marks unread notification as read when clicked', async () => {
    let markReadCalls = 0;
    server.use(
      http.get(/\/api\/notifications/, () => HttpResponse.json({
        status: 'success',
        data: {
          rows: [{ id: 'N-55', subject: 'Pending Read', message: 'Please read', seen: false, createdAtLabel: 'now' }],
        },
      })),
      http.patch(/\/api\/notifications\/N-55\/read/, () => {
        markReadCalls += 1;
        return HttpResponse.json({ status: 'success' });
      }),
    );

    renderWithAll(<Notifications />);
    const row = await screen.findByText('Pending Read');
    fireEvent.click(row);

    await waitFor(() => {
      expect(markReadCalls).toBe(1);
    });
  });
});
