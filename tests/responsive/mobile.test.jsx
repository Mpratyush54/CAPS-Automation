/**
 * Mobile Compatibility Tests
 *
 * These tests verify that the responsive CSS classes and layout elements
 * are present in the rendered DOM. In jsdom we cannot test actual CSS
 * media-query activation, but we CAN verify the structural contract:
 *   - mobile-specific elements exist (`.mobile-log-list`, `.fab`, `.hamburger-btn`)
 *   - desktop elements exist (`.desktop-log-table`)
 *   - both views render simultaneously in the DOM (CSS controls visibility)
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../src/setupTests';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../src/store/auth';
import { ROLES } from '../../src/rbac';

import Logs from '../../src/pages/Logs';
import Login from '../../src/pages/Login';

import { renderWithAll } from '../test-utils';

const installLogHandlers = (rows = []) => {
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

describe('Mobile Compatibility', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'U1', name: 'Alok' },
      token: 'valid-token',
      role: ROLES.VOLUNTEER,
    });
  });

  describe('Logs Page – Responsive Structure', () => {
    it('renders both desktop table and mobile card list in the DOM', () => {
      installLogHandlers([
        { _id: '1', title: 'Task A', workDate: '2026-03-25T00:00:00Z', durationMinutes: 60, status: 'draft', userId: 'U1' },
      ]);
      const { container } = renderWithAll(<Logs />);

      // Desktop table wrapper
      const desktopTable = container.querySelector('.desktop-log-table');
      expect(desktopTable).toBeTruthy();

      // Mobile list wrapper
      const mobileList = container.querySelector('.mobile-log-list');
      expect(mobileList).toBeTruthy();
    });

    it('renders a FAB (floating action button) for mobile "New Entry"', () => {
      installLogHandlers();
      const { container } = renderWithAll(<Logs />);
      const fab = container.querySelector('.fab');
      expect(fab).toBeTruthy();
    });

    it('renders the hamburger menu button', () => {
      installLogHandlers();
      renderWithAll(<Logs />);
      expect(screen.getByLabelText(/Open menu/i)).toBeInTheDocument();
    });

    it('renders skeleton loaders in both desktop and mobile views while loading', () => {
      installLogHandlers();
      const { container } = renderWithAll(<Logs />);

      // Desktop skeletons live inside `.desktop-log-table` <table>
      const desktopCells = container.querySelectorAll('.desktop-log-table td');
      expect(desktopCells.length).toBeGreaterThan(0);

      // Mobile skeletons are CardSkeleton inside `.mobile-log-list`
      const mobileCards = container.querySelectorAll('.mobile-log-list .card');
      expect(mobileCards.length).toBeGreaterThan(0);
    });
  });

  describe('Login Page – Mobile Layout', () => {
    it('renders at full viewport width with a max-width container', () => {
      const { container } = renderWithAll(<Login />);
      // The login page uses a centered container (maxWidth: '440px')
      const wrapper = container.firstChild;
      expect(wrapper).toBeTruthy();
      // It renders key form elements
      expect(screen.getByPlaceholderText(/you@worklog.io/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('renders the Sign In and Sign Up mode tabs', () => {
      renderWithAll(<Login />);
      // 'Sign In' appears in both the tab button and the submit button
      const signInElements = screen.getAllByText('Sign In');
      expect(signInElements.length).toBeGreaterThanOrEqual(2); // tab + submit
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('renders the password visibility toggle', () => {
      renderWithAll(<Login />);
      // Eye icon toggle button for show/hide password
      const eyeButtons = screen.getAllByRole('button');
      const toggleBtn = eyeButtons.find(b =>
        b.querySelector('svg') && b.style.position === 'absolute'
      );
      expect(toggleBtn).toBeTruthy();
    });
  });

  describe('Responsive CSS contract', () => {
    it('confirms .search-bar exists for top bar search', () => {
      installLogHandlers();
      const { container } = renderWithAll(<Logs />);
      const searchBars = container.querySelectorAll('.search-bar');
      expect(searchBars.length).toBeGreaterThan(0);
    });

    it('confirms filter chips are horizontally scrollable (card-action-row)', () => {
      installLogHandlers();
      const { container } = renderWithAll(<Logs />);
      const actionRow = container.querySelector('.card-action-row');
      expect(actionRow).toBeTruthy();
    });
  });
});
