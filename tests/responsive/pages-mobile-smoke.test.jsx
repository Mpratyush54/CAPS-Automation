import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';
import { renderWithAll } from '../test-utils';

import Notifications from '../../src/pages/Notifications';
import Organization from '../../src/pages/Organization';
import Profile from '../../src/pages/Profile';
import Reports from '../../src/pages/Reports';
import ReportCenter from '../../src/pages/ReportCenter';
import Moms from '../../src/pages/Moms';

const installCommonHandlers = () => {
  server.use(
    http.get(/\/api\/notifications$/, () => HttpResponse.json({ status: 'success', data: { rows: [] } })),
    http.get(/\/api\/notifications\/devices/, () => HttpResponse.json({ status: 'success', data: { items: [] } })),
    http.get(/\/api\/organization\/teams/, () => HttpResponse.json({
      status: 'success',
      data: { rows: [{ _id: 'T1', name: 'Ops Team', members: [], leadUserIds: [] }] },
    })),
    http.get(/\/api\/organization\/users\/all/, () => HttpResponse.json({ status: 'success', data: { rows: [] } })),
    http.get(/\/api\/profile\/me/, () => HttpResponse.json({
      status: 'success',
      data: {
        user: { id: 'U1', name: 'Alok', email: 'alok@example.com' },
        recentActivity: [],
        summary: { hours: 0, logs: 0 },
      },
    })),
    http.get(/\/api\/stats\/overview/, () => HttpResponse.json({
      status: 'success',
      data: { data: { kpi: {}, weekly: [], pie: [], monthly: [] } },
    })),
    http.get(/\/api\/stats\/breakdown/, () => HttpResponse.json({
      status: 'success',
      data: { data: { rows: [] } },
    })),
    http.get(/\/api\/stats\/contributions/, () => HttpResponse.json({
      status: 'success',
      data: { data: { rows: [] } },
    })),
    http.get(/\/api\/reports$/, () => HttpResponse.json({ status: 'success', data: { rows: [] } })),
    http.get(/\/api\/moms$/, () => HttpResponse.json({ status: 'success', data: { rows: [] } })),
    http.get(/\/api\/moms\/categories/, () => HttpResponse.json({ status: 'success', data: { rows: [] } })),
  );
};

describe('Responsive: mobile smoke for key pages', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    window.dispatchEvent(new Event('resize'));

    useAuthStore.setState({
      user: { id: 'U1', name: 'Alok', email: 'alok@example.com' },
      token: 'valid-token',
      role: ROLES.ADMIN,
    });

    installCommonHandlers();
  });

  it('loads Notifications on mobile', async () => {
    renderWithAll(<Notifications />);
    expect(await screen.findByText('Intelligence Dispatch')).toBeInTheDocument();
  });

  it('loads Organization on mobile', async () => {
    renderWithAll(<Organization />);
    expect(await screen.findByText('Operational Directory')).toBeInTheDocument();
  });

  it('loads Profile on mobile', async () => {
    renderWithAll(<Profile />);
    expect(await screen.findByText('Agent Identity')).toBeInTheDocument();
  });

  it('loads Reports on mobile', async () => {
    renderWithAll(<Reports />);
    expect(await screen.findByText('Wing Analytics')).toBeInTheDocument();
  });

  it('loads Report Center on mobile', async () => {
    renderWithAll(<ReportCenter />);
    expect(await screen.findByText('Intelligence & Reporting')).toBeInTheDocument();
  });

  it('loads MOMs on mobile', async () => {
    renderWithAll(<Moms />);
    expect(await screen.findByText('Mission Protocols (MOM)')).toBeInTheDocument();
  });
});
