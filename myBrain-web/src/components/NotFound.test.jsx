import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import userEvent from '@testing-library/user-event';
import NotFound from './NotFound';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders 404 text', () => {
      render(<NotFound />);
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders "Page Not Found" heading', () => {
      render(<NotFound />);
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });

    it('renders descriptive message', () => {
      render(<NotFound />);
      expect(
        screen.getByText("The page you're looking for doesn't exist or may have been moved.")
      ).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<NotFound />);
      // Search icon should be present (rendered as SVG)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('renders "Go Back" button', () => {
      render(<NotFound />);
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders "Dashboard" button', () => {
      render(<NotFound />);
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('navigates back when "Go Back" button is clicked', async () => {
      const user = userEvent.setup();
      render(<NotFound />);

      await user.click(screen.getByRole('button', { name: /go back/i }));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to /app when "Dashboard" button is clicked', async () => {
      const user = userEvent.setup();
      render(<NotFound />);

      await user.click(screen.getByRole('button', { name: /dashboard/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  describe('Button Icons', () => {
    it('renders ArrowLeft icon in Go Back button', () => {
      render(<NotFound />);
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      expect(goBackButton.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Home icon in Dashboard button', () => {
      render(<NotFound />);
      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      expect(dashboardButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has centered layout', () => {
      const { container } = render(<NotFound />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('has min-height screen', () => {
      const { container } = render(<NotFound />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-screen');
    });

    it('Go Back button has proper styling', () => {
      render(<NotFound />);
      const goBackButton = screen.getByRole('button', { name: /go back/i });
      expect(goBackButton).toHaveClass('border', 'border-border');
    });

    it('Dashboard button has primary styling', () => {
      render(<NotFound />);
      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      expect(dashboardButton).toHaveClass('bg-primary');
    });
  });

  describe('Accessibility', () => {
    it('has semantic heading structure', () => {
      render(<NotFound />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Page Not Found');
    });

    it('buttons are keyboard accessible', () => {
      render(<NotFound />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Content Structure', () => {
    it('renders content in correct order', () => {
      const { container } = render(<NotFound />);
      const textContent = container.textContent;

      // 404 should appear before Page Not Found
      const pos404 = textContent.indexOf('404');
      const posTitle = textContent.indexOf('Page Not Found');
      const posDescription = textContent.indexOf("doesn't exist");
      const posGoBack = textContent.indexOf('Go Back');
      const posDashboard = textContent.indexOf('Dashboard');

      expect(pos404).toBeLessThan(posTitle);
      expect(posTitle).toBeLessThan(posDescription);
      expect(posDescription).toBeLessThan(posGoBack);
      expect(posGoBack).toBeLessThan(posDashboard);
    });
  });
});
