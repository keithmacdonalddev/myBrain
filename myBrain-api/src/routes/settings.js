/**
 * =============================================================================
 * SETTINGS.JS - User Settings & Configuration Routes
 * =============================================================================
 *
 * This file handles user settings and preferences in myBrain.
 * Users can customize how myBrain looks and behaves to their preferences.
 *
 * WHAT ARE SETTINGS?
 * ------------------
 * Settings control personalization:
 * - SIDEBAR: What appears in the left sidebar
 * - THEME: Dark mode, light mode, auto
 * - NOTIFICATIONS: Alert preferences
 * - PRIVACY: Who can see what
 * - INTEGRATIONS: Connected services
 * - DISPLAY: Language, timezone, date format
 *
 * SIDEBAR CONFIGURATION:
 * ----------------------
 * Users can customize sidebar to show:
 * - Quick links to favorite features
 * - Recently used items
 * - Upcoming events and tasks
 * - Saved filters
 * - Pinned projects
 * - Life areas
 * - Custom sections
 *
 * THEME PREFERENCES:
 * ------------------
 * - LIGHT: Bright colors (daytime)
 * - DARK: Dark colors (nighttime)
 * - AUTO: Follows system preference
 * - CUSTOM: User-defined color scheme
 *
 * NOTIFICATION SETTINGS:
 * ----------------------
 * Control what triggers alerts:
 * - NEW MESSAGES: Notify when receive message
 * - SHARED ITEMS: Notify when item shared
 * - DUE SOON: Notify before tasks/events due
 * - REMINDERS: Notification preferences
 * - SOUND: Enable/disable audio alerts
 * - EMAIL: Receive email notifications
 *
 * PRIVACY SETTINGS:
 * -----------------
 * Control visibility:
 * - PROFILE VISIBILITY: Public, friends only, private
 * - SEARCH: Show in search results?
 * - ACTIVITY STATUS: Show online/offline status?
 * - CONNECTIONS: Who can connect with you?
 * - DATA SHARING: Analytics opt-in/out
 *
 * DISPLAY SETTINGS:
 * -----------------
 * Customize display:
 * - LANGUAGE: English, Spanish, French, etc.
 * - TIMEZONE: Local timezone for dates
 * - DATE FORMAT: MM/DD/YYYY or DD/MM/YYYY
 * - TIME FORMAT: 12-hour or 24-hour
 * - ITEMS PER PAGE: How many results to show
 *
 * INTEGRATIONS:
 * ---------------
 * Connect external services:
 * - CALENDAR: Google Calendar, Outlook
 * - EMAIL: Gmail, Outlook
 * - CLOUD STORAGE: Google Drive, Dropbox
 * - MESSAGING: Slack, Teams
 *
 * ENDPOINTS:
 * -----------
 * - GET /settings - Get all user settings
 * - GET /settings/sidebar - Get sidebar config
 * - PUT /settings/sidebar - Update sidebar config
 * - PUT /settings/theme - Update theme preference
 * - PUT /settings/notifications - Update notification prefs
 * - PUT /settings/privacy - Update privacy settings
 * - PUT /settings/display - Update display settings
 * - POST /settings/export - Export all user data
 * - DELETE /settings/account - Delete account
 *
 * SIDEBAR DEFAULT LAYOUT:
 * -----------------------
 * Default sidebar shows:
 * 1. Search bar
 * 2. Main navigation (Dashboard, Notes, Tasks, etc.)
 * 3. Pinned items
 * 4. Life areas
 * 5. Recent items
 * 6. Saved filters
 * 7. Settings/Help
 *
 * ACCOUNT DELETION:
 * ------------------
 * When user deletes account:
 * - All personal data deleted
 * - Shared items transferred to other users
 * - Account can't be recovered
 * 30-day grace period before permanent deletion
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, PUT, DELETE)
 * - Define routes (URLs that the frontend can call)
 * - Use middleware (functions that process requests)
 * We use it to define all the settings endpoints.
 */
import express from 'express';

/**
 * Auth middleware checks that the user is logged in.
 * Every settings request must include a valid JWT token in the Authorization header.
 * If not authenticated, the request is rejected with a 401 Unauthorized response.
 * This protects user's private settings from unauthorized access.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to request logs
 * so we can investigate failures (database errors, validation issues, etc.).
 * Helps us troubleshoot when settings operations fail.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * SidebarConfig model represents the sidebar menu configuration.
 * Stores which menu items appear in the sidebar, their order, labels, and icons.
 * Can be customized per user or use global defaults for all users.
 * Determines what navigation options appear on the left side of the app.
 */
import SidebarConfig from '../models/SidebarConfig.js';

// Create an Express router to group all settings-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All settings routes require the user to be logged in.
// requireAuth middleware checks that the Authorization header contains a valid JWT token.
// This prevents unauthorized access to user's settings and preferences.
router.use(requireAuth);

/**
 * GET /settings/sidebar
 * Get sidebar configuration for the authenticated user
 *
 * PURPOSE:
 * Retrieves the sidebar menu configuration showing which navigation items appear
 * in the sidebar, their order, labels, and icons. This is called when the user
 * opens the app to build the navigation menu.
 *
 * SIDEBAR STRUCTURE:
 * The sidebar shows a customizable menu of navigation items:
 * - Dashboard: Quick overview and summary
 * - Notes: Access all notes and knowledge base
 * - Tasks: Manage tasks and to-dos
 * - Projects: View and manage projects
 * - Calendar: See events and schedule
 * - Messages: Direct messaging with other users
 * - And more based on configuration...
 *
 * CUSTOMIZATION:
 * - Admin can set default sidebar for all users via /admin/sidebar-config
 * - Users can customize their own sidebar (stored per-user preference)
 * - Settings persist across sessions so user sees same sidebar next time
 * - Each item can be hidden, reordered, or customized
 *
 * USE CASES:
 * - App startup: Load navigation menu when user opens app
 * - Settings page: Show user which menu items are available
 * - Admin dashboard: Admin configures default sidebar for all users
 * - Personalization: User can add/hide/reorder items
 *
 * @returns {Object} - Sidebar configuration with items array:
 * {
 *   items: [
 *     {
 *       id: "dashboard",
 *       label: "Dashboard",
 *       icon: "home",
 *       order: 1,
 *       visible: true
 *     },
 *     {
 *       id: "notes",
 *       label: "Notes",
 *       icon: "note",
 *       order: 2,
 *       visible: true
 *     },
 *     {
 *       id: "tasks",
 *       label: "Tasks",
 *       icon: "checkbox",
 *       order: 3,
 *       visible: true
 *     },
 *     ...more items
 *   ]
 * }
 *
 * @throws {500} - Server error if sidebar config cannot be fetched
 *
 * EXAMPLE REQUEST:
 * GET /settings/sidebar
 * Authorization: Bearer <JWT_TOKEN>
 *
 * EXAMPLE RESPONSE:
 * {
 *   "items": [
 *     { "id": "dashboard", "label": "Dashboard", "icon": "home", "order": 1 },
 *     { "id": "notes", "label": "Notes", "icon": "note", "order": 2 },
 *     { "id": "tasks", "label": "Tasks", "icon": "checkbox", "order": 3 },
 *     { "id": "projects", "label": "Projects", "icon": "folder", "order": 4 },
 *     { "id": "calendar", "label": "Calendar", "icon": "calendar", "order": 5 }
 *   ]
 * }
 */
router.get('/sidebar', requireAuth, async (req, res, next) => {
  try {
    // =============================================================================
    // STEP 1: Fetch Sidebar Configuration
    // =============================================================================
    // SidebarConfig.getConfig() retrieves the sidebar layout from database.
    // Method handles: global defaults, user customizations, merging preferences
    // Returns a SidebarConfig document with sidebar items and settings.
    const config = await SidebarConfig.getConfig();

    // =============================================================================
    // STEP 2: Convert to Safe JSON Format for Frontend
    // =============================================================================
    // toSafeJSON() method:
    // - Includes: item IDs, labels, icons, order, visibility (what frontend needs)
    // - Excludes: internal fields, timestamps, sensitive data
    // - Returns clean, user-facing data structure for building UI
    const safeConfig = config.toSafeJSON();

    // =============================================================================
    // STEP 3: Log the Sidebar View for Analytics
    // =============================================================================
    // Track that user fetched sidebar config (useful for understanding UI interactions)
    attachEntityId(req, 'userId', req.user._id);
    req.eventName = 'settings.sidebar.view';

    // =============================================================================
    // STEP 4: Return Sidebar Configuration
    // =============================================================================
    res.json(safeConfig);

  } catch (error) {
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    // Log error with operation context for debugging
    // attachError adds details to server logs for troubleshooting
    attachError(req, error, { operation: 'sidebar_config_fetch' });

    // Return generic error response
    // Never expose internal error details to user (security best practice)
    // requestId helps user reference this error when reporting issues
    res.status(500).json({
      error: {
        message: 'Failed to fetch sidebar configuration',
        code: 'SIDEBAR_CONFIG_FETCH_ERROR',
        requestId: req.requestId  // User can use this ID to report issue
      }
    });
  }
});

export default router;
