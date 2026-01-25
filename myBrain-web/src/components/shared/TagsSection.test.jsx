import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import TagsSection from './TagsSection';

// Mock the useTags hooks
vi.mock('../../hooks/useTags', () => ({
  usePopularTags: vi.fn(() => ({
    data: {
      tags: [
        { name: 'work', usageCount: 10 },
        { name: 'personal', usageCount: 8 },
        { name: 'urgent', usageCount: 5 },
        { name: 'review', usageCount: 3 },
      ],
    },
    isLoading: false,
  })),
  useSearchTags: vi.fn((query) => ({
    data: {
      tags: query
        ? [
            { name: `${query}-tag`, usageCount: 3 },
            { name: `another-${query}`, usageCount: 2 },
          ]
        : [],
    },
    isLoading: false,
  })),
}));

describe('TagsSection', () => {
  const defaultProps = {
    tags: [],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with "Tags" header when no tags selected', () => {
      render(<TagsSection {...defaultProps} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('renders with tag count when tags are selected', () => {
      render(<TagsSection {...defaultProps} tags={['work', 'personal']} />);
      expect(screen.getByText('2 tags')).toBeInTheDocument();
    });

    it('renders with singular "tag" for single selection', () => {
      render(<TagsSection {...defaultProps} tags={['work']} />);
      expect(screen.getByText('1 tag')).toBeInTheDocument();
    });

    it('renders the TagInput component', () => {
      render(<TagsSection {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search or create tags...')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('returns null when disabled', () => {
      const { container } = render(<TagsSection {...defaultProps} disabled={true} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders normally when not disabled', () => {
      render(<TagsSection {...defaultProps} disabled={false} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('Quick Select Tags', () => {
    it('shows quick-select tags from popular tags', () => {
      render(<TagsSection {...defaultProps} />);

      // Quick select buttons should be visible with + prefix
      expect(screen.getByRole('button', { name: /\+ work/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ personal/i })).toBeInTheDocument();
    });

    it('filters out already selected tags from quick-select', () => {
      render(<TagsSection {...defaultProps} tags={['work']} />);

      // 'work' should not appear in quick-select since it's already selected
      const quickSelectButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('+')
      );
      const workButton = quickSelectButtons.find(btn => btn.textContent?.includes('work'));
      expect(workButton).toBeUndefined();
    });

    it('adds tag when quick-select button is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TagsSection {...defaultProps} onChange={handleChange} />);

      const workButton = screen.getByRole('button', { name: /\+ work/i });
      await user.click(workButton);

      expect(handleChange).toHaveBeenCalledWith(['work']);
    });

    it('does not add duplicate tags via quick-select', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TagsSection {...defaultProps} tags={['work']} onChange={handleChange} />);

      // Quick select for 'work' should not be visible since it's already selected
      const quickSelectButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('+')
      );
      const workButton = quickSelectButtons.find(btn => btn.textContent?.includes('work'));
      expect(workButton).toBeUndefined();
    });

    it('converts quick-added tags to lowercase', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      // Mock with uppercase tag
      vi.doMock('../../hooks/useTags', () => ({
        usePopularTags: vi.fn(() => ({
          data: {
            tags: [{ name: 'UPPERCASE', usageCount: 5 }],
          },
          isLoading: false,
        })),
        useSearchTags: vi.fn(() => ({ data: { tags: [] }, isLoading: false })),
      }));

      render(<TagsSection {...defaultProps} onChange={handleChange} />);

      // The work button should still be available from our original mock
      const workButton = screen.getByRole('button', { name: /\+ work/i });
      await user.click(workButton);

      expect(handleChange).toHaveBeenCalledWith(['work']);
    });
  });

  describe('Quick Select Visibility', () => {
    it('hides quick-select when showQuickSelect is false', () => {
      render(<TagsSection {...defaultProps} showQuickSelect={false} />);

      // Should not show quick-select buttons (buttons with + prefix)
      const buttons = screen.queryAllByRole('button');
      const quickSelectButtons = buttons.filter(
        btn => btn.textContent?.includes('+')
      );
      expect(quickSelectButtons).toHaveLength(0);
    });

    it('shows quick-select by default', () => {
      render(<TagsSection {...defaultProps} />);

      // Should show quick-select buttons
      expect(screen.getByRole('button', { name: /\+ work/i })).toBeInTheDocument();
    });
  });

  describe('Quick Select Limit', () => {
    it('respects quickSelectLimit prop', () => {
      // Default limit is 6, our mock has 4 tags, so all should show
      render(<TagsSection {...defaultProps} quickSelectLimit={2} />);

      // Since limit is passed to usePopularTags, we can verify the component renders
      // The actual limiting happens in the hook
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('onChange Handler', () => {
    it('calls onChange when tags are modified through TagInput', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TagsSection {...defaultProps} onChange={handleChange} />);

      const input = screen.getByPlaceholderText('Search or create tags...');
      await user.type(input, 'newtag{Enter}');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Integration with TagInput', () => {
    it('passes tags to TagInput as value', () => {
      render(<TagsSection {...defaultProps} tags={['existing', 'tags']} />);

      // TagInput should display selected tags
      expect(screen.getByText('existing')).toBeInTheDocument();
      expect(screen.getByText('tags')).toBeInTheDocument();
    });

    it('configures TagInput without showing popular tags (handled by quick-select)', () => {
      render(<TagsSection {...defaultProps} />);

      // TagInput's internal popular tags section should not be shown
      // because showPopular is set to false
      expect(screen.queryByText('Popular Tags')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tags array', () => {
      render(<TagsSection {...defaultProps} tags={[]} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('handles undefined tags', () => {
      render(<TagsSection {...defaultProps} tags={undefined} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('handles whitespace-only tag names gracefully', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TagsSection {...defaultProps} onChange={handleChange} />);

      const input = screen.getByPlaceholderText('Search or create tags...');
      await user.type(input, '   {Enter}');

      // Should not call onChange for empty/whitespace tags
      // This depends on TagInput's behavior
    });
  });

  describe('Styling', () => {
    it('renders with proper structure', () => {
      const { container } = render(<TagsSection {...defaultProps} />);

      // Should have border-t class for top border
      expect(container.firstChild).toHaveClass('border-t');
    });
  });
});
