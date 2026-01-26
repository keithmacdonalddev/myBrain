import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { DatePicker, TimePicker, DateTimePicker } from './DateTimePicker';

// Mock scrollIntoView since JSDOM doesn't implement it
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DatePicker', () => {
  it('renders with placeholder when no value', () => {
    render(<DatePicker value={null} onChange={() => {}} />);
    expect(screen.getByText('Select date')).toBeInTheDocument();
  });

  it('renders with label when provided', () => {
    render(<DatePicker value={null} onChange={() => {}} label="Due Date" />);
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  it('renders formatted date when value is provided', () => {
    const testDate = new Date('2024-06-15T12:00:00');
    render(<DatePicker value={testDate.toISOString()} onChange={() => {}} />);
    // Date format: weekday short, month short, day numeric
    expect(screen.getByText(/Sat, Jun 15/)).toBeInTheDocument();
  });

  it('opens calendar dropdown on click', async () => {
    const user = userEvent.setup();
    render(<DatePicker value={null} onChange={() => {}} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Calendar should be visible with day headers
    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Tu')).toBeInTheDocument();
  });

  it('shows month and year in calendar header', async () => {
    const user = userEvent.setup();
    const testDate = new Date('2024-06-15T12:00:00');
    render(<DatePicker value={testDate.toISOString()} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('June 2024')).toBeInTheDocument();
  });

  it('navigates to previous month', async () => {
    const user = userEvent.setup();
    const testDate = new Date('2024-06-15T12:00:00');
    render(<DatePicker value={testDate.toISOString()} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));

    // Find and click previous month button (first button in header)
    const prevButton = screen.getAllByRole('button')[1]; // Skip the trigger button
    await user.click(prevButton);

    expect(screen.getByText('May 2024')).toBeInTheDocument();
  });

  it('navigates to next month', async () => {
    const user = userEvent.setup();
    const testDate = new Date('2024-06-15T12:00:00');
    render(<DatePicker value={testDate.toISOString()} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));

    // Find and click next month button
    const buttons = screen.getAllByRole('button');
    // buttons[0] = trigger, buttons[1] = prev month, buttons[2] = next month
    const nextButton = buttons[2];
    await user.click(nextButton);

    expect(screen.getByText('July 2024')).toBeInTheDocument();
  });

  it('calls onChange when date is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date('2024-06-15T12:00:00');
    render(<DatePicker value={testDate.toISOString()} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));

    // Click on day 20
    const dayButton = screen.getByRole('button', { name: '20' });
    await user.click(dayButton);

    expect(handleChange).toHaveBeenCalled();
    const selectedDate = handleChange.mock.calls[0][0];
    expect(new Date(selectedDate).getDate()).toBe(20);
  });

  it('shows Today quick action', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<DatePicker value={null} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  it('selects today when Today button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<DatePicker value={null} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Today'));

    expect(handleChange).toHaveBeenCalled();
    const selectedDate = new Date(handleChange.mock.calls[0][0]);
    const today = new Date();
    expect(selectedDate.toDateString()).toBe(today.toDateString());
  });

  it('closes dropdown when date is selected', async () => {
    const user = userEvent.setup();
    render(<DatePicker value={null} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Su')).toBeInTheDocument();

    await user.click(screen.getByText('Today'));

    // Calendar should be closed
    expect(screen.queryByText('Su')).not.toBeInTheDocument();
  });
});

describe('TimePicker', () => {
  it('renders with placeholder when no value', () => {
    render(<TimePicker value={null} onChange={() => {}} />);
    expect(screen.getByText('Select time')).toBeInTheDocument();
  });

  it('renders with label when provided', () => {
    render(<TimePicker value={null} onChange={() => {}} label="Start Time" />);
    expect(screen.getByText('Start Time')).toBeInTheDocument();
  });

  it('renders formatted time when value is provided', () => {
    render(<TimePicker value="14:30" onChange={() => {}} />);
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('opens time dropdown on click', async () => {
    const user = userEvent.setup();
    render(<TimePicker value={null} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));

    // Should show time options
    expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:15 AM')).toBeInTheDocument();
  });

  it('calls onChange when time is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimePicker value={null} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));

    // Find and click 9:00 AM option
    const timeOption = screen.getByRole('button', { name: '9:00 AM' });
    await user.click(timeOption);

    expect(handleChange).toHaveBeenCalledWith('09:00');
  });

  it('closes dropdown when time is selected', async () => {
    const user = userEvent.setup();
    render(<TimePicker value={null} onChange={() => {}} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('12:00 AM')).toBeInTheDocument();

    const timeOption = screen.getByRole('button', { name: '9:00 AM' });
    await user.click(timeOption);

    // Dropdown should be closed (12:00 AM shouldn't be visible)
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument();
  });

  it('highlights selected time', async () => {
    const user = userEvent.setup();
    render(<TimePicker value="09:00" onChange={() => {}} />);

    await user.click(screen.getByRole('button'));

    // Get all buttons with 9:00 AM and find the one in the dropdown
    const buttons = screen.getAllByRole('button', { name: '9:00 AM' });
    // The dropdown option is the second one (first is the trigger)
    const selectedOption = buttons[1];
    expect(selectedOption).toHaveClass('bg-primary/10');
  });
});

describe('DateTimePicker', () => {
  it('renders both date and time pickers by default', () => {
    render(<DateTimePicker value={null} onChange={() => {}} />);

    expect(screen.getByText('Select date')).toBeInTheDocument();
    // When no value, TimePicker defaults to showing 9:00 AM
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
  });

  it('renders only date picker when showTime is false', () => {
    render(<DateTimePicker value={null} onChange={() => {}} showTime={false} />);

    expect(screen.getByText('Select date')).toBeInTheDocument();
    expect(screen.queryByText('Select time')).not.toBeInTheDocument();
  });

  it('renders with label when provided', () => {
    render(<DateTimePicker value={null} onChange={() => {}} label="Event Start" />);
    expect(screen.getByText('Event Start')).toBeInTheDocument();
  });

  it('displays formatted date and time when value is provided', () => {
    const testDate = new Date('2024-06-15T14:30:00');
    render(<DateTimePicker value={testDate.toISOString()} onChange={() => {}} />);

    // Date should be formatted
    expect(screen.getByText(/Sat, Jun 15/)).toBeInTheDocument();
    // Time should show 2:30 PM
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('calls onChange with ISO string when date changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date('2024-06-15T14:30:00');
    render(<DateTimePicker value={testDate.toISOString()} onChange={handleChange} />);

    // Open date picker and select a date
    const dateButton = screen.getAllByRole('button')[0];
    await user.click(dateButton);

    const dayButton = screen.getByRole('button', { name: '20' });
    await user.click(dayButton);

    expect(handleChange).toHaveBeenCalled();
    const newValue = handleChange.mock.calls[0][0];
    expect(typeof newValue).toBe('string');
    // Should be ISO string
    expect(newValue).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('preserves time when date changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date('2024-06-15T14:30:00');
    render(<DateTimePicker value={testDate.toISOString()} onChange={handleChange} />);

    const dateButton = screen.getAllByRole('button')[0];
    await user.click(dateButton);

    const dayButton = screen.getByRole('button', { name: '20' });
    await user.click(dayButton);

    const newDate = new Date(handleChange.mock.calls[0][0]);
    expect(newDate.getHours()).toBe(14);
    expect(newDate.getMinutes()).toBe(30);
  });

  it('calls onChange with ISO string when time changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date('2024-06-15T09:00:00');
    render(<DateTimePicker value={testDate.toISOString()} onChange={handleChange} />);

    // Open time picker (second button group)
    const timeButton = screen.getAllByRole('button')[1];
    await user.click(timeButton);

    // Select 2:30 PM
    const timeOption = screen.getByRole('button', { name: '2:30 PM' });
    await user.click(timeOption);

    expect(handleChange).toHaveBeenCalled();
    const newDate = new Date(handleChange.mock.calls[0][0]);
    expect(newDate.getHours()).toBe(14);
    expect(newDate.getMinutes()).toBe(30);
  });

  it('preserves date when time changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date('2024-06-15T09:00:00');
    render(<DateTimePicker value={testDate.toISOString()} onChange={handleChange} />);

    const timeButton = screen.getAllByRole('button')[1];
    await user.click(timeButton);

    const timeOption = screen.getByRole('button', { name: '2:30 PM' });
    await user.click(timeOption);

    const newDate = new Date(handleChange.mock.calls[0][0]);
    expect(newDate.getFullYear()).toBe(2024);
    expect(newDate.getMonth()).toBe(5); // June (0-indexed)
    expect(newDate.getDate()).toBe(15);
  });

  it('defaults to 9:00 AM when selecting date with no prior value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const dateButton = screen.getAllByRole('button')[0];
    await user.click(dateButton);

    await user.click(screen.getByText('Today'));

    const newDate = new Date(handleChange.mock.calls[0][0]);
    expect(newDate.getHours()).toBe(9);
    expect(newDate.getMinutes()).toBe(0);
  });
});
