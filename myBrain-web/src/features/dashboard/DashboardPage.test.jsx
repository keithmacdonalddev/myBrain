/**
 * =============================================================================
 * DASHBOARDPAGE.TEST.JSX - Tests for Dashboard Page Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import DashboardPage from './DashboardPage';

// Mock hooks
vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
  useDashboardPreferences: vi.fn(),
  useDashboardSession: vi.fn()
}));

vi.mock('../../hooks/useAnalytics', () => ({
  usePageTracking: vi.fn()
}));

vi.mock('../notes/hooks/useNotes', () => ({
  useInboxCount: vi.fn()
}));

vi.mock('../tasks/hooks/useTasks', () => ({
  useUpdateTaskStatus: vi.fn()
}));

vi.mock('../calendar/hooks/useEvents', () => ({
  useDayEvents: vi.fn()
}));

vi.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn()
}));

vi.mock('../../hooks/useWeather', () => ({
  useWeather: vi.fn(),
  useWeatherLocations: vi.fn(),
  useAddWeatherLocation: vi.fn(),
  useRemoveWeatherLocation: vi.fn()
}));

// Mock components that have complex dependencies
vi.mock('./components/DashboardGrid', () => ({
  default: vi.fn(({ widgets }) => (
    <div data-testid="dashboard-grid">
      {widgets.map((w) => (
        <div key={w.id} data-testid={`widget-${w.id}`}>
          {w.id}
        </div>
      ))}
    </div>
  ))
}));

vi.mock('./components/FocusCard', () => ({
  default: vi.fn(({ data }) => (
    data ? <div data-testid="focus-card">Focus Card</div> : null
  ))
}));

vi.mock('../calendar/components/EventModal', () => ({
  default: vi.fn(({ onClose }) => (
    <div data-testid="event-modal">
      <button onClick={onClose}>Close Event Modal</button>
    </div>
  ))
}));

vi.mock('../../components/tasks/TaskSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="task-panel" />)
}));

vi.mock('../../components/notes/NoteSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="note-panel" />)
}));

vi.mock('../../components/projects/ProjectSlidePanel', () => ({
  default: vi.fn(() => <div data-testid="project-panel" />)
}));

vi.mock('../../components/ui/WeatherWidget', () => ({
  default: vi.fn(() => <div data-testid="weather-widget" />)
}));

// Import mocked hooks
import { useDashboardData, useDashboardPreferences, useDashboardSession } from './hooks/useDashboardData';
import { usePageTracking } from '../../hooks/useAnalytics';
import { useInboxCount } from '../notes/hooks/useNotes';
import { useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useDayEvents } from '../calendar/hooks/useEvents';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useWeather, useWeatherLocations } from '../../hooks/useWeather';

describe('DashboardPage', () => {
  let originalDate;

  const mockDashboardData = {
    urgentItems: {
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingEvents: []
    },
    events: {
      today: []
    },
    projects: [],
    inbox: [],
    stats: {
      tasks: { completedToday: 0 },
      projects: { active: 0 }
    },
    preferences: {
      pinnedWidgets: []
    },
    usageProfile: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    originalDate = global.Date;

    // Default mocks
    useDashboardData.mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    useDashboardPreferences.mockReturnValue({
      pinWidget: vi.fn(),
      unpinWidget: vi.fn(),
      hideWidget: vi.fn(),
      showWidget: vi.fn(),
      resetPreferences: vi.fn()
    });

    useDashboardSession.mockReturnValue({});

    usePageTracking.mockReturnValue({});

    useInboxCount.mockReturnValue({
      data: 0
    });

    useUpdateTaskStatus.mockReturnValue({
      mutate: vi.fn()
    });

    useDayEvents.mockReturnValue({
      data: [],
      isLoading: false
    });

    useFeatureFlag.mockReturnValue(true);

    useWeather.mockReturnValue({
      data: null,
      isLoading: false
    });

    useWeatherLocations.mockReturnValue({
      data: [],
      isLoading: false
    });
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  function mockDate(dateString) {
    const mockDateInstance = new originalDate(dateString);
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDateInstance;
        }
        return new originalDate(...args);
      }
      static now() {
        return mockDateInstance.getTime();
      }
    };
  }

  describe('Basic Rendering', () => {
    it('renders dashboard page', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    });

    it('renders focus card when data available', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByTestId('focus-card')).toBeInTheDocument();
    });

    it('renders slide panels', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByTestId('task-panel')).toBeInTheDocument();
      expect(screen.getByTestId('note-panel')).toBeInTheDocument();
      expect(screen.getByTestId('project-panel')).toBeInTheDocument();
    });

    it('renders weather widget in sidebar', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading and no data', () => {
      mockDate('2024-01-25T10:00:00');

      useDashboardData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      const { container } = render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when fetch fails', () => {
      mockDate('2024-01-25T10:00:00');

      useDashboardData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn()
      });

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    });

    it('shows retry button in error state', () => {
      mockDate('2024-01-25T10:00:00');

      useDashboardData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn()
      });

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls refetch when clicking retry', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      const refetch = vi.fn();

      useDashboardData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch
      });

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('Time Display', () => {
    it('shows greeting based on time of day', () => {
      mockDate('2024-01-25T09:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'John' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText('Good morning,')).toBeInTheDocument();
    });

    it('shows user first name in greeting', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Alice' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows current date', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText(/thursday/i)).toBeInTheDocument();
      expect(screen.getByText(/january 25/i)).toBeInTheDocument();
    });
  });

  describe('Quick Add Button', () => {
    it('renders quick add button', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      const addButton = screen.getByRole('button', { name: /create new items/i });
      expect(addButton).toBeInTheDocument();
    });

    it('opens quick add menu when clicked', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      await user.click(screen.getByRole('button', { name: /create new items/i }));

      expect(screen.getByText('New Note')).toBeInTheDocument();
      expect(screen.getByText('New Event')).toBeInTheDocument();
      expect(screen.getByText('New Task')).toBeInTheDocument();
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('closes menu when clicking backdrop', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      await user.click(screen.getByRole('button', { name: /create new items/i }));
      expect(screen.getByText('New Note')).toBeInTheDocument();

      // Find and click the backdrop
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      if (backdrop) {
        await user.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('New Note')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quick Capture', () => {
    it('renders quick capture input', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByPlaceholderText('Capture a thought...')).toBeInTheDocument();
    });

    it('has capture buttons for task, note, and event', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByRole('button', { name: 'Task' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Event' })).toBeInTheDocument();
    });

    it('disables capture buttons when input is empty', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByRole('button', { name: 'Task' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Note' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Event' })).toBeDisabled();
    });

    it('enables capture buttons when input has text', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      await user.type(screen.getByPlaceholderText('Capture a thought...'), 'My thought');

      expect(screen.getByRole('button', { name: 'Task' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Note' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Event' })).not.toBeDisabled();
    });
  });

  describe('Mobile Elements', () => {
    it('renders mobile inbox link', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      const inboxLink = screen.getByRole('link', { name: '' }); // Inbox icon link
      expect(inboxLink).toHaveAttribute('href', '/app/inbox');
    });

    it('shows inbox count badge when there are items', () => {
      mockDate('2024-01-25T10:00:00');

      useInboxCount.mockReturnValue({
        data: 5
      });

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 99+ for high inbox count', () => {
      mockDate('2024-01-25T10:00:00');

      useInboxCount.mockReturnValue({
        data: 150
      });

      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Widget Grid', () => {
    it('passes widgets to dashboard grid', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      // Check that widget grid received widgets
      expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    });
  });

  describe('Hooks', () => {
    it('tracks page view', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(usePageTracking).toHaveBeenCalled();
    });

    it('tracks dashboard session', () => {
      mockDate('2024-01-25T10:00:00');
      render(<DashboardPage />, {
        preloadedState: {
          auth: {
            user: { profile: { firstName: 'Test' } },
            isAuthenticated: true
          }
        }
      });

      expect(useDashboardSession).toHaveBeenCalled();
    });
  });
});
