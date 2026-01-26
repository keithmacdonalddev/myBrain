import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import authReducer from '../store/authSlice';
import FeatureGate, {
  AdminGate,
  ComingSoon,
  FeatureNotEnabled,
  AccessDenied,
} from './FeatureGate';

/**
 * Test file for FeatureGate components
 *
 * FeatureGate - Conditionally renders children based on feature flags
 * AdminGate - Renders children only for admin users
 * ComingSoon - Placeholder for features under development
 * FeatureNotEnabled - Placeholder for premium/optional features
 * AccessDenied - Placeholder for admin-only areas
 */

// Helper to create store with specific auth state
function createStoreWithAuth(authState) {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...authState,
      },
    },
  });
}

// Custom render with routing support
function renderWithProviders(ui, { store } = {}) {
  const testStore = store || createStoreWithAuth({});

  return render(
    <Provider store={testStore}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </Provider>,
    { wrapper: ({ children }) => children }
  );
}

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when flag is enabled', () => {
    it('renders children when user has the feature flag', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: true },
        },
      });

      renderWithProviders(
        <FeatureGate flag="fitnessEnabled">
          <div>Fitness Feature</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.getByText('Fitness Feature')).toBeInTheDocument();
    });

    it('renders complex children when flag is enabled', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { kbEnabled: true },
        },
      });

      renderWithProviders(
        <FeatureGate flag="kbEnabled">
          <div>
            <h1>Knowledge Base</h1>
            <p>Your personal wiki</p>
            <button>Create Article</button>
          </div>
        </FeatureGate>,
        { store }
      );

      expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
      expect(screen.getByText('Your personal wiki')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Article' })).toBeInTheDocument();
    });
  });

  describe('when flag is disabled', () => {
    it('renders nothing when flag is disabled and no fallback provided', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: false },
        },
      });

      const { container } = renderWithProviders(
        <FeatureGate flag="fitnessEnabled">
          <div>Fitness Feature</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Fitness Feature')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it('renders fallback when flag is disabled', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: false },
        },
      });

      renderWithProviders(
        <FeatureGate flag="fitnessEnabled" fallback={<div>Feature Unavailable</div>}>
          <div>Fitness Feature</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Fitness Feature')).not.toBeInTheDocument();
      expect(screen.getByText('Feature Unavailable')).toBeInTheDocument();
    });

    it('renders ComingSoon as fallback', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { betaFeature: false },
        },
      });

      renderWithProviders(
        <FeatureGate flag="betaFeature" fallback={<ComingSoon featureName="Beta Feature" />}>
          <div>Beta Content</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Beta Content')).not.toBeInTheDocument();
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });
  });

  describe('when flag does not exist', () => {
    it('returns false for non-existent flag', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
          flags: { existingFlag: true },
        },
      });

      renderWithProviders(
        <FeatureGate flag="nonExistentFlag" fallback={<div>Fallback</div>}>
          <div>Feature Content</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });
  });

  describe('when user has no flags', () => {
    it('returns fallback when user has no flags object', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'test@example.com',
        },
      });

      renderWithProviders(
        <FeatureGate flag="anyFlag" fallback={<div>Fallback</div>}>
          <div>Feature Content</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });

    it('returns fallback when user is null', () => {
      const store = createStoreWithAuth({
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(
        <FeatureGate flag="anyFlag" fallback={<div>Fallback</div>}>
          <div>Feature Content</div>
        </FeatureGate>,
        { store }
      );

      expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });
  });
});

describe('AdminGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is admin', () => {
    it('renders children for admin users', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      renderWithProviders(
        <AdminGate>
          <div>Admin Only Content</div>
        </AdminGate>,
        { store }
      );

      expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
    });
  });

  describe('when user is not admin', () => {
    it('shows AccessDenied by default for non-admin users', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'user@example.com',
          role: 'user',
        },
      });

      renderWithProviders(
        <AdminGate>
          <div>Admin Only Content</div>
        </AdminGate>,
        { store }
      );

      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'user@example.com',
          role: 'user',
        },
      });

      renderWithProviders(
        <AdminGate fallback={<div>Custom Non-Admin Message</div>}>
          <div>Admin Only Content</div>
        </AdminGate>,
        { store }
      );

      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
      expect(screen.getByText('Custom Non-Admin Message')).toBeInTheDocument();
    });

    it('shows AccessDenied when user has no role', () => {
      const store = createStoreWithAuth({
        isAuthenticated: true,
        user: {
          id: '123',
          email: 'user@example.com',
        },
      });

      renderWithProviders(
        <AdminGate>
          <div>Admin Only Content</div>
        </AdminGate>,
        { store }
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('shows AccessDenied when user is null', () => {
      const store = createStoreWithAuth({
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(
        <AdminGate>
          <div>Admin Only Content</div>
        </AdminGate>,
        { store }
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });
});

describe('ComingSoon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default feature name', () => {
    renderWithProviders(<ComingSoon />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.getByText(/This feature is currently under development/i)).toBeInTheDocument();
  });

  it('renders with custom feature name', () => {
    renderWithProviders(<ComingSoon featureName="Dark Mode" />);

    expect(screen.getByText(/Dark Mode is currently under development/i)).toBeInTheDocument();
  });

  it('displays rocket icon', () => {
    const { container } = renderWithProviders(<ComingSoon />);

    const icon = container.querySelector('svg.lucide-rocket');
    expect(icon).toBeInTheDocument();
  });

  it('renders Go Back button', () => {
    renderWithProviders(<ComingSoon />);

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('renders Dashboard button', () => {
    renderWithProviders(<ComingSoon />);

    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('has proper styling container', () => {
    const { container } = renderWithProviders(<ComingSoon />);

    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('FeatureNotEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default feature name', () => {
    renderWithProviders(<FeatureNotEnabled />);

    expect(screen.getByText('Feature Not Available')).toBeInTheDocument();
    expect(screen.getByText(/This feature is not enabled for your account/i)).toBeInTheDocument();
  });

  it('renders with custom feature name', () => {
    renderWithProviders(<FeatureNotEnabled featureName="Premium Analytics" />);

    expect(screen.getByText(/Premium Analytics is not enabled for your account/i)).toBeInTheDocument();
  });

  it('displays lock icon', () => {
    const { container } = renderWithProviders(<FeatureNotEnabled />);

    const icon = container.querySelector('svg.lucide-lock');
    expect(icon).toBeInTheDocument();
  });

  it('renders Go Back button', () => {
    renderWithProviders(<FeatureNotEnabled />);

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('renders Dashboard button', () => {
    renderWithProviders(<FeatureNotEnabled />);

    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('mentions subscription or admin approval', () => {
    renderWithProviders(<FeatureNotEnabled />);

    expect(screen.getByText(/subscription plan or admin approval/i)).toBeInTheDocument();
  });
});

describe('AccessDenied', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default message', () => {
    renderWithProviders(<AccessDenied />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/don't have permission to access this page/i)).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    renderWithProviders(<AccessDenied message="Only VIP users can access this area." />);

    expect(screen.getByText('Only VIP users can access this area.')).toBeInTheDocument();
  });

  it('displays shield icon', () => {
    const { container } = renderWithProviders(<AccessDenied />);

    const icon = container.querySelector('svg.lucide-shield-x');
    expect(icon).toBeInTheDocument();
  });

  it('renders Go Back button', () => {
    renderWithProviders(<AccessDenied />);

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('renders Dashboard button', () => {
    renderWithProviders(<AccessDenied />);

    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('has red-themed styling', () => {
    const { container } = renderWithProviders(<AccessDenied />);

    const iconContainer = container.querySelector('.bg-red-500\\/10');
    expect(iconContainer).toBeInTheDocument();
  });
});

describe('Navigation button interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Go Back button is clickable in ComingSoon', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ComingSoon />);

    const goBackButton = screen.getByRole('button', { name: /go back/i });
    // Just verify it can be clicked without throwing
    await user.click(goBackButton);
  });

  it('Dashboard button is clickable in ComingSoon', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ComingSoon />);

    const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
    await user.click(dashboardButton);
  });

  it('Go Back button is clickable in FeatureNotEnabled', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FeatureNotEnabled />);

    const goBackButton = screen.getByRole('button', { name: /go back/i });
    await user.click(goBackButton);
  });

  it('Dashboard button is clickable in FeatureNotEnabled', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FeatureNotEnabled />);

    const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
    await user.click(dashboardButton);
  });

  it('Go Back button is clickable in AccessDenied', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccessDenied />);

    const goBackButton = screen.getByRole('button', { name: /go back/i });
    await user.click(goBackButton);
  });

  it('Dashboard button is clickable in AccessDenied', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccessDenied />);

    const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
    await user.click(dashboardButton);
  });
});

describe('FeatureGate edge cases', () => {
  it('handles Map-based flags', () => {
    // Create a store with Map-based flags
    const flagsMap = new Map();
    flagsMap.set('mapFeature', true);

    const store = createStoreWithAuth({
      isAuthenticated: true,
      user: {
        id: '123',
        email: 'test@example.com',
        flags: flagsMap,
      },
    });

    renderWithProviders(
      <FeatureGate flag="mapFeature">
        <div>Map Feature Content</div>
      </FeatureGate>,
      { store }
    );

    expect(screen.getByText('Map Feature Content')).toBeInTheDocument();
  });

  it('handles falsy flag values correctly', () => {
    const store = createStoreWithAuth({
      isAuthenticated: true,
      user: {
        id: '123',
        email: 'test@example.com',
        flags: { falsyFlag: 0 }, // 0 should not equal true
      },
    });

    renderWithProviders(
      <FeatureGate flag="falsyFlag" fallback={<div>Fallback</div>}>
        <div>Feature Content</div>
      </FeatureGate>,
      { store }
    );

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('handles string "true" as not enabled (must be boolean true)', () => {
    const store = createStoreWithAuth({
      isAuthenticated: true,
      user: {
        id: '123',
        email: 'test@example.com',
        flags: { stringFlag: 'true' }, // String 'true' should not equal boolean true
      },
    });

    renderWithProviders(
      <FeatureGate flag="stringFlag" fallback={<div>Fallback</div>}>
        <div>Feature Content</div>
      </FeatureGate>,
      { store }
    );

    expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });
});
