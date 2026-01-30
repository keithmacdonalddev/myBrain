/**
 * =============================================================================
 * SECURITYSERVICE.JS - Security Detection and Alerting Service
 * =============================================================================
 *
 * This service handles security detection logic for myBrain. It detects
 * suspicious activity and creates security alerts to warn users.
 *
 * WHAT DOES THIS SERVICE DO?
 * --------------------------
 * 1. Detects new devices (first login from a device fingerprint)
 * 2. Detects new locations (first login from a city+country)
 * 3. Detects failed login patterns (brute force attempts)
 * 4. Detects impossible travel (login from NYC, then Tokyo 1 hour later)
 * 5. Creates security alerts when suspicious activity is detected
 * 6. Triggers notifications for critical alerts
 *
 * WHY A SEPARATE SERVICE?
 * -----------------------
 * - Business logic is separate from route handling
 * - Can be tested independently
 * - Can be called from multiple places (auth, profile, admin)
 * - Follows the service pattern used elsewhere in the app
 *
 * ALERT THRESHOLDS:
 * -----------------
 * - New device/location: info alert (just informational)
 * - 3 failed logins in 15 min: warning alert
 * - 5 failed logins in 15 min: critical alert + notification
 * - Impossible travel (>1000 km/h): critical alert + notification
 *
 * INTEGRATION POINTS:
 * -------------------
 * - auth.js POST /login: Calls processLoginSecurityChecks after login
 * - auth.js POST /login: Calls checkFailedLoginPattern on failures
 * - profile.js POST /change-password: Calls createPasswordChangedAlert
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Session model for checking device and location history.
 */
import Session from '../models/Session.js';

/**
 * SecurityAlert model for creating security alerts.
 */
import SecurityAlert from '../models/SecurityAlert.js';

/**
 * FailedLogin model for checking failed login patterns.
 */
import FailedLogin from '../models/FailedLogin.js';

/**
 * Notification model for sending in-app notifications.
 */
import Notification from '../models/Notification.js';

/**
 * calculateDistance from geoip utility for impossible travel detection.
 */
import { calculateDistance } from '../utils/geoip.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * SECURITY_CONFIG
 * ---------------
 * Centralized configuration for security thresholds.
 * Adjust these values to tune sensitivity.
 */
const SECURITY_CONFIG = {
  // Failed login detection
  failedLogin: {
    warningThreshold: 3,      // Alert at 3 failures
    criticalThreshold: 5,     // Critical alert + notification at 5 failures
    windowMs: 15 * 60 * 1000  // 15 minute window
  },

  // New device/location detection
  newDevice: {
    lookbackDays: 90  // Consider devices/locations from last 90 days as "known"
  },

  // Impossible travel detection
  impossibleTravel: {
    maxSpeedKmH: 1000,  // Max reasonable speed (commercial flight + buffer)
    minDistanceKm: 500, // Ignore distances under 500km (same region)
    maxTimeDiffHours: 24 // Only check within 24 hour window
  }
};

// =============================================================================
// DEVICE DETECTION
// =============================================================================

/**
 * checkNewDevice(userId, deviceFingerprint)
 * -----------------------------------------
 * Check if this is a new device (fingerprint) for the user.
 * Looks back 90 days at previous sessions.
 *
 * WHAT IS A DEVICE FINGERPRINT?
 * -----------------------------
 * A coarse identifier combining browser + OS + device type + language.
 * Example: "chrome|windows|desktop|en-us"
 *
 * Not perfect (different users can have same fingerprint), but good
 * enough for "have I seen this device before?" checks.
 *
 * @param {ObjectId|string} userId - User to check history for
 * @param {string} deviceFingerprint - Fingerprint to check
 * @returns {Promise<boolean>} True if device is new (not seen before)
 *
 * EXAMPLE:
 * const isNew = await checkNewDevice(userId, 'chrome|windows|desktop|en-us');
 * if (isNew) {
 *   // Create new device alert
 * }
 */
export async function checkNewDevice(userId, deviceFingerprint) {
  // Can't check if no fingerprint provided
  if (!deviceFingerprint) {
    return false;
  }

  // Calculate lookback date
  const lookbackMs = SECURITY_CONFIG.newDevice.lookbackDays * 24 * 60 * 60 * 1000;
  const lookbackDate = new Date(Date.now() - lookbackMs);

  // Check if we've seen this fingerprint before
  const existingSession = await Session.findOne({
    userId,
    'device.fingerprint': deviceFingerprint,
    createdAt: { $gte: lookbackDate }
  }).select('_id').lean();

  // If no existing session with this fingerprint, it's a new device
  return !existingSession;
}

// =============================================================================
// LOCATION DETECTION
// =============================================================================

/**
 * checkNewLocation(userId, city, countryCode)
 * -------------------------------------------
 * Check if this is a new location (city+country) for the user.
 * Looks back 90 days at previous sessions.
 *
 * WHY CITY + COUNTRY CODE?
 * ------------------------
 * Just city name isn't unique ("Paris" in France vs Texas).
 * Just country isn't specific enough.
 * City + country code gives good balance of precision.
 *
 * @param {ObjectId|string} userId - User to check history for
 * @param {string} city - City name from geolocation
 * @param {string} countryCode - Two-letter country code (e.g., 'US')
 * @returns {Promise<boolean>} True if location is new (not seen before)
 *
 * EXAMPLE:
 * const isNew = await checkNewLocation(userId, 'New York', 'US');
 * if (isNew) {
 *   // Create new location alert
 * }
 */
export async function checkNewLocation(userId, city, countryCode) {
  // Can't check if no city or country provided
  if (!city || city === 'Unknown' || !countryCode) {
    return false;
  }

  // Calculate lookback date
  const lookbackMs = SECURITY_CONFIG.newDevice.lookbackDays * 24 * 60 * 60 * 1000;
  const lookbackDate = new Date(Date.now() - lookbackMs);

  // Check if we've seen this city+country combination before
  const existingSession = await Session.findOne({
    userId,
    'location.city': city,
    'location.countryCode': countryCode,
    createdAt: { $gte: lookbackDate }
  }).select('_id').lean();

  // If no existing session with this location, it's new
  return !existingSession;
}

// =============================================================================
// IMPOSSIBLE TRAVEL DETECTION
// =============================================================================

/**
 * checkImpossibleTravel(userId, newLocation, newTimestamp)
 * --------------------------------------------------------
 * Check if the user has traveled faster than physically possible.
 * Compares current login location to the user's last active session.
 *
 * HOW IT WORKS:
 * -------------
 * 1. Find user's most recent active session with coordinates
 * 2. Calculate distance from that location to new location
 * 3. Calculate time elapsed since last activity
 * 4. If required speed > 1000 km/h, flag as impossible
 *
 * LIMITATIONS:
 * ------------
 * - Only works if both locations have coordinates
 * - Ignores distances < 500km (could be VPN bounce in same region)
 * - Ignores time gaps > 24h (user could have flown)
 * - VPNs can trigger false positives
 *
 * @param {ObjectId|string} userId - User to check
 * @param {Object} newLocation - New login location
 *   - latitude: Number
 *   - longitude: Number
 *   - city: String
 *   - country: String
 * @param {Date|number} newTimestamp - When the new login occurred
 * @returns {Promise<Object>} Result object:
 *   - isImpossible: boolean
 *   - reason: string (why it's impossible or why check was skipped)
 *   - distanceKm: number (if calculated)
 *   - timeDiffHours: number (if calculated)
 *   - requiredSpeedKmH: number (if calculated)
 *   - fromLocation: string (previous location)
 *   - toLocation: string (new location)
 *
 * EXAMPLE:
 * const result = await checkImpossibleTravel(userId, {
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   city: 'New York',
 *   country: 'United States'
 * }, new Date());
 *
 * if (result.isImpossible) {
 *   // Someone in Tokyo logged in 1 hour after NYC login
 *   // Create critical alert!
 * }
 */
export async function checkImpossibleTravel(userId, newLocation, newTimestamp) {
  // Check if we have coordinates for the new location
  if (!newLocation?.latitude || !newLocation?.longitude) {
    return {
      isImpossible: false,
      reason: 'no_coordinates'
    };
  }

  // Find user's most recent active session with coordinates
  const lastSession = await Session.findOne({
    userId,
    status: 'active',
    'location.latitude': { $exists: true, $ne: null },
    'location.longitude': { $exists: true, $ne: null }
  })
    .sort({ lastActivityAt: -1 })
    .select('location lastActivityAt')
    .lean();

  // If no previous session with coordinates, can't check
  if (!lastSession?.location?.latitude || !lastSession?.location?.longitude) {
    return {
      isImpossible: false,
      reason: 'no_previous_session'
    };
  }

  // Calculate time difference in hours
  const newTime = new Date(newTimestamp).getTime();
  const lastTime = new Date(lastSession.lastActivityAt).getTime();
  const timeDiffHours = (newTime - lastTime) / (1000 * 60 * 60);

  // If more than 24 hours apart, user could have traveled legitimately
  if (timeDiffHours > SECURITY_CONFIG.impossibleTravel.maxTimeDiffHours) {
    return {
      isImpossible: false,
      reason: 'time_gap_too_large'
    };
  }

  // If time difference is 0 or negative (shouldn't happen), skip
  if (timeDiffHours <= 0) {
    return {
      isImpossible: false,
      reason: 'invalid_time_difference'
    };
  }

  // Calculate distance using Haversine formula
  const distanceKm = calculateDistance(
    lastSession.location.latitude,
    lastSession.location.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  // If distance is null (calculation failed), skip
  if (distanceKm === null) {
    return {
      isImpossible: false,
      reason: 'distance_calculation_failed'
    };
  }

  // If distance is short (< 500km), could be VPN within same region
  if (distanceKm < SECURITY_CONFIG.impossibleTravel.minDistanceKm) {
    return {
      isImpossible: false,
      reason: 'distance_too_short'
    };
  }

  // Calculate required speed
  const requiredSpeedKmH = distanceKm / timeDiffHours;

  // Build location strings for display
  const fromLocation = lastSession.location.city && lastSession.location.country
    ? `${lastSession.location.city}, ${lastSession.location.country}`
    : 'Unknown Location';

  const toLocation = newLocation.city && newLocation.country
    ? `${newLocation.city}, ${newLocation.country}`
    : 'Unknown Location';

  // Check if speed exceeds maximum possible
  const isImpossible = requiredSpeedKmH > SECURITY_CONFIG.impossibleTravel.maxSpeedKmH;

  return {
    isImpossible,
    reason: isImpossible ? 'impossible_speed' : 'possible_travel',
    distanceKm: Math.round(distanceKm),
    timeDiffHours: Math.round(timeDiffHours * 10) / 10, // 1 decimal place
    requiredSpeedKmH: Math.round(requiredSpeedKmH),
    fromLocation,
    toLocation
  };
}

// =============================================================================
// FAILED LOGIN PATTERN DETECTION
// =============================================================================

/**
 * checkFailedLoginPattern(userId)
 * -------------------------------
 * Check if there's a concerning pattern of failed logins.
 * Creates alerts at warning (3) and critical (5) thresholds.
 *
 * ALERT LEVELS:
 * -------------
 * - 3+ failures in 15 min: Warning alert (no notification)
 * - 5+ failures in 15 min: Critical alert + in-app notification
 *
 * DEDUPLICATION:
 * --------------
 * SecurityAlert.createAlert has 1-hour deduplication built in,
 * so we won't spam users with repeated alerts.
 *
 * @param {ObjectId|string} userId - User to check failures for
 * @returns {Promise<Object|null>} Created alert or null if below threshold
 *
 * EXAMPLE:
 * // Called after recording a failed login
 * if (user) {
 *   await checkFailedLoginPattern(user._id);
 * }
 */
export async function checkFailedLoginPattern(userId) {
  if (!userId) return null;

  // Count recent failures for this user
  const recentCount = await FailedLogin.getRecentByUser(
    userId,
    SECURITY_CONFIG.failedLogin.windowMs
  );

  // Check critical threshold first (5+ failures)
  if (recentCount >= SECURITY_CONFIG.failedLogin.criticalThreshold) {
    // Create critical alert
    const alert = await SecurityAlert.createAlert({
      userId,
      alertType: 'failed_login_burst',
      severity: 'critical',
      title: 'Multiple failed login attempts',
      description: `${recentCount} failed login attempts in the last 15 minutes. ` +
        'If this was not you, consider changing your password immediately.',
      metadata: {
        attemptCount: recentCount
      }
    });

    // Also create an in-app notification for critical alerts
    try {
      await Notification.createNotification({
        userId,
        type: 'security_alert',
        title: 'Suspicious login activity',
        body: `${recentCount} failed login attempts were detected on your account. ` +
          'Please review your account security.',
        actionUrl: '/app/settings?tab=activity',
        metadata: {
          priority: 'high',
          alertId: alert?._id
        }
      });
    } catch (notifyErr) {
      // Don't fail the main flow if notification fails
      console.error('[Security] Failed to create notification:', notifyErr.message);
    }

    return alert;
  }

  // Check warning threshold (3+ failures)
  if (recentCount >= SECURITY_CONFIG.failedLogin.warningThreshold) {
    const alert = await SecurityAlert.createAlert({
      userId,
      alertType: 'failed_login_burst',
      severity: 'warning',
      title: 'Failed login attempts detected',
      description: `${recentCount} failed login attempts in the last 15 minutes.`,
      metadata: {
        attemptCount: recentCount
      }
    });

    return alert;
  }

  // Below threshold, no alert needed
  return null;
}

// =============================================================================
// POST-LOGIN SECURITY CHECKS
// =============================================================================

/**
 * processLoginSecurityChecks(userId, session)
 * -------------------------------------------
 * Process all security checks after a successful login.
 * Called asynchronously (don't block login response).
 *
 * CHECKS PERFORMED:
 * -----------------
 * 1. New device detection → info alert
 * 2. New location detection → info alert
 * 3. Impossible travel detection → critical alert + notification
 *
 * @param {ObjectId|string} userId - User who just logged in
 * @param {Object} session - The session document created during login
 *   - sessionId: string
 *   - device: { browser, os, fingerprint }
 *   - location: { city, country, countryCode, latitude, longitude, ip }
 *   - securityFlags: { isNewDevice, isNewLocation }
 *   - issuedAt: Date
 * @returns {Promise<Array>} Array of created alerts
 *
 * EXAMPLE:
 * // In auth.js login handler, after session creation:
 * setImmediate(() => {
 *   processLoginSecurityChecks(user._id, session).catch(err => {
 *     console.error('[Security] Login check failed:', err);
 *   });
 * });
 */
export async function processLoginSecurityChecks(userId, session) {
  const alerts = [];

  // ---------------------------------------------------------------------------
  // CHECK 1: New Device Detection
  // ---------------------------------------------------------------------------

  if (session.securityFlags?.isNewDevice) {
    const deviceDisplay = session.device?.browser
      ? `${session.device.browser} on ${session.device.os || 'Unknown OS'}`
      : 'Unknown Device';

    try {
      const alert = await SecurityAlert.createAlert({
        userId,
        alertType: 'new_device',
        severity: 'info',
        title: 'New device sign-in',
        description: `Signed in from ${deviceDisplay}.`,
        metadata: {
          sessionId: session.sessionId,
          device: deviceDisplay,
          ip: session.location?.ip
        }
      });

      if (alert) alerts.push(alert);
    } catch (err) {
      console.error('[Security] Failed to create new device alert:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // CHECK 2: New Location Detection
  // ---------------------------------------------------------------------------

  if (session.securityFlags?.isNewLocation) {
    const locationDisplay = session.location?.city && session.location?.country
      ? `${session.location.city}, ${session.location.country}`
      : session.location?.country || 'Unknown Location';

    try {
      const alert = await SecurityAlert.createAlert({
        userId,
        alertType: 'new_location',
        severity: 'info',
        title: 'New location sign-in',
        description: `Signed in from ${locationDisplay}.`,
        metadata: {
          sessionId: session.sessionId,
          location: locationDisplay,
          ip: session.location?.ip
        }
      });

      if (alert) alerts.push(alert);
    } catch (err) {
      console.error('[Security] Failed to create new location alert:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // CHECK 3: Impossible Travel Detection
  // ---------------------------------------------------------------------------

  try {
    const travelCheck = await checkImpossibleTravel(
      userId,
      session.location,
      session.issuedAt
    );

    if (travelCheck.isImpossible) {
      const alert = await SecurityAlert.createAlert({
        userId,
        alertType: 'impossible_travel',
        severity: 'critical',
        title: 'Unusual login location detected',
        description: `Login from ${travelCheck.toLocation} detected ` +
          `${travelCheck.timeDiffHours}h after activity in ${travelCheck.fromLocation}. ` +
          `This would require traveling at ${travelCheck.requiredSpeedKmH} km/h.`,
        metadata: {
          sessionId: session.sessionId,
          fromLocation: travelCheck.fromLocation,
          toLocation: travelCheck.toLocation,
          distanceKm: travelCheck.distanceKm,
          timeHours: travelCheck.timeDiffHours,
          requiredSpeedKmH: travelCheck.requiredSpeedKmH,
          ip: session.location?.ip
        }
      });

      if (alert) {
        alerts.push(alert);

        // Create urgent notification for impossible travel
        try {
          await Notification.createNotification({
            userId,
            type: 'security_alert',
            title: 'Urgent: Unusual login detected',
            body: `Someone signed in from ${travelCheck.toLocation}. ` +
              'If this was not you, please secure your account immediately.',
            actionUrl: '/app/settings?tab=activity',
            metadata: {
              priority: 'high',
              alertId: alert._id
            }
          });
        } catch (notifyErr) {
          console.error('[Security] Failed to create travel notification:', notifyErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[Security] Failed to check impossible travel:', err.message);
  }

  return alerts;
}

// =============================================================================
// PASSWORD CHANGE ALERT
// =============================================================================

/**
 * createPasswordChangedAlert(userId, ip)
 * --------------------------------------
 * Create a security alert when a user changes their password.
 * This is an informational alert - password changes are expected behavior.
 *
 * @param {ObjectId|string} userId - User who changed password
 * @param {string} ip - IP address the change was made from
 * @returns {Promise<SecurityAlert>} Created alert
 *
 * EXAMPLE:
 * // In profile.js change-password handler:
 * await createPasswordChangedAlert(user._id, req.ip);
 */
export async function createPasswordChangedAlert(userId, ip) {
  return SecurityAlert.createAlert({
    userId,
    alertType: 'password_changed',
    severity: 'info',
    title: 'Password changed',
    description: 'Your password was changed successfully. All other sessions have been signed out.',
    metadata: {
      ip
    }
  });
}

/**
 * createSessionRevokedAlert(userId, sessionInfo)
 * -----------------------------------------------
 * Create a security alert when a session is revoked.
 *
 * @param {ObjectId|string} userId - User who revoked the session
 * @param {Object} sessionInfo - Info about the revoked session
 *   - device: Device description
 *   - location: Location description
 *   - reason: Why it was revoked
 * @returns {Promise<SecurityAlert>} Created alert
 */
export async function createSessionRevokedAlert(userId, sessionInfo = {}) {
  return SecurityAlert.createAlert({
    userId,
    alertType: 'session_revoked',
    severity: 'info',
    title: 'Session signed out',
    description: sessionInfo.device
      ? `Session for ${sessionInfo.device} was signed out.`
      : 'A session was signed out.',
    metadata: {
      device: sessionInfo.device,
      location: sessionInfo.location,
      reason: sessionInfo.reason
    }
  });
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all security service functions.
 *
 * USAGE:
 * import * as securityService from './services/securityService.js';
 *
 * // Check if device is new
 * const isNew = await securityService.checkNewDevice(userId, fingerprint);
 *
 * // Process login security checks
 * await securityService.processLoginSecurityChecks(userId, session);
 *
 * // Check failed login pattern
 * await securityService.checkFailedLoginPattern(userId);
 */
export default {
  checkNewDevice,
  checkNewLocation,
  checkImpossibleTravel,
  checkFailedLoginPattern,
  processLoginSecurityChecks,
  createPasswordChangedAlert,
  createSessionRevokedAlert,
  SECURITY_CONFIG
};
