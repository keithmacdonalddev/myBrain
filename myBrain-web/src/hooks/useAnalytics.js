import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { analyticsApi } from '../lib/api';

// Generate a session ID that persists for the browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Get screen size
const getScreenSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight
});

// Event queue for batching
let eventQueue = [];
let flushTimeout = null;

const flushEvents = async () => {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  try {
    await analyticsApi.trackBatch(events);
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Analytics batch failed:', error);
  }
};

// Flush events periodically or when queue is large
const queueEvent = (event) => {
  eventQueue.push(event);

  if (eventQueue.length >= 10) {
    // Flush immediately if queue is large
    if (flushTimeout) clearTimeout(flushTimeout);
    flushEvents();
  } else if (!flushTimeout) {
    // Otherwise flush after 5 seconds
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      flushEvents();
    }, 5000);
  }
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page unload
      const data = JSON.stringify({ events: eventQueue });
      navigator.sendBeacon?.('/analytics/track/batch', new Blob([data], { type: 'application/json' }));
    }
  });
}

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();
  const pageLoadTime = useRef(Date.now());

  // Track a single event
  const track = useCallback((category, action, feature = 'other', metadata = {}) => {
    if (!isAuthenticated) return;

    const event = {
      sessionId: getSessionId(),
      category,
      action,
      feature,
      metadata,
      page: location.pathname,
      referrer: document.referrer,
      screenSize: getScreenSize()
    };

    queueEvent(event);
  }, [isAuthenticated, location.pathname]);

  // Track feature usage
  const trackFeature = useCallback((feature, action, metadata = {}) => {
    track('feature', action, feature, metadata);
  }, [track]);

  // Track page view
  const trackPageView = useCallback((pageName) => {
    if (!isAuthenticated) return;

    const event = {
      sessionId: getSessionId(),
      category: 'page_view',
      action: pageName || location.pathname,
      feature: getFeatureFromPath(location.pathname),
      page: location.pathname,
      referrer: document.referrer,
      screenSize: getScreenSize()
    };

    queueEvent(event);
  }, [isAuthenticated, location.pathname]);

  // Track error
  const trackError = useCallback((error, context = {}) => {
    track('error', error.message || String(error), 'other', {
      ...context,
      stack: error.stack
    });
  }, [track]);

  // Track search
  const trackSearch = useCallback((query, resultCount, feature = 'search') => {
    track('search', 'search_performed', feature, { query, resultCount });
  }, [track]);

  // Track navigation
  const trackNavigation = useCallback((from, to) => {
    track('navigation', 'navigate', 'other', { from, to });
  }, [track]);

  return {
    track,
    trackFeature,
    trackPageView,
    trackError,
    trackSearch,
    trackNavigation
  };
}

/**
 * Hook that automatically tracks page views
 */
export function usePageTracking() {
  const { trackPageView } = useAnalytics();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      trackPageView();
    }
  }, [location.pathname, isAuthenticated, trackPageView]);
}

/**
 * Get feature name from route path
 */
function getFeatureFromPath(path) {
  if (path.includes('/notes')) return 'notes';
  if (path.includes('/tasks') || path.includes('/today')) return 'tasks';
  if (path.includes('/calendar')) return 'calendar';
  if (path.includes('/events')) return 'events';
  if (path.includes('/projects')) return 'projects';
  if (path.includes('/inbox')) return 'inbox';
  if (path.includes('/profile')) return 'profile';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/dashboard') || path === '/app') return 'dashboard';
  return 'other';
}

/**
 * Pre-defined tracking helpers for common actions
 */
export const trackingEvents = {
  // Notes
  NOTE_CREATE: (metadata) => ({ feature: 'notes', action: 'create_note', metadata }),
  NOTE_UPDATE: (metadata) => ({ feature: 'notes', action: 'update_note', metadata }),
  NOTE_DELETE: (metadata) => ({ feature: 'notes', action: 'delete_note', metadata }),
  NOTE_VIEW: (metadata) => ({ feature: 'notes', action: 'view_note', metadata }),

  // Tasks
  TASK_CREATE: (metadata) => ({ feature: 'tasks', action: 'create_task', metadata }),
  TASK_UPDATE: (metadata) => ({ feature: 'tasks', action: 'update_task', metadata }),
  TASK_DELETE: (metadata) => ({ feature: 'tasks', action: 'delete_task', metadata }),
  TASK_COMPLETE: (metadata) => ({ feature: 'tasks', action: 'complete_task', metadata }),
  TASK_VIEW: (metadata) => ({ feature: 'tasks', action: 'view_task', metadata }),

  // Calendar/Events
  EVENT_CREATE: (metadata) => ({ feature: 'events', action: 'create_event', metadata }),
  EVENT_UPDATE: (metadata) => ({ feature: 'events', action: 'update_event', metadata }),
  EVENT_DELETE: (metadata) => ({ feature: 'events', action: 'delete_event', metadata }),
  EVENT_VIEW: (metadata) => ({ feature: 'events', action: 'view_event', metadata }),

  // Projects
  PROJECT_CREATE: (metadata) => ({ feature: 'projects', action: 'create_project', metadata }),
  PROJECT_UPDATE: (metadata) => ({ feature: 'projects', action: 'update_project', metadata }),
  PROJECT_DELETE: (metadata) => ({ feature: 'projects', action: 'delete_project', metadata }),
  PROJECT_VIEW: (metadata) => ({ feature: 'projects', action: 'view_project', metadata }),

  // Life Areas
  LIFE_AREA_CREATE: (metadata) => ({ feature: 'life_areas', action: 'create_life_area', metadata }),
  LIFE_AREA_UPDATE: (metadata) => ({ feature: 'life_areas', action: 'update_life_area', metadata }),
  LIFE_AREA_DELETE: (metadata) => ({ feature: 'life_areas', action: 'delete_life_area', metadata }),

  // Weather
  WEATHER_VIEW: (metadata) => ({ feature: 'weather', action: 'view_weather', metadata }),
  WEATHER_ADD_LOCATION: (metadata) => ({ feature: 'weather', action: 'add_weather_location', metadata }),
  WEATHER_REMOVE_LOCATION: (metadata) => ({ feature: 'weather', action: 'remove_weather_location', metadata }),

  // Search
  SEARCH_PERFORM: (metadata) => ({ feature: 'search', action: 'search_performed', metadata }),

  // Settings
  SETTINGS_UPDATE: (metadata) => ({ feature: 'settings', action: 'update_settings', metadata }),
  PROFILE_UPDATE: (metadata) => ({ feature: 'profile', action: 'update_profile', metadata }),

  // Auth
  LOGIN: (metadata) => ({ feature: 'auth', action: 'login', metadata }),
  LOGOUT: (metadata) => ({ feature: 'auth', action: 'logout', metadata }),
  SIGNUP: (metadata) => ({ feature: 'auth', action: 'signup', metadata }),
};

export default useAnalytics;
