import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'mybrain_token';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Still send cookies for same-origin fallback
  timeout: 30000, // 30 second timeout to prevent hung requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management for cross-origin authentication
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Request interceptor to add Authorization header
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API functions
export const authApi = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),

  getSubscription: () =>
    api.get('/auth/subscription'),
};

// Notes API functions
export const notesApi = {
  // Get notes with optional filters
  getNotes: (params = {}) =>
    api.get('/notes', { params }),

  // Get single note
  getNote: (id) =>
    api.get(`/notes/${id}`),

  // Create note
  createNote: (data) =>
    api.post('/notes', data),

  // Update note
  updateNote: (id, data) =>
    api.patch(`/notes/${id}`, data),

  // Delete note permanently
  deleteNote: (id) =>
    api.delete(`/notes/${id}`),

  // Pin/unpin
  pinNote: (id) =>
    api.post(`/notes/${id}/pin`),

  unpinNote: (id) =>
    api.post(`/notes/${id}/unpin`),

  // Archive/unarchive
  archiveNote: (id) =>
    api.post(`/notes/${id}/archive`),

  unarchiveNote: (id) =>
    api.post(`/notes/${id}/unarchive`),

  // Trash/restore
  trashNote: (id) =>
    api.post(`/notes/${id}/trash`),

  restoreNote: (id) =>
    api.post(`/notes/${id}/restore`),

  // Utility endpoints
  getTags: () =>
    api.get('/notes/tags'),

  getRecentNotes: (limit = 5) =>
    api.get('/notes/recent', { params: { limit } }),

  getPinnedNotes: () =>
    api.get('/notes/pinned'),

  getLastOpenedNote: () =>
    api.get('/notes/last-opened'),

  // Inbox endpoints
  getInboxNotes: (params = {}) =>
    api.get('/notes/inbox', { params }),

  getInboxCount: () =>
    api.get('/notes/inbox/count'),

  processNote: (id) =>
    api.post(`/notes/${id}/process`),

  unprocessNote: (id) =>
    api.post(`/notes/${id}/unprocess`),

  convertToTask: (id, keepNote = true) =>
    api.post(`/notes/${id}/convert-to-task`, { keepNote }),

  getBacklinks: (id) =>
    api.get(`/notes/${id}/backlinks`),
};

// Tasks API functions
export const tasksApi = {
  // Get tasks with optional filters
  getTasks: (params = {}) =>
    api.get('/tasks', { params }),

  // Get single task
  getTask: (id) =>
    api.get(`/tasks/${id}`),

  // Create task
  createTask: (data) =>
    api.post('/tasks', data),

  // Update task
  updateTask: (id, data) =>
    api.patch(`/tasks/${id}`, data),

  // Update task status (quick)
  updateTaskStatus: (id, status) =>
    api.post(`/tasks/${id}/status`, { status }),

  // Delete task
  deleteTask: (id) =>
    api.delete(`/tasks/${id}`),

  // Today view
  getTodayView: () =>
    api.get('/tasks/today'),

  // Tags
  getTaskTags: () =>
    api.get('/tasks/tags'),

  // Link/unlink notes
  linkNote: (taskId, noteId) =>
    api.post(`/tasks/${taskId}/link-note`, { noteId }),

  unlinkNote: (taskId, noteId) =>
    api.delete(`/tasks/${taskId}/link-note/${noteId}`),

  // Backlinks
  getBacklinks: (id) =>
    api.get(`/tasks/${id}/backlinks`),

  // Archive/Trash
  archiveTask: (id) =>
    api.post(`/tasks/${id}/archive`),

  unarchiveTask: (id) =>
    api.post(`/tasks/${id}/unarchive`),

  trashTask: (id) =>
    api.post(`/tasks/${id}/trash`),

  restoreTask: (id) =>
    api.post(`/tasks/${id}/restore`),

  // Comments
  addComment: (taskId, text) =>
    api.post(`/tasks/${taskId}/comments`, { text }),

  updateComment: (taskId, commentId, text) =>
    api.patch(`/tasks/${taskId}/comments/${commentId}`, { text }),

  deleteComment: (taskId, commentId) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),
};

// Filters API functions
export const filtersApi = {
  // Get saved filters
  getFilters: (entityType) =>
    api.get('/filters', { params: entityType ? { entityType } : {} }),

  // Get single filter
  getFilter: (id) =>
    api.get(`/filters/${id}`),

  // Create filter
  createFilter: (data) =>
    api.post('/filters', data),

  // Update filter
  updateFilter: (id, data) =>
    api.patch(`/filters/${id}`, data),

  // Delete filter
  deleteFilter: (id) =>
    api.delete(`/filters/${id}`),
};

// Profile API functions
export const profileApi = {
  getProfile: () =>
    api.get('/profile'),

  updateProfile: (data) =>
    api.patch('/profile', data),

  changePassword: (currentPassword, newPassword) =>
    api.post('/profile/change-password', { currentPassword, newPassword }),

  changeEmail: (newEmail, password) =>
    api.post('/profile/change-email', { newEmail, password }),

  deleteAccount: (password) =>
    api.delete('/profile', { data: { password } }),

  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAvatar: () =>
    api.delete('/profile/avatar'),

  getActivity: (params = {}) =>
    api.get('/profile/activity', { params }),

  updatePreferences: (preferences) =>
    api.patch('/profile/preferences', preferences),
};

// Activity API functions (sessions, alerts, login history, stats, export)
export const activityApi = {
  // Session management (auth namespace endpoints)
  getSessions: () =>
    api.get('/auth/sessions'),

  revokeSession: (id) =>
    api.delete(`/auth/sessions/${id}`),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  // Activity data (profile namespace endpoints)
  getActivity: (params = {}) =>
    api.get('/profile/activity', { params }),

  getActivityStats: (params = {}) =>
    api.get('/profile/activity/stats', { params }),

  getLoginHistory: (params = {}) =>
    api.get('/profile/activity/logins', { params }),

  exportActivity: (params = {}) =>
    api.get('/profile/activity/export', {
      params,
      responseType: 'blob', // Important for file download
    }),

  // Security alerts
  getSecurityAlerts: (params = {}) =>
    api.get('/profile/security-alerts', { params }),

  dismissAlert: (id, data) =>
    api.patch(`/profile/security-alerts/${id}`, data),
};

// Images API functions
export const imagesApi = {
  getImages: (params = {}) =>
    api.get('/images', { params }),

  getImage: (id) =>
    api.get(`/images/${id}`),

  searchImages: (params = {}) =>
    api.get('/images/search', { params }),

  getImageTags: () =>
    api.get('/images/tags'),

  getImageLimits: () =>
    api.get('/images/limits'),

  uploadImage: (file, options = {}) => {
    const formData = new FormData();
    formData.append('image', file);
    if (options.title) formData.append('title', options.title);
    if (options.description) formData.append('description', options.description);
    if (options.alt) formData.append('alt', options.alt);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));
    if (options.folder) formData.append('folder', options.folder);
    return api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateImage: (id, data) =>
    api.patch(`/images/${id}`, data),

  toggleFavorite: (id) =>
    api.post(`/images/${id}/favorite`),

  deleteImage: (id) =>
    api.delete(`/images/${id}`),

  bulkDeleteImages: (ids) =>
    api.post('/images/bulk-delete', { ids }),
};

// Events API functions
export const eventsApi = {
  getEvents: (params = {}) =>
    api.get('/events', { params }),

  getEvent: (id) =>
    api.get(`/events/${id}`),

  getUpcoming: (days = 7) =>
    api.get('/events/upcoming', { params: { days } }),

  getDayEvents: (date) =>
    api.get(`/events/day/${date}`),

  createEvent: (data) =>
    api.post('/events', data),

  updateEvent: (id, data) =>
    api.patch(`/events/${id}`, data),

  deleteEvent: (id) =>
    api.delete(`/events/${id}`),

  linkTask: (eventId, taskId) =>
    api.post(`/events/${eventId}/link-task`, { taskId }),

  unlinkTask: (eventId, taskId) =>
    api.delete(`/events/${eventId}/link-task/${taskId}`),

  linkNote: (eventId, noteId) =>
    api.post(`/events/${eventId}/link-note`, { noteId }),

  unlinkNote: (eventId, noteId) =>
    api.delete(`/events/${eventId}/link-note/${noteId}`),
};

// Tags API functions
export const tagsApi = {
  getTags: (params = {}) =>
    api.get('/tags', { params }),

  getAllTags: (params = {}) =>
    api.get('/tags/all', { params }),

  getPopularTags: (limit = 10) =>
    api.get('/tags/popular', { params: { limit } }),

  searchTags: (search, limit = 10) =>
    api.get('/tags', { params: { search, limit } }),

  createTag: (data) =>
    api.post('/tags', data),

  trackUsage: (tags) =>
    api.post('/tags/track', { tags }),

  renameTag: (oldName, newName) =>
    api.post('/tags/rename', { oldName, newName }),

  mergeTags: (sourceTags, targetTag) =>
    api.post('/tags/merge', { sourceTags, targetTag }),

  updateTag: (name, data) =>
    api.patch(`/tags/${encodeURIComponent(name)}`, data),

  deleteTag: (name) =>
    api.delete(`/tags/${encodeURIComponent(name)}`),
};

// Life Areas API functions
export const lifeAreasApi = {
  getLifeAreas: (includeArchived = false) =>
    api.get('/life-areas', { params: { includeArchived } }),

  getLifeArea: (id, includeCounts = false) =>
    api.get(`/life-areas/${id}`, { params: { includeCounts } }),

  createLifeArea: (data) =>
    api.post('/life-areas', data),

  updateLifeArea: (id, data) =>
    api.patch(`/life-areas/${id}`, data),

  deleteLifeArea: (id) =>
    api.delete(`/life-areas/${id}`),

  setDefault: (id) =>
    api.post(`/life-areas/${id}/set-default`),

  reorderLifeAreas: (orderedIds) =>
    api.post('/life-areas/reorder', { orderedIds }),

  archiveLifeArea: (id, isArchived = true) =>
    api.post(`/life-areas/${id}/archive`, { isArchived }),

  getLifeAreaItems: (id, params = {}) =>
    api.get(`/life-areas/${id}/items`, { params }),
};

// Projects API functions
export const projectsApi = {
  getProjects: (params = {}) =>
    api.get('/projects', { params }),

  getProject: (id, populateLinks = false) =>
    api.get(`/projects/${id}`, { params: { populateLinks } }),

  getUpcoming: (days = 7) =>
    api.get('/projects/upcoming', { params: { days } }),

  getOverdue: () =>
    api.get('/projects/overdue'),

  getProjectTags: () =>
    api.get('/projects/tags'),

  createProject: (data) =>
    api.post('/projects', data),

  updateProject: (id, data) =>
    api.patch(`/projects/${id}`, data),

  updateProjectStatus: (id, status) =>
    api.post(`/projects/${id}/status`, { status }),

  deleteProject: (id) =>
    api.delete(`/projects/${id}`),

  linkNote: (projectId, noteId) =>
    api.post(`/projects/${projectId}/link-note`, { noteId }),

  unlinkNote: (projectId, noteId) =>
    api.delete(`/projects/${projectId}/link-note/${noteId}`),

  linkTask: (projectId, taskId) =>
    api.post(`/projects/${projectId}/link-task`, { taskId }),

  unlinkTask: (projectId, taskId) =>
    api.delete(`/projects/${projectId}/link-task/${taskId}`),

  linkEvent: (projectId, eventId) =>
    api.post(`/projects/${projectId}/link-event`, { eventId }),

  unlinkEvent: (projectId, eventId) =>
    api.delete(`/projects/${projectId}/link-event/${eventId}`),

  // Comments
  addComment: (projectId, text) =>
    api.post(`/projects/${projectId}/comments`, { text }),

  updateComment: (projectId, commentId, text) =>
    api.patch(`/projects/${projectId}/comments/${commentId}`, { text }),

  deleteComment: (projectId, commentId) =>
    api.delete(`/projects/${projectId}/comments/${commentId}`),

  favoriteProject: (id) =>
    api.patch(`/projects/${id}/favorite`),

  unfavoriteProject: (id) =>
    api.patch(`/projects/${id}/unfavorite`),
};

// Saved Locations API functions
export const savedLocationsApi = {
  getLocations: () =>
    api.get('/saved-locations'),

  getLocation: (id) =>
    api.get(`/saved-locations/${id}`),

  createLocation: (data) =>
    api.post('/saved-locations', data),

  updateLocation: (id, data) =>
    api.patch(`/saved-locations/${id}`, data),

  deleteLocation: (id) =>
    api.delete(`/saved-locations/${id}`),

  setDefault: (id) =>
    api.post(`/saved-locations/${id}/set-default`),

  reorderLocations: (orderedIds) =>
    api.post('/saved-locations/reorder', { orderedIds }),
};

// Weather API functions
export const weatherApi = {
  getWeather: (location, units = 'metric') => {
    const params = { units };
    if (location) params.location = location;
    return api.get('/weather', { params });
  },

  geocode: (location) =>
    api.get('/weather/geocode', { params: { location } }),

  // Weather locations
  getLocations: () =>
    api.get('/weather/locations'),

  addLocation: (data) =>
    api.post('/weather/locations', data),

  removeLocation: (id) =>
    api.delete(`/weather/locations/${id}`),

  setDefaultLocation: (id) =>
    api.patch(`/weather/locations/${id}/default`),
};

// Analytics API functions
export const analyticsApi = {
  // Tracking (for all users)
  track: (eventData) =>
    api.post('/analytics/track', eventData),

  trackBatch: (events) =>
    api.post('/analytics/track/batch', { events }),

  // Admin analytics endpoints
  getOverview: (params = {}) =>
    api.get('/analytics/overview', { params }),

  getFeatures: (params = {}) =>
    api.get('/analytics/features', { params }),

  getUsers: (params = {}) =>
    api.get('/analytics/users', { params }),

  getErrors: (params = {}) =>
    api.get('/analytics/errors', { params }),

  getRealtime: () =>
    api.get('/analytics/realtime'),
};

// Admin API functions
export const adminApi = {
  // Inbox (task-first view)
  getInbox: () =>
    api.get('/admin/inbox'),

  // Logs
  getLogs: (params = {}) =>
    api.get('/admin/logs', { params }),

  getLog: (requestId) =>
    api.get(`/admin/logs/${requestId}`),

  getLogStats: (params = {}) =>
    api.get('/admin/logs/stats/summary', { params }),

  // Users
  getUsers: (params = {}) =>
    api.get('/admin/users', { params }),

  createUser: (data) =>
    api.post('/admin/users', data),

  updateUser: (id, data) =>
    api.patch(`/admin/users/${id}`, data),

  updateUserFlags: (id, flags) =>
    api.patch(`/admin/users/${id}/flags`, { flags }),

  resetUserPassword: (id, newPassword) =>
    api.post(`/admin/users/${id}/reset-password`, { newPassword }),

  // Features
  getFeatures: () =>
    api.get('/admin/features'),

  // User Content
  getUserContent: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/content`, { params }),

  getUserActivity: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/activity`, { params }),

  // Moderation
  warnUser: (userId, data) =>
    api.post(`/admin/users/${userId}/warn`, data),

  suspendUser: (userId, data) =>
    api.post(`/admin/users/${userId}/suspend`, data),

  unsuspendUser: (userId, data) =>
    api.post(`/admin/users/${userId}/unsuspend`, data),

  addAdminNote: (userId, data) =>
    api.post(`/admin/users/${userId}/admin-note`, data),

  banUser: (userId, data) =>
    api.post(`/admin/users/${userId}/ban`, data),

  unbanUser: (userId, data) =>
    api.post(`/admin/users/${userId}/unban`, data),

  getModerationHistory: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/moderation-history`, { params }),

  // System Settings
  getSystemSettings: () =>
    api.get('/admin/system/settings'),

  getKillSwitches: () =>
    api.get('/admin/system/kill-switches'),

  toggleKillSwitch: (feature, enabled, reason) =>
    api.post('/admin/system/kill-switch', { feature, enabled, reason }),

  // Rate Limit Management
  getRateLimitConfig: () =>
    api.get('/admin/rate-limit/config'),

  updateRateLimitConfig: (config) =>
    api.put('/admin/rate-limit/config', config),

  getRateLimitEvents: (params = {}) =>
    api.get('/admin/rate-limit/events', { params }),

  getRateLimitStats: (windowMs) =>
    api.get('/admin/rate-limit/stats', { params: { windowMs } }),

  getRateLimitAlerts: () =>
    api.get('/admin/rate-limit/alerts'),

  addToWhitelist: (ip, resolveEvents = true) =>
    api.post('/admin/rate-limit/whitelist', { ip, resolveEvents }),

  removeFromWhitelist: (ip) =>
    api.delete(`/admin/rate-limit/whitelist/${encodeURIComponent(ip)}`),

  resolveRateLimitEvent: (id, action) =>
    api.post(`/admin/rate-limit/events/${id}/resolve`, { action }),

  resolveRateLimitEventsByIP: (ip, action) =>
    api.post('/admin/rate-limit/events/resolve-by-ip', { ip, action }),

  // Role Configurations
  getRoleConfigs: () =>
    api.get('/admin/roles'),

  getRoleConfig: (role) =>
    api.get(`/admin/roles/${role}`),

  getRoleFeatures: () =>
    api.get('/admin/roles/features'),

  updateRoleConfig: (role, { limits, features }) =>
    api.patch(`/admin/roles/${role}`, { limits, features }),

  // User Limits
  getUserLimits: (userId) =>
    api.get(`/admin/users/${userId}/limits`),

  updateUserLimits: (userId, limits) =>
    api.patch(`/admin/users/${userId}/limits`, { limits }),

  // Sidebar Configuration
  getSidebarConfig: () =>
    api.get('/admin/sidebar'),

  updateSidebarConfig: (data) =>
    api.patch('/admin/sidebar', data),

  resetSidebarConfig: () =>
    api.post('/admin/sidebar/reset'),

  // Database metrics
  getDatabaseMetrics: () =>
    api.get('/admin/metrics/database'),

  getDatabaseHealth: () =>
    api.get('/admin/metrics/database/health'),

  getSlowQueries: (params = {}) =>
    api.get('/admin/metrics/database/slow-queries', { params }),

  // Reports (user reports/moderation)
  getReports: (params = {}) =>
    api.get('/admin/reports', { params }),

  getReportCounts: () =>
    api.get('/admin/reports/counts'),

  getReport: (reportId) =>
    api.get(`/admin/reports/${reportId}`),

  updateReport: (reportId, data) =>
    api.patch(`/admin/reports/${reportId}`, data),

  getUserReports: (userId, params = {}) =>
    api.get(`/admin/reports/user/${userId}`, { params }),

  // Social Dashboard
  getSocialDashboard: (params = {}) =>
    api.get('/admin/social/dashboard', { params }),

  // User Social Monitoring
  getUserSocialStats: (userId) =>
    api.get(`/admin/users/${userId}/social`),

  getUserSocialMetrics: (userId) =>
    api.get(`/admin/users/${userId}/social-metrics`),

  getUserConnectionPatterns: (userId) =>
    api.get(`/admin/users/${userId}/connection-patterns`),

  // Moderation Templates
  getModerationTemplates: (params = {}) =>
    api.get('/admin/moderation-templates', { params }),

  getModerationTemplate: (templateId) =>
    api.get(`/admin/moderation-templates/${templateId}`),

  createModerationTemplate: (data) =>
    api.post('/admin/moderation-templates', data),

  updateModerationTemplate: (templateId, data) =>
    api.patch(`/admin/moderation-templates/${templateId}`, data),

  deleteModerationTemplate: (templateId) =>
    api.delete(`/admin/moderation-templates/${templateId}`),

  useModerationTemplate: (templateId) =>
    api.post(`/admin/moderation-templates/${templateId}/use`),

  getUserConnections: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/connections`, { params }),

  getUserBlocks: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/blocks`, { params }),

  getUserMessages: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/messages`, { params }),

  getUserShares: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/shares`, { params }),

  // Admin Messages (direct admin-to-user communication)
  sendAdminMessage: (userId, data) =>
    api.post(`/admin/users/${userId}/admin-message`, data),

  getAdminMessages: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/admin-messages`, { params }),

  getAdminMessage: (messageId) =>
    api.get(`/admin/admin-messages/${messageId}`),
};

// Settings API functions (for regular users)
export const settingsApi = {
  getSidebarConfig: () =>
    api.get('/settings/sidebar'),
};

// Files API functions
export const filesApi = {
  getFiles: (params = {}) =>
    api.get('/files', { params }),

  getFile: (id) =>
    api.get(`/files/${id}`),

  searchFiles: (params = {}) =>
    api.get('/files/search', { params }),

  getRecentFiles: (limit = 10) =>
    api.get('/files/recent', { params: { limit } }),

  getTrashedFiles: (params = {}) =>
    api.get('/files/trash', { params }),

  getFileTags: () =>
    api.get('/files/tags'),

  getFileLimits: () =>
    api.get('/files/limits'),

  getStorageStats: () =>
    api.get('/files/stats'),

  uploadFile: (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file); // Using 'file' field for uploadFileSingle middleware
    if (options.folderId) formData.append('folderId', options.folderId);
    if (options.title) formData.append('title', options.title);
    if (options.description) formData.append('description', options.description);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));
    return api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onProgress,
    });
  },

  updateFile: (id, data) =>
    api.patch(`/files/${id}`, data),

  toggleFavorite: (id) =>
    api.post(`/files/${id}/favorite`),

  moveFile: (id, folderId) =>
    api.post(`/files/${id}/move`, { folderId }),

  copyFile: (id, folderId) =>
    api.post(`/files/${id}/copy`, { folderId }),

  trashFile: (id) =>
    api.post(`/files/${id}/trash`),

  restoreFile: (id) =>
    api.post(`/files/${id}/restore`),

  deleteFile: (id) =>
    api.delete(`/files/${id}`),

  getDownloadUrl: (id) =>
    api.get(`/files/${id}/download`),

  getFileVersions: (id) =>
    api.get(`/files/${id}/versions`),

  uploadFileVersion: (id, file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file); // Using 'file' field for uploadFileSingle middleware
    return api.post(`/files/${id}/version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onProgress,
    });
  },

  // Sharing
  getFileShares: (id) =>
    api.get(`/files/${id}/share`),

  createFileShare: (id, options = {}) =>
    api.post(`/files/${id}/share`, options),

  revokeFileShares: (id) =>
    api.delete(`/files/${id}/share`),

  // Entity linking
  linkFile: (id, entityId, entityType) =>
    api.post(`/files/${id}/link`, { entityId, entityType }),

  unlinkFile: (id, entityId, entityType) =>
    api.delete(`/files/${id}/link`, { data: { entityId, entityType } }),

  getFilesForEntity: (entityType, entityId) =>
    api.get(`/files/entity/${entityType}/${entityId}`),

  // Bulk operations
  bulkMoveFiles: (ids, folderId) =>
    api.post('/files/bulk-move', { ids, folderId }),

  bulkTrashFiles: (ids) =>
    api.post('/files/bulk-trash', { ids }),

  bulkDeleteFiles: (ids) =>
    api.post('/files/bulk-delete', { ids }),

  emptyTrash: () =>
    api.post('/files/empty-trash'),
};

// Folders API functions
export const foldersApi = {
  getFolders: (params = {}) =>
    api.get('/folders', { params }),

  getFolderTree: (params = {}) =>
    api.get('/folders/tree', { params }),

  getFolder: (id, params = {}) =>
    api.get(`/folders/${id}`, { params }),

  getBreadcrumb: (id) =>
    api.get(`/folders/${id}/breadcrumb`),

  getFolderStats: (id) =>
    api.get(`/folders/${id}/stats`),

  getTrashedFolders: () =>
    api.get('/folders/trash'),

  createFolder: (data) =>
    api.post('/folders', data),

  updateFolder: (id, data) =>
    api.patch(`/folders/${id}`, data),

  moveFolder: (id, parentId) =>
    api.post(`/folders/${id}/move`, { parentId }),

  trashFolder: (id) =>
    api.post(`/folders/${id}/trash`),

  restoreFolder: (id) =>
    api.post(`/folders/${id}/restore`),

  deleteFolder: (id) =>
    api.delete(`/folders/${id}`),
};

// Public Shares API functions (no auth required)
export const sharesApi = {
  getShareInfo: (token) =>
    api.get(`/share/${token}`),

  verifySharePassword: (token, password) =>
    api.post(`/share/${token}/verify`, { password }),

  getShareDownloadUrl: (token, password) =>
    api.get(`/share/${token}/download`, { params: { password } }),

  getSharePreview: (token, password) =>
    api.get(`/share/${token}/preview`, { params: { password } }),
};

// Logs API functions (for client-side error reporting)
export const logsApi = {
  reportClientError: (errorData) =>
    api.post('/logs/client-error', errorData),
};

// Connections API functions
export const connectionsApi = {
  // Get all connections
  getConnections: (params = {}) =>
    api.get('/connections', { params }).then(res => res.data),

  // Get pending connection requests
  getPending: (params = {}) =>
    api.get('/connections/pending', { params }).then(res => res.data),

  // Get sent connection requests
  getSent: (params = {}) =>
    api.get('/connections/sent', { params }).then(res => res.data),

  // Get connection counts
  getCounts: () =>
    api.get('/connections/counts').then(res => res.data),

  // Get suggested connections
  getSuggestions: (limit = 10) =>
    api.get('/connections/suggestions', { params: { limit } }).then(res => res.data),

  // Send connection request
  sendRequest: (userId, message, source = 'search') =>
    api.post('/connections', { userId, message, source }).then(res => res.data),

  // Accept connection request
  accept: (connectionId) =>
    api.patch(`/connections/${connectionId}/accept`).then(res => res.data),

  // Decline connection request
  decline: (connectionId) =>
    api.patch(`/connections/${connectionId}/decline`).then(res => res.data),

  // Remove connection or cancel request
  remove: (connectionId) =>
    api.delete(`/connections/${connectionId}`).then(res => res.data),

  // Block a user
  block: (userId, reason = 'other', notes) =>
    api.post(`/connections/${userId}/block`, { reason, notes }).then(res => res.data),

  // Unblock a user
  unblock: (userId) =>
    api.delete(`/connections/${userId}/block`).then(res => res.data),

  // Get blocked users
  getBlocked: (params = {}) =>
    api.get('/connections/blocked', { params }).then(res => res.data),
};

// Users API functions (for social features)
export const usersApi = {
  // Search users
  search: (query, params = {}) =>
    api.get('/users/search', { params: { q: query, ...params } }),

  // Get user profile
  getProfile: (userId) =>
    api.get(`/users/${userId}/profile`),

  // Get user's connections
  getUserConnections: (userId, params = {}) =>
    api.get(`/users/${userId}/connections`, { params }),

  // Update social settings
  updateSocialSettings: (settings) =>
    api.patch('/users/social-settings', settings),

  // Update presence status
  updatePresence: (status, statusMessage) =>
    api.patch('/users/presence', { status, statusMessage }),
};

// Item Shares API functions
export const itemSharesApi = {
  // Get items shared with me
  getSharedWithMe: (params = {}) =>
    api.get('/item-shares', { params }).then(res => res.data),

  // Get items I've shared
  getSharedByMe: (params = {}) =>
    api.get('/item-shares/by-me', { params }).then(res => res.data),

  // Get pending share invitations
  getPending: (params = {}) =>
    api.get('/item-shares/pending', { params }).then(res => res.data),

  // Get share counts
  getCounts: () =>
    api.get('/item-shares/counts').then(res => res.data),

  // Get share by item (check if item is already shared)
  getShareByItem: (itemId, itemType) =>
    api.get(`/item-shares/item/${itemId}`, { params: { itemType } }).then(res => res.data),

  // Share an item
  shareItem: (data) =>
    api.post('/item-shares', data).then(res => res.data),

  // Accept share invitation
  acceptShare: (shareId) =>
    api.post(`/item-shares/${shareId}/accept`).then(res => res.data),

  // Decline share invitation
  declineShare: (shareId) =>
    api.post(`/item-shares/${shareId}/decline`).then(res => res.data),

  // Update share settings
  updateShare: (shareId, data) =>
    api.patch(`/item-shares/${shareId}`, data).then(res => res.data),

  // Revoke a share
  revokeShare: (shareId) =>
    api.delete(`/item-shares/${shareId}`).then(res => res.data),

  // Remove a user from a share
  removeUser: (shareId, userId) =>
    api.delete(`/item-shares/${shareId}/users/${userId}`).then(res => res.data),

  // Access a share by token (public/password)
  accessByToken: (token, password) =>
    api.get(`/item-shares/token/${token}`, { params: { password } }).then(res => res.data),

  // Get share analytics
  getAnalytics: (shareId) =>
    api.get(`/item-shares/${shareId}/analytics`).then(res => res.data),
};

// Messages API functions
export const messagesApi = {
  // Get conversations
  getConversations: (params = {}) =>
    api.get('/messages/conversations', { params }).then(res => res.data),

  // Create or get conversation
  createConversation: (data) =>
    api.post('/messages/conversations', data).then(res => res.data),

  // Get messages for a conversation
  getMessages: (conversationId, params = {}) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params }).then(res => res.data),

  // Send a message
  sendMessage: (conversationId, data) =>
    api.post(`/messages/conversations/${conversationId}/messages`, data).then(res => res.data),

  // Edit a message
  editMessage: (messageId, content) =>
    api.patch(`/messages/${messageId}`, { content }).then(res => res.data),

  // Delete a message
  deleteMessage: (messageId) =>
    api.delete(`/messages/${messageId}`).then(res => res.data),

  // Mark message as read
  markAsRead: (messageId) =>
    api.post(`/messages/${messageId}/read`).then(res => res.data),

  // Get unread count
  getUnreadCount: () =>
    api.get('/messages/unread-count').then(res => res.data),

  // Archive conversation
  archiveConversation: (conversationId) =>
    api.post(`/messages/conversations/${conversationId}/archive`).then(res => res.data),

  // Mute conversation
  muteConversation: (conversationId, duration) =>
    api.post(`/messages/conversations/${conversationId}/mute`, { duration }).then(res => res.data),

  // Unmute conversation
  unmuteConversation: (conversationId) =>
    api.post(`/messages/conversations/${conversationId}/unmute`).then(res => res.data),

  // Toggle reaction on a message (add or remove)
  toggleReaction: (messageId, emoji) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }).then(res => res.data),

  // Remove a specific reaction from a message
  removeReaction: (messageId, emoji) =>
    api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`).then(res => res.data),

  // Upload attachments for a message
  uploadAttachments: (conversationId, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post(`/messages/conversations/${conversationId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  // Group member management
  addMember: (conversationId, userId) =>
    api.post(`/messages/conversations/${conversationId}/members`, { userId }).then(res => res.data),

  removeMember: (conversationId, userId) =>
    api.delete(`/messages/conversations/${conversationId}/members/${userId}`).then(res => res.data),

  updateMemberRole: (conversationId, userId, role) =>
    api.patch(`/messages/conversations/${conversationId}/members/${userId}`, { role }).then(res => res.data),

  // Search messages across all conversations
  search: (query, params = {}) =>
    api.get('/messages/search', { params: { q: query, ...params } }).then(res => res.data),
};

// Reports API functions (user-facing)
export const reportsApi = {
  // Submit a report
  submitReport: (data) =>
    api.post('/reports', data),

  // Get my submitted reports
  getMyReports: (params = {}) =>
    api.get('/reports/my-reports', { params }),
};

// Feedback API functions (user-facing)
export const feedbackApi = {
  // Submit feedback
  submitFeedback: (data) =>
    api.post('/feedback', data),

  // Check feedback status by token
  getFeedbackStatus: (statusToken) =>
    api.get(`/feedback/status/${statusToken}`),
};

// Notifications API functions
export const notificationsApi = {
  // Get notifications
  getNotifications: (params = {}) =>
    api.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (notificationId) =>
    api.post(`/notifications/${notificationId}/read`),

  // Mark all as read
  markAllAsRead: () =>
    api.post('/notifications/read-all'),

  // Delete notification
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),

  // Delete all read notifications
  deleteReadNotifications: () =>
    api.delete('/notifications'),

  // Get activity feed
  getActivityFeed: (params = {}) =>
    api.get('/notifications/activity/feed', { params }),

  // Get user activities
  getUserActivities: (userId, params = {}) =>
    api.get(`/notifications/activity/user/${userId}`, { params }),
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from response
    const message = error.response?.data?.error || error.message || 'An error occurred';
    const code = error.response?.data?.code || 'UNKNOWN_ERROR';

    // Create enhanced error
    const enhancedError = new Error(message);
    enhancedError.code = code;
    enhancedError.status = error.response?.status;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export default api;
