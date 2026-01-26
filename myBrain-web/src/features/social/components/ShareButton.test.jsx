import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ShareButton from './ShareButton';

// Mock ShareModal component
vi.mock('./ShareModal', () => ({
  default: ({ isOpen, onClose, itemId, itemType, itemTitle }) =>
    isOpen ? (
      <div data-testid="share-modal">
        Share Modal - {itemType} - {itemId} - {itemTitle}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

// Mock useFeatureFlag hook
vi.mock('../../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(),
}));

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

describe('ShareButton', () => {
  const defaultProps = {
    itemId: 'item123',
    itemType: 'project',
    itemTitle: 'Test Project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
  });

  it('renders nothing when socialEnabled feature flag is false', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false);

    const { container } = render(<ShareButton {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders share button when socialEnabled is true', () => {
    render(<ShareButton {...defaultProps} />);

    expect(screen.getByTitle('Share')).toBeInTheDocument();
  });

  describe('Icon variant (default)', () => {
    it('renders icon-only button by default', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByTitle('Share');
      expect(button).toBeInTheDocument();
      // Should not have "Share" text visible
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
    });

    it('applies correct size classes for sm', () => {
      render(<ShareButton {...defaultProps} size="sm" />);

      const button = screen.getByTitle('Share');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies correct size classes for md (default)', () => {
      render(<ShareButton {...defaultProps} />);

      const button = screen.getByTitle('Share');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('applies correct size classes for lg', () => {
      render(<ShareButton {...defaultProps} size="lg" />);

      const button = screen.getByTitle('Share');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('Button variant', () => {
    it('renders button with text', () => {
      render(<ShareButton {...defaultProps} variant="button" />);

      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('applies primary button styles', () => {
      render(<ShareButton {...defaultProps} variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-white');
    });

    it('applies correct size classes for button variant', () => {
      render(<ShareButton {...defaultProps} variant="button" size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2');
    });
  });

  describe('Text variant', () => {
    it('renders text link style button', () => {
      render(<ShareButton {...defaultProps} variant="text" />);

      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('applies text button styles', () => {
      render(<ShareButton {...defaultProps} variant="text" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-muted');
    });
  });

  describe('Modal interaction', () => {
    it('opens ShareModal when button clicked', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);

      await user.click(screen.getByTitle('Share'));

      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });

    it('passes correct props to ShareModal', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);

      await user.click(screen.getByTitle('Share'));

      const modal = screen.getByTestId('share-modal');
      expect(modal).toHaveTextContent('project');
      expect(modal).toHaveTextContent('item123');
      expect(modal).toHaveTextContent('Test Project');
    });

    it('closes ShareModal when close is triggered', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);

      // Open modal
      await user.click(screen.getByTitle('Share'));
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
    });

    it('opens modal when button variant clicked', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} variant="button" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });

    it('opens modal when text variant clicked', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} variant="text" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className to icon variant', () => {
      render(<ShareButton {...defaultProps} className="custom-class" />);

      const button = screen.getByTitle('Share');
      expect(button).toHaveClass('custom-class');
    });

    it('applies custom className to button variant', () => {
      render(
        <ShareButton {...defaultProps} variant="button" className="custom-class" />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('applies custom className to text variant', () => {
      render(
        <ShareButton {...defaultProps} variant="text" className="custom-class" />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  it('checks socialEnabled feature flag on mount', () => {
    render(<ShareButton {...defaultProps} />);

    expect(useFeatureFlag).toHaveBeenCalledWith('socialEnabled');
  });
});
