/**
 * =============================================================================
 * GEOIP.JS - IP Geolocation Utility
 * =============================================================================
 *
 * This utility provides IP address geolocation for security and analytics.
 * It determines the approximate geographic location of users based on their
 * IP address.
 *
 * WHY IP GEOLOCATION?
 * -------------------
 * 1. SECURITY: Detect logins from unusual locations
 * 2. IMPOSSIBLE TRAVEL: Detect if someone logs in from NYC, then Tokyo 5 min later
 * 3. UX: Show users where their sessions are located
 * 4. COMPLIANCE: Know which country data is being accessed from
 *
 * HOW IT WORKS:
 * -------------
 * IP addresses are assigned to organizations (ISPs, companies, etc.) in blocks.
 * Geolocation databases map these blocks to geographic locations.
 *
 * ACCURACY:
 * ---------
 * - Country: ~99% accurate
 * - City: ~80% accurate (can be off by tens of miles)
 * - VPNs/proxies may show wrong location
 *
 * DATA SOURCE:
 * ------------
 * ip-api.com - Free tier (150 requests/minute, no API key)
 * - Reliable and fast
 * - Returns city, country, timezone, coordinates
 * - Detects VPNs, proxies, hosting providers
 *
 * IMPORTANT NOTES:
 * ----------------
 * - Always use HTTPS for the API call (ip-api requires http for free tier)
 * - Cache results to avoid hitting rate limits
 * - Handle timeouts gracefully (don't block logins)
 * - Private IPs (192.168.x.x, 10.x.x.x) can't be geolocated
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import IPGeoCache from '../models/IPGeoCache.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Geolocation API endpoint
 * Using ip-api.com free tier (HTTP only for free, but we're server-side)
 * Fields requested: city, region, country, countryCode, timezone, lat, lon, isp, proxy, hosting
 */
const GEO_API_URL = 'http://ip-api.com/json';

/**
 * API request timeout in milliseconds
 * Set to 3 seconds to avoid blocking login if API is slow
 */
const GEO_TIMEOUT_MS = 3000;

/**
 * Fields to request from ip-api.com
 * See: https://ip-api.com/docs/api:json
 */
const GEO_FIELDS = [
  'status',
  'message',
  'city',
  'region',
  'country',
  'countryCode',
  'timezone',
  'lat',
  'lon',
  'isp',
  'proxy',     // VPN detection
  'hosting'    // Datacenter detection
].join(',');

// =============================================================================
// PRIVATE IP DETECTION
// =============================================================================

/**
 * Private IP address ranges that cannot be geolocated
 * These are reserved for local networks and don't have public location data
 */
const privateIPPatterns = [
  // IPv4 private ranges
  /^10\./,                    // 10.0.0.0 - 10.255.255.255
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0 - 172.31.255.255
  /^192\.168\./,              // 192.168.0.0 - 192.168.255.255
  /^127\./,                   // 127.0.0.0 - 127.255.255.255 (localhost)
  /^0\./,                     // 0.0.0.0/8
  /^169\.254\./,              // 169.254.0.0/16 (link-local)

  // IPv6 private/special ranges
  /^::1$/,                    // IPv6 localhost
  /^fe80:/i,                  // Link-local
  /^fc00:/i,                  // Unique local
  /^fd00:/i,                  // Unique local
  /^::ffff:127\./i,           // IPv4-mapped localhost
  /^::ffff:10\./i,            // IPv4-mapped private
  /^::ffff:192\.168\./i       // IPv4-mapped private
];

/**
 * isPrivateIP(ip)
 * ---------------
 * Check if an IP address is private/local and cannot be geolocated.
 *
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private/local
 */
export function isPrivateIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return true;  // Treat missing IP as private
  }

  return privateIPPatterns.some(pattern => pattern.test(ip));
}

// =============================================================================
// MAIN GEOLOCATION FUNCTION
// =============================================================================

/**
 * getLocationFromIP(ip, forceRefresh)
 * -----------------------------------
 * Get geographic location from an IP address.
 * Uses caching to avoid excessive API calls.
 *
 * @param {string} ip - IP address to look up
 * @param {boolean} forceRefresh - Skip cache and get fresh data (default: false)
 * @returns {Promise<Object>} Location data:
 *   - ip: The IP address
 *   - city: City name or null
 *   - region: State/province or null
 *   - country: Country name or null
 *   - countryCode: Two-letter country code or null
 *   - timezone: Timezone identifier or null
 *   - latitude: Latitude coordinate or null
 *   - longitude: Longitude coordinate or null
 *   - geoResolved: Boolean indicating if lookup succeeded
 *
 * EXAMPLE:
 * const location = await getLocationFromIP('8.8.8.8');
 * // Returns: { city: 'Mountain View', country: 'United States', countryCode: 'US', ... }
 *
 * BEHAVIOR:
 * - Private IPs return "Local Network" immediately
 * - Cached results are returned if available and not forcing refresh
 * - API calls have 3-second timeout to avoid blocking
 * - Errors return empty location (geoResolved: false)
 */
export async function getLocationFromIP(ip, forceRefresh = false) {
  // Default response for failures
  const emptyLocation = {
    ip,
    city: null,
    region: null,
    country: null,
    countryCode: null,
    timezone: null,
    latitude: null,
    longitude: null,
    geoResolved: false
  };

  // Handle missing IP
  if (!ip) {
    return emptyLocation;
  }

  // Handle private IPs (can't be geolocated)
  if (isPrivateIP(ip)) {
    return {
      ...emptyLocation,
      country: 'Local Network',
      geoResolved: false  // Not really resolved, just identified as local
    };
  }

  // Check cache unless forcing refresh
  if (!forceRefresh) {
    try {
      const cached = await IPGeoCache.getByIP(ip);
      if (cached) {
        return {
          ip,
          city: cached.city,
          region: cached.region,
          country: cached.country,
          countryCode: cached.countryCode,
          timezone: cached.timezone,
          latitude: cached.latitude,
          longitude: cached.longitude,
          geoResolved: true
        };
      }
    } catch (cacheError) {
      console.warn('[GEOIP] Cache lookup failed:', cacheError.message);
      // Continue to API call
    }
  }

  // Call geolocation API with timeout
  try {
    const url = `${GEO_API_URL}/${ip}?fields=${GEO_FIELDS}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // ip-api returns status: 'fail' for invalid IPs
    if (data.status === 'fail') {
      console.warn('[GEOIP] API returned fail:', data.message);
      return emptyLocation;
    }

    // Build location object
    const location = {
      ip,
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
      countryCode: data.countryCode || null,
      timezone: data.timezone || null,
      latitude: data.lat || null,
      longitude: data.lon || null,
      geoResolved: true
    };

    // Cache the result (don't await, fire and forget)
    IPGeoCache.cacheLocation(ip, {
      ...location,
      isp: data.isp,
      isVPN: data.proxy,
      isProxy: data.proxy,
      isHosting: data.hosting
    }).catch(err => {
      console.warn('[GEOIP] Failed to cache result:', err.message);
    });

    return location;

  } catch (error) {
    // Handle timeout specifically
    if (error.name === 'AbortError') {
      console.warn('[GEOIP] Request timed out after', GEO_TIMEOUT_MS, 'ms');
    } else {
      console.warn('[GEOIP] API call failed:', error.message);
    }

    return emptyLocation;
  }
}

/**
 * getLocationWithTimeout(ip, timeoutMs)
 * -------------------------------------
 * Get location with a custom timeout. Uses Promise.race for guaranteed timeout.
 * This is the function recommended for use in login flows.
 *
 * @param {string} ip - IP address to look up
 * @param {number} timeoutMs - Maximum time to wait (default: 3000)
 * @returns {Promise<Object>} Location data (same as getLocationFromIP)
 *
 * IMPORTANT:
 * This function NEVER throws. It always returns a location object
 * (with geoResolved: false if lookup failed).
 */
export async function getLocationWithTimeout(ip, timeoutMs = GEO_TIMEOUT_MS) {
  const emptyLocation = {
    ip,
    city: null,
    region: null,
    country: null,
    countryCode: null,
    timezone: null,
    latitude: null,
    longitude: null,
    geoResolved: false
  };

  // Handle private IPs without waiting
  if (isPrivateIP(ip)) {
    return {
      ...emptyLocation,
      country: 'Local Network'
    };
  }

  try {
    const geoPromise = getLocationFromIP(ip);
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...emptyLocation, _timeout: true });
      }, timeoutMs);
    });

    const result = await Promise.race([geoPromise, timeoutPromise]);

    if (result._timeout) {
      console.warn('[GEOIP] Lookup timed out after', timeoutMs, 'ms');
      return emptyLocation;
    }

    return result;

  } catch (error) {
    console.warn('[GEOIP] getLocationWithTimeout error:', error.message);
    return emptyLocation;
  }
}

// =============================================================================
// DISTANCE CALCULATION
// =============================================================================

/**
 * calculateDistance(lat1, lon1, lat2, lon2)
 * -----------------------------------------
 * Calculate the distance between two geographic points using the Haversine formula.
 * Used for "impossible travel" detection (e.g., login from NYC then Tokyo in 5 minutes).
 *
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 *
 * THE HAVERSINE FORMULA:
 * ----------------------
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere (the Earth). It accounts for the curvature of the Earth.
 *
 * EXAMPLE:
 * const distance = calculateDistance(40.7128, -74.0060, 35.6762, 139.6503);
 * // NYC to Tokyo = ~10,850 km
 *
 * IMPOSSIBLE TRAVEL:
 * If distance / time > max_speed (e.g., 1000 km/h for flights), it's suspicious.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate inputs
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;  // Can't calculate without coordinates
  }

  // Earth's radius in kilometers
  const R = 6371;

  // Convert degrees to radians
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;  // Distance in km
}

/**
 * isImpossibleTravel(location1, location2, timeDiffMs)
 * ----------------------------------------------------
 * Check if travel between two locations is impossible given the time difference.
 *
 * @param {Object} location1 - First location { latitude, longitude }
 * @param {Object} location2 - Second location { latitude, longitude }
 * @param {number} timeDiffMs - Time difference in milliseconds
 * @returns {Object|null} Result:
 *   - isPossible: boolean
 *   - distance: number (km)
 *   - requiredSpeed: number (km/h)
 *   - null if coordinates missing
 *
 * THRESHOLDS:
 * - < 100 km: Always possible (local travel)
 * - < 1000 km/h: Possible (fast plane)
 * - > 1000 km/h: Impossible travel detected
 */
export function isImpossibleTravel(location1, location2, timeDiffMs) {
  // Need coordinates for both locations
  if (!location1?.latitude || !location1?.longitude ||
      !location2?.latitude || !location2?.longitude) {
    return null;
  }

  const distance = calculateDistance(
    location1.latitude, location1.longitude,
    location2.latitude, location2.longitude
  );

  // If same location (< 100 km), it's always possible
  if (distance < 100) {
    return {
      isPossible: true,
      distance,
      requiredSpeed: 0
    };
  }

  // Calculate required speed
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // Avoid division by zero
  if (timeDiffHours <= 0) {
    return {
      isPossible: false,
      distance,
      requiredSpeed: Infinity
    };
  }

  const requiredSpeed = distance / timeDiffHours;

  // Max reasonable speed: 1000 km/h (fast commercial flight)
  const MAX_SPEED_KMH = 1000;

  return {
    isPossible: requiredSpeed <= MAX_SPEED_KMH,
    distance: Math.round(distance),
    requiredSpeed: Math.round(requiredSpeed)
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  getLocationFromIP,
  getLocationWithTimeout,
  isPrivateIP,
  calculateDistance,
  isImpossibleTravel
};
