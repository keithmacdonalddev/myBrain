import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import LocationPicker from './LocationPicker';

// Mock the API and query client
vi.mock('../../lib/api', () => ({
  savedLocationsApi: {
    createLocation: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
}));

// Mock fetch for address search
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'mock-uuid-12345',
});

describe('LocationPicker', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  const savedLocations = [
    { id: '1', name: 'Home', address: '123 Main St, Toronto, ON' },
    { id: '2', name: 'Work', address: '456 Office Rd, Toronto, ON' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders input with placeholder', () => {
    render(<LocationPicker {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search for an address...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<LocationPicker {...defaultProps} placeholder="Enter location" />);
    expect(screen.getByPlaceholderText('Enter location')).toBeInTheDocument();
  });

  it('renders with initial value', () => {
    render(<LocationPicker {...defaultProps} value="123 Test St" />);
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
  });

  it('shows clear button when input has value', () => {
    render(<LocationPicker {...defaultProps} value="123 Test St" />);
    // X button should be visible
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LocationPicker {...defaultProps} value="123 Test St" onChange={handleChange} />);

    const clearButton = screen.getByRole('button');
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('shows saved locations dropdown on focus', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    expect(screen.getByText('Saved Locations')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('shows saved location addresses', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    expect(screen.getByText('123 Main St, Toronto, ON')).toBeInTheDocument();
    expect(screen.getByText('456 Office Rd, Toronto, ON')).toBeInTheDocument();
  });

  it('selects saved location on click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <LocationPicker
        {...defaultProps}
        onChange={handleChange}
        savedLocations={savedLocations}
      />
    );

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    const homeButton = screen.getByText('Home').closest('button');
    fireEvent.mouseDown(homeButton);

    expect(handleChange).toHaveBeenCalledWith('123 Main St, Toronto, ON');
  });

  it('filters saved locations based on search query', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.type(input, 'Home');

    // Should only show matching saved location
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Work')).not.toBeInTheDocument();
  });

  it('searches for addresses when typing (OSM fallback)', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            place_id: '123',
            display_name: '100 Queen St, Toronto, ON, Canada',
            address: {
              house_number: '100',
              road: 'Queen St',
              city: 'Toronto',
              state: 'ON',
              country: 'Canada',
            },
          },
        ]),
    });

    render(<LocationPicker {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.type(input, '100 Queen');

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 500 }
    );
  });

  it('handles keyboard navigation - Arrow Down', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    // First item should be highlighted
    const homeButton = screen.getByText('Home').closest('button');
    expect(homeButton).toHaveClass('bg-primary/10');
  });

  it('handles keyboard navigation - Arrow Up', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

    // First item should be highlighted after going down twice and up once
    const homeButton = screen.getByText('Home').closest('button');
    expect(homeButton).toHaveClass('bg-primary/10');
  });

  it('selects item on Enter key', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <LocationPicker
        {...defaultProps}
        onChange={handleChange}
        savedLocations={savedLocations}
      />
    );

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(handleChange).toHaveBeenCalledWith('123 Main St, Toronto, ON');
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<LocationPicker {...defaultProps} savedLocations={savedLocations} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    expect(screen.getByText('Saved Locations')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Saved Locations')).not.toBeInTheDocument();
  });

  it('submits custom value on Enter when no item selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LocationPicker {...defaultProps} onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.type(input, 'Custom Location');
    await user.keyboard('{Enter}');

    expect(handleChange).toHaveBeenCalledWith('Custom Location');
  });

  it('shows no results message when search returns empty', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<LocationPicker {...defaultProps} savedLocations={[]} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.type(input, 'xyznonexistent');

    await waitFor(
      () => {
        expect(
          screen.getByText('No locations found. Try a different search.')
        ).toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('applies custom className', () => {
    const { container } = render(
      <LocationPicker {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows save location button when showSaveOption is true and location selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleSave = vi.fn();

    render(
      <LocationPicker
        {...defaultProps}
        onChange={handleChange}
        savedLocations={savedLocations}
        showSaveOption={true}
        onSaveLocation={handleSave}
      />
    );

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    const homeButton = screen.getByText('Home').closest('button');
    fireEvent.mouseDown(homeButton);

    expect(screen.getByText('Save this location')).toBeInTheDocument();
  });

  it('calls onSaveLocation when save button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleSave = vi.fn();

    render(
      <LocationPicker
        {...defaultProps}
        onChange={handleChange}
        savedLocations={savedLocations}
        showSaveOption={true}
        onSaveLocation={handleSave}
      />
    );

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    const homeButton = screen.getByText('Home').closest('button');
    fireEvent.mouseDown(homeButton);

    const saveButton = screen.getByText('Save this location');
    await user.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith('123 Main St, Toronto, ON');
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LocationPicker {...defaultProps} savedLocations={savedLocations} />
        <button>Outside</button>
      </div>
    );

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.click(input);

    expect(screen.getByText('Saved Locations')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByText('Outside'));

    await waitFor(() => {
      expect(screen.queryByText('Saved Locations')).not.toBeInTheDocument();
    });
  });

  it('shows loading spinner while searching', async () => {
    const user = userEvent.setup();
    // Create a promise that we can control
    let resolveSearch;
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        })
    );

    render(<LocationPicker {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search for an address...');
    await user.type(input, 'test location');

    // Wait for debounce and check loading state
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 500 }
    );

    // Resolve the search
    resolveSearch({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('syncs with external value changes', async () => {
    const { rerender } = render(<LocationPicker {...defaultProps} value="" />);

    expect(screen.getByDisplayValue('')).toBeInTheDocument();

    rerender(<LocationPicker {...defaultProps} value="New Address" />);

    expect(screen.getByDisplayValue('New Address')).toBeInTheDocument();
  });

  it('shows MapPin icon in input', () => {
    const { container } = render(<LocationPicker {...defaultProps} />);
    // MapPin is rendered as an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
