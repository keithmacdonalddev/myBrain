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

export default {
  useUserContent,
  useUserActivity,
  useUserModerationHistory,
  useWarnUser,
  useSuspendUser,
  useUnsuspendUser,
  useAddAdminNote,
  useSystemSettings,
  useKillSwitches,
  useToggleKillSwitch,
};
