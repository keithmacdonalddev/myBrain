/**
 * =============================================================================
 * IPGEOCACHE.JS - IP Geolocation Cache Model
 * =============================================================================
 *
 * This file defines the IPGeoCache model - a cache for IP address geolocation
 * lookups. Instead of calling external geolocation APIs every time, we store
 * the results and reuse them for subsequent requests from the same IP.
 *
 * WHY CACHE IP GEOLOCATION?
 * -------------------------
 * 1. RATE LIMITS: Free geolocation APIs have request limits (e.g., 150/min)
 * 2. SPEED: Database lookup is much faster than external API call
 * 3. RELIABILITY: Cached data works even if geolocation API is down
 * 4. COST: Reduces API calls if using a paid service
 *
 * HOW IT WORKS:
 * -------------
 * 1. User logs in from IP address 1.2.3.4
 * 2. Check IPGeoCache for this IP
 * 3. If found and recent: Use cached location
 * 4. If not found: Call geolocation API, store result
 * 5. Cached results auto-expire after 30 days (IPs can be reassigned)
 *
 * DATA SOURCE:
 * ------------
 * Primary: ip-api.com (free tier: 150 req/min, no API key needed)
 * The cache stores responses from this service.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// IP GEOLOCATION CACHE SCHEMA
// =============================================================================

const ipGeoCacheSchema = new mongoose.Schema({

  /**
   * ip: The IP address this cache entry is for
   * - Required: Every cache entry must have an IP
   * - Unique: One cache entry per IP address
   * - Index: Fast lookup by IP
   *
   * EXAMPLES: "192.168.1.1", "2001:0db8:85a3::8a2e:0370:7334"
   */
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  /**
   * city: City name from geolocation
   * EXAMPLES: "New York", "London", "Tokyo"
   */
  city: String,

  /**
   * region: State/province/region
   * EXAMPLES: "California", "Ontario", "England"
   */
  region: String,

  /**
   * country: Full country name
   * EXAMPLES: "United States", "Canada", "Japan"
   */
  country: String,

  /**
   * countryCode: Two-letter country code (ISO 3166-1 alpha-2)
   * EXAMPLES: "US", "CA", "JP", "GB"
   */
  countryCode: String,

  /**
   * timezone: Timezone identifier
   * EXAMPLES: "America/New_York", "Europe/London", "Asia/Tokyo"
   */
  timezone: String,

  /**
   * latitude: Geographic latitude
   * - Range: -90 to 90
   * - Used for impossible travel detection
   */
  latitude: Number,

  /**
   * longitude: Geographic longitude
   * - Range: -180 to 180
   * - Used for impossible travel detection
   */
  longitude: Number,

  /**
   * isp: Internet Service Provider name
   * EXAMPLES: "Comcast", "AT&T", "Verizon"
   */
  isp: String,

  /**
   * isVPN: Whether the IP is detected as a VPN
   * - May indicate privacy-conscious user or suspicious activity
   */
  isVPN: Boolean,

  /**
   * isProxy: Whether the IP is detected as a proxy
   * - May indicate attempt to hide real location
   */
  isProxy: Boolean,

  /**
   * isHosting: Whether the IP belongs to a hosting/datacenter
   * - Datacenter IPs are often bots or automated systems
   */
  isHosting: Boolean,

  /**
   * source: Which geolocation service provided this data
   * - Useful if we switch providers or use multiple
   */
  source: {
    type: String,
    default: 'ip-api'
  },

  /**
   * resolvedAt: When the geolocation was resolved
   * - Used for TTL index (auto-cleanup)
   * - Helps track data freshness
   */
  resolvedAt: {
    type: Date,
    default: Date.now
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the document was created
   * - updatedAt: When the document was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * TTL Index for Automatic Cleanup
 * -------------------------------
 * Automatically delete cache entries after 30 days.
 * IPs can be reassigned, so we don't want stale location data.
 *
 * 30 days is a good balance:
 * - Long enough to reduce API calls significantly
 * - Short enough that reassigned IPs get updated
 */
const CACHE_TTL_DAYS = 30;
ipGeoCacheSchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: CACHE_TTL_DAYS * 24 * 60 * 60 }
);

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getByIP(ip)
 * -----------
 * Get cached geolocation data for an IP address.
 *
 * @param {string} ip - IP address to look up
 * @returns {Promise<Object|null>} - Cached geo data or null
 *
 * EXAMPLE:
 * const cached = await IPGeoCache.getByIP('1.2.3.4');
 * if (cached) {
 *   console.log(`Location: ${cached.city}, ${cached.country}`);
 * }
 */
ipGeoCacheSchema.statics.getByIP = async function(ip) {
  return this.findOne({ ip }).lean();
};

/**
 * cacheLocation(ip, locationData)
 * -------------------------------
 * Store geolocation data for an IP address.
 * Uses upsert to handle both new entries and updates.
 *
 * @param {string} ip - IP address
 * @param {Object} locationData - Geolocation data to cache
 * @returns {Promise<Object>} - The cached document
 *
 * EXAMPLE:
 * await IPGeoCache.cacheLocation('1.2.3.4', {
 *   city: 'New York',
 *   region: 'New York',
 *   country: 'United States',
 *   countryCode: 'US',
 *   timezone: 'America/New_York',
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   isp: 'Comcast'
 * });
 */
ipGeoCacheSchema.statics.cacheLocation = async function(ip, locationData) {
  return this.findOneAndUpdate(
    { ip },
    {
      $set: {
        ip,
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        countryCode: locationData.countryCode,
        timezone: locationData.timezone,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        isp: locationData.isp,
        isVPN: locationData.isVPN,
        isProxy: locationData.isProxy,
        isHosting: locationData.isHosting,
        source: locationData.source || 'ip-api',
        resolvedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
};

/**
 * invalidate(ip)
 * --------------
 * Remove cached data for an IP address.
 * Used when we know the cache is stale or want fresh data.
 *
 * @param {string} ip - IP address to invalidate
 * @returns {Promise<Object>} - Delete result
 */
ipGeoCacheSchema.statics.invalidate = async function(ip) {
  return this.deleteOne({ ip });
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the IPGeoCache model from the schema.
 *
 * USAGE:
 * - IPGeoCache.getByIP(ip) - Check cache
 * - IPGeoCache.cacheLocation(ip, data) - Store result
 * - IPGeoCache.invalidate(ip) - Force refresh
 *
 * IMPORTANT:
 * - Cache entries auto-delete after 30 days
 * - Always have a fallback if cache returns null
 */
const IPGeoCache = mongoose.model('IPGeoCache', ipGeoCacheSchema);

export default IPGeoCache;
