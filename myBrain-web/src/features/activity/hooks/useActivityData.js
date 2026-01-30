/**
 * Activity Query Keys Factory
 *
 * Centralized query key management for all activity-related data.
 * Following the factory pattern ensures consistent cache invalidation
 * and query key organization across the activity feature.
 */

// Query keys factory for activity-related data
export const activityKeys = {
  // Base key for all activity queries
  all: ['activity'],

  // Sessions queries
  sessions: () => [...activityKeys.all, 'sessions'],
  session: (id) => [...activityKeys.sessions(), id],

  // Security alerts queries
  alerts: () => [...activityKeys.all, 'alerts'],
  alert: (id) => [...activityKeys.alerts(), id],

  // Login history queries
  loginHistory: (params) => [...activityKeys.all, 'login-history', params],

  // Activity stats queries
  stats: (period) => [...activityKeys.all, 'stats', period],

  // Activity timeline queries
  timeline: (params) => [...activityKeys.all, 'timeline', params],
};
