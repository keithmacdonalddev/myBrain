import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'mybrain_token';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Still send cookies for same-origin fallback
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

  getModerationHistory: (userId, params = {}) =>
    api.get(`/admin/users/${userId}/moderation-history`, { params }),

  // System Settings
  getSystemSettings: () =>
    api.get('/admin/system/settings'),

  getKillSwitches: () =>
    api.get('/admin/system/kill-switches'),

  toggleKillSwitch: (feature, enabled, reason) =>
    api.post('/admin/system/kill-switch', { feature, enabled, reason }),

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
};

// Settings API functions (for regular users)
export const settingsApi = {
  getSidebarConfig: () =>
    api.get('/settings/sidebar'),
};

// Logs API functions (for client-side error reporting)
export const logsApi = {
  reportClientError: (errorData) =>
    api.post('/logs/client-error', errorData),
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
