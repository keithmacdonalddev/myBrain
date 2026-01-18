import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

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
};

// Areas API functions
export const areasApi = {
  getAreas: () =>
    api.get('/areas'),

  // Admin endpoints
  getAllAreas: () =>
    api.get('/areas/admin'),

  createArea: (data) =>
    api.post('/areas/admin', data),

  updateArea: (slug, data) =>
    api.patch(`/areas/admin/${slug}`, data),

  deleteArea: (slug) =>
    api.delete(`/areas/admin/${slug}`),

  reorderAreas: (orderedSlugs) =>
    api.post('/areas/admin/reorder', { orderedSlugs }),
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
};

// Images API functions
export const imagesApi = {
  getImages: (params = {}) =>
    api.get('/images', { params }),

  getImage: (id) =>
    api.get(`/images/${id}`),

  uploadImage: (file, options = {}) => {
    const formData = new FormData();
    formData.append('image', file);
    if (options.alt) formData.append('alt', options.alt);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));
    if (options.folder) formData.append('folder', options.folder);
    return api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateImage: (id, data) =>
    api.patch(`/images/${id}`, data),

  deleteImage: (id) =>
    api.delete(`/images/${id}`),
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

// Admin API functions
export const adminApi = {
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

  updateUser: (id, data) =>
    api.patch(`/admin/users/${id}`, data),

  updateUserFlags: (id, flags) =>
    api.patch(`/admin/users/${id}/flags`, { flags }),

  resetUserPassword: (id, newPassword) =>
    api.post(`/admin/users/${id}/reset-password`, { newPassword }),
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
