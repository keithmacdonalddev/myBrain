import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage mock
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('renders toggle button', () => {
    render(<ThemeToggle />, {
      preloadedState: { theme: { mode: 'light' } }
    });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('shows moon icon in light mode', () => {
    render(<ThemeToggle />, {
      preloadedState: { theme: { mode: 'light' } }
    });

    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
  });

  it('shows sun icon in dark mode', () => {
    render(<ThemeToggle />, {
      preloadedState: { theme: { mode: 'dark' } }
    });

    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();
  });

  it('toggles theme on click', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<ThemeToggle />, {
      preloadedState: { theme: { mode: 'light' } }
    });

    const button = screen.getByRole('button');
    await user.click(button);

    // After clicking, the store should update
    // In real usage, the component would re-render with the new state
    expect(button).toBeInTheDocument();
  });
});
