/**
 * Tests for api.js
 * Testing API client configuration, interceptors, and API method groups
 *
 * NOTE: The axios instance is created at module load time, so we can't easily
 * test the interceptors by mocking axios.create. Instead, we test:
 * 1. Token management functions (which are standalone)
 * 2. API method signatures (using a mock axios instance)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Mock Setup - Must happen before importing the module
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock axios module - vi.mock is hoisted, factory must be self-contained
// Using simple function mocks that track calls
vi.mock('axios', () => {
  // Simple mock functions that record calls
  const createMockFn = () => {
    const calls = [];
    const fn = (...args) => {
      calls.push(args);
      return Promise.resolve({ data: {} });
    };
    fn.mock = { calls };
    fn.mockClear = () => { calls.length = 0; };
    return fn;
  };

  const mockInstance = {
    get: createMockFn(),
    post: createMockFn(),
    patch: createMockFn(),
    delete: createMockFn(),
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} },
    },
  };

  return {
    default: {
      create: () => mockInstance,
    },
  };
});

// Now import the module (after mocks are set up)
import api, {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  authApi,
  notesApi,
  tasksApi,
  filtersApi,
  profileApi,
  imagesApi,
  eventsApi,
  tagsApi,
  lifeAreasApi,
  projectsApi,
  savedLocationsApi,
  weatherApi,
  analyticsApi,
  adminApi,
  settingsApi,
  filesApi,
  foldersApi,
  sharesApi,
  logsApi,
  connectionsApi,
  usersApi,
  itemSharesApi,
  messagesApi,
  reportsApi,
  notificationsApi,
} from './api';

// The mock axios instance is the default export from api.js
// We can access the mock functions through it
const mockAxiosInstance = api;

// Helper to clear mock call history
const clearMocks = () => {
  mockAxiosInstance.get.mock.calls.length = 0;
  mockAxiosInstance.post.mock.calls.length = 0;
  mockAxiosInstance.patch.mock.calls.length = 0;
  mockAxiosInstance.delete.mock.calls.length = 0;
};

// Helper to check if mock was called with expected args
const expectCalledWith = (mockFn, ...expectedArgs) => {
  const lastCall = mockFn.mock.calls[mockFn.mock.calls.length - 1];
  expect(lastCall).toBeDefined();
  expectedArgs.forEach((expectedArg, index) => {
    if (expectedArg !== undefined) {
      if (typeof expectedArg === 'object' && expectedArg !== null) {
        expect(lastCall[index]).toEqual(expect.objectContaining(expectedArg));
      } else {
        expect(lastCall[index]).toEqual(expectedArg);
      }
    }
  });
};

// Extend mock functions with toHaveBeenCalledWith-like behavior
const addMockMatcher = (fn) => {
  fn.toHaveBeenCalledWith = (...args) => {
    const lastCall = fn.mock.calls[fn.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    args.forEach((arg, i) => {
      if (arg && typeof arg === 'object') {
        expect(lastCall[i]).toEqual(expect.objectContaining(arg));
      } else {
        expect(lastCall[i]).toEqual(arg);
      }
    });
  };
};

// Add matchers after import (this runs after module initialization)
addMockMatcher(mockAxiosInstance.get);
addMockMatcher(mockAxiosInstance.post);
addMockMatcher(mockAxiosInstance.patch);
addMockMatcher(mockAxiosInstance.delete);

// =============================================================================
// Tests for Token Management Functions
// =============================================================================

describe('Token Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Also reset the mock function call history
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    clearMocks();
  });

  describe('setAuthToken', () => {
    it('stores token in localStorage when provided', () => {
      setAuthToken('test-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('mybrain_token', 'test-token-123');
    });

    it('does not store null or undefined tokens', () => {
      setAuthToken(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      setAuthToken(undefined);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('does not store empty string token (falsy check)', () => {
      setAuthToken('');
      // Empty string is falsy, so it should not be stored
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAuthToken', () => {
    it('removes token from localStorage', () => {
      clearAuthToken();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mybrain_token');
    });
  });

  describe('getAuthToken', () => {
    it('retrieves token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-token-456');
      const token = getAuthToken();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mybrain_token');
      expect(token).toBe('stored-token-456');
    });

    it('returns null when no token is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const token = getAuthToken();
      expect(token).toBeNull();
    });
  });
});

// =============================================================================
// Tests for Auth API Methods
// =============================================================================

describe('authApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('register calls POST /auth/register with credentials', () => {
    authApi.register('test@example.com', 'password123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/auth/register', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('login calls POST /auth/login with credentials', () => {
    authApi.login('test@example.com', 'password123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('logout calls POST /auth/logout', () => {
    authApi.logout();
    mockAxiosInstance.post.toHaveBeenCalledWith('/auth/logout');
  });

  it('getMe calls GET /auth/me', () => {
    authApi.getMe();
    mockAxiosInstance.get.toHaveBeenCalledWith('/auth/me');
  });

  it('getSubscription calls GET /auth/subscription', () => {
    authApi.getSubscription();
    mockAxiosInstance.get.toHaveBeenCalledWith('/auth/subscription');
  });
});

// =============================================================================
// Tests for Notes API Methods
// =============================================================================

describe('notesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getNotes calls GET /notes with params', () => {
    notesApi.getNotes({ status: 'active' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes', { params: { status: 'active' } });
  });

  it('getNotes calls GET /notes with empty params by default', () => {
    notesApi.getNotes();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes', { params: {} });
  });

  it('getNote calls GET /notes/:id', () => {
    notesApi.getNote('note123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/note123');
  });

  it('createNote calls POST /notes', () => {
    const noteData = { title: 'Test Note', content: 'Content' };
    notesApi.createNote(noteData);
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes', noteData);
  });

  it('updateNote calls PATCH /notes/:id', () => {
    const updateData = { title: 'Updated Title' };
    notesApi.updateNote('note123', updateData);
    mockAxiosInstance.patch.toHaveBeenCalledWith('/notes/note123', updateData);
  });

  it('deleteNote calls DELETE /notes/:id', () => {
    notesApi.deleteNote('note123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/notes/note123');
  });

  it('pinNote calls POST /notes/:id/pin', () => {
    notesApi.pinNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/pin');
  });

  it('unpinNote calls POST /notes/:id/unpin', () => {
    notesApi.unpinNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/unpin');
  });

  it('archiveNote calls POST /notes/:id/archive', () => {
    notesApi.archiveNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/archive');
  });

  it('unarchiveNote calls POST /notes/:id/unarchive', () => {
    notesApi.unarchiveNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/unarchive');
  });

  it('trashNote calls POST /notes/:id/trash', () => {
    notesApi.trashNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/trash');
  });

  it('restoreNote calls POST /notes/:id/restore', () => {
    notesApi.restoreNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/restore');
  });

  it('getRecentNotes calls GET /notes/recent with limit', () => {
    notesApi.getRecentNotes(10);
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/recent', { params: { limit: 10 } });
  });

  it('getRecentNotes uses default limit of 5', () => {
    notesApi.getRecentNotes();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/recent', { params: { limit: 5 } });
  });

  it('getPinnedNotes calls GET /notes/pinned', () => {
    notesApi.getPinnedNotes();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/pinned');
  });

  it('getInboxNotes calls GET /notes/inbox', () => {
    notesApi.getInboxNotes({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/inbox', { params: { page: 1 } });
  });

  it('getInboxCount calls GET /notes/inbox/count', () => {
    notesApi.getInboxCount();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/inbox/count');
  });

  it('processNote calls POST /notes/:id/process', () => {
    notesApi.processNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/process');
  });

  it('convertToTask calls POST /notes/:id/convert-to-task', () => {
    notesApi.convertToTask('note123', false);
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/convert-to-task', {
      keepNote: false,
    });
  });

  it('getBacklinks calls GET /notes/:id/backlinks', () => {
    notesApi.getBacklinks('note123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/note123/backlinks');
  });

  it('getLastOpenedNote calls GET /notes/last-opened', () => {
    notesApi.getLastOpenedNote();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/last-opened');
  });

  it('unprocessNote calls POST /notes/:id/unprocess', () => {
    notesApi.unprocessNote('note123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notes/note123/unprocess');
  });

  it('getTags calls GET /notes/tags', () => {
    notesApi.getTags();
    mockAxiosInstance.get.toHaveBeenCalledWith('/notes/tags');
  });
});

// =============================================================================
// Tests for Tasks API Methods
// =============================================================================

describe('tasksApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getTasks calls GET /tasks with params', () => {
    tasksApi.getTasks({ status: 'pending' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/tasks', { params: { status: 'pending' } });
  });

  it('getTask calls GET /tasks/:id', () => {
    tasksApi.getTask('task123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/tasks/task123');
  });

  it('createTask calls POST /tasks', () => {
    const taskData = { title: 'Test Task' };
    tasksApi.createTask(taskData);
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks', taskData);
  });

  it('updateTask calls PATCH /tasks/:id', () => {
    tasksApi.updateTask('task123', { title: 'Updated' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/tasks/task123', { title: 'Updated' });
  });

  it('updateTaskStatus calls POST /tasks/:id/status', () => {
    tasksApi.updateTaskStatus('task123', 'completed');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/status', {
      status: 'completed',
    });
  });

  it('deleteTask calls DELETE /tasks/:id', () => {
    tasksApi.deleteTask('task123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/tasks/task123');
  });

  it('getTodayView calls GET /tasks/today', () => {
    tasksApi.getTodayView();
    mockAxiosInstance.get.toHaveBeenCalledWith('/tasks/today');
  });

  it('linkNote calls POST /tasks/:id/link-note', () => {
    tasksApi.linkNote('task123', 'note456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/link-note', {
      noteId: 'note456',
    });
  });

  it('unlinkNote calls DELETE /tasks/:id/link-note/:noteId', () => {
    tasksApi.unlinkNote('task123', 'note456');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/tasks/task123/link-note/note456');
  });

  it('addComment calls POST /tasks/:id/comments', () => {
    tasksApi.addComment('task123', 'Great progress!');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/comments', {
      text: 'Great progress!',
    });
  });

  it('updateComment calls PATCH /tasks/:id/comments/:commentId', () => {
    tasksApi.updateComment('task123', 'comment456', 'Updated text');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/tasks/task123/comments/comment456', {
      text: 'Updated text',
    });
  });

  it('deleteComment calls DELETE /tasks/:id/comments/:commentId', () => {
    tasksApi.deleteComment('task123', 'comment456');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/tasks/task123/comments/comment456');
  });

  it('getTaskTags calls GET /tasks/tags', () => {
    tasksApi.getTaskTags();
    mockAxiosInstance.get.toHaveBeenCalledWith('/tasks/tags');
  });

  it('getBacklinks calls GET /tasks/:id/backlinks', () => {
    tasksApi.getBacklinks('task123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/tasks/task123/backlinks');
  });

  it('archiveTask calls POST /tasks/:id/archive', () => {
    tasksApi.archiveTask('task123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/archive');
  });

  it('unarchiveTask calls POST /tasks/:id/unarchive', () => {
    tasksApi.unarchiveTask('task123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/unarchive');
  });

  it('trashTask calls POST /tasks/:id/trash', () => {
    tasksApi.trashTask('task123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/trash');
  });

  it('restoreTask calls POST /tasks/:id/restore', () => {
    tasksApi.restoreTask('task123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tasks/task123/restore');
  });
});

// =============================================================================
// Tests for Filters API Methods
// =============================================================================

describe('filtersApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getFilters calls GET /filters with entityType param', () => {
    filtersApi.getFilters('task');
    mockAxiosInstance.get.toHaveBeenCalledWith('/filters', {
      params: { entityType: 'task' },
    });
  });

  it('getFilters calls GET /filters with empty params when no entityType', () => {
    filtersApi.getFilters();
    mockAxiosInstance.get.toHaveBeenCalledWith('/filters', { params: {} });
  });

  it('getFilter calls GET /filters/:id', () => {
    filtersApi.getFilter('filter123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/filters/filter123');
  });

  it('createFilter calls POST /filters', () => {
    const data = { name: 'My Filter', query: {} };
    filtersApi.createFilter(data);
    mockAxiosInstance.post.toHaveBeenCalledWith('/filters', data);
  });

  it('updateFilter calls PATCH /filters/:id', () => {
    filtersApi.updateFilter('filter123', { name: 'Updated' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/filters/filter123', { name: 'Updated' });
  });

  it('deleteFilter calls DELETE /filters/:id', () => {
    filtersApi.deleteFilter('filter123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/filters/filter123');
  });
});

// =============================================================================
// Tests for Projects API Methods
// =============================================================================

describe('projectsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getProjects calls GET /projects', () => {
    projectsApi.getProjects({ status: 'active' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/projects', {
      params: { status: 'active' },
    });
  });

  it('getProject calls GET /projects/:id with populateLinks param', () => {
    projectsApi.getProject('proj123', true);
    mockAxiosInstance.get.toHaveBeenCalledWith('/projects/proj123', {
      params: { populateLinks: true },
    });
  });

  it('getUpcoming calls GET /projects/upcoming with days param', () => {
    projectsApi.getUpcoming(14);
    mockAxiosInstance.get.toHaveBeenCalledWith('/projects/upcoming', {
      params: { days: 14 },
    });
  });

  it('getOverdue calls GET /projects/overdue', () => {
    projectsApi.getOverdue();
    mockAxiosInstance.get.toHaveBeenCalledWith('/projects/overdue');
  });

  it('createProject calls POST /projects', () => {
    const data = { name: 'New Project' };
    projectsApi.createProject(data);
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects', data);
  });

  it('updateProject calls PATCH /projects/:id', () => {
    projectsApi.updateProject('proj123', { name: 'Updated' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/projects/proj123', { name: 'Updated' });
  });

  it('updateProjectStatus calls POST /projects/:id/status', () => {
    projectsApi.updateProjectStatus('proj123', 'completed');
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects/proj123/status', {
      status: 'completed',
    });
  });

  it('deleteProject calls DELETE /projects/:id', () => {
    projectsApi.deleteProject('proj123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/projects/proj123');
  });

  it('linkNote calls POST /projects/:id/link-note', () => {
    projectsApi.linkNote('proj123', 'note456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects/proj123/link-note', {
      noteId: 'note456',
    });
  });

  it('unlinkNote calls DELETE /projects/:id/link-note/:noteId', () => {
    projectsApi.unlinkNote('proj123', 'note456');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/projects/proj123/link-note/note456');
  });

  it('linkTask calls POST /projects/:id/link-task', () => {
    projectsApi.linkTask('proj123', 'task456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects/proj123/link-task', {
      taskId: 'task456',
    });
  });

  it('linkEvent calls POST /projects/:id/link-event', () => {
    projectsApi.linkEvent('proj123', 'event456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects/proj123/link-event', {
      eventId: 'event456',
    });
  });

  it('addComment calls POST /projects/:id/comments', () => {
    projectsApi.addComment('proj123', 'Project update');
    mockAxiosInstance.post.toHaveBeenCalledWith('/projects/proj123/comments', {
      text: 'Project update',
    });
  });
});

// =============================================================================
// Tests for Profile API Methods
// =============================================================================

describe('profileApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getProfile calls GET /profile', () => {
    profileApi.getProfile();
    mockAxiosInstance.get.toHaveBeenCalledWith('/profile');
  });

  it('updateProfile calls PATCH /profile', () => {
    profileApi.updateProfile({ displayName: 'New Name' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/profile', { displayName: 'New Name' });
  });

  it('changePassword calls POST /profile/change-password', () => {
    profileApi.changePassword('oldPass', 'newPass');
    mockAxiosInstance.post.toHaveBeenCalledWith('/profile/change-password', {
      currentPassword: 'oldPass',
      newPassword: 'newPass',
    });
  });

  it('changeEmail calls POST /profile/change-email', () => {
    profileApi.changeEmail('new@email.com', 'password');
    mockAxiosInstance.post.toHaveBeenCalledWith('/profile/change-email', {
      newEmail: 'new@email.com',
      password: 'password',
    });
  });

  it('deleteAccount calls DELETE /profile with password', () => {
    profileApi.deleteAccount('mypassword');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/profile', {
      data: { password: 'mypassword' },
    });
  });

  it('uploadAvatar creates FormData and calls POST /profile/avatar', () => {
    const mockFile = new File([''], 'avatar.png', { type: 'image/png' });
    profileApi.uploadAvatar(mockFile);

    // Get the last call to post
    const lastCall = mockAxiosInstance.post.mock.calls[mockAxiosInstance.post.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/profile/avatar');
    expect(lastCall[1]).toBeInstanceOf(FormData);
    expect(lastCall[2]).toEqual(expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  });

  it('deleteAvatar calls DELETE /profile/avatar', () => {
    profileApi.deleteAvatar();
    mockAxiosInstance.delete.toHaveBeenCalledWith('/profile/avatar');
  });

  it('getActivity calls GET /profile/activity', () => {
    profileApi.getActivity({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/profile/activity', {
      params: { page: 1 },
    });
  });

  it('updatePreferences calls PATCH /profile/preferences', () => {
    profileApi.updatePreferences({ theme: 'dark' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/profile/preferences', { theme: 'dark' });
  });
});

// =============================================================================
// Tests for Images API Methods
// =============================================================================

describe('imagesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getImages calls GET /images', () => {
    imagesApi.getImages({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/images', { params: { page: 1 } });
  });

  it('getImage calls GET /images/:id', () => {
    imagesApi.getImage('img123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/images/img123');
  });

  it('searchImages calls GET /images/search', () => {
    imagesApi.searchImages({ query: 'sunset' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/images/search', {
      params: { query: 'sunset' },
    });
  });

  it('uploadImage creates FormData with all options', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    imagesApi.uploadImage(mockFile, {
      title: 'My Image',
      description: 'A test image',
      alt: 'Test',
      tags: ['tag1', 'tag2'],
      folder: 'folder123',
    });

    // Get the last call to post
    const lastCall = mockAxiosInstance.post.mock.calls[mockAxiosInstance.post.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/images');
    expect(lastCall[1]).toBeInstanceOf(FormData);
    expect(lastCall[2]).toEqual(expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  });

  it('toggleFavorite calls POST /images/:id/favorite', () => {
    imagesApi.toggleFavorite('img123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/images/img123/favorite');
  });

  it('bulkDeleteImages calls POST /images/bulk-delete', () => {
    imagesApi.bulkDeleteImages(['img1', 'img2', 'img3']);
    mockAxiosInstance.post.toHaveBeenCalledWith('/images/bulk-delete', {
      ids: ['img1', 'img2', 'img3'],
    });
  });

  it('getImageLimits calls GET /images/limits', () => {
    imagesApi.getImageLimits();
    mockAxiosInstance.get.toHaveBeenCalledWith('/images/limits');
  });

  it('updateImage calls PATCH /images/:id', () => {
    imagesApi.updateImage('img123', { title: 'New Title' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/images/img123', { title: 'New Title' });
  });

  it('deleteImage calls DELETE /images/:id', () => {
    imagesApi.deleteImage('img123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/images/img123');
  });
});

// =============================================================================
// Tests for Events API Methods
// =============================================================================

describe('eventsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getEvents calls GET /events', () => {
    eventsApi.getEvents({ month: '2024-06' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/events', { params: { month: '2024-06' } });
  });

  it('getEvent calls GET /events/:id', () => {
    eventsApi.getEvent('event123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/events/event123');
  });

  it('getUpcoming calls GET /events/upcoming with days param', () => {
    eventsApi.getUpcoming(14);
    mockAxiosInstance.get.toHaveBeenCalledWith('/events/upcoming', { params: { days: 14 } });
  });

  it('getUpcoming uses default of 7 days', () => {
    eventsApi.getUpcoming();
    mockAxiosInstance.get.toHaveBeenCalledWith('/events/upcoming', { params: { days: 7 } });
  });

  it('getDayEvents calls GET /events/day/:date', () => {
    eventsApi.getDayEvents('2024-06-15');
    mockAxiosInstance.get.toHaveBeenCalledWith('/events/day/2024-06-15');
  });

  it('createEvent calls POST /events', () => {
    const data = { title: 'Meeting', date: '2024-06-15' };
    eventsApi.createEvent(data);
    mockAxiosInstance.post.toHaveBeenCalledWith('/events', data);
  });

  it('updateEvent calls PATCH /events/:id', () => {
    eventsApi.updateEvent('event123', { title: 'Updated' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/events/event123', { title: 'Updated' });
  });

  it('deleteEvent calls DELETE /events/:id', () => {
    eventsApi.deleteEvent('event123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/events/event123');
  });

  it('linkTask calls POST /events/:id/link-task', () => {
    eventsApi.linkTask('event123', 'task456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/events/event123/link-task', {
      taskId: 'task456',
    });
  });

  it('unlinkTask calls DELETE /events/:id/link-task/:taskId', () => {
    eventsApi.unlinkTask('event123', 'task456');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/events/event123/link-task/task456');
  });

  it('linkNote calls POST /events/:id/link-note', () => {
    eventsApi.linkNote('event123', 'note456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/events/event123/link-note', {
      noteId: 'note456',
    });
  });

  it('unlinkNote calls DELETE /events/:id/link-note/:noteId', () => {
    eventsApi.unlinkNote('event123', 'note456');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/events/event123/link-note/note456');
  });
});

// =============================================================================
// Tests for Tags API Methods
// =============================================================================

describe('tagsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getTags calls GET /tags', () => {
    tagsApi.getTags({ type: 'note' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/tags', { params: { type: 'note' } });
  });

  it('getAllTags calls GET /tags/all', () => {
    tagsApi.getAllTags({ includeCount: true });
    mockAxiosInstance.get.toHaveBeenCalledWith('/tags/all', {
      params: { includeCount: true },
    });
  });

  it('getPopularTags calls GET /tags/popular with limit', () => {
    tagsApi.getPopularTags(20);
    mockAxiosInstance.get.toHaveBeenCalledWith('/tags/popular', { params: { limit: 20 } });
  });

  it('getPopularTags uses default limit of 10', () => {
    tagsApi.getPopularTags();
    mockAxiosInstance.get.toHaveBeenCalledWith('/tags/popular', { params: { limit: 10 } });
  });

  it('searchTags calls GET /tags with search params', () => {
    tagsApi.searchTags('work', 5);
    mockAxiosInstance.get.toHaveBeenCalledWith('/tags', {
      params: { search: 'work', limit: 5 },
    });
  });

  it('createTag calls POST /tags', () => {
    tagsApi.createTag({ name: 'important', color: 'red' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/tags', {
      name: 'important',
      color: 'red',
    });
  });

  it('trackUsage calls POST /tags/track', () => {
    tagsApi.trackUsage(['tag1', 'tag2']);
    mockAxiosInstance.post.toHaveBeenCalledWith('/tags/track', { tags: ['tag1', 'tag2'] });
  });

  it('renameTag calls POST /tags/rename', () => {
    tagsApi.renameTag('oldName', 'newName');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tags/rename', {
      oldName: 'oldName',
      newName: 'newName',
    });
  });

  it('mergeTags calls POST /tags/merge', () => {
    tagsApi.mergeTags(['tag1', 'tag2'], 'targetTag');
    mockAxiosInstance.post.toHaveBeenCalledWith('/tags/merge', {
      sourceTags: ['tag1', 'tag2'],
      targetTag: 'targetTag',
    });
  });

  it('updateTag calls PATCH /tags/:name (URL encoded)', () => {
    tagsApi.updateTag('my tag', { color: 'blue' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/tags/my%20tag', { color: 'blue' });
  });

  it('deleteTag encodes tag name in URL', () => {
    tagsApi.deleteTag('my tag');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/tags/my%20tag');
  });
});

// =============================================================================
// Tests for Life Areas API Methods
// =============================================================================

describe('lifeAreasApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getLifeAreas calls GET /life-areas with includeArchived param', () => {
    lifeAreasApi.getLifeAreas(true);
    mockAxiosInstance.get.toHaveBeenCalledWith('/life-areas', {
      params: { includeArchived: true },
    });
  });

  it('getLifeAreas defaults to false for includeArchived', () => {
    lifeAreasApi.getLifeAreas();
    mockAxiosInstance.get.toHaveBeenCalledWith('/life-areas', {
      params: { includeArchived: false },
    });
  });

  it('getLifeArea calls GET /life-areas/:id with includeCounts', () => {
    lifeAreasApi.getLifeArea('area123', true);
    mockAxiosInstance.get.toHaveBeenCalledWith('/life-areas/area123', {
      params: { includeCounts: true },
    });
  });

  it('createLifeArea calls POST /life-areas', () => {
    lifeAreasApi.createLifeArea({ name: 'Work', color: 'blue' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/life-areas', {
      name: 'Work',
      color: 'blue',
    });
  });

  it('updateLifeArea calls PATCH /life-areas/:id', () => {
    lifeAreasApi.updateLifeArea('area123', { name: 'Updated' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/life-areas/area123', {
      name: 'Updated',
    });
  });

  it('deleteLifeArea calls DELETE /life-areas/:id', () => {
    lifeAreasApi.deleteLifeArea('area123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/life-areas/area123');
  });

  it('setDefault calls POST /life-areas/:id/set-default', () => {
    lifeAreasApi.setDefault('area123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/life-areas/area123/set-default');
  });

  it('reorderLifeAreas calls POST /life-areas/reorder', () => {
    lifeAreasApi.reorderLifeAreas(['area1', 'area2', 'area3']);
    mockAxiosInstance.post.toHaveBeenCalledWith('/life-areas/reorder', {
      orderedIds: ['area1', 'area2', 'area3'],
    });
  });

  it('archiveLifeArea calls POST /life-areas/:id/archive', () => {
    lifeAreasApi.archiveLifeArea('area123', true);
    mockAxiosInstance.post.toHaveBeenCalledWith('/life-areas/area123/archive', {
      isArchived: true,
    });
  });

  it('getLifeAreaItems calls GET /life-areas/:id/items', () => {
    lifeAreasApi.getLifeAreaItems('area123', { type: 'task' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/life-areas/area123/items', {
      params: { type: 'task' },
    });
  });
});

// =============================================================================
// Tests for Weather API Methods
// =============================================================================

describe('weatherApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getWeather calls GET /weather with location and units', () => {
    weatherApi.getWeather('New York', 'imperial');
    mockAxiosInstance.get.toHaveBeenCalledWith('/weather', {
      params: { units: 'imperial', location: 'New York' },
    });
  });

  it('getWeather uses default metric units', () => {
    weatherApi.getWeather('London');
    mockAxiosInstance.get.toHaveBeenCalledWith('/weather', {
      params: { units: 'metric', location: 'London' },
    });
  });

  it('getWeather works without location', () => {
    weatherApi.getWeather();
    mockAxiosInstance.get.toHaveBeenCalledWith('/weather', { params: { units: 'metric' } });
  });

  it('geocode calls GET /weather/geocode', () => {
    weatherApi.geocode('Paris');
    mockAxiosInstance.get.toHaveBeenCalledWith('/weather/geocode', {
      params: { location: 'Paris' },
    });
  });

  it('getLocations calls GET /weather/locations', () => {
    weatherApi.getLocations();
    mockAxiosInstance.get.toHaveBeenCalledWith('/weather/locations');
  });

  it('addLocation calls POST /weather/locations', () => {
    weatherApi.addLocation({ name: 'Tokyo', coords: { lat: 35.6762, lng: 139.6503 } });
    mockAxiosInstance.post.toHaveBeenCalledWith('/weather/locations', {
      name: 'Tokyo',
      coords: { lat: 35.6762, lng: 139.6503 },
    });
  });

  it('removeLocation calls DELETE /weather/locations/:id', () => {
    weatherApi.removeLocation('loc123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/weather/locations/loc123');
  });

  it('setDefaultLocation calls PATCH /weather/locations/:id/default', () => {
    weatherApi.setDefaultLocation('loc123');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/weather/locations/loc123/default');
  });
});

// =============================================================================
// Tests for Analytics API Methods
// =============================================================================

describe('analyticsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('track calls POST /analytics/track', () => {
    const eventData = { event: 'page_view', page: '/dashboard' };
    analyticsApi.track(eventData);
    mockAxiosInstance.post.toHaveBeenCalledWith('/analytics/track', eventData);
  });

  it('trackBatch calls POST /analytics/track/batch', () => {
    const events = [{ event: 'click' }, { event: 'view' }];
    analyticsApi.trackBatch(events);
    mockAxiosInstance.post.toHaveBeenCalledWith('/analytics/track/batch', { events });
  });

  it('getOverview calls GET /analytics/overview', () => {
    analyticsApi.getOverview({ period: 'month' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/analytics/overview', {
      params: { period: 'month' },
    });
  });
});

// =============================================================================
// Tests for Files API Methods
// =============================================================================

describe('filesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getFiles calls GET /files', () => {
    filesApi.getFiles({ folderId: 'folder123' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/files', {
      params: { folderId: 'folder123' },
    });
  });

  it('getFile calls GET /files/:id', () => {
    filesApi.getFile('file123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/files/file123');
  });

  it('uploadFile creates FormData with options', () => {
    const mockFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    const onProgress = vi.fn();
    filesApi.uploadFile(mockFile, {
      folderId: 'folder123',
      title: 'My Document',
      onProgress,
    });

    // Get the last call to post
    const lastCall = mockAxiosInstance.post.mock.calls[mockAxiosInstance.post.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/files');
    expect(lastCall[1]).toBeInstanceOf(FormData);
    expect(lastCall[2]).toEqual(expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }));
  });

  it('moveFile calls POST /files/:id/move', () => {
    filesApi.moveFile('file123', 'folder456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/file123/move', {
      folderId: 'folder456',
    });
  });

  it('copyFile calls POST /files/:id/copy', () => {
    filesApi.copyFile('file123', 'folder456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/file123/copy', {
      folderId: 'folder456',
    });
  });

  it('trashFile calls POST /files/:id/trash', () => {
    filesApi.trashFile('file123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/file123/trash');
  });

  it('restoreFile calls POST /files/:id/restore', () => {
    filesApi.restoreFile('file123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/file123/restore');
  });

  it('deleteFile calls DELETE /files/:id', () => {
    filesApi.deleteFile('file123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/files/file123');
  });

  it('emptyTrash calls POST /files/empty-trash', () => {
    filesApi.emptyTrash();
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/empty-trash');
  });

  it('linkFile calls POST /files/:id/link', () => {
    filesApi.linkFile('file123', 'project456', 'project');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/file123/link', {
      entityId: 'project456',
      entityType: 'project',
    });
  });

  it('unlinkFile calls DELETE /files/:id/link', () => {
    filesApi.unlinkFile('file123', 'project456', 'project');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/files/file123/link', {
      data: { entityId: 'project456', entityType: 'project' },
    });
  });

  it('bulkMoveFiles calls POST /files/bulk-move', () => {
    filesApi.bulkMoveFiles(['f1', 'f2'], 'folder123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/files/bulk-move', {
      ids: ['f1', 'f2'],
      folderId: 'folder123',
    });
  });
});

// =============================================================================
// Tests for Folders API Methods
// =============================================================================

describe('foldersApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getFolders calls GET /folders', () => {
    foldersApi.getFolders({ parentId: 'parent123' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/folders', {
      params: { parentId: 'parent123' },
    });
  });

  it('getFolderTree calls GET /folders/tree', () => {
    foldersApi.getFolderTree({ rootId: 'root123' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/folders/tree', {
      params: { rootId: 'root123' },
    });
  });

  it('getFolder calls GET /folders/:id', () => {
    foldersApi.getFolder('folder123', { includeFiles: true });
    mockAxiosInstance.get.toHaveBeenCalledWith('/folders/folder123', {
      params: { includeFiles: true },
    });
  });

  it('getBreadcrumb calls GET /folders/:id/breadcrumb', () => {
    foldersApi.getBreadcrumb('folder123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/folders/folder123/breadcrumb');
  });

  it('createFolder calls POST /folders', () => {
    foldersApi.createFolder({ name: 'New Folder', parentId: 'parent123' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/folders', {
      name: 'New Folder',
      parentId: 'parent123',
    });
  });

  it('updateFolder calls PATCH /folders/:id', () => {
    foldersApi.updateFolder('folder123', { name: 'Renamed' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/folders/folder123', { name: 'Renamed' });
  });

  it('moveFolder calls POST /folders/:id/move', () => {
    foldersApi.moveFolder('folder123', 'parent456');
    mockAxiosInstance.post.toHaveBeenCalledWith('/folders/folder123/move', {
      parentId: 'parent456',
    });
  });

  it('deleteFolder calls DELETE /folders/:id', () => {
    foldersApi.deleteFolder('folder123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/folders/folder123');
  });
});

// =============================================================================
// Tests for Connections API Methods
// =============================================================================

describe('connectionsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getConnections calls GET /connections', () => {
    connectionsApi.getConnections({ status: 'accepted' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/connections', {
      params: { status: 'accepted' },
    });
  });

  it('sendRequest calls POST /connections', () => {
    connectionsApi.sendRequest('user123', 'Hello!', 'profile');
    mockAxiosInstance.post.toHaveBeenCalledWith('/connections', {
      userId: 'user123',
      message: 'Hello!',
      source: 'profile',
    });
  });

  it('accept calls PATCH /connections/:id/accept', () => {
    connectionsApi.accept('conn123');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/connections/conn123/accept');
  });

  it('decline calls PATCH /connections/:id/decline', () => {
    connectionsApi.decline('conn123');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/connections/conn123/decline');
  });

  it('remove calls DELETE /connections/:id', () => {
    connectionsApi.remove('conn123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/connections/conn123');
  });

  it('block calls POST /connections/:userId/block', () => {
    connectionsApi.block('user123', 'spam', 'Sent spam messages');
    mockAxiosInstance.post.toHaveBeenCalledWith('/connections/user123/block', {
      reason: 'spam',
      notes: 'Sent spam messages',
    });
  });

  it('unblock calls DELETE /connections/:userId/block', () => {
    connectionsApi.unblock('user123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/connections/user123/block');
  });

  it('getBlocked calls GET /connections/blocked', () => {
    connectionsApi.getBlocked({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/connections/blocked', {
      params: { page: 1 },
    });
  });
});

// =============================================================================
// Tests for Messages API Methods
// =============================================================================

describe('messagesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getConversations calls GET /messages/conversations', () => {
    messagesApi.getConversations({ archived: false });
    mockAxiosInstance.get.toHaveBeenCalledWith('/messages/conversations', {
      params: { archived: false },
    });
  });

  it('createConversation calls POST /messages/conversations', () => {
    messagesApi.createConversation({ participantId: 'user123' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/messages/conversations', {
      participantId: 'user123',
    });
  });

  it('getMessages calls GET /messages/conversations/:id/messages', () => {
    messagesApi.getMessages('conv123', { limit: 50 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/messages/conversations/conv123/messages', {
      params: { limit: 50 },
    });
  });

  it('sendMessage calls POST /messages/conversations/:id/messages', () => {
    messagesApi.sendMessage('conv123', { content: 'Hello!' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/messages/conversations/conv123/messages', {
      content: 'Hello!',
    });
  });

  it('editMessage calls PATCH /messages/:id', () => {
    messagesApi.editMessage('msg123', 'Updated content');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/messages/msg123', {
      content: 'Updated content',
    });
  });

  it('deleteMessage calls DELETE /messages/:id', () => {
    messagesApi.deleteMessage('msg123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/messages/msg123');
  });

  it('muteConversation calls POST with duration', () => {
    messagesApi.muteConversation('conv123', '24h');
    mockAxiosInstance.post.toHaveBeenCalledWith('/messages/conversations/conv123/mute', {
      duration: '24h',
    });
  });
});

// =============================================================================
// Tests for Admin API Methods
// =============================================================================

describe('adminApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getInbox calls GET /admin/inbox', () => {
    adminApi.getInbox();
    mockAxiosInstance.get.toHaveBeenCalledWith('/admin/inbox');
  });

  it('getLogs calls GET /admin/logs', () => {
    adminApi.getLogs({ level: 'error' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/admin/logs', {
      params: { level: 'error' },
    });
  });

  it('getLog calls GET /admin/logs/:requestId', () => {
    adminApi.getLog('req123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/admin/logs/req123');
  });

  it('updateUser calls PATCH /admin/users/:id', () => {
    adminApi.updateUser('user123', { role: 'admin' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/admin/users/user123', { role: 'admin' });
  });

  it('warnUser calls POST /admin/users/:id/warn', () => {
    adminApi.warnUser('user123', { reason: 'Violation of terms' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/admin/users/user123/warn', {
      reason: 'Violation of terms',
    });
  });

  it('suspendUser calls POST /admin/users/:id/suspend', () => {
    adminApi.suspendUser('user123', { duration: '7d', reason: 'Spam' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/admin/users/user123/suspend', {
      duration: '7d',
      reason: 'Spam',
    });
  });

  it('unsuspendUser calls POST /admin/users/:id/unsuspend', () => {
    adminApi.unsuspendUser('user123', { reason: 'Appeal accepted' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/admin/users/user123/unsuspend', {
      reason: 'Appeal accepted',
    });
  });

  it('toggleKillSwitch calls POST /admin/system/kill-switch', () => {
    adminApi.toggleKillSwitch('feature-x', true, 'Maintenance');
    mockAxiosInstance.post.toHaveBeenCalledWith('/admin/system/kill-switch', {
      feature: 'feature-x',
      enabled: true,
      reason: 'Maintenance',
    });
  });

  it('updateRoleConfig calls PATCH /admin/roles/:role', () => {
    adminApi.updateRoleConfig('user', { limits: { maxNotes: 100 }, features: ['basic'] });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/admin/roles/user', {
      limits: { maxNotes: 100 },
      features: ['basic'],
    });
  });
});

// =============================================================================
// Tests for Logs API (Client Error Reporting)
// =============================================================================

describe('logsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('reportClientError calls POST /logs/client-error', () => {
    const errorData = {
      errorType: 'uncaught_error',
      message: 'Something went wrong',
      stack: 'Error: Something went wrong\n    at test.js:10',
      url: 'http://localhost:5173/dashboard',
    };
    logsApi.reportClientError(errorData);
    mockAxiosInstance.post.toHaveBeenCalledWith('/logs/client-error', errorData);
  });
});

// =============================================================================
// Tests for Shares API (Public Shares)
// =============================================================================

describe('sharesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getShareInfo calls GET /share/:token', () => {
    sharesApi.getShareInfo('abc123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/share/abc123');
  });

  it('verifySharePassword calls POST /share/:token/verify', () => {
    sharesApi.verifySharePassword('abc123', 'secret');
    mockAxiosInstance.post.toHaveBeenCalledWith('/share/abc123/verify', {
      password: 'secret',
    });
  });

  it('getShareDownloadUrl calls GET /share/:token/download with password', () => {
    sharesApi.getShareDownloadUrl('abc123', 'secret');
    mockAxiosInstance.get.toHaveBeenCalledWith('/share/abc123/download', {
      params: { password: 'secret' },
    });
  });

  it('getSharePreview calls GET /share/:token/preview with password', () => {
    sharesApi.getSharePreview('abc123', 'secret');
    mockAxiosInstance.get.toHaveBeenCalledWith('/share/abc123/preview', {
      params: { password: 'secret' },
    });
  });
});

// =============================================================================
// Tests for Settings API
// =============================================================================

describe('settingsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getSidebarConfig calls GET /settings/sidebar', () => {
    settingsApi.getSidebarConfig();
    mockAxiosInstance.get.toHaveBeenCalledWith('/settings/sidebar');
  });
});

// =============================================================================
// Tests for Saved Locations API
// =============================================================================

describe('savedLocationsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getLocations calls GET /saved-locations', () => {
    savedLocationsApi.getLocations();
    mockAxiosInstance.get.toHaveBeenCalledWith('/saved-locations');
  });

  it('createLocation calls POST /saved-locations', () => {
    savedLocationsApi.createLocation({ name: 'Home', address: '123 Main St' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/saved-locations', {
      name: 'Home',
      address: '123 Main St',
    });
  });

  it('setDefault calls POST /saved-locations/:id/set-default', () => {
    savedLocationsApi.setDefault('loc123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/saved-locations/loc123/set-default');
  });

  it('reorderLocations calls POST /saved-locations/reorder', () => {
    savedLocationsApi.reorderLocations(['loc1', 'loc2']);
    mockAxiosInstance.post.toHaveBeenCalledWith('/saved-locations/reorder', {
      orderedIds: ['loc1', 'loc2'],
    });
  });
});

// =============================================================================
// Tests for Notifications API
// =============================================================================

describe('notificationsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getNotifications calls GET /notifications', () => {
    notificationsApi.getNotifications({ unread: true });
    mockAxiosInstance.get.toHaveBeenCalledWith('/notifications', {
      params: { unread: true },
    });
  });

  it('markAsRead calls POST /notifications/:id/read', () => {
    notificationsApi.markAsRead('notif123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/notifications/notif123/read');
  });

  it('markAllAsRead calls POST /notifications/read-all', () => {
    notificationsApi.markAllAsRead();
    mockAxiosInstance.post.toHaveBeenCalledWith('/notifications/read-all');
  });

  it('deleteNotification calls DELETE /notifications/:id', () => {
    notificationsApi.deleteNotification('notif123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/notifications/notif123');
  });

  it('getActivityFeed calls GET /notifications/activity/feed', () => {
    notificationsApi.getActivityFeed({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/notifications/activity/feed', {
      params: { page: 1 },
    });
  });
});

// =============================================================================
// Tests for Reports API (User-facing)
// =============================================================================

describe('reportsApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('submitReport calls POST /reports', () => {
    reportsApi.submitReport({ type: 'spam', targetId: 'user123' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/reports', {
      type: 'spam',
      targetId: 'user123',
    });
  });

  it('getMyReports calls GET /reports/my-reports', () => {
    reportsApi.getMyReports({ status: 'pending' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/reports/my-reports', {
      params: { status: 'pending' },
    });
  });
});

// =============================================================================
// Tests for Item Shares API
// =============================================================================

describe('itemSharesApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('getSharedWithMe calls GET /item-shares', () => {
    itemSharesApi.getSharedWithMe({ type: 'note' });
    mockAxiosInstance.get.toHaveBeenCalledWith('/item-shares', { params: { type: 'note' } });
  });

  it('getSharedByMe calls GET /item-shares/by-me', () => {
    itemSharesApi.getSharedByMe({ page: 1 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/item-shares/by-me', {
      params: { page: 1 },
    });
  });

  it('shareItem calls POST /item-shares', () => {
    itemSharesApi.shareItem({ itemId: 'note123', itemType: 'note', userId: 'user456' });
    mockAxiosInstance.post.toHaveBeenCalledWith('/item-shares', {
      itemId: 'note123',
      itemType: 'note',
      userId: 'user456',
    });
  });

  it('acceptShare calls POST /item-shares/:id/accept', () => {
    itemSharesApi.acceptShare('share123');
    mockAxiosInstance.post.toHaveBeenCalledWith('/item-shares/share123/accept');
  });

  it('revokeShare calls DELETE /item-shares/:id', () => {
    itemSharesApi.revokeShare('share123');
    mockAxiosInstance.delete.toHaveBeenCalledWith('/item-shares/share123');
  });
});

// =============================================================================
// Tests for Users API (Social features)
// =============================================================================

describe('usersApi', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('search calls GET /users/search with query', () => {
    usersApi.search('john', { limit: 10 });
    mockAxiosInstance.get.toHaveBeenCalledWith('/users/search', {
      params: { q: 'john', limit: 10 },
    });
  });

  it('getProfile calls GET /users/:id/profile', () => {
    usersApi.getProfile('user123');
    mockAxiosInstance.get.toHaveBeenCalledWith('/users/user123/profile');
  });

  it('updateSocialSettings calls PATCH /users/social-settings', () => {
    usersApi.updateSocialSettings({ visibility: 'friends' });
    mockAxiosInstance.patch.toHaveBeenCalledWith('/users/social-settings', {
      visibility: 'friends',
    });
  });

  it('updatePresence calls PATCH /users/presence', () => {
    usersApi.updatePresence('online', 'Working');
    mockAxiosInstance.patch.toHaveBeenCalledWith('/users/presence', {
      status: 'online',
      statusMessage: 'Working',
    });
  });
});
