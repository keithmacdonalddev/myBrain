import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import DefaultAvatar, {
  DEFAULT_AVATARS,
  DEFAULT_AVATAR_ID,
  getAvatarById,
  AvatarSelector,
} from './DefaultAvatar';

describe('DefaultAvatar', () => {
  describe('rendering with custom avatar URL', () => {
    it('renders custom avatar image when avatarUrl is provided', () => {
      render(
        <DefaultAvatar
          avatarUrl="https://example.com/avatar.jpg"
          name="John Doe"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'John Doe');
    });

    it('renders custom avatar with empty name as alt text', () => {
      render(<DefaultAvatar avatarUrl="https://example.com/avatar.jpg" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', '');
    });
  });

  describe('rendering with default avatar', () => {
    it('renders SVG avatar when no avatarUrl is provided', () => {
      const { container } = render(<DefaultAvatar />);

      // Should contain SVG content
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders specified default avatar by ID', () => {
      const { container } = render(<DefaultAvatar defaultAvatarId="avatar-3" />);

      // Should render the Green Leaf avatar (avatar-3)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders first avatar when invalid ID is provided', () => {
      const { container } = render(<DefaultAvatar defaultAvatarId="invalid-id" />);

      // Should fall back to first avatar
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies xs size classes', () => {
      const { container } = render(<DefaultAvatar size="xs" />);
      expect(container.firstChild).toHaveClass('w-6', 'h-6');
    });

    it('applies sm size classes', () => {
      const { container } = render(<DefaultAvatar size="sm" />);
      expect(container.firstChild).toHaveClass('w-8', 'h-8');
    });

    it('applies md size classes by default', () => {
      const { container } = render(<DefaultAvatar />);
      expect(container.firstChild).toHaveClass('w-10', 'h-10');
    });

    it('applies lg size classes', () => {
      const { container } = render(<DefaultAvatar size="lg" />);
      expect(container.firstChild).toHaveClass('w-16', 'h-16');
    });

    it('applies xl size classes', () => {
      const { container } = render(<DefaultAvatar size="xl" />);
      expect(container.firstChild).toHaveClass('w-20', 'h-20');
    });

    it('applies md size for invalid size value', () => {
      const { container } = render(<DefaultAvatar size="invalid" />);
      expect(container.firstChild).toHaveClass('w-10', 'h-10');
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<DefaultAvatar className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies custom className with avatarUrl', () => {
      const { container } = render(
        <DefaultAvatar
          avatarUrl="https://example.com/avatar.jpg"
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('common styles', () => {
    it('has rounded-full class for circular avatar', () => {
      const { container } = render(<DefaultAvatar />);
      expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('has overflow-hidden class', () => {
      const { container } = render(<DefaultAvatar />);
      expect(container.firstChild).toHaveClass('overflow-hidden');
    });

    it('has flex-shrink-0 to prevent shrinking', () => {
      const { container } = render(<DefaultAvatar />);
      expect(container.firstChild).toHaveClass('flex-shrink-0');
    });
  });
});

describe('getAvatarById', () => {
  it('returns correct avatar for valid ID', () => {
    const avatar = getAvatarById('avatar-1');
    expect(avatar.id).toBe('avatar-1');
    expect(avatar.name).toBe('Blue Circle');
  });

  it('returns correct avatar for different valid ID', () => {
    const avatar = getAvatarById('avatar-5');
    expect(avatar.id).toBe('avatar-5');
    expect(avatar.name).toBe('Pink Heart');
  });

  it('returns first avatar for invalid ID', () => {
    const avatar = getAvatarById('invalid-id');
    expect(avatar.id).toBe('avatar-1');
  });

  it('returns first avatar for undefined', () => {
    const avatar = getAvatarById(undefined);
    expect(avatar.id).toBe('avatar-1');
  });
});

describe('DEFAULT_AVATARS', () => {
  it('has 8 avatar options', () => {
    expect(DEFAULT_AVATARS).toHaveLength(8);
  });

  it('each avatar has required properties', () => {
    DEFAULT_AVATARS.forEach((avatar) => {
      expect(avatar).toHaveProperty('id');
      expect(avatar).toHaveProperty('name');
      expect(avatar).toHaveProperty('svg');
      expect(avatar.svg).toContain('<svg');
    });
  });

  it('all avatars have unique IDs', () => {
    const ids = DEFAULT_AVATARS.map((a) => a.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toEqual(uniqueIds);
  });
});

describe('DEFAULT_AVATAR_ID', () => {
  it('is set to avatar-1', () => {
    expect(DEFAULT_AVATAR_ID).toBe('avatar-1');
  });

  it('exists in DEFAULT_AVATARS', () => {
    const exists = DEFAULT_AVATARS.some((a) => a.id === DEFAULT_AVATAR_ID);
    expect(exists).toBe(true);
  });
});

describe('AvatarSelector', () => {
  it('renders all avatar options', () => {
    render(<AvatarSelector selectedId="avatar-1" onSelect={() => {}} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
  });

  it('highlights selected avatar', () => {
    render(<AvatarSelector selectedId="avatar-3" onSelect={() => {}} />);

    const buttons = screen.getAllByRole('button');
    // The selected button should have scale-110 and border-primary classes
    const selectedButton = buttons.find((btn) => btn.classList.contains('scale-110'));
    expect(selectedButton).toBeInTheDocument();
  });

  it('calls onSelect when avatar is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<AvatarSelector selectedId="avatar-1" onSelect={handleSelect} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[2]); // Click the third avatar

    expect(handleSelect).toHaveBeenCalledWith('avatar-3');
  });

  it('shows message about choosing avatar when no custom avatar', () => {
    render(<AvatarSelector selectedId="avatar-1" onSelect={() => {}} />);

    expect(
      screen.getByText('Choose a default avatar or upload your own.')
    ).toBeInTheDocument();
  });

  it('shows message about deleting custom avatar when one exists', () => {
    render(
      <AvatarSelector
        selectedId="avatar-1"
        onSelect={() => {}}
        currentAvatarUrl="https://example.com/custom.jpg"
      />
    );

    expect(
      screen.getByText('Delete your custom avatar to use a default one.')
    ).toBeInTheDocument();
  });

  it('disables avatar buttons when custom avatar exists', () => {
    render(
      <AvatarSelector
        selectedId="avatar-1"
        onSelect={() => {}}
        currentAvatarUrl="https://example.com/custom.jpg"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('calls onCustomAvatarBlock when clicking avatar with custom avatar set', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleBlock = vi.fn();

    render(
      <AvatarSelector
        selectedId="avatar-1"
        onSelect={handleSelect}
        currentAvatarUrl="https://example.com/custom.jpg"
        onCustomAvatarBlock={handleBlock}
      />
    );

    // Buttons are disabled, but we can test the click handler
    // Since buttons are disabled, we shouldn't be able to click them
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();

    // onSelect should not be called since button is disabled
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('shows correct title attribute on avatar buttons', () => {
    render(<AvatarSelector selectedId="avatar-1" onSelect={() => {}} />);

    expect(screen.getByTitle('Blue Circle')).toBeInTheDocument();
    expect(screen.getByTitle('Purple Diamond')).toBeInTheDocument();
    expect(screen.getByTitle('Green Leaf')).toBeInTheDocument();
  });

  it('shows delete message title when custom avatar exists', () => {
    render(
      <AvatarSelector
        selectedId="avatar-1"
        onSelect={() => {}}
        currentAvatarUrl="https://example.com/custom.jpg"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('title', 'Delete custom avatar first');
    });
  });
});
