import { nanoid } from 'nanoid';
import { logWideEvent } from '../utils/logger.js';

/**
 * Request Logger Middleware
 *
 * Adds requestId to each request and logs wide events on response finish.
 */
export function requestLogger(req, res, next) {
  // Generate unique request ID
  req.requestId = `req_${nanoid(16)}`;
  res.setHeader('X-Request-Id', req.requestId);

  // Capture start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Entity IDs collected during request
  req.entityIds = {};

  // Override end to capture response
  res.end = function(chunk, encoding) {
    // Restore original end
    res.end = originalEnd;

    // Call original end
    res.end(chunk, encoding);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Don't log health checks and static assets
    const skipPaths = ['/health', '/favicon.ico', '/_next'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return;
    }

    // Sanitize request body (remove sensitive fields)
    const sanitizeBody = (body) => {
      if (!body || typeof body !== 'object') return null;
      const sanitized = { ...body };
      const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'token', 'secret', 'apiKey'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) sanitized[field] = '[REDACTED]';
      });
      return sanitized;
    };

    // Build log data
    const logData = {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?._id || null,
      userRole: req.user?.role || null,
      userEmail: req.user?.email || null,
      featureFlags: req.user?.flags ? Object.fromEntries(req.user.flags) : {},
      entityIds: req.entityIds || {},
      error: req.error || null,
      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('User-Agent') || null,
        origin: req.get('Origin') || null
      },
      metadata: {
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        contentLength: res.get('Content-Length') || null,
        // Include sanitized request body for debugging (only for mutations)
        requestBody: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
          ? sanitizeBody(req.body)
          : undefined,
        // Include mutation context if available (before/after state)
        mutation: req.mutation || undefined
      }
    };

    // Log asynchronously (don't wait)
    logWideEvent(logData).catch(err => {
      console.error('Logging error:', err.message);
    });
  };

  next();
}

/**
 * Helper to attach entity IDs to the request for logging
 */
export function attachEntityId(req, type, id) {
  if (!req.entityIds) {
    req.entityIds = {};
  }
  req.entityIds[type] = id?.toString();
}

export default requestLogger;
