import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import TagInput from './TagInput';

// Mock the useTags hooks
vi.mock('../../hooks/useTags', () => ({
  usePopularTags: vi.fn(() => ({
    data: {
      tags: [
        { name: 'work', usageCount: 10 },
        { name: 'personal', usageCount: 8 },
        { name: 'urgent', usageCount: 5 },
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

describe('TagInput', () => {
  const defaultProps = {
    value: [],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder', () => {
    render(<TagInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<TagInput {...defaultProps} placeholder="Type to add tags" />);
    expect(screen.getByPlaceholderText('Type to add tags')).toBeInTheDocument();
  });

  it('renders selected tags', () => {
    render(<TagInput {...defaultProps} value={['work', 'personal']} />);
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('personal')).toBeInTheDocument();
  });

  it('shows remove button on selected tags', () => {
    render(<TagInput {...defaultProps} value={['work']} />);
    // The X button is within the tag span
    const tagElement = screen.getByText('work').closest('span');
    const removeButton = tagElement.querySelector('button');
    expect(removeButton).toBeInTheDocument();
  });

  it('removes tag when X button is clicked', async () => {
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} value={['work', 'personal']} onChange={handleChange} />);

    const tagElement = screen.getByText('work').closest('span');
    const removeButton = tagElement.querySelector('button');
    await userEvent.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith(['personal']);
  });

  it('shows dropdown on focus', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    // Should show popular tags section
    expect(screen.getByText('Popular Tags')).toBeInTheDocument();
  });

  it('shows popular tags in dropdown when focused', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('adds tag when popular tag is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    // Click on "work" tag in the dropdown
    const workButtons = screen.getAllByText('work');
    const dropdownButton = workButtons.find(
      (el) => el.closest('button')?.classList.contains('inline-flex')
    );
    await user.click(dropdownButton);

    expect(handleChange).toHaveBeenCalledWith(['work']);
  });

  it('adds tag when Enter is pressed', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'newtag{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['newtag']);
  });

  it('adds tag when comma is typed', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'newtag,');

    expect(handleChange).toHaveBeenCalledWith(['newtag']);
  });

  it('converts tags to lowercase', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'NewTag{Enter}');

    expect(handleChange).toHaveBeenCalledWith(['newtag']);
  });

  it('does not add duplicate tags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} value={['work']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'work{Enter}');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('removes last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} value={['work', 'personal']} onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(handleChange).toHaveBeenCalledWith(['work']);
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    expect(screen.getByText('Popular Tags')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Popular Tags')).not.toBeInTheDocument();
    });
  });

  it('filters out already selected tags from popular suggestions', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} value={['work']} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    // "work" should not appear in popular tags since it's already selected
    const popularSection = screen.getByText('Popular Tags').closest('div');
    expect(popularSection.parentElement).not.toHaveTextContent('work (10)');
  });

  it('respects maxTags limit', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TagInput
        {...defaultProps}
        value={['tag1', 'tag2', 'tag3']}
        onChange={handleChange}
        maxTags={3}
      />
    );

    // Input should not be rendered when at max capacity
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('hides popular tags when showPopular is false', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} showPopular={false} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    // Should not show popular tags section
    expect(screen.queryByText('Popular Tags')).not.toBeInTheDocument();
  });

  it('shows create option for new tags', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'brandnew');

    await waitFor(() => {
      expect(screen.getByText(/Create "brandnew"/)).toBeInTheDocument();
    });
  });

  it('adds custom className', () => {
    const { container } = render(<TagInput {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('trims whitespace from tags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, '  spacey  {Enter}');

    expect(handleChange).toHaveBeenCalledWith(['spacey']);
  });

  it('does not add empty tags', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, '   {Enter}');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('clears input after adding tag', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} onChange={() => {}} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'newtag{Enter}');

    expect(input).toHaveValue('');
  });

  it('hides placeholder when tags are selected', () => {
    render(<TagInput {...defaultProps} value={['work']} />);
    expect(screen.queryByPlaceholderText('Add tag...')).not.toBeInTheDocument();
  });

  it('shows usage count on tags in dropdown', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Add tag...');
    await user.click(input);

    expect(screen.getByText('(10)')).toBeInTheDocument();
    expect(screen.getByText('(8)')).toBeInTheDocument();
  });
});
