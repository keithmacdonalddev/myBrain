/**
 * =============================================================================
 * SERVER.JS - Main Entry Point for the myBrain API Backend
 * =============================================================================
 *
 * This is the main server file that starts and configures the entire backend
 * application. Think of this file as the "control center" that:
 *
 * 1. Sets up the web server (Express.js) to handle incoming requests
 * 2. Connects to the database (MongoDB) where all data is stored
 * 3. Loads all the API routes (different URLs the frontend can call)
 * 4. Configures security settings (CORS, cookies, etc.)
 * 5. Sets up real-time communication (WebSockets)
 *
 * When you run "npm start" or "npm run dev", this file is executed first.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading External Libraries and Internal Modules
// =============================================================================

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PUT, DELETE)
 * - Define routes (URLs that the server responds to)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * createServer creates an HTTP server from our Express app.
 * This is needed to support WebSockets (real-time communication).
 */
import { createServer } from 'http';

/**
 * CORS (Cross-Origin Resource Sharing) is a security feature that controls
 * which websites can make requests to our API. Without this, browsers would
 * block the frontend (running on localhost:5173) from calling our API
 * (running on localhost:5000).
 */
import cors from 'cors';

/**
 * Cookie-parser allows the server to read cookies sent by the browser.
 * We use cookies to store authentication tokens (JWT) for secure login.
 */
import cookieParser from 'cookie-parser';

/**
 * Dotenv loads environment variables from a .env file.
 * Environment variables are settings like database passwords, API keys,
 * and configuration options that shouldn't be in the code directly.
 */
import dotenv from 'dotenv';

/**
 * Mongoose is an ODM (Object Document Mapper) for MongoDB.
 * It provides a way to:
 * - Define data models (schemas) for our database
 * - Query and update data easily
 * - Validate data before saving
 */
import mongoose from 'mongoose';

// =============================================================================
// LOAD ENVIRONMENT VARIABLES
// =============================================================================

/**
 * This loads all variables from the .env file into process.env
 * For example, if .env contains MONGO_URI=mongodb://..., then
 * process.env.MONGO_URI will equal "mongodb://..."
 */
dotenv.config();

// =============================================================================
// IMPORT API ROUTES
// =============================================================================

/**
 * Routes define what happens when someone visits a specific URL.
 * Each route file handles a different "resource" or feature:
 *
 * - authRoutes: Login, signup, logout, password reset
 * - notesRoutes: Create, read, update, delete notes
 * - tasksRoutes: Manage tasks and to-dos
 * - etc.
 *
 * By organizing routes into separate files, the code stays clean and
 * each file focuses on one feature.
 */
import authRoutes from './routes/auth.js';           // User authentication (login/signup)
import notesRoutes from './routes/notes.js';         // Notes management
import tasksRoutes from './routes/tasks.js';         // Tasks/to-dos management
import filtersRoutes from './routes/filters.js';     // Saved search filters
import adminRoutes from './routes/admin.js';         // Admin panel features
import profileRoutes from './routes/profile.js';     // User profile management
import imagesRoutes from './routes/images.js';       // Image uploads and gallery
import eventsRoutes from './routes/events.js';       // Calendar events
import tagsRoutes from './routes/tags.js';           // Tags/labels for organization
import lifeAreasRoutes from './routes/lifeAreas.js'; // Life area categories
import projectsRoutes from './routes/projects.js';   // Projects management
import savedLocationsRoutes from './routes/savedLocations.js'; // Saved locations for weather
import weatherRoutes from './routes/weather.js';     // Weather data
import analyticsRoutes from './routes/analytics.js'; // Usage analytics
import logsRoutes from './routes/logs.js';           // System logs (admin)
import settingsRoutes from './routes/settings.js';   // App settings
import filesRoutes from './routes/files.js';         // File storage
import foldersRoutes from './routes/folders.js';     // Folder organization
import sharesRoutes from './routes/shares.js';       // Sharing content with others
import connectionsRoutes from './routes/connections.js'; // Social connections/friends
import usersRoutes from './routes/users.js';         // User lookup
import itemSharesRoutes from './routes/itemShares.js'; // Sharing individual items
import messagesRoutes, { setSocketIO } from './routes/messages.js'; // Direct messages
import notificationsRoutes from './routes/notifications.js'; // User notifications
import reportsRoutes from './routes/reports.js';     // Content reports (moderation)
import dashboardRoutes from './routes/dashboard.js'; // Intelligent dashboard
import apiKeysRoutes from './routes/apiKeys.js';     // Personal API keys for CLI access

// =============================================================================
// IMPORT WEBSOCKET MODULE
// =============================================================================

/**
 * WebSockets enable real-time, two-way communication between the server
 * and clients. Unlike regular HTTP requests (where the client asks and
 * server responds), WebSockets allow:
 * - Instant message delivery
 * - Real-time typing indicators
 * - Live presence updates (online/offline status)
 */
import { initializeWebSocket } from './websocket/index.js';

// =============================================================================
// IMPORT MODELS FOR STARTUP TASKS
// =============================================================================

/**
 * RoleConfig defines what different user roles (admin, user, etc.) can do.
 * We sync it on startup to ensure any new features have default permissions.
 */
import RoleConfig from './models/RoleConfig.js';

// =============================================================================
// IMPORT MIDDLEWARE
// =============================================================================

/**
 * Middleware are functions that run on every request before reaching the route.
 * They can:
 * - Log requests
 * - Check authentication
 * - Parse request bodies
 * - Handle errors
 */
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// =============================================================================
// CREATE EXPRESS APPLICATION
// =============================================================================

/**
 * Create the Express application instance.
 * This 'app' object is what we configure and add routes to.
 */
const app = express();

/**
 * PORT defines which port the server listens on.
 * Default is 5000, but can be changed via environment variable.
 * Example: The server will be accessible at http://localhost:5000
 */
const PORT = process.env.PORT || 5000;

// =============================================================================
// CONFIGURE PROXY TRUST
// =============================================================================

/**
 * Trust proxy setting is needed when the app runs behind a reverse proxy
 * (like Nginx, Heroku, or AWS load balancer). This ensures:
 * - req.ip shows the real user's IP, not the proxy's IP
 * - Secure cookies work correctly
 * - Rate limiting works properly
 *
 * The '1' means trust one level of proxy.
 */
app.set('trust proxy', 1);

// =============================================================================
// CONFIGURE MIDDLEWARE
// =============================================================================

/**
 * CORS Configuration
 * -----------------
 * This controls which websites can call our API:
 * - origin: The frontend URL that's allowed to make requests
 * - credentials: Allow cookies to be sent with requests
 * - exposedHeaders: Headers that the frontend can read from responses
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Request-Id']
}));

/**
 * Body Parsing Middleware
 * ----------------------
 * These allow the server to read data sent in request bodies:
 * - express.json(): Parses JSON data (most common for APIs)
 * - express.urlencoded(): Parses form data
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Cookie Parser
 * ------------
 * Parses cookies from the request headers so we can access them via req.cookies
 */
app.use(cookieParser());

/**
 * Request Logger
 * -------------
 * Logs information about every request for debugging and analytics.
 * Also adds a unique requestId to each request for tracing.
 */
app.use(requestLogger);

// =============================================================================
// BASIC ROUTES (Health Checks)
// =============================================================================

/**
 * Root Route - API Information
 * ---------------------------
 * When someone visits the base URL (http://localhost:5000/),
 * they see basic API information. Useful for checking if the server is running.
 */
app.get('/', (req, res) => {
  res.json({
    message: 'myBrain API is running!',  // Confirmation message
    version: '1.0.0',                      // API version
    environment: process.env.NODE_ENV || 'development', // Current environment
    requestId: req.requestId               // Unique ID for this request
  });
});

/**
 * Health Check Route
 * -----------------
 * Used by monitoring tools to verify the server and database are working.
 * Returns:
 * - status: 'ok' if server is running
 * - database: 'connected' or 'disconnected'
 * - timestamp: Current server time
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// API ROUTES REGISTRATION
// =============================================================================

/**
 * Register all API routes with their URL prefixes.
 *
 * For example, app.use('/auth', authRoutes) means:
 * - All routes in authRoutes will start with /auth
 * - A login route defined as POST /login becomes POST /auth/login
 *
 * This creates a clean, organized URL structure:
 * - /auth/login, /auth/signup, /auth/logout
 * - /notes, /notes/:id, /notes/search
 * - /tasks, /tasks/:id
 * - etc.
 */
app.use('/auth', authRoutes);              // Authentication: /auth/login, /auth/signup
app.use('/notes', notesRoutes);            // Notes: /notes, /notes/:id
app.use('/tasks', tasksRoutes);            // Tasks: /tasks, /tasks/:id
app.use('/filters', filtersRoutes);        // Filters: /filters, /filters/:id
app.use('/admin', adminRoutes);            // Admin: /admin/users, /admin/logs
app.use('/profile', profileRoutes);        // Profile: /profile, /profile/avatar
app.use('/images', imagesRoutes);          // Images: /images, /images/upload
app.use('/events', eventsRoutes);          // Events: /events, /events/:id
app.use('/tags', tagsRoutes);              // Tags: /tags, /tags/:id
app.use('/life-areas', lifeAreasRoutes);   // Life Areas: /life-areas, /life-areas/:id
app.use('/projects', projectsRoutes);      // Projects: /projects, /projects/:id
app.use('/saved-locations', savedLocationsRoutes); // Locations: /saved-locations
app.use('/weather', weatherRoutes);        // Weather: /weather
app.use('/analytics', analyticsRoutes);    // Analytics: /analytics/track
app.use('/logs', logsRoutes);              // Logs: /logs (admin only)
app.use('/settings', settingsRoutes);      // Settings: /settings
app.use('/files', filesRoutes);            // Files: /files, /files/upload
app.use('/folders', foldersRoutes);        // Folders: /folders, /folders/:id
app.use('/share', sharesRoutes);           // Sharing: /share
app.use('/connections', connectionsRoutes); // Connections: /connections
app.use('/users', usersRoutes);            // Users: /users/search
app.use('/item-shares', itemSharesRoutes); // Item Shares: /item-shares
app.use('/messages', messagesRoutes);      // Messages: /messages, /messages/conversations
app.use('/notifications', notificationsRoutes); // Notifications: /notifications
app.use('/reports', reportsRoutes);        // Reports: /reports
app.use('/dashboard', dashboardRoutes);    // Dashboard: /dashboard
app.use('/api-keys', apiKeysRoutes);       // API Keys: /api-keys (Personal API keys for CLI)

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * 404 Not Found Handler
 * --------------------
 * If no route matches the request, this middleware returns a 404 error.
 * This catches requests to URLs that don't exist.
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 * -------------------
 * Catches all errors that occur in route handlers.
 * Returns a consistent error response format and logs errors.
 * Must be the last middleware added.
 */
app.use(errorHandler);

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

/**
 * Connect to MongoDB Database
 * --------------------------
 * This function establishes a connection to the MongoDB database.
 *
 * Steps:
 * 1. Check if MONGO_URI environment variable exists
 * 2. If not, log a warning and continue (server runs without database)
 * 3. If yes, attempt to connect using Mongoose
 * 4. On success, sync role configurations with defaults
 * 5. On failure, log error and exit the process
 */
const connectDB = async () => {
  try {
    // Get the MongoDB connection string from environment variables
    const mongoURI = process.env.MONGO_URI;

    // Warn if no database URI is configured
    if (!mongoURI) {
      console.log('Warning: MONGO_URI not found in environment variables');
      console.log('Server will run without database connection');
      console.log('Add MONGO_URI to .env file to connect to MongoDB');
      return;
    }

    // Attempt to connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');

    // Sync role configurations with defaults
    // This ensures any new features added to the code have default permissions
    try {
      await RoleConfig.syncAllWithDefaults(null);
      console.log('Role configurations synced with defaults');
    } catch (syncError) {
      // Don't crash if role sync fails, just warn
      console.warn('Failed to sync role configurations:', syncError.message);
    }
  } catch (error) {
    // Database connection failed - this is fatal, so exit
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// =============================================================================
// CREATE HTTP SERVER
// =============================================================================

/**
 * Create HTTP Server for WebSocket Support
 * ----------------------------------------
 * Express creates its own simple server, but WebSockets need access to
 * the raw HTTP server. By creating it explicitly with createServer(),
 * we can attach both Express and Socket.IO to the same server.
 */
const httpServer = createServer(app);

// =============================================================================
// START SERVER
// =============================================================================

/**
 * Start the Server
 * ----------------
 * This function performs the startup sequence:
 *
 * 1. Connect to the database
 * 2. Initialize WebSocket server for real-time features
 * 3. Pass Socket.IO instance to routes that need it (messages)
 * 4. Start listening for HTTP requests on the configured port
 * 5. Log startup information
 */
const startServer = async () => {
  // Step 1: Connect to the database
  await connectDB();

  // Step 2: Initialize WebSocket server
  // This enables real-time features like instant messaging
  const io = initializeWebSocket(httpServer);

  // Step 3: Share Socket.IO instance with message routes
  // This allows message routes to emit real-time events
  setSocketIO(io);

  // Step 4: Start listening for HTTP requests
  httpServer.listen(PORT, () => {
    // Step 5: Log startup information
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log('WebSocket server initialized');
    console.log('\nReady to receive requests!\n');
  });
};

// Start the server by calling the startup function
startServer();

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Handle SIGINT (Ctrl+C) for Graceful Shutdown
 * -------------------------------------------
 * When the user presses Ctrl+C to stop the server:
 * 1. Log that we're shutting down
 * 2. Close the database connection properly
 * 3. Exit the process cleanly
 *
 * This prevents data corruption by ensuring all database operations
 * are completed before the server stops.
 */
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
