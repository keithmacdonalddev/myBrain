import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUserContent,
  useUserActivity,
  useUserModerationHistory,
  useWarnUser,
  useSuspendUser,
  useUnsuspendUser,
  useAddAdminNote,
  useBanUser,
  useUnbanUser,
  useSendAdminMessage,
  useAdminMessages,
  useSystemSettings,
  useKillSwitches,
  useToggleKillSwitch,
  useRoleConfigs,
  useRoleFeatures,
  useRoleConfig,
  useUpdateRoleConfig,
  useUserLimits,
  useUpdateUserLimits,
  useAdminSidebarConfig,
  useUpdateSidebarConfig,
  useResetSidebarConfig,
} from './useAdminUsers';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  adminApi: {
    getUserContent: vi.fn(),
    getUserActivity: vi.fn(),
    getModerationHistory: vi.fn(),
    warnUser: vi.fn(),
    suspendUser: vi.fn(),
    unsuspendUser: vi.fn(),
    addAdminNote: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    sendAdminMessage: vi.fn(),
    getAdminMessages: vi.fn(),
    getSystemSettings: vi.fn(),
    getKillSwitches: vi.fn(),
    toggleKillSwitch: vi.fn(),
    getRoleConfigs: vi.fn(),
    getRoleFeatures: vi.fn(),
    getRoleConfig: vi.fn(),
    updateRoleConfig: vi.fn(),
    getUserLimits: vi.fn(),
    updateUserLimits: vi.fn(),
    getSidebarConfig: vi.fn(),
    updateSidebarConfig: vi.fn(),
    resetSidebarConfig: vi.fn(),
  },
}));

// Import the mocked API
import { adminApi } from '../../../lib/api';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAdminUsers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useUserContent hook
  describe('useUserContent', () => {
    it('fetches user content successfully', async () => {
      const mockContent = {
        notes: [{ _id: '1', title: 'Note 1' }],
        tasks: [{ _id: '2', title: 'Task 1' }],
        total: 2,
      };
      adminApi.getUserContent.mockResolvedValueOnce({ data: mockContent });

      const { result } = renderHook(() => useUserContent('user123'), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockContent);
      expect(adminApi.getUserContent).toHaveBeenCalledWith('user123', { type: 'all' });
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useUserContent(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getUserContent).not.toHaveBeenCalled();
    });

    it('passes type filter to API call', async () => {
      adminApi.getUserContent.mockResolvedValueOnce({ data: { notes: [] } });

      renderHook(() => useUserContent('user123', 'notes'), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(adminApi.getUserContent).toHaveBeenCalledWith('user123', { type: 'notes' })
      );
    });

    it('handles error when fetching content fails', async () => {
      adminApi.getUserContent.mockRejectedValueOnce(new Error('Failed to fetch content'));

      const { result } = renderHook(() => useUserContent('user123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch content');
    });
  });

  // Test useUserActivity hook
  describe('useUserActivity', () => {
    it('fetches user activity successfully', async () => {
      const mockActivity = {
        activities: [{ _id: '1', type: 'login', timestamp: '2025-01-25' }],
        total: 1,
      };
      adminApi.getUserActivity.mockResolvedValueOnce({ data: mockActivity });

      const { result } = renderHook(() => useUserActivity('user123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockActivity);
      expect(adminApi.getUserActivity).toHaveBeenCalledWith('user123', {});
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useUserActivity(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getUserActivity).not.toHaveBeenCalled();
    });

    it('handles error when fetching activity fails', async () => {
      adminApi.getUserActivity.mockRejectedValueOnce(new Error('Failed to fetch activity'));

      const { result } = renderHook(() => useUserActivity('user123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUserModerationHistory hook
  describe('useUserModerationHistory', () => {
    it('fetches moderation history successfully', async () => {
      const mockHistory = {
        actions: [
          { _id: '1', type: 'warning', reason: 'Spam', createdAt: '2025-01-20' },
        ],
      };
      adminApi.getModerationHistory.mockResolvedValueOnce({ data: mockHistory });

      const { result } = renderHook(() => useUserModerationHistory('user123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockHistory);
      expect(adminApi.getModerationHistory).toHaveBeenCalledWith('user123');
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useUserModerationHistory(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getModerationHistory).not.toHaveBeenCalled();
    });
  });

  // Test useWarnUser mutation
  describe('useWarnUser', () => {
    it('warns a user successfully', async () => {
      adminApi.warnUser.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useWarnUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          reason: 'Inappropriate content',
          level: 'warning',
        });
      });

      expect(adminApi.warnUser).toHaveBeenCalledWith('user123', {
        reason: 'Inappropriate content',
        level: 'warning',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when warning user fails', async () => {
      adminApi.warnUser.mockRejectedValueOnce(new Error('Warning failed'));

      const { result } = renderHook(() => useWarnUser(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ userId: 'user123', reason: 'Spam', level: 'warning' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSuspendUser mutation
  describe('useSuspendUser', () => {
    it('suspends a user successfully', async () => {
      adminApi.suspendUser.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useSuspendUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          reason: 'Repeated violations',
          until: '2025-02-01',
        });
      });

      expect(adminApi.suspendUser).toHaveBeenCalledWith('user123', {
        reason: 'Repeated violations',
        until: '2025-02-01',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when suspending user fails', async () => {
      adminApi.suspendUser.mockRejectedValueOnce(new Error('Suspend failed'));

      const { result } = renderHook(() => useSuspendUser(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            userId: 'user123',
            reason: 'Test',
            until: '2025-02-01',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnsuspendUser mutation
  describe('useUnsuspendUser', () => {
    it('unsuspends a user successfully', async () => {
      adminApi.unsuspendUser.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnsuspendUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          reason: 'Appeal accepted',
        });
      });

      expect(adminApi.unsuspendUser).toHaveBeenCalledWith('user123', {
        reason: 'Appeal accepted',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useAddAdminNote mutation
  describe('useAddAdminNote', () => {
    it('adds an admin note successfully', async () => {
      adminApi.addAdminNote.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useAddAdminNote(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          content: 'User contacted support about billing',
        });
      });

      expect(adminApi.addAdminNote).toHaveBeenCalledWith('user123', {
        content: 'User contacted support about billing',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when adding admin note fails', async () => {
      adminApi.addAdminNote.mockRejectedValueOnce(new Error('Note failed'));

      const { result } = renderHook(() => useAddAdminNote(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ userId: 'user123', content: 'Note' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBanUser mutation
  describe('useBanUser', () => {
    it('bans a user successfully', async () => {
      adminApi.banUser.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useBanUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          reason: 'Terms of service violation',
        });
      });

      expect(adminApi.banUser).toHaveBeenCalledWith('user123', {
        reason: 'Terms of service violation',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useUnbanUser mutation
  describe('useUnbanUser', () => {
    it('unbans a user successfully', async () => {
      adminApi.unbanUser.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnbanUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          reason: 'Ban reviewed and lifted',
        });
      });

      expect(adminApi.unbanUser).toHaveBeenCalledWith('user123', {
        reason: 'Ban reviewed and lifted',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // Test useSendAdminMessage mutation
  describe('useSendAdminMessage', () => {
    it('sends an admin message successfully', async () => {
      adminApi.sendAdminMessage.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useSendAdminMessage(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          subject: 'Account Notice',
          message: 'Your account has been reviewed.',
          category: 'account',
          priority: 'normal',
        });
      });

      expect(adminApi.sendAdminMessage).toHaveBeenCalledWith('user123', {
        subject: 'Account Notice',
        message: 'Your account has been reviewed.',
        category: 'account',
        priority: 'normal',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when sending admin message fails', async () => {
      adminApi.sendAdminMessage.mockRejectedValueOnce(new Error('Message failed'));

      const { result } = renderHook(() => useSendAdminMessage(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            userId: 'user123',
            subject: 'Test',
            message: 'Test message',
            category: 'general',
            priority: 'low',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useAdminMessages hook
  describe('useAdminMessages', () => {
    it('fetches admin messages successfully', async () => {
      const mockMessages = {
        messages: [
          { _id: '1', subject: 'Welcome', message: 'Welcome to the platform' },
        ],
        total: 1,
      };
      adminApi.getAdminMessages.mockResolvedValueOnce({ data: mockMessages });

      const { result } = renderHook(() => useAdminMessages('user123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockMessages);
      expect(adminApi.getAdminMessages).toHaveBeenCalledWith('user123', {});
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useAdminMessages(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getAdminMessages).not.toHaveBeenCalled();
    });
  });

  // Test useSystemSettings hook
  describe('useSystemSettings', () => {
    it('fetches system settings successfully', async () => {
      const mockSettings = {
        registrationEnabled: true,
        maintenanceMode: false,
        maxUploadSize: 10485760,
      };
      adminApi.getSystemSettings.mockResolvedValueOnce({ data: mockSettings });

      const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockSettings);
    });

    it('handles error when fetching system settings fails', async () => {
      adminApi.getSystemSettings.mockRejectedValueOnce(new Error('Failed to fetch settings'));

      const { result } = renderHook(() => useSystemSettings(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useKillSwitches hook
  describe('useKillSwitches', () => {
    it('fetches kill switches successfully', async () => {
      const mockKillSwitches = {
        fileUpload: { enabled: true, reason: null },
        newRegistration: { enabled: true, reason: null },
        messaging: { enabled: false, reason: 'Maintenance' },
      };
      adminApi.getKillSwitches.mockResolvedValueOnce({ data: mockKillSwitches });

      const { result } = renderHook(() => useKillSwitches(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockKillSwitches);
    });
  });

  // Test useToggleKillSwitch mutation
  describe('useToggleKillSwitch', () => {
    it('toggles a kill switch successfully', async () => {
      adminApi.toggleKillSwitch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useToggleKillSwitch(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          feature: 'fileUpload',
          enabled: false,
          reason: 'Storage issue',
        });
      });

      expect(adminApi.toggleKillSwitch).toHaveBeenCalledWith('fileUpload', false, 'Storage issue');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when toggling kill switch fails', async () => {
      adminApi.toggleKillSwitch.mockRejectedValueOnce(new Error('Toggle failed'));

      const { result } = renderHook(() => useToggleKillSwitch(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            feature: 'unknown',
            enabled: false,
            reason: 'Test',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRoleConfigs hook
  describe('useRoleConfigs', () => {
    it('fetches role configs successfully', async () => {
      const mockRoleConfigs = [
        { role: 'user', limits: { maxNotes: 100 } },
        { role: 'premium', limits: { maxNotes: 1000 } },
      ];
      adminApi.getRoleConfigs.mockResolvedValueOnce({ data: mockRoleConfigs });

      const { result } = renderHook(() => useRoleConfigs(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockRoleConfigs);
    });
  });

  // Test useRoleFeatures hook
  describe('useRoleFeatures', () => {
    it('fetches role features successfully', async () => {
      const mockFeatures = ['notes', 'tasks', 'projects', 'calendar', 'files'];
      adminApi.getRoleFeatures.mockResolvedValueOnce({ data: mockFeatures });

      const { result } = renderHook(() => useRoleFeatures(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFeatures);
    });
  });

  // Test useRoleConfig hook
  describe('useRoleConfig', () => {
    it('fetches a specific role config successfully', async () => {
      const mockRoleConfig = {
        role: 'premium',
        limits: { maxNotes: 1000, maxTasks: 500 },
        features: ['notes', 'tasks', 'calendar', 'files', 'advanced-search'],
      };
      adminApi.getRoleConfig.mockResolvedValueOnce({ data: mockRoleConfig });

      const { result } = renderHook(() => useRoleConfig('premium'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockRoleConfig);
      expect(adminApi.getRoleConfig).toHaveBeenCalledWith('premium');
    });

    it('does not fetch when role is not provided', async () => {
      const { result } = renderHook(() => useRoleConfig(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getRoleConfig).not.toHaveBeenCalled();
    });
  });

  // Test useUpdateRoleConfig mutation
  describe('useUpdateRoleConfig', () => {
    it('updates a role config successfully', async () => {
      adminApi.updateRoleConfig.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUpdateRoleConfig(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          role: 'premium',
          limits: { maxNotes: 2000 },
          features: ['notes', 'tasks', 'calendar'],
        });
      });

      expect(adminApi.updateRoleConfig).toHaveBeenCalledWith('premium', {
        limits: { maxNotes: 2000 },
        features: ['notes', 'tasks', 'calendar'],
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating role config fails', async () => {
      adminApi.updateRoleConfig.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateRoleConfig(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            role: 'invalid',
            limits: {},
            features: [],
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUserLimits hook
  describe('useUserLimits', () => {
    it('fetches user limits successfully', async () => {
      const mockLimits = {
        notesUsed: 50,
        notesLimit: 100,
        tasksUsed: 25,
        tasksLimit: 50,
      };
      adminApi.getUserLimits.mockResolvedValueOnce({ data: mockLimits });

      const { result } = renderHook(() => useUserLimits('user123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLimits);
      expect(adminApi.getUserLimits).toHaveBeenCalledWith('user123');
    });

    it('does not fetch when userId is not provided', async () => {
      const { result } = renderHook(() => useUserLimits(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(adminApi.getUserLimits).not.toHaveBeenCalled();
    });
  });

  // Test useUpdateUserLimits mutation
  describe('useUpdateUserLimits', () => {
    it('updates user limits successfully', async () => {
      adminApi.updateUserLimits.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUpdateUserLimits(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          limits: { maxNotes: 200, maxTasks: 100 },
        });
      });

      expect(adminApi.updateUserLimits).toHaveBeenCalledWith('user123', {
        maxNotes: 200,
        maxTasks: 100,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating user limits fails', async () => {
      adminApi.updateUserLimits.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateUserLimits(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            userId: 'user123',
            limits: { maxNotes: -1 },
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useAdminSidebarConfig hook
  describe('useAdminSidebarConfig', () => {
    it('fetches admin sidebar config successfully', async () => {
      const mockConfig = {
        items: [
          { id: 'dashboard', label: 'Dashboard', visible: true },
          { id: 'notes', label: 'Notes', visible: true },
          { id: 'tasks', label: 'Tasks', visible: true },
        ],
      };
      adminApi.getSidebarConfig.mockResolvedValueOnce({ data: mockConfig });

      const { result } = renderHook(() => useAdminSidebarConfig(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockConfig);
    });

    it('handles error when fetching sidebar config fails', async () => {
      adminApi.getSidebarConfig.mockRejectedValueOnce(new Error('Failed to fetch config'));

      const { result } = renderHook(() => useAdminSidebarConfig(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateSidebarConfig mutation
  describe('useUpdateSidebarConfig', () => {
    it('updates sidebar config successfully', async () => {
      adminApi.updateSidebarConfig.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUpdateSidebarConfig(), { wrapper: createWrapper() });

      const newConfig = {
        items: [
          { id: 'dashboard', label: 'Dashboard', visible: true },
          { id: 'notes', label: 'Notes', visible: false },
        ],
      };

      await act(async () => {
        await result.current.mutateAsync(newConfig);
      });

      expect(adminApi.updateSidebarConfig).toHaveBeenCalledWith(newConfig);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating sidebar config fails', async () => {
      adminApi.updateSidebarConfig.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateSidebarConfig(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ items: [] });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useResetSidebarConfig mutation
  describe('useResetSidebarConfig', () => {
    it('resets sidebar config successfully', async () => {
      adminApi.resetSidebarConfig.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useResetSidebarConfig(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(adminApi.resetSidebarConfig).toHaveBeenCalled();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when resetting sidebar config fails', async () => {
      adminApi.resetSidebarConfig.mockRejectedValueOnce(new Error('Reset failed'));

      const { result } = renderHook(() => useResetSidebarConfig(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
