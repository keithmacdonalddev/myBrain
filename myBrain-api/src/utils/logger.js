import Log from '../models/Log.js';

// Configuration from environment
const LOG_SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE) || 0.1; // 10% by default
const LOG_SLOW_MS = parseInt(process.env.LOG_SLOW_MS) || 1000; // 1 second

/**
 * Wide Event Logger
 *
 * Implements "wide events" pattern where each log entry captures
 * complete context about a request/operation.
 *
 * Uses tail sampling:
 * - 100% of errors are logged
 * - 100% of slow requests are logged
 * - 100% of debug-flagged users are logged
 * - X% of successful requests are sampled randomly
 */

/**
 * Determine if a log should be sampled
 */
function shouldSample(logData) {
  // Always log errors (4xx and 5xx)
  if (logData.statusCode >= 400) {
    return { shouldLog: true, reason: 'error' };
  }

  // Always log slow requests
  if (logData.durationMs >= LOG_SLOW_MS) {
    return { shouldLog: true, reason: 'slow' };
  }

  // Always log debug-flagged users
  if (logData.featureFlags && logData.featureFlags['debug.logging']) {
    return { shouldLog: true, reason: 'debug_user' };
  }

  // Random sampling for successful requests
  if (Math.random() < LOG_SAMPLE_RATE) {
    return { shouldLog: true, reason: 'random' };
  }

  return { shouldLog: false, reason: null };
}

/**
 * Generate event name from request
 */
function generateEventName(method, route, statusCode, error) {
  // Normalize route (remove IDs)
  const normalizedRoute = route
    .replace(/\/[a-f0-9]{24}/gi, '/:id') // MongoDB ObjectId
    .replace(/\/[0-9]+/g, '/:id');        // Numeric IDs

  const resource = normalizedRoute.split('/')[1] || 'root';
  const action = getActionFromMethod(method);

  if (error) {
    return `${resource}.${action}.failed`;
  }

  if (statusCode >= 400) {
    return `${resource}.${action}.error`;
  }

  return `${resource}.${action}.success`;
}

function getActionFromMethod(method) {
  switch (method.toUpperCase()) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'request';
  }
}

/**
 * Categorize error type
 */
function categorizeError(statusCode, errorCode) {
  if (statusCode === 400) return 'validation';
  if (statusCode === 401) return 'auth';
  if (statusCode === 403) return 'permission';
  if (statusCode === 404) return 'notFound';
  if (statusCode === 409) return 'conflict';
  if (statusCode === 429) return 'rateLimit';
  if (statusCode >= 500) return 'server';
  return 'unknown';
}

/**
 * Create and save a wide event log
 */
export async function logWideEvent(eventData) {
  try {
    const {
      requestId,
      method,
      route,
      statusCode,
      durationMs,
      userId,
      userRole,
      userEmail,
      featureFlags,
      entityIds,
      error,
      clientInfo,
      metadata
    } = eventData;

    // Determine sampling
    const { shouldLog, reason } = shouldSample(eventData);

    if (!shouldLog) {
      return null; // Don't log this request
    }

    // Generate event name
    const eventName = generateEventName(method, route, statusCode, error);

    // Build log entry
    const logEntry = new Log({
      requestId,
      timestamp: new Date(),
      route,
      method: method.toUpperCase(),
      statusCode,
      durationMs,
      userId: userId || null,
      userRole: userRole || null,
      userEmail: userEmail || null,
      featureFlags: featureFlags || {},
      entityIds: entityIds || {},
      error: error ? {
        category: categorizeError(statusCode, error.code),
        code: error.code || null,
        name: error.name || null,
        messageSafe: error.message || null,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : null,
        context: error.context || null  // Additional debugging context
      } : null,
      clientInfo: clientInfo || {},
      eventName,
      sampled: true,
      sampleReason: reason,
      metadata: metadata || {}
    });

    // Save asynchronously (don't block the response)
    await logEntry.save();

    return logEntry;
  } catch (err) {
    // Don't let logging errors break the application
    console.error('Failed to write log:', err.message);
    return null;
  }
}

/**
 * Log a custom event (not tied to HTTP request)
 */
export async function logEvent(eventName, data = {}) {
  try {
    const logEntry = new Log({
      requestId: data.requestId || `evt_${Date.now()}`,
      timestamp: new Date(),
      route: data.route || '/internal',
      method: 'POST',
      statusCode: data.error ? 500 : 200,
      durationMs: data.durationMs || 0,
      userId: data.userId || null,
      userRole: data.userRole || null,
      eventName,
      sampled: true,
      sampleReason: 'always',
      error: data.error ? {
        category: 'internal',
        code: data.error.code || 'INTERNAL_ERROR',
        messageSafe: data.error.message || 'Internal error',
        stack: process.env.NODE_ENV !== 'production' ? data.error.stack : null
      } : null,
      metadata: data.metadata || {}
    });

    await logEntry.save();
    return logEntry;
  } catch (err) {
    console.error('Failed to log event:', err.message);
    return null;
  }
}

export default {
  logWideEvent,
  logEvent,
  shouldSample,
  categorizeError
};
