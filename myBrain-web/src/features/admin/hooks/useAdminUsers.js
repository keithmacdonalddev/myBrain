import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api';

// User Content hooks
export function useUserContent(userId, type = 'all', options = {}) {
  return useQuery({
    queryKey: ['admin-user-content', userId, type, options],
    queryFn: async () => {
      const response = await adminApi.getUserContent(userId, { type, ...options });
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useUserActivity(userId, options = {}) {
  return useQuery({
    queryKey: ['admin-user-activity', userId, options],
    queryFn: async () => {
      const response = await adminApi.getUserActivity(userId, options);
      return response.data;
    },
    enabled: !!userId,
  });
}

// Moderation hooks
export function useUserModerationHistory(userId) {
  return useQuery({
    queryKey: ['admin-user-moderation', userId],
    queryFn: async () => {
      const response = await adminApi.getModerationHistory(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useWarnUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason, level }) =>
      adminApi.warnUser(userId, { reason, level }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason, until }) =>
      adminApi.suspendUser(userId, { reason, until }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useUnsuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }) =>
      adminApi.unsuspendUser(userId, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useAddAdminNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, content }) =>
      adminApi.addAdminNote(userId, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
    },
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }) =>
      adminApi.banUser(userId, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }) =>
      adminApi.unbanUser(userId, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-moderation', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useSendAdminMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, subject, message, category, priority }) =>
      adminApi.sendAdminMessage(userId, { subject, message, category, priority }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-messages', variables.userId] });
    },
  });
}

export function useAdminMessages(userId, options = {}) {
  return useQuery({
    queryKey: ['admin-user-messages', userId, options],
    queryFn: async () => {
      const response = await adminApi.getAdminMessages(userId, options);
      return response.data;
    },
    enabled: !!userId,
  });
}

// System Settings hooks
export function useSystemSettings() {
  return useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const response = await adminApi.getSystemSettings();
      return response.data;
    },
  });
}

export function useKillSwitches() {
  return useQuery({
    queryKey: ['admin-kill-switches'],
    queryFn: async () => {
      const response = await adminApi.getKillSwitches();
      return response.data;
    },
  });
}

export function useToggleKillSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feature, enabled, reason }) =>
      adminApi.toggleKillSwitch(feature, enabled, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kill-switches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
    },
  });
}

// Role Configuration hooks
export function useRoleConfigs() {
  return useQuery({
    queryKey: ['admin-role-configs'],
    queryFn: async () => {
      const response = await adminApi.getRoleConfigs();
      return response.data;
    },
  });
}

export function useRoleFeatures() {
  return useQuery({
    queryKey: ['admin-role-features'],
    queryFn: async () => {
      const response = await adminApi.getRoleFeatures();
      return response.data;
    },
  });
}

export function useRoleConfig(role) {
  return useQuery({
    queryKey: ['admin-role-config', role],
    queryFn: async () => {
      const response = await adminApi.getRoleConfig(role);
      return response.data;
    },
    enabled: !!role,
  });
}

export function useUpdateRoleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, limits, features }) =>
      adminApi.updateRoleConfig(role, { limits, features }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-config', variables.role] });
    },
  });
}

// User Limits hooks
export function useUserLimits(userId) {
  return useQuery({
    queryKey: ['admin-user-limits', userId],
    queryFn: async () => {
      const response = await adminApi.getUserLimits(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useUpdateUserLimits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, limits }) =>
      adminApi.updateUserLimits(userId, limits),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-limits', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

// Sidebar Configuration hooks
export function useAdminSidebarConfig() {
  return useQuery({
    queryKey: ['admin-sidebar-config'],
    queryFn: async () => {
      const response = await adminApi.getSidebarConfig();
      return response.data;
    },
  });
}

export function useUpdateSidebarConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => adminApi.updateSidebarConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-config'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-config'] });
    },
  });
}

export function useResetSidebarConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminApi.resetSidebarConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-config'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-config'] });
    },
  });
}

// Rate Limit Management hooks
export function useRateLimitConfig() {
  return useQuery({
    queryKey: ['admin-rate-limit-config'],
    queryFn: async () => {
      const response = await adminApi.getRateLimitConfig();
      return response.data;
    },
  });
}

export function useUpdateRateLimitConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config) => adminApi.updateRateLimitConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
    },
  });
}

export function useRateLimitEvents(params = {}) {
  return useQuery({
    queryKey: ['admin-rate-limit-events', params],
    queryFn: async () => {
      const response = await adminApi.getRateLimitEvents(params);
      return response.data;
    },
  });
}

export function useRateLimitStats(windowMs) {
  return useQuery({
    queryKey: ['admin-rate-limit-stats', windowMs],
    queryFn: async () => {
      const response = await adminApi.getRateLimitStats(windowMs);
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useRateLimitAlerts() {
  return useQuery({
    queryKey: ['admin-rate-limit-alerts'],
    queryFn: async () => {
      const response = await adminApi.getRateLimitAlerts();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useAddToWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ip, resolveEvents }) => adminApi.addToWhitelist(ip, resolveEvents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-alerts'] });
    },
  });
}

export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ip) => adminApi.removeFromWhitelist(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
    },
  });
}

export function useResolveRateLimitEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }) => adminApi.resolveRateLimitEvent(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-alerts'] });
    },
  });
}

export function useResolveRateLimitEventsByIP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ip, action }) => adminApi.resolveRateLimitEventsByIP(ip, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
    },
  });
}

export default {
  useUserContent,
  useUserActivity,
  useUserModerationHistory,
  useWarnUser,
  useSuspendUser,
  useUnsuspendUser,
  useBanUser,
  useUnbanUser,
  useAddAdminNote,
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
  useRateLimitConfig,
  useUpdateRateLimitConfig,
  useRateLimitEvents,
  useRateLimitStats,
  useRateLimitAlerts,
  useAddToWhitelist,
  useRemoveFromWhitelist,
  useResolveRateLimitEvent,
  useResolveRateLimitEventsByIP,
};
