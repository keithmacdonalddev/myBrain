import express from 'express';
import { nanoid } from 'nanoid';
import Log from '../models/Log.js';

const router = express.Router();

/**
 * POST /logs/client-error
 * Receive and log frontend errors
 *
 * This endpoint is intentionally unauthenticated to capture errors
 * that occur before/during authentication. Rate limiting should be
 * applied at the infrastructure level.
 */
router.post('/client-error', async (req, res) => {
  try {
    const {
      errorType,
      message,
      stack,
      componentStack,
      url,
      userAgent,
      userId,
      sessionId,
      metadata
    } = req.body;

    // Basic validation
    if (!errorType || !message) {
      return res.status(400).json({
        error: 'errorType and message are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Create log entry for client error
    const logEntry = new Log({
      requestId: `client_${nanoid(16)}`,
      timestamp: new Date(),
      route: url || '/client',
      method: 'CLIENT',
      statusCode: 0, // Client errors don't have HTTP status
      durationMs: 0,
      userId: userId || null,
      eventName: `client.${errorType}`,
      sampled: true,
      sampleReason: 'client_error',
      error: {
        category: 'client',
        code: errorType,
        name: errorType,
        messageSafe: message,
        stack: stack || null,
        context: {
          componentStack: componentStack || null,
          url: url || null,
          sessionId: sessionId || null
        }
      },
      clientInfo: {
        ip: req.ip || req.connection?.remoteAddress || null,
        userAgent: userAgent || req.get('User-Agent') || null,
        origin: req.get('Origin') || null
      },
      metadata: metadata || {}
    });

    await logEntry.save();

    res.status(201).json({
      success: true,
      requestId: logEntry.requestId
    });
  } catch (error) {
    console.error('Failed to log client error:', error.message);
    // Don't expose internal errors, but acknowledge receipt
    res.status(500).json({
      error: 'Failed to log error',
      code: 'LOG_ERROR'
    });
  }
});

export default router;
