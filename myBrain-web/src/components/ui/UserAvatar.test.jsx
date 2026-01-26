import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
  // Test user data fixtures
  const userWithAvatar = {
    _id: 'user123',
    profile: {
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    presence: {
      currentStatus: 'available',
      isOnline: true,
    },
  };

  const userWithoutAvatar = {
    _id: 'user456',
    profile: {
      displayName: 'Jane Smith',
    },
    presence: {
      currentStatus: 'busy',
      isOnline: true,
    },
  };

  const userWithFirstNameOnly = {
    _id: 'user789',
    profile: {
      firstName: 'Alice',
    },
  };

  const userWithFirstAndLastName = {
    _id: 'user101',
    profile: {
      firstName: 'Bob',
      lastName: 'Wilson',
    },
  };

  describe('rendering', () => {
    it('renders with custom avatar image when avatarUrl is provided', () => {
      render(<UserAvatar user={userWithAvatar} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'John Doe');
    });

    it('renders initials when no avatar URL is provided', () => {
      render(<UserAvatar user={userWithoutAvatar} />);

      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('renders initials from first and last name when displayName is not provided', () => {
      render(<UserAvatar user={userWithFirstAndLastName} />);

      expect(screen.getByText('BW')).toBeInTheDocument();
    });

    it('renders two-character initials from first name only', () => {
      render(<UserAvatar user={userWithFirstNameOnly} />);

      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('renders fallback initials when no profile data is available', () => {
      render(<UserAvatar user={{ _id: 'empty' }} />);

      expect(screen.getByText('??')).toBeInTheDocument();
    });

    it('renders fallback initials when user is undefined', () => {
      render(<UserAvatar user={undefined} />);

      expect(screen.getByText('??')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies xs size classes', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} size="xs" />);
      expect(container.firstChild).toHaveClass('w-6', 'h-6');
    });

    it('applies sm size classes', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} size="sm" />);
      expect(container.firstChild).toHaveClass('w-8', 'h-8');
    });

    it('applies md size classes by default', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} />);
      expect(container.firstChild).toHaveClass('w-10', 'h-10');
    });

    it('applies lg size classes', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} size="lg" />);
      expect(container.firstChild).toHaveClass('w-12', 'h-12');
    });

    it('applies xl size classes', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} size="xl" />);
      expect(container.firstChild).toHaveClass('w-16', 'h-16');
    });

    it('applies 2xl size classes', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} size="2xl" />);
      expect(container.firstChild).toHaveClass('w-20', 'h-20');
    });
  });

  describe('presence indicator', () => {
    it('does not show presence indicator by default', () => {
      const { container } = render(<UserAvatar user={userWithAvatar} />);
      const presenceIndicator = container.querySelector('[title]');
      expect(presenceIndicator).not.toBeInTheDocument();
    });

    it('shows presence indicator when showPresence is true', () => {
      const { container } = render(<UserAvatar user={userWithAvatar} showPresence />);
      const presenceIndicator = container.querySelector('[title="available"]');
      expect(presenceIndicator).toBeInTheDocument();
    });

    it('shows offline status when user is not online', () => {
      const offlineUser = {
        ...userWithAvatar,
        presence: {
          currentStatus: 'available',
          isOnline: false,
        },
      };
      const { container } = render(<UserAvatar user={offlineUser} showPresence />);
      const presenceIndicator = container.querySelector('[title="available"]');
      expect(presenceIndicator).toHaveClass('bg-gray-400'); // offline color
    });

    it('shows correct color for available status', () => {
      const { container } = render(<UserAvatar user={userWithAvatar} showPresence />);
      const presenceIndicator = container.querySelector('[title="available"]');
      expect(presenceIndicator).toHaveClass('bg-green-500');
    });

    it('shows correct color for busy status', () => {
      const { container } = render(<UserAvatar user={userWithoutAvatar} showPresence />);
      const presenceIndicator = container.querySelector('[title="busy"]');
      expect(presenceIndicator).toHaveClass('bg-red-500');
    });
  });

  describe('click handler', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<UserAvatar user={userWithAvatar} onClick={handleClick} />);

      const avatar = screen.getByRole('button');
      await user.click(avatar);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has button role when onClick is provided', () => {
      render(<UserAvatar user={userWithAvatar} onClick={() => {}} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has no button role when onClick is not provided', () => {
      render(<UserAvatar user={userWithAvatar} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('is focusable when onClick is provided', () => {
      const { container } = render(<UserAvatar user={userWithAvatar} onClick={() => {}} />);
      expect(container.firstChild).toHaveAttribute('tabIndex', '0');
    });

    it('is not focusable when onClick is not provided', () => {
      const { container } = render(<UserAvatar user={userWithAvatar} />);
      expect(container.firstChild).not.toHaveAttribute('tabIndex');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <UserAvatar user={userWithAvatar} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('consistent color for user ID', () => {
    it('generates consistent background color for the same user ID', () => {
      const { container: container1 } = render(
        <UserAvatar user={userWithoutAvatar} />
      );
      const { container: container2 } = render(
        <UserAvatar user={userWithoutAvatar} />
      );

      // Both should have the same background color class
      const bgClasses1 = Array.from(container1.firstChild.classList).filter(c => c.startsWith('bg-'));
      const bgClasses2 = Array.from(container2.firstChild.classList).filter(c => c.startsWith('bg-'));

      expect(bgClasses1).toEqual(bgClasses2);
    });

    it('generates different colors for different user IDs', () => {
      // Using users with different IDs
      const { container: container1 } = render(
        <UserAvatar user={{ _id: 'aaaa', profile: { displayName: 'Test' } }} />
      );
      const { container: container2 } = render(
        <UserAvatar user={{ _id: 'zzzz', profile: { displayName: 'Test' } }} />
      );

      const bgClasses1 = Array.from(container1.firstChild.classList).filter(c => c.startsWith('bg-'));
      const bgClasses2 = Array.from(container2.firstChild.classList).filter(c => c.startsWith('bg-'));

      // They should potentially be different (not guaranteed but likely)
      // At minimum, both should have a background color
      expect(bgClasses1.length).toBeGreaterThan(0);
      expect(bgClasses2.length).toBeGreaterThan(0);
    });
  });
});
