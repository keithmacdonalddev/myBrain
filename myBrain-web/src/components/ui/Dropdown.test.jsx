import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import Dropdown, { DropdownWithDescription } from './Dropdown';
import { Circle, Star, Heart } from 'lucide-react';

describe('Dropdown', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps = {
    value: null,
    onChange: vi.fn(),
    options,
    placeholder: 'Select an option',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value selected', () => {
    render(<Dropdown {...defaultProps} />);

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders with selected option label', () => {
    render(<Dropdown {...defaultProps} value="option2" />);

    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('opens dropdown menu when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dropdown {...defaultProps} />);

    // Menu should not be visible initially
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();

    // Click trigger button
    await user.click(screen.getByRole('button', { name: /select an option/i }));

    // Menu should now be visible with all options
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Dropdown {...defaultProps} onChange={handleChange} />);

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /select an option/i }));

    // Select an option
    await user.click(screen.getByText('Option 2'));

    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('closes dropdown after selecting an option', async () => {
    const user = userEvent.setup();
    render(<Dropdown {...defaultProps} />);

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /select an option/i }));
    expect(screen.getByText('Option 1')).toBeInTheDocument();

    // Select an option
    await user.click(screen.getByText('Option 2'));

    // Menu should be closed
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Dropdown {...defaultProps} />
        <button>Outside</button>
      </div>
    );

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /select an option/i }));
    expect(screen.getByText('Option 1')).toBeInTheDocument();

    // Click outside (on the backdrop)
    fireEvent.mouseDown(document.body);

    // Menu should be closed
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('closes dropdown when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<Dropdown {...defaultProps} />);

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /select an option/i }));
    expect(screen.getByText('Option 1')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Menu should be closed
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('does not open dropdown when disabled', async () => {
    const user = userEvent.setup();
    render(<Dropdown {...defaultProps} disabled={true} />);

    const triggerButton = screen.getByRole('button');
    expect(triggerButton).toBeDisabled();

    // Try to click (won't work because button is disabled)
    await user.click(triggerButton);

    // Menu should not open
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('applies disabled styles when disabled', () => {
    render(<Dropdown {...defaultProps} disabled={true} />);

    const triggerButton = screen.getByRole('button');
    expect(triggerButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('renders options with icons', async () => {
    const user = userEvent.setup();
    const optionsWithIcons = [
      { value: 'circle', label: 'Circle', icon: Circle },
      { value: 'star', label: 'Star', icon: Star },
    ];

    const { container } = render(
      <Dropdown {...defaultProps} options={optionsWithIcons} value="circle" />
    );

    // Icon should be visible in trigger
    expect(container.querySelector('svg')).toBeInTheDocument();

    // Open dropdown to check option icons
    await user.click(screen.getByRole('button'));

    // Options should have icons (multiple SVGs now visible)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(1);
  });

  it('renders options with custom colors', async () => {
    const user = userEvent.setup();
    const optionsWithColors = [
      { value: 'red', label: 'Red', icon: Circle, color: 'text-red-500' },
      { value: 'blue', label: 'Blue', icon: Circle, color: 'text-blue-500' },
    ];

    const { container } = render(
      <Dropdown {...defaultProps} options={optionsWithColors} value="red" />
    );

    // Icon should have the color class
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('text-red-500');
  });

  it('shows checkmark on selected item when showCheck is true', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Dropdown {...defaultProps} value="option2" showCheck={true} />
    );

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // The selected option should have a check icon
    const checkIcons = container.querySelectorAll('.text-primary');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('applies custom className to trigger', () => {
    const { container } = render(
      <Dropdown {...defaultProps} className="custom-trigger-class" />
    );

    const triggerButton = screen.getByRole('button');
    expect(triggerButton).toHaveClass('custom-trigger-class');
  });

  it('applies custom menuClassName to menu', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Dropdown {...defaultProps} menuClassName="custom-menu-class" />
    );

    await user.click(screen.getByRole('button'));

    const menu = container.querySelector('.custom-menu-class');
    expect(menu).toBeInTheDocument();
  });

  it('applies minWidth to menu', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Dropdown {...defaultProps} minWidth={300} />
    );

    await user.click(screen.getByRole('button'));

    const menu = container.querySelector('.absolute.top-full');
    expect(menu).toHaveStyle({ minWidth: '300px' });
  });

  it('rotates chevron icon when dropdown is open', async () => {
    const user = userEvent.setup();
    const { container } = render(<Dropdown {...defaultProps} />);

    // Get the chevron (last svg in trigger)
    const trigger = screen.getByRole('button');
    let chevron = trigger.querySelector('.rotate-180');
    expect(chevron).toBeNull();

    // Open dropdown
    await user.click(trigger);

    // Chevron should have rotate-180 class
    chevron = trigger.querySelector('.rotate-180');
    expect(chevron).toBeInTheDocument();
  });

  it('highlights selected option in menu', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Dropdown {...defaultProps} value="option2" />
    );

    await user.click(screen.getByRole('button', { name: 'Option 2' }));

    // Get all option buttons
    const optionButtons = container.querySelectorAll('.absolute.top-full button');
    const selectedButton = Array.from(optionButtons).find(btn =>
      btn.textContent === 'Option 2'
    );

    expect(selectedButton).toHaveClass('bg-bg');
  });
});

describe('DropdownWithDescription', () => {
  const options = [
    { value: 'option1', label: 'Option 1', description: 'Description for option 1' },
    { value: 'option2', label: 'Option 2', description: 'Description for option 2' },
  ];

  const defaultProps = {
    value: null,
    onChange: vi.fn(),
    options,
    placeholder: 'Select an option',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value selected', () => {
    render(<DropdownWithDescription {...defaultProps} />);

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders with selected option label', () => {
    render(<DropdownWithDescription {...defaultProps} value="option2" />);

    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('displays descriptions for options in menu', async () => {
    const user = userEvent.setup();
    render(<DropdownWithDescription {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Description for option 1')).toBeInTheDocument();
    expect(screen.getByText('Description for option 2')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DropdownWithDescription {...defaultProps} onChange={handleChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Option 1'));

    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<DropdownWithDescription {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Description for option 1')).toBeInTheDocument();

    await user.click(screen.getByText('Option 1'));
    expect(screen.queryByText('Description for option 1')).not.toBeInTheDocument();
  });

  it('renders options with icons', async () => {
    const user = userEvent.setup();
    const optionsWithIcons = [
      { value: 'heart', label: 'Heart', icon: Heart, description: 'A heart icon' },
    ];

    const { container } = render(
      <DropdownWithDescription {...defaultProps} options={optionsWithIcons} value="heart" />
    );

    // Icon should be visible in trigger
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<DropdownWithDescription {...defaultProps} disabled={true} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
  });

  it('closes on click outside', async () => {
    const user = userEvent.setup();
    render(<DropdownWithDescription {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Description for option 1')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Description for option 1')).not.toBeInTheDocument();
  });

  it('uses default minWidth of 200', async () => {
    const user = userEvent.setup();
    const { container } = render(<DropdownWithDescription {...defaultProps} />);

    await user.click(screen.getByRole('button'));

    const menu = container.querySelector('.absolute.top-full');
    expect(menu).toHaveStyle({ minWidth: '200px' });
  });

  it('applies custom minWidth', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DropdownWithDescription {...defaultProps} minWidth={400} />
    );

    await user.click(screen.getByRole('button'));

    const menu = container.querySelector('.absolute.top-full');
    expect(menu).toHaveStyle({ minWidth: '400px' });
  });

  it('applies custom className to trigger', () => {
    render(<DropdownWithDescription {...defaultProps} className="custom-class" />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveClass('custom-class');
  });
});
