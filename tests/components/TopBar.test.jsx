import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TopBar from '../../src/components/TopBar';

const renderWithRouter = (ui) => render(ui, { wrapper: BrowserRouter });

describe('Component: TopBar', () => {
  it('renders the provided title', () => {
    renderWithRouter(<TopBar title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the search bar', () => {
    renderWithRouter(<TopBar title="Dashboard" />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('renders the hamburger menu button for mobile', () => {
    renderWithRouter(<TopBar title="Dashboard" />);
    expect(screen.getByLabelText(/Open menu/i)).toBeInTheDocument();
  });

  it('renders the notifications link', () => {
    renderWithRouter(<TopBar title="Dashboard" />);
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    renderWithRouter(<TopBar title="Dashboard" />);
    // The button has an aria-label for light/dark mode
    const toggle = screen.getByTitle(/mode/i);
    expect(toggle).toBeInTheDocument();
  });
});
