/**
 * =============================================================================
 * PROFILEPAGE.TEST.JSX - Unit Tests for ProfilePage Component
 * =============================================================================
 *
 * Tests the ProfilePage component which handles user profile management.
 * Covers:
 * - Basic rendering with user info
 * - Personal and Account tab navigation (desktop)
 * - PersonalInfoTab with form fields (name, bio, phone, location, etc.)
 * - AccountTab with email/password change and delete account
 * - Avatar upload and selection
 * - Modal interactions (change email, change password, delete account)
 * - Mobile navigation menu
 * - Form validation and save state
 *
 * Note: ProfilePage renders both mobile and desktop views simultaneously.
 * Most tests focus on desktop view interactions.
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';

// Mock react-router-dom's Link and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

// Mock profileApi
vi.mock('../../lib/api', () => ({
  profileApi: {
    updateProfile: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}));

import { profileApi } from '../../lib/api';

// Mock useUploadAvatar and useDeleteAvatar hooks
vi.mock('./hooks/useAvatar', () => ({
  useUploadAvatar: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteAvatar: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

import { useUploadAvatar, useDeleteAvatar } from './hooks/useAvatar';

// Mock useSavedLocations hook
vi.mock('../../hooks/useSavedLocations', () => ({
  useSavedLocations: vi.fn(() => ({
    data: [
      { _id: 'loc1', name: 'Home', address: '123 Main St' },
      { _id: 'loc2', name: 'Office', address: '456 Work Ave' },
    ],
    isLoading: false,
    error: null,
  })),
}));

import { useSavedLocations } from '../../hooks/useSavedLocations';

// Mock useToast hook
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock('../../hooks/useToast', () => ({
  default: vi.fn(() => mockToast),
}));

// Mock LocationPicker component
vi.mock('../../components/ui/LocationPicker', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input
      data-testid="location-picker"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock DefaultAvatar and AvatarSelector components
vi.mock('../../components/ui/DefaultAvatar', () => ({
  default: ({ avatarUrl, defaultAvatarId, name, size, className }) => (
    <div
      data-testid="default-avatar"
      data-avatar-url={avatarUrl || ''}
      data-avatar-id={defaultAvatarId || ''}
      data-name={name}
      data-size={size}
      className={className}
    >
      Avatar
    </div>
  ),
  DEFAULT_AVATARS: [
    { id: 'avatar-1', name: 'Blue Circle', svg: '<svg></svg>' },
    { id: 'avatar-2', name: 'Purple Diamond', svg: '<svg></svg>' },
  ],
  AvatarSelector: ({ selectedId, onSelect, currentAvatarUrl, onCustomAvatarBlock }) => (
    <div data-testid="avatar-selector">
      <button
        data-testid="avatar-option-1"
        onClick={() => (currentAvatarUrl ? onCustomAvatarBlock?.() : onSelect('avatar-1'))}
      >
        Avatar 1
      </button>
      <button
        data-testid="avatar-option-2"
        onClick={() => (currentAvatarUrl ? onCustomAvatarBlock?.() : onSelect('avatar-2'))}
      >
        Avatar 2
      </button>
    </div>
  ),
}));

// Mock ConfirmDialog component
vi.mock('../../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm, title, message, confirmText }) =>
    isOpen ? (
      <div data-testid="confirm-dialog" role="dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onClose} data-testid="confirm-cancel">
          Cancel
        </button>
        <button onClick={onConfirm} data-testid="confirm-action">
          {confirmText}
        </button>
      </div>
    ) : null,
}));

// Mock authSlice actions
vi.mock('../../store/authSlice', async () => {
  const actual = await vi.importActual('../../store/authSlice');
  return {
    ...actual,
    setUser: vi.fn((user) => ({
      type: 'auth/setUser',
      payload: user,
    })),
    logout: vi.fn(() => ({
      type: 'auth/logout',
    })),
  };
});

import { setUser, logout } from '../../store/authSlice';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    profileApi.updateProfile.mockResolvedValue({
      data: {
        user: {
          _id: 'user123',
          email: 'test@example.com',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            displayName: 'Johnny',
            bio: 'Updated bio',
          },
        },
      },
    });
  });

  // Default user for most tests
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    passwordChangedAt: '2024-06-15T00:00:00.000Z',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'Johnny',
      bio: 'Software developer',
      phone: '+1 555-1234',
      location: 'New York, NY',
      website: 'https://johndoe.com',
      timezone: 'America/New_York',
      avatarUrl: null,
      defaultAvatarId: 'avatar-1',
    },
  };

  // Default preloaded state
  const defaultAuthState = {
    preloadedState: {
      auth: {
        isLoading: false,
        isAuthenticated: true,
        user: mockUser,
        error: null,
      },
    },
  };

  // Helper to get the desktop view container
  const getDesktopView = () => {
    const { container } = render(<ProfilePage />, defaultAuthState);
    // Desktop view has class "hidden sm:block"
    return container.querySelector('.hidden.sm\\:block');
  };

  // ===========================================================================
  // BASIC RENDERING
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders profile page with user display name', () => {
      render(<ProfilePage />, defaultAuthState);

      // Both mobile and desktop show the display name
      const displayNames = screen.getAllByText('Johnny');
      expect(displayNames.length).toBeGreaterThan(0);
    });

    it('renders user email', () => {
      render(<ProfilePage />, defaultAuthState);

      const emails = screen.getAllByText('test@example.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('renders avatar component', () => {
      render(<ProfilePage />, defaultAuthState);

      const avatars = screen.getAllByTestId('default-avatar');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('displays full name when no display name is set', () => {
      const userWithoutDisplayName = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          displayName: '',
        },
      };

      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithoutDisplayName,
            error: null,
          },
        },
      });

      const fullNames = screen.getAllByText('John Doe');
      expect(fullNames.length).toBeGreaterThan(0);
    });

    it('displays email username when no name is available', () => {
      const userWithoutNames = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          firstName: '',
          lastName: '',
          displayName: '',
        },
      };

      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithoutNames,
            error: null,
          },
        },
      });

      const usernames = screen.getAllByText('test');
      expect(usernames.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // DESKTOP TAB NAVIGATION
  // ===========================================================================

  describe('Desktop Tab Navigation', () => {
    it('renders Personal Information and Account tabs', () => {
      render(<ProfilePage />, defaultAuthState);

      // Get all buttons with these names (mobile + desktop)
      const personalTabs = screen.getAllByText(/Personal Information/i);
      const accountTabs = screen.getAllByText(/Account/i);
      expect(personalTabs.length).toBeGreaterThan(0);
      expect(accountTabs.length).toBeGreaterThan(0);
    });

    it('shows Personal tab content by default', () => {
      render(<ProfilePage />, defaultAuthState);

      // Personal tab content includes form fields - query by placeholder since labels aren't linked
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      const lastNameInputs = screen.getAllByPlaceholderText('Doe');
      expect(firstNameInputs.length).toBeGreaterThan(0);
      expect(lastNameInputs.length).toBeGreaterThan(0);
    });

    it('switches to Account tab when clicked on desktop', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Find the desktop Account tab (it's a button, not inside a menu button)
      const accountButtons = screen.getAllByRole('button', { name: /Account/i });
      // The desktop tab is the one that's visible and has tab styling
      const desktopAccountTab = accountButtons.find(
        (btn) => btn.className.includes('border-b-2')
      );

      if (desktopAccountTab) {
        await user.click(desktopAccountTab);
      } else {
        // Fallback - click the first Account button
        await user.click(accountButtons[0]);
      }

      // Should now show Account content
      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // PERSONAL INFO TAB CONTENT
  // ===========================================================================

  describe('PersonalInfoTab Content', () => {
    it('renders all form fields with correct values', () => {
      render(<ProfilePage />, defaultAuthState);

      // Query by placeholder since labels aren't properly linked with htmlFor
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      const lastNameInputs = screen.getAllByPlaceholderText('Doe');
      const displayNameInputs = screen.getAllByPlaceholderText('How you want to be called');
      const bioInputs = screen.getAllByPlaceholderText('Tell us about yourself...');

      // Check at least one has the correct value
      expect(firstNameInputs.some((input) => input.value === 'John')).toBe(true);
      expect(lastNameInputs.some((input) => input.value === 'Doe')).toBe(true);
      expect(displayNameInputs.some((input) => input.value === 'Johnny')).toBe(true);
      expect(bioInputs.some((input) => input.value === 'Software developer')).toBe(true);
    });

    it('renders phone input', () => {
      render(<ProfilePage />, defaultAuthState);

      const phoneInputs = screen.getAllByPlaceholderText('+1 (555) 123-4567');
      expect(phoneInputs.some((input) => input.value === '+1 555-1234')).toBe(true);
    });

    it('renders location picker', () => {
      render(<ProfilePage />, defaultAuthState);

      const locationPickers = screen.getAllByTestId('location-picker');
      expect(locationPickers.length).toBeGreaterThan(0);
    });

    it('renders website input', () => {
      render(<ProfilePage />, defaultAuthState);

      const websiteInputs = screen.getAllByPlaceholderText('https://yourwebsite.com');
      expect(websiteInputs.some((input) => input.value === 'https://johndoe.com')).toBe(true);
    });

    it('renders timezone selector', () => {
      render(<ProfilePage />, defaultAuthState);

      const timezoneSelects = screen.getAllByRole('combobox');
      expect(timezoneSelects.some((select) => select.value === 'America/New_York')).toBe(true);
    });

    it('renders avatar selector', () => {
      render(<ProfilePage />, defaultAuthState);

      const avatarSelectors = screen.getAllByTestId('avatar-selector');
      expect(avatarSelectors.length).toBeGreaterThan(0);
    });

    it('renders bio character counter', () => {
      render(<ProfilePage />, defaultAuthState);

      // "Software developer" is 18 characters
      const counters = screen.getAllByText('18/500 characters');
      expect(counters.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // FORM INPUT CHANGES
  // ===========================================================================

  describe('Form Input Changes', () => {
    it('updates first name field when typing', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Get all first name inputs by placeholder and use the first one (desktop view)
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      const firstNameInput = firstNameInputs[0];

      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('updates bio field when typing', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      const bioInputs = screen.getAllByPlaceholderText('Tell us about yourself...');
      const bioInput = bioInputs[0];

      await user.clear(bioInput);
      await user.type(bioInput, 'New bio content');

      expect(bioInput).toHaveValue('New bio content');
    });

    it('enables save button when form changes are made', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Get all save buttons
      const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      // All should be disabled initially
      expect(saveButtons.every((btn) => btn.disabled)).toBe(true);

      // Make a change
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      await user.type(firstNameInputs[0], 'x');

      // Now at least one save button should be enabled
      const updatedSaveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      expect(updatedSaveButtons.some((btn) => !btn.disabled)).toBe(true);
    });

    it('updates timezone when selected', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      const timezoneSelects = screen.getAllByRole('combobox');
      await user.selectOptions(timezoneSelects[0], 'America/Los_Angeles');

      expect(timezoneSelects[0]).toHaveValue('America/Los_Angeles');
    });
  });

  // ===========================================================================
  // FORM SUBMISSION
  // ===========================================================================

  describe('Form Submission', () => {
    it('calls updateProfile API when form is submitted', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Make a change to enable save button
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      await user.type(firstNameInputs[0], 'x');

      // Submit the form
      const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      const enabledSaveButton = saveButtons.find((btn) => !btn.disabled);
      await user.click(enabledSaveButton);

      await waitFor(() => {
        expect(profileApi.updateProfile).toHaveBeenCalled();
      });
    });

    it('dispatches setUser on successful profile update', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Make a change
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      await user.type(firstNameInputs[0], 'x');

      // Submit
      const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      const enabledSaveButton = saveButtons.find((btn) => !btn.disabled);
      await user.click(enabledSaveButton);

      await waitFor(() => {
        expect(setUser).toHaveBeenCalled();
      });
    });

    it('shows success toast on successful profile update', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Make a change and submit
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      await user.type(firstNameInputs[0], 'x');

      const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      const enabledSaveButton = saveButtons.find((btn) => !btn.disabled);
      await user.click(enabledSaveButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Profile updated successfully');
      });
    });

    it('shows error toast on failed profile update', async () => {
      profileApi.updateProfile.mockRejectedValueOnce(new Error('Update failed'));

      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      // Make a change and submit
      const firstNameInputs = screen.getAllByPlaceholderText('John');
      await user.type(firstNameInputs[0], 'x');

      const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
      const enabledSaveButton = saveButtons.find((btn) => !btn.disabled);
      await user.click(enabledSaveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Update failed');
      });
    });
  });

  // ===========================================================================
  // ACCOUNT TAB CONTENT
  // ===========================================================================

  describe('AccountTab Content', () => {
    // Helper to switch to Account tab on desktop
    const switchToAccountTab = async (user) => {
      // Find desktop Account tabs (those with border-b-2 class from tab styling)
      const allAccountButtons = screen.getAllByRole('button', { name: /Account/i });
      // Desktop tab has the tab styling class
      const desktopTab = allAccountButtons.find(btn =>
        btn.className.includes('border-b') || btn.className.includes('whitespace-nowrap')
      ) || allAccountButtons[allAccountButtons.length - 1];
      await user.click(desktopTab);
    };

    it('displays current email address in Account tab', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });
    });

    it('displays account details section', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Account Details')).toBeInTheDocument();
        expect(screen.getByText('Account created:')).toBeInTheDocument();
        expect(screen.getByText('Role:')).toBeInTheDocument();
        expect(screen.getByText('Status:')).toBeInTheDocument();
      });
    });

    it('displays Delete Account button in danger zone', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // CHANGE EMAIL MODAL
  // ===========================================================================

  describe('Change Email Modal', () => {
    // Helper to switch to Account tab on desktop
    const switchToAccountTab = async (user) => {
      const allAccountButtons = screen.getAllByRole('button', { name: /Account/i });
      const desktopTab = allAccountButtons.find(btn =>
        btn.className.includes('border-b') || btn.className.includes('whitespace-nowrap')
      ) || allAccountButtons[allAccountButtons.length - 1];
      await user.click(desktopTab);
    };

    it('opens change email modal when Change button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });

      // Find the Change button for email
      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[0]);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByText('Change Email Address')).toBeInTheDocument();
      });
    });

    it('closes email modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Change Email Address')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      await user.click(cancelButtons[0]);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Change Email Address')).not.toBeInTheDocument();
      });
    });

    it('submits email change with correct data', async () => {
      profileApi.changeEmail.mockResolvedValueOnce({
        data: { user: { ...mockUser, email: 'newemail@example.com' } },
      });

      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Email Address')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('newemail@example.com')).toBeInTheDocument();
      });

      // Fill in the form
      await user.type(screen.getByPlaceholderText('newemail@example.com'), 'newemail@example.com');
      await user.type(screen.getByPlaceholderText('Enter your current password'), 'mypassword123');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Change Email' }));

      await waitFor(() => {
        expect(profileApi.changeEmail).toHaveBeenCalledWith('newemail@example.com', 'mypassword123');
      });
    });
  });

  // ===========================================================================
  // CHANGE PASSWORD MODAL
  // ===========================================================================

  describe('Change Password Modal', () => {
    // Helper to switch to Account tab on desktop
    const switchToAccountTab = async (user) => {
      const allAccountButtons = screen.getAllByRole('button', { name: /Account/i });
      const desktopTab = allAccountButtons.find(btn =>
        btn.className.includes('border-b') || btn.className.includes('whitespace-nowrap')
      ) || allAccountButtons[allAccountButtons.length - 1];
      await user.click(desktopTab);
    };

    it('opens change password modal when Change button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Password')).toBeInTheDocument();
      });

      // Find the Change button that's after the Password section
      // There should be 2 Change buttons: one for email, one for password
      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      // The password change button is the last one
      await user.click(changeButtons[changeButtons.length - 1]);

      // Modal opens - check for the form elements inside
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
      });
    });

    it('validates passwords match before submitting', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Password')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[1]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter current password'), 'currentpass');
      await user.type(screen.getByPlaceholderText('Min 8 characters'), 'newpassword123');
      await user.type(screen.getByPlaceholderText('Confirm new password'), 'differentpass');

      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('New passwords do not match');
      });
      expect(profileApi.changePassword).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Password')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[1]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter current password'), 'currentpass');
      await user.type(screen.getByPlaceholderText('Min 8 characters'), 'short');
      await user.type(screen.getByPlaceholderText('Confirm new password'), 'short');

      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('New password must be at least 8 characters');
      });
    });

    it('submits password change with correct data', async () => {
      profileApi.changePassword.mockResolvedValueOnce({ data: { success: true } });

      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Password')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[1]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter current password'), 'currentpass');
      await user.type(screen.getByPlaceholderText('Min 8 characters'), 'newpassword123');
      await user.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');

      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      await waitFor(() => {
        expect(profileApi.changePassword).toHaveBeenCalledWith('currentpass', 'newpassword123');
      });
    });

    it('shows success toast on successful password change', async () => {
      profileApi.changePassword.mockResolvedValueOnce({ data: { success: true } });

      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Password')).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: 'Change' });
      await user.click(changeButtons[1]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter current password'), 'currentpass');
      await user.type(screen.getByPlaceholderText('Min 8 characters'), 'newpassword123');
      await user.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');

      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Password changed successfully');
      });
    });
  });

  // ===========================================================================
  // DELETE ACCOUNT MODAL
  // ===========================================================================

  describe('Delete Account Modal', () => {
    // Helper to switch to Account tab on desktop
    const switchToAccountTab = async (user) => {
      const allAccountButtons = screen.getAllByRole('button', { name: /Account/i });
      const desktopTab = allAccountButtons.find(btn =>
        btn.className.includes('border-b') || btn.className.includes('whitespace-nowrap')
      ) || allAccountButtons[allAccountButtons.length - 1];
      await user.click(desktopTab);
    };

    it('opens delete account modal when Delete Account is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Delete Account/i }));

      await waitFor(() => {
        expect(screen.getByText('Delete Account?')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
      });
    });

    it('shows delete modal with password field and delete button', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      // Click the Delete Account button to open the modal
      const deleteAccountButton = screen.getByRole('button', { name: /Delete Account/i });
      await user.click(deleteAccountButton);

      // Modal should have the expected elements
      await waitFor(() => {
        expect(screen.getByText('Delete Account?')).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete Forever' })).toBeInTheDocument();
      });
    });

    it('submits delete account request with password', async () => {
      profileApi.deleteAccount.mockResolvedValueOnce({ data: { success: true } });

      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await switchToAccountTab(user);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Delete Account/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter your password'), 'mypassword');
      await user.click(screen.getByRole('button', { name: 'Delete Forever' }));

      await waitFor(() => {
        expect(profileApi.deleteAccount).toHaveBeenCalledWith('mypassword');
      });
    });
  });

  // ===========================================================================
  // AVATAR FUNCTIONALITY
  // ===========================================================================

  describe('Avatar Functionality', () => {
    it('renders avatar with correct props', () => {
      render(<ProfilePage />, defaultAuthState);

      const avatars = screen.getAllByTestId('default-avatar');
      const avatar = avatars[0];
      expect(avatar).toHaveAttribute('data-avatar-id', 'avatar-1');
      expect(avatar).toHaveAttribute('data-name', 'Johnny');
    });

    it('selects default avatar when clicked (no custom avatar)', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      const avatarOptions = screen.getAllByTestId('avatar-option-2');
      await user.click(avatarOptions[0]);

      await waitFor(() => {
        expect(profileApi.updateProfile).toHaveBeenCalledWith({ defaultAvatarId: 'avatar-2' });
      });
    });

    it('shows info toast when trying to select default avatar with custom avatar', async () => {
      const userWithCustomAvatar = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      const user = userEvent.setup();
      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithCustomAvatar,
            error: null,
          },
        },
      });

      const avatarOptions = screen.getAllByTestId('avatar-option-1');
      await user.click(avatarOptions[0]);

      expect(mockToast.info).toHaveBeenCalledWith('Delete your custom avatar first to use a default one');
    });

    it('shows delete avatar button when user has custom avatar', () => {
      const userWithCustomAvatar = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithCustomAvatar,
            error: null,
          },
        },
      });

      // Find the delete avatar button (with Trash2 icon)
      const deleteButtons = screen.getAllByTitle('Remove avatar');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('opens confirm dialog when delete avatar button is clicked', async () => {
      const userWithCustomAvatar = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      const user = userEvent.setup();
      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithCustomAvatar,
            error: null,
          },
        },
      });

      const deleteButtons = screen.getAllByTitle('Remove avatar');
      await user.click(deleteButtons[0]);

      // ConfirmDialog should open - it renders with data-testid="confirm-dialog"
      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });
      // Check for the dialog title using the h2 element specifically
      expect(screen.getByRole('heading', { name: 'Remove Avatar' })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // MOBILE VIEW
  // ===========================================================================

  describe('Mobile View', () => {
    it('renders mobile navigation menu with sections', () => {
      render(<ProfilePage />, defaultAuthState);

      // Mobile menu should have the navigation items
      const personalItems = screen.getAllByText('Personal Information');
      const accountItems = screen.getAllByText(/Account/);
      expect(personalItems.length).toBeGreaterThan(0);
      expect(accountItems.length).toBeGreaterThan(0);
    });

    it('renders sign out button', () => {
      render(<ProfilePage />, defaultAuthState);

      const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('calls logout when sign out is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />, defaultAuthState);

      await user.click(screen.getByRole('button', { name: /Sign Out/i }));

      expect(logout).toHaveBeenCalled();
    });

    it('calls onMobileClose when close button is clicked', async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();
      render(<ProfilePage onMobileClose={mockOnClose} />, defaultAuthState);

      // Find close button in mobile header (has aria-label "Close")
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DESKTOP NAVIGATION
  // ===========================================================================

  describe('Desktop Navigation', () => {
    it('renders Back to Dashboard link', () => {
      render(<ProfilePage />, defaultAuthState);

      const backLink = screen.getByRole('link', { name: /Back to Dashboard/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/app');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles user with minimal profile data', () => {
      const userWithMinimalProfile = {
        _id: 'user123',
        email: 'minimal@example.com',
        role: 'user',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        profile: {
          firstName: '',
          lastName: '',
          displayName: '',
          bio: '',
          phone: '',
          location: '',
          website: '',
          timezone: 'UTC',
        },
      };

      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: userWithMinimalProfile,
            error: null,
          },
        },
      });

      // Should render without errors - the email username is shown as fallback name
      const usernames = screen.getAllByText('minimal');
      expect(usernames.length).toBeGreaterThan(0);

      // Email should be displayed
      const emails = screen.getAllByText('minimal@example.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('handles null user gracefully', () => {
      // This tests defensive coding - though should not happen in practice
      render(<ProfilePage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      // Should not crash - displays "User" as fallback name
      const userTexts = screen.getAllByText('User');
      expect(userTexts.length).toBeGreaterThan(0);
    });

    it('handles empty saved locations', () => {
      useSavedLocations.mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<ProfilePage />, defaultAuthState);

      const locationPickers = screen.getAllByTestId('location-picker');
      expect(locationPickers.length).toBeGreaterThan(0);
    });
  });
});
