import { useCallback } from 'react';

/**
 * useMetadataCapture - Captures sanitized environment and application context metadata
 *
 * This hook provides a function to capture non-sensitive metadata about the user's
 * environment when submitting feedback. Captures are ONLY included if the user opts in.
 *
 * STRICT PRIVACY RULES:
 * - No PII or sensitive data
 * - URLs stripped of query parameters
 * - Error messages stripped of stack traces and file paths
 * - NEVER captures: headers, cookies, localStorage, form data, tokens
 *
 * @returns {Object} Object containing captureMetadata function
 * @returns {Function} captureMetadata - Returns object with all captured metadata
 *
 * @example
 * const { captureMetadata } = useMetadataCapture();
 * const metadata = captureMetadata();
 * // metadata = {
 * //   browser: "Chrome 120",
 * //   os: "Windows 11",
 * //   screenSize: "1920x1080",
 * //   viewport: "1280x720",
 * //   deviceType: "desktop",
 * //   colorScheme: "dark",
 * //   url: "/dashboard",
 * //   appVersion: "1.2.3",
 * //   recentErrors: [],
 * //   recentActions: []
 * // }
 */
export function useMetadataCapture() {
  /**
   * getBrowserInfo - Extract browser name and version from navigator.userAgent
   *
   * Parses the user agent string to identify the browser type.
   * Returns only the browser name and version - never the full user agent string.
   *
   * @private
   * @returns {string} Browser name and version (e.g., "Chrome 120", "Firefox 122")
   */
  const getBrowserInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = '';

    // Chrome/Edge detection (must come before Safari as Edge contains Safari/Chrome)
    if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/(\d+)/);
      browserName = 'Edge';
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('Chrome/')) {
      const match = ua.match(/Chrome\/(\d+)/);
      browserName = 'Chrome';
      browserVersion = match ? match[1] : '';
    }
    // Firefox detection
    else if (ua.includes('Firefox/')) {
      const match = ua.match(/Firefox\/(\d+)/);
      browserName = 'Firefox';
      browserVersion = match ? match[1] : '';
    }
    // Safari detection (must come after Chrome since Safari appears in Chrome UA)
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      const match = ua.match(/Version\/(\d+)/);
      browserName = 'Safari';
      browserVersion = match ? match[1] : '';
    }

    return browserVersion ? `${browserName} ${browserVersion}` : browserName;
  }, []);

  /**
   * getOSInfo - Extract operating system name from navigator.userAgent
   *
   * Parses the user agent to identify the OS type.
   * Returns only the OS name - never the full user agent.
   *
   * @private
   * @returns {string} Operating system name (e.g., "Windows 11", "macOS 14", "iOS 17")
   */
  const getOSInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let osName = 'Unknown';

    // Windows detection
    if (ua.includes('Windows')) {
      if (ua.includes('Windows NT 10.0')) {
        osName = 'Windows 11'; // NT 10.0 is Windows 10/11
      } else if (ua.includes('Windows NT 6.3')) {
        osName = 'Windows 8.1';
      } else if (ua.includes('Windows NT 6.2')) {
        osName = 'Windows 8';
      } else {
        osName = 'Windows';
      }
    }
    // macOS detection
    else if (ua.includes('Macintosh')) {
      const match = ua.match(/OS X ([\d_.]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        osName = `macOS ${version}`;
      } else {
        osName = 'macOS';
      }
    }
    // Linux detection
    else if (ua.includes('Linux')) {
      osName = 'Linux';
    }
    // iOS detection
    else if (ua.includes('iPhone') || ua.includes('iPad')) {
      const match = ua.match(/OS ([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        osName = `iOS ${version}`;
      } else {
        osName = 'iOS';
      }
    }
    // Android detection
    else if (ua.includes('Android')) {
      const match = ua.match(/Android ([\d.]+)/);
      if (match) {
        osName = `Android ${match[1]}`;
      } else {
        osName = 'Android';
      }
    }

    return osName;
  }, []);

  /**
   * getDeviceType - Detect device type (desktop, mobile, tablet)
   *
   * Uses screen size and touch support to classify the device.
   * Respects the device's actual form factor rather than hardcoding.
   *
   * @private
   * @returns {string} Device type: "desktop", "mobile", or "tablet"
   */
  const getDeviceType = useCallback(() => {
    // Check if device supports touch
    const hasTouch = () => {
      return (
        typeof window !== 'undefined' &&
        (navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0 ||
          'ontouchstart' in window)
      );
    };

    const width = window.innerWidth;

    // If not touch device, it's desktop
    if (!hasTouch()) {
      return 'desktop';
    }

    // Touch device - classify by width
    if (width >= 1024) {
      return 'tablet';
    } else if (width >= 768) {
      return 'tablet';
    } else {
      return 'mobile';
    }
  }, []);

  /**
   * getColorScheme - Get user's preferred color scheme (light or dark)
   *
   * Uses prefers-color-scheme media query to detect system/browser preference.
   * Falls back to "light" if preference cannot be determined.
   *
   * @private
   * @returns {string} Color scheme: "light" or "dark"
   */
  const getColorScheme = useCallback(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return darkModeQuery.matches ? 'dark' : 'light';
  }, []);

  /**
   * getRecentErrors - Get recent error messages for context
   *
   * MVP: Returns empty array. In future, this would integrate with error tracking
   * to capture the last N errors in the last M minutes.
   *
   * CRITICAL REDACTION RULES:
   * - Only capture error messages, never stack traces
   * - Never capture file paths or line numbers
   * - Never capture sensitive data from error context
   * - Cap at 5 errors maximum
   * - Only include errors from last 5 minutes
   *
   * @private
   * @returns {Array<Object>} Array of error objects with message and timestamp
   */
  const getRecentErrors = useCallback(() => {
    // MVP: Return empty array
    // Future implementation will integrate with error tracking service
    return [];
  }, []);

  /**
   * getRecentActions - Get recent user actions for context
   *
   * MVP: Returns empty array. In future, this would track the last N user actions
   * (clicks, navigation, form submissions) from the last M minutes.
   *
   * CRITICAL REDACTION RULES:
   * - Never capture form data or input values
   * - Never capture element content or text
   * - Only capture action type and target element ID/class
   * - Cap at 10 actions maximum
   * - Only include actions from last 2 minutes
   *
   * @private
   * @returns {Array<Object>} Array of action objects with action type and timestamp
   */
  const getRecentActions = useCallback(() => {
    // MVP: Return empty array
    // Future implementation will integrate with action tracking/telemetry
    return [];
  }, []);

  /**
   * captureMetadata - Capture all metadata about the current environment
   *
   * This is the main hook function. Returns an object containing all available
   * metadata. ONLY non-sensitive, user-opted-in data is included.
   *
   * @returns {Object} Metadata object with the following structure:
   *   - browser: string (e.g., "Chrome 120")
   *   - os: string (e.g., "Windows 11")
   *   - screenSize: string (e.g., "1920x1080")
   *   - viewport: string (e.g., "1280x720")
   *   - deviceType: string ("desktop", "mobile", or "tablet")
   *   - colorScheme: string ("light" or "dark")
   *   - url: string (path only, query parameters stripped)
   *   - appVersion: string (from VITE_APP_VERSION or "unknown")
   *   - recentErrors: array (max 5 errors, message only)
   *   - recentActions: array (max 10 actions, last 2 minutes)
   */
  const captureMetadata = useCallback(() => {
    return {
      // Environment Context (Safe - no PII)
      browser: getBrowserInfo(),
      os: getOSInfo(),
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      deviceType: getDeviceType(),
      colorScheme: getColorScheme(),

      // Application State (Safe - no sensitive data)
      // Strip query parameters from URL to avoid capturing search queries, tokens, etc.
      url: window.location.pathname,
      appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',

      // Error Context (Redacted - no stack traces or file paths)
      recentErrors: getRecentErrors(),

      // User Journey (Redacted - no form data or sensitive interactions)
      recentActions: getRecentActions(),
    };
  }, [
    getBrowserInfo,
    getOSInfo,
    getDeviceType,
    getColorScheme,
    getRecentErrors,
    getRecentActions,
  ]);

  return { captureMetadata };
}
