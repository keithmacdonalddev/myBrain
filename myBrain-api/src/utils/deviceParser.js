/**
 * =============================================================================
 * DEVICEPARSER.JS - User-Agent Parsing Utility
 * =============================================================================
 *
 * This utility parses User-Agent strings to extract device information.
 * When a user logs in, their browser sends a User-Agent string that describes
 * their browser, operating system, and device type.
 *
 * WHAT IS A USER-AGENT STRING?
 * ----------------------------
 * A User-Agent is a text string that browsers send with every request.
 * It tells the server what browser and OS the user is using.
 *
 * EXAMPLE USER-AGENT STRINGS:
 * - Chrome on Windows:
 *   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
 *
 * - Safari on iPhone:
 *   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
 *
 * - Firefox on macOS:
 *   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0"
 *
 * WHY PARSE USER-AGENTS?
 * ----------------------
 * 1. SECURITY: Detect if someone's logging in from a new browser/device
 * 2. UX: Show "Chrome on Windows" instead of raw User-Agent string
 * 3. ANALYTICS: Understand what browsers/devices users use
 *
 * IMPORTANT NOTE:
 * ---------------
 * User-Agent strings can be spoofed (faked). Don't rely on them for
 * security-critical decisions, only for informational purposes.
 *
 * =============================================================================
 */

// =============================================================================
// BROWSER DETECTION PATTERNS
// =============================================================================

/**
 * Browser detection rules
 * Order matters - check more specific patterns first
 */
const browserPatterns = [
  // Edge must be before Chrome (Edge includes "Chrome" in UA)
  { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/(\d+[\.\d]*)/ },
  // Opera must be before Chrome (Opera includes "Chrome" in UA)
  { name: 'Opera', pattern: /(?:Opera|OPR)\/(\d+[\.\d]*)/ },
  // Samsung Internet
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/(\d+[\.\d]*)/ },
  // Chrome
  { name: 'Chrome', pattern: /Chrome\/(\d+[\.\d]*)/ },
  // Firefox
  { name: 'Firefox', pattern: /Firefox\/(\d+[\.\d]*)/ },
  // Safari must be after Chrome (Chrome includes "Safari" in UA)
  { name: 'Safari', pattern: /Version\/(\d+[\.\d]*).*Safari/ },
  // Internet Explorer
  { name: 'IE', pattern: /(?:MSIE |Trident.*rv:)(\d+[\.\d]*)/ },
  // Generic fallback
  { name: 'Unknown Browser', pattern: null }
];

// =============================================================================
// OS DETECTION PATTERNS
// =============================================================================

/**
 * Operating system detection rules
 */
const osPatterns = [
  // Windows versions
  { name: 'Windows', pattern: /Windows NT (\d+[\.\d]*)/, versionMap: {
    '10.0': '10/11',  // Windows 10 and 11 both report as 10.0
    '6.3': '8.1',
    '6.2': '8',
    '6.1': '7',
    '6.0': 'Vista',
    '5.1': 'XP'
  }},
  // macOS
  { name: 'macOS', pattern: /Mac OS X (\d+[_\.\d]*)/ },
  // iOS (must be before generic Mac pattern)
  { name: 'iOS', pattern: /(?:iPhone|iPad|iPod).*OS (\d+[_\.\d]*)/ },
  // Android
  { name: 'Android', pattern: /Android (\d+[\.\d]*)/ },
  // Linux distributions
  { name: 'Ubuntu', pattern: /Ubuntu/ },
  { name: 'Linux', pattern: /Linux/ },
  // Chrome OS
  { name: 'Chrome OS', pattern: /CrOS/ },
  // Generic fallback
  { name: 'Unknown OS', pattern: null }
];

// =============================================================================
// DEVICE TYPE DETECTION
// =============================================================================

/**
 * Device type detection patterns
 */
const deviceTypePatterns = {
  mobile: [
    /Mobile/i,
    /iPhone/i,
    /iPod/i,
    /Android.*Mobile/i,
    /webOS/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Opera Mini/i,
    /IEMobile/i
  ],
  tablet: [
    /iPad/i,
    /Android(?!.*Mobile)/i,  // Android without "Mobile" is usually tablet
    /Tablet/i,
    /Kindle/i,
    /Silk/i,
    /PlayBook/i
  ]
};

// =============================================================================
// MAIN PARSING FUNCTION
// =============================================================================

/**
 * parseUserAgent(userAgent)
 * -------------------------
 * Parse a User-Agent string into structured device information.
 *
 * @param {string} userAgent - Raw User-Agent string from request headers
 * @returns {Object} Parsed device info:
 *   - deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
 *   - browser: Browser name (e.g., 'Chrome')
 *   - browserVersion: Browser version (e.g., '120.0.0')
 *   - os: Operating system name (e.g., 'Windows')
 *   - osVersion: OS version (e.g., '10')
 *
 * EXAMPLE:
 * const device = parseUserAgent(req.get('User-Agent'));
 * // Returns: { deviceType: 'desktop', browser: 'Chrome', browserVersion: '120.0.0', os: 'Windows', osVersion: '10/11' }
 */
export function parseUserAgent(userAgent) {
  // Handle missing or invalid input
  if (!userAgent || typeof userAgent !== 'string') {
    return {
      deviceType: 'unknown',
      browser: 'Unknown',
      browserVersion: null,
      os: 'Unknown',
      osVersion: null
    };
  }

  // Detect device type
  const deviceType = detectDeviceType(userAgent);

  // Detect browser
  const { browser, browserVersion } = detectBrowser(userAgent);

  // Detect OS
  const { os, osVersion } = detectOS(userAgent);

  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion
  };
}

/**
 * detectDeviceType(userAgent)
 * ---------------------------
 * Determine if the device is desktop, mobile, or tablet.
 *
 * @param {string} userAgent - Raw User-Agent string
 * @returns {string} 'desktop' | 'mobile' | 'tablet' | 'unknown'
 */
function detectDeviceType(userAgent) {
  // Check for mobile patterns
  for (const pattern of deviceTypePatterns.mobile) {
    if (pattern.test(userAgent)) {
      return 'mobile';
    }
  }

  // Check for tablet patterns
  for (const pattern of deviceTypePatterns.tablet) {
    if (pattern.test(userAgent)) {
      return 'tablet';
    }
  }

  // Default to desktop for standard browsers
  if (/Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(userAgent)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * detectBrowser(userAgent)
 * ------------------------
 * Extract browser name and version from User-Agent.
 *
 * @param {string} userAgent - Raw User-Agent string
 * @returns {Object} { browser: string, browserVersion: string|null }
 */
function detectBrowser(userAgent) {
  for (const { name, pattern } of browserPatterns) {
    if (!pattern) continue;  // Skip fallback pattern

    const match = userAgent.match(pattern);
    if (match) {
      return {
        browser: name,
        browserVersion: match[1] || null
      };
    }
  }

  return {
    browser: 'Unknown',
    browserVersion: null
  };
}

/**
 * detectOS(userAgent)
 * -------------------
 * Extract operating system name and version from User-Agent.
 *
 * @param {string} userAgent - Raw User-Agent string
 * @returns {Object} { os: string, osVersion: string|null }
 */
function detectOS(userAgent) {
  for (const { name, pattern, versionMap } of osPatterns) {
    if (!pattern) continue;  // Skip fallback pattern

    const match = userAgent.match(pattern);
    if (match) {
      let version = match[1] || null;

      // Clean up version (replace underscores with dots for macOS/iOS)
      if (version) {
        version = version.replace(/_/g, '.');
      }

      // Apply version mapping if available (for Windows)
      if (versionMap && version && versionMap[version]) {
        version = versionMap[version];
      }

      return {
        os: name,
        osVersion: version
      };
    }
  }

  return {
    os: 'Unknown',
    osVersion: null
  };
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * formatDevice(device)
 * --------------------
 * Format device info into a human-readable string.
 * Used for display in session list.
 *
 * @param {Object} device - Device info from parseUserAgent()
 * @returns {string} Formatted device string
 *
 * EXAMPLES:
 * formatDevice({ browser: 'Chrome', browserVersion: '120.0', os: 'Windows', osVersion: '10' })
 * // Returns: "Chrome on Windows"
 *
 * formatDevice({ browser: 'Safari', os: 'iOS' })
 * // Returns: "Safari on iOS"
 */
export function formatDevice(device) {
  if (!device) {
    return 'Unknown Device';
  }

  const browser = device.browser || 'Unknown Browser';
  const os = device.os || 'Unknown OS';

  return `${browser} on ${os}`;
}

/**
 * formatDeviceDetailed(device)
 * ----------------------------
 * Format device info with version numbers.
 *
 * @param {Object} device - Device info from parseUserAgent()
 * @returns {string} Detailed formatted device string
 *
 * EXAMPLE:
 * formatDeviceDetailed({ browser: 'Chrome', browserVersion: '120.0', os: 'Windows', osVersion: '10' })
 * // Returns: "Chrome 120.0 on Windows 10"
 */
export function formatDeviceDetailed(device) {
  if (!device) {
    return 'Unknown Device';
  }

  const browser = device.browser || 'Unknown Browser';
  const browserVersion = device.browserVersion ? ` ${device.browserVersion}` : '';
  const os = device.os || 'Unknown OS';
  const osVersion = device.osVersion ? ` ${device.osVersion}` : '';

  return `${browser}${browserVersion} on ${os}${osVersion}`;
}

// =============================================================================
// FINGERPRINTING (COARSE)
// =============================================================================

/**
 * generateDeviceFingerprint(userAgent, acceptLanguage)
 * ----------------------------------------------------
 * Generate a coarse fingerprint for "same device" detection.
 * This is NOT a unique identifier, but helps detect if someone
 * is likely using the same browser.
 *
 * @param {string} userAgent - User-Agent header
 * @param {string} acceptLanguage - Accept-Language header (optional)
 * @returns {string} Coarse device fingerprint
 *
 * IMPORTANT:
 * - This is NOT for tracking users across sites
 * - This is NOT highly accurate
 * - Only used to detect "new device" vs "same device"
 *
 * EXAMPLE:
 * // Same user, same browser = same fingerprint
 * // Same user, different browser = different fingerprint
 * // Different user, same browser = might be same fingerprint
 */
export function generateDeviceFingerprint(userAgent, acceptLanguage = '') {
  const device = parseUserAgent(userAgent);

  // Create a coarse fingerprint from browser and OS
  // We don't include versions because they change frequently
  const parts = [
    device.browser || 'unknown',
    device.os || 'unknown',
    device.deviceType || 'unknown'
  ];

  // Add primary language if available
  if (acceptLanguage) {
    const primaryLang = acceptLanguage.split(',')[0].split(';')[0].trim();
    if (primaryLang) {
      parts.push(primaryLang);
    }
  }

  return parts.join('|').toLowerCase();
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  parseUserAgent,
  formatDevice,
  formatDeviceDetailed,
  generateDeviceFingerprint
};
