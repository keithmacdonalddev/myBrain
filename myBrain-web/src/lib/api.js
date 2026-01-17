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
