/**
 * Tests for errorCapture.js
 * Testing client-side error capture and reporting functionality
 *
 * NOTE: The errorCapture module initializes at import time and sets up global
 * error handlers. This makes it difficult to test the initialization logic directly.
 * Instead, we test the exported functions: captureError and captureWarning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the logsApi before importing errorCapture
vi.mock('./api', () => ({
  logsApi: {
    reportClientError: vi.fn(() => Promise.resolve()),
  },
}));

// Import after mocking
import { logsApi } from './api';
import { initErrorCapture, captureError, captureWarning } from './errorCapture';
import errorCaptureDefault from './errorCapture';

// =============================================================================
// Test Setup
// =============================================================================

describe('errorCapture', () => {
  let originalConsoleWarn;

  beforeEach(() => {
    // Store original console.warn
    originalConsoleWarn = console.warn;
    console.warn = vi.fn();

    // Reset mocks
    vi.clearAllMocks();

    // Use fake timers for debouncing tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    // Restore console.warn
    console.warn = originalConsoleWarn;
    vi.useRealTimers();
  });

  // =============================================================================
  // Tests for captureError (manual error reporting)
  // =============================================================================

  describe('captureError', () => {
    it('reports Error objects with stack trace', async () => {
      const error = new Error('Test error message');
      captureError(error, { component: 'TestComponent' });

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          message: 'Test error message',
          stack: error.stack,
          url: expect.any(String),
          userAgent: expect.any(String),
          sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
          metadata: expect.objectContaining({
            component: 'TestComponent',
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        })
      );
    });

    it('reports string errors', async () => {
      captureError('String error message');

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          message: 'String error message',
        })
      );
    });

    it('handles null errors', async () => {
      captureError(null);

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          message: 'null',
        })
      );
    });

    it('handles undefined errors', async () => {
      captureError(undefined);

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          message: 'undefined',
        })
      );
    });

    it('handles error-like objects with message property', async () => {
      const errorLike = { message: 'Custom error object' };
      captureError(errorLike);

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          message: 'Custom error object',
        })
      );
    });

    it('includes context metadata in report', async () => {
      captureError(new Error('Test'), {
        component: 'Dashboard',
        action: 'loadData',
        userId: 'user123',
      });

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            component: 'Dashboard',
            action: 'loadData',
            userId: 'user123',
          }),
        })
      );
    });

    it('works without context parameter', async () => {
      captureError(new Error('No context'));

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Tests for captureWarning
  // =============================================================================

  describe('captureWarning', () => {
    it('reports warnings with message and context', async () => {
      captureWarning('Performance issue detected', {
        metric: 'loadTime',
        value: 5000,
      });

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'warning',
          message: 'Performance issue detected',
          metadata: expect.objectContaining({
            metric: 'loadTime',
            value: 5000,
          }),
        })
      );
    });

    it('reports warnings without context', async () => {
      captureWarning('Simple warning message');

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'warning',
          message: 'Simple warning message',
        })
      );
    });

    it('includes session ID in warning reports', async () => {
      captureWarning('Warning with session');

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
        })
      );
    });

    it('includes URL in warning reports', async () => {
      captureWarning('Warning with URL');

      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String),
        })
      );
    });
  });

  // =============================================================================
  // Tests for Error Debouncing
  // =============================================================================

  describe('Error Debouncing', () => {
    it('reports the same error only once within debounce window', async () => {
      const error = new Error('Repeated error');

      // First report should go through
      captureError(error);
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      // Second report (same error) should be skipped within 5 seconds
      captureError(error);
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);
    });

    it('reports same error again after debounce window expires', async () => {
      const error = new Error('Debounced error');

      // First report
      captureError(error);
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      // Advance time past debounce window (5 seconds)
      vi.advanceTimersByTime(6000);

      // Should now report again
      captureError(error);
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(2);
    });

    it('reports different errors independently', async () => {
      captureError(new Error('First error'));
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      captureError(new Error('Second error'));
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(2);

      captureError(new Error('Third error'));
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(3);
    });

    it('debounces based on error type and message combination', async () => {
      // Same message but different functions should both be reported
      captureError(new Error('Shared message'));
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      // Different error type (warning vs caught_error) should be reported
      captureWarning('Shared message');
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(2);
    });

    it('debounces string errors correctly', async () => {
      captureError('Same string error');
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      // Same string should be debounced
      captureError('Same string error');
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(1);

      // Different string should be reported
      captureError('Different string error');
      await vi.runAllTimersAsync();
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================================================
  // Tests for Error Handling in Error Reporting
  // =============================================================================

  describe('Error Handling', () => {
    it('does not throw when API call fails', async () => {
      // Make the API call reject
      logsApi.reportClientError.mockRejectedValueOnce(new Error('Network error'));

      // This should not throw
      expect(() => {
        captureError(new Error('Test error that will fail'));
      }).not.toThrow();

      await vi.runAllTimersAsync();

      // Should log warning about failed report
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to report error to server:',
        'Network error'
      );
    });

    it('continues reporting new errors after API failure', async () => {
      // First call fails (use unique error message)
      logsApi.reportClientError.mockRejectedValueOnce(new Error('Network error'));
      captureError(new Error('API failure test error 1'));
      await vi.runAllTimersAsync();

      // Second call succeeds (different error message, so no debounce)
      logsApi.reportClientError.mockResolvedValueOnce();
      captureError(new Error('API failure test error 2'));
      await vi.runAllTimersAsync();

      // Both calls should have been attempted
      expect(logsApi.reportClientError).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================================================
  // Tests for Session ID Consistency
  // =============================================================================

  describe('Session ID', () => {
    it('uses consistent sessionId across multiple reports', async () => {
      // Use unique error messages to avoid debouncing
      captureError(new Error('Session test error 1'));
      await vi.runAllTimersAsync();

      captureWarning('Session test warning 1');
      await vi.runAllTimersAsync();

      const [call1, call2] = logsApi.reportClientError.mock.calls;
      expect(call1[0].sessionId).toBe(call2[0].sessionId);
    });

    it('sessionId has expected format', async () => {
      captureError(new Error('Session format test'));
      await vi.runAllTimersAsync();

      const call = logsApi.reportClientError.mock.calls[0][0];
      // Format: session_{timestamp}_{random}
      expect(call.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  // =============================================================================
  // Tests for Browser Context in Reports
  // =============================================================================

  describe('Browser Context', () => {
    it('includes URL in all reports', async () => {
      captureError(new Error('URL context test'));
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.any(String),
        })
      );
    });

    it('includes userAgent in all reports', async () => {
      captureError(new Error('UserAgent context test'));
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: expect.any(String),
        })
      );
    });

    it('includes timestamp in metadata', async () => {
      captureError(new Error('Timestamp context test'));
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          }),
        })
      );
    });
  });

  // =============================================================================
  // Tests for Module Exports
  // =============================================================================

  describe('Module Exports', () => {
    it('exports initErrorCapture function', () => {
      expect(typeof initErrorCapture).toBe('function');
    });

    it('exports captureError function', () => {
      expect(typeof captureError).toBe('function');
    });

    it('exports captureWarning function', () => {
      expect(typeof captureWarning).toBe('function');
    });

    it('default export contains all functions', () => {
      expect(errorCaptureDefault).toEqual({
        initErrorCapture: expect.any(Function),
        captureError: expect.any(Function),
        captureWarning: expect.any(Function),
      });
    });
  });

  // =============================================================================
  // Tests for initErrorCapture
  // =============================================================================

  describe('initErrorCapture', () => {
    it('is idempotent - calling multiple times is safe', () => {
      // Should not throw even if called multiple times
      expect(() => {
        initErrorCapture();
        initErrorCapture();
        initErrorCapture();
      }).not.toThrow();
    });
  });

  // =============================================================================
  // Tests for Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles objects without message property', async () => {
      captureError({ code: 123, detail: 'Some detail' });
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
          // Should convert to string
          message: expect.any(String),
        })
      );
    });

    it('handles numbers as errors', async () => {
      captureError(404);
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '404',
        })
      );
    });

    it('handles empty string errors', async () => {
      captureError('');
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '',
        })
      );
    });

    it('handles very long error messages', async () => {
      const longMessage = 'x'.repeat(10000);
      captureError(new Error(longMessage));
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        })
      );
    });

    it('handles errors with undefined message', async () => {
      // Advance time to clear any debounce from previous "undefined" test
      vi.advanceTimersByTime(6000);

      const weirdError = { message: undefined };
      captureError(weirdError);
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'caught_error',
        })
      );
    });

    it('handles context with special characters', async () => {
      captureError(new Error('Special chars test error'), {
        query: "SELECT * FROM users WHERE name = 'O'Brien'",
        json: '{"key": "value"}',
      });
      await vi.runAllTimersAsync();

      expect(logsApi.reportClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            query: "SELECT * FROM users WHERE name = 'O'Brien'",
            json: '{"key": "value"}',
          }),
        })
      );
    });
  });
});
