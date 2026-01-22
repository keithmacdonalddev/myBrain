/**
 * =============================================================================
 * WEATHERSERVICE.JS - Weather Data Fetching Service
 * =============================================================================
 *
 * This service handles fetching weather data from the Open-Meteo API.
 * It provides current conditions, hourly forecasts, and daily forecasts.
 *
 * WHAT IS OPEN-METEO?
 * -------------------
 * Open-Meteo is a FREE weather API that doesn't require an API key.
 * It provides accurate weather forecasts globally using data from
 * multiple national weather services.
 *
 * WHY OPEN-METEO?
 * ---------------
 * 1. FREE: No cost, no API key required
 * 2. GLOBAL: Coverage for any location worldwide
 * 3. RELIABLE: Data from official weather services
 * 4. DETAILED: Current, hourly, and daily forecasts
 *
 * KEY FEATURES:
 * -------------
 * 1. GEOCODING: Convert location names to coordinates
 * 2. CURRENT WEATHER: Temperature, humidity, conditions
 * 3. HOURLY FORECAST: 24-hour outlook
 * 4. DAILY FORECAST: 7-day outlook
 * 5. UNIT CONVERSION: Metric and imperial support
 *
 * WEATHER CODES:
 * --------------
 * Open-Meteo uses numeric codes for weather conditions (0-99).
 * This service maps codes to human-readable descriptions and icons.
 *
 * DATA FLOW:
 * ----------
 * 1. User provides location (name or coordinates)
 * 2. If name, geocode to get coordinates
 * 3. Fetch weather data from Open-Meteo
 * 4. Format data for frontend consumption
 *
 * =============================================================================
 */

// =============================================================================
// CONSOLE LOGGING FOR EXTERNAL API CALLS
// =============================================================================
/**
 * Import logging utilities from requestLogger for consistent style.
 * External API calls use [EXT] prefix to distinguish from HTTP/WebSocket logs.
 */
import { colors, LOG_LEVEL, LOG_LEVELS } from '../middleware/requestLogger.js';

/**
 * logExternalApi(eventName, data) - Log External API Calls to Console
 * ====================================================================
 * Prints external API calls to the terminal with the same style as HTTP
 * and WebSocket logging. Events are prefixed with [EXT] to distinguish them.
 *
 * WHAT THIS LOGS:
 * - API calls to Open-Meteo (geocoding and weather)
 * - Duration of each call
 * - Success or failure status
 * - Error details (if any)
 *
 * WHY LOG EXTERNAL CALLS?
 * ----------------------
 * 1. VISIBILITY: See when external APIs are called
 * 2. DEBUGGING: Identify slow or failing API calls
 * 3. MONITORING: Track external service health
 *
 * EXAMPLE OUTPUT:
 * [EXT] weather.geocode
 *   location: "New York, NY"
 *
 * [EXT] weather.geocode.success (234ms)
 *   location: "New York, NY"
 *   result: latitude=40.71, longitude=-74.01
 *
 * @param {string} eventName - Name of the external API event
 * @param {Object} data - Event data containing:
 *   - location: Location being searched
 *   - durationMs: Time taken (for success/error events)
 *   - error: Error message (if any)
 *   - result: Brief description of result
 */
function logExternalApi(eventName, data = {}) {
  // Check log level
  const level = LOG_LEVELS[LOG_LEVEL] || 0;
  if (level === 0) return;

  const { location, durationMs, error, result } = data;
  const errorTag = error ? ` ${colors.red}[ERROR]${colors.reset}` : '';
  const durationTag = durationMs ? ` ${colors.dim}(${durationMs}ms)${colors.reset}` : '';

  // Level 1 (minimal): Just the event name
  console.log(`${colors.cyan}[EXT]${colors.reset} ${eventName}${durationTag}${errorTag}`);

  if (level < 2) return;

  // Level 2 (normal): Add location and result
  if (location) {
    console.log(`${colors.dim}  location: "${location}"${colors.reset}`);
  }
  if (result) {
    console.log(`${colors.dim}  result: ${result}${colors.reset}`);
  }

  if (level < 3) return;

  // Level 3 (verbose): Add error details
  if (error) {
    console.log(`${colors.red}  error: ${error}${colors.reset}`);
  }

  // Blank line for readability
  console.log('');
}

// =============================================================================
// WEATHER CODE MAPPING
// =============================================================================

/**
 * WEATHER_CODES
 * -------------
 * Maps Open-Meteo weather codes to descriptions and icon names.
 *
 * WEATHER CODE RANGES:
 * - 0-3: Clear to cloudy
 * - 45-48: Fog
 * - 51-57: Drizzle
 * - 61-67: Rain
 * - 71-77: Snow
 * - 80-86: Showers
 * - 95-99: Thunderstorms
 *
 * ICON NAMES:
 * Icons are Lucide icon names used in the frontend:
 * - sun: Clear sky
 * - cloud-sun: Partly cloudy
 * - cloud: Overcast
 * - cloud-fog: Foggy
 * - cloud-drizzle: Light precipitation
 * - cloud-rain: Rain
 * - cloud-snow: Snow
 * - cloud-lightning: Thunderstorm
 */
const WEATHER_CODES = {
  // Clear conditions (0-3)
  0: { description: 'Clear sky', icon: 'sun' },
  1: { description: 'Mainly clear', icon: 'sun' },
  2: { description: 'Partly cloudy', icon: 'cloud-sun' },
  3: { description: 'Overcast', icon: 'cloud' },

  // Fog (45-48)
  45: { description: 'Foggy', icon: 'cloud-fog' },
  48: { description: 'Depositing rime fog', icon: 'cloud-fog' },

  // Drizzle (51-57)
  51: { description: 'Light drizzle', icon: 'cloud-drizzle' },
  53: { description: 'Moderate drizzle', icon: 'cloud-drizzle' },
  55: { description: 'Dense drizzle', icon: 'cloud-drizzle' },
  56: { description: 'Light freezing drizzle', icon: 'cloud-drizzle' },
  57: { description: 'Dense freezing drizzle', icon: 'cloud-drizzle' },

  // Rain (61-67)
  61: { description: 'Slight rain', icon: 'cloud-rain' },
  63: { description: 'Moderate rain', icon: 'cloud-rain' },
  65: { description: 'Heavy rain', icon: 'cloud-rain' },
  66: { description: 'Light freezing rain', icon: 'cloud-rain' },
  67: { description: 'Heavy freezing rain', icon: 'cloud-rain' },

  // Snow (71-77)
  71: { description: 'Slight snow', icon: 'cloud-snow' },
  73: { description: 'Moderate snow', icon: 'cloud-snow' },
  75: { description: 'Heavy snow', icon: 'cloud-snow' },
  77: { description: 'Snow grains', icon: 'cloud-snow' },

  // Showers (80-86)
  80: { description: 'Slight rain showers', icon: 'cloud-rain' },
  81: { description: 'Moderate rain showers', icon: 'cloud-rain' },
  82: { description: 'Violent rain showers', icon: 'cloud-rain' },
  85: { description: 'Slight snow showers', icon: 'cloud-snow' },
  86: { description: 'Heavy snow showers', icon: 'cloud-snow' },

  // Thunderstorms (95-99)
  95: { description: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { description: 'Thunderstorm with slight hail', icon: 'cloud-lightning' },
  99: { description: 'Thunderstorm with heavy hail', icon: 'cloud-lightning' },
};

// =============================================================================
// LOCATION PARSING
// =============================================================================

/**
 * extractLocationParts(fullAddress)
 * ---------------------------------
 * Extracts searchable location parts from a full address.
 * Returns an array of search terms to try, from most specific to least.
 *
 * @param {string} fullAddress - Full address string
 *   Example: "123 Main St, New York, NY, 10001, USA"
 *
 * @returns {Array} Array of search terms to try
 *   Example: ["New York, NY, USA", "New York, NY", "New York"]
 *
 * WHY THIS IS NEEDED:
 * -------------------
 * Users might enter full addresses, but the geocoding API works
 * better with just city names. This function extracts the city
 * and progressively less specific parts to try.
 *
 * EXTRACTION LOGIC:
 * 1. Split address by commas
 * 2. Skip segments that look like street addresses (start with numbers)
 * 3. Skip postal codes
 * 4. Try combinations of city + state + country, city + state, just city
 *
 * EXAMPLE:
 * "123 Oak Ave, San Francisco, CA, 94102, USA" →
 * ["San Francisco, CA, USA", "San Francisco, CA", "San Francisco"]
 */
function extractLocationParts(fullAddress) {
  const parts = [];

  // Split by comma and clean up whitespace
  const segments = fullAddress.split(',').map(s => s.trim()).filter(Boolean);

  // Find the city - skip segments that start with numbers (street addresses)
  // or contain postal codes (5-digit numbers)
  const cityIndex = segments.findIndex(s => !/^\d/.test(s) && !/\d{5}/.test(s));

  if (cityIndex >= 0 && segments.length > cityIndex) {
    // Try city + state + country
    if (segments.length > cityIndex + 2) {
      parts.push(segments.slice(cityIndex, cityIndex + 3).join(', '));
    }
    // Try city + state
    if (segments.length > cityIndex + 1) {
      parts.push(segments.slice(cityIndex, cityIndex + 2).join(', '));
    }
    // Try just the city
    parts.push(segments[cityIndex]);
  }

  // Also try individual segments that look like city names
  // (no numbers, reasonable length)
  segments.forEach(seg => {
    // Remove postal codes (like "A1B 2C3" for Canadian)
    const cleaned = seg.replace(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/gi, '').trim();

    // Check if it could be a city name
    if (cleaned && !/^\d/.test(cleaned) && cleaned.length > 2 && cleaned.length < 50) {
      if (!parts.includes(cleaned)) {
        parts.push(cleaned);
      }
    }
  });

  return parts;
}

// =============================================================================
// GEOCODING
// =============================================================================

/**
 * tryGeocode(searchTerm)
 * ----------------------
 * Attempts to geocode a single search term.
 *
 * @param {string} searchTerm - Location name to search for
 *
 * @returns {Object|null} Geocoding result or null if not found
 *   - latitude: Latitude coordinate
 *   - longitude: Longitude coordinate
 *   - name: Location name
 *   - country: Country name
 *   - admin1: State/province/region
 *
 * API USED:
 * Open-Meteo Geocoding API
 * https://geocoding-api.open-meteo.com/v1/search
 */
async function tryGeocode(searchTerm) {
  const startTime = Date.now();

  try {
    // Log the geocoding attempt
    logExternalApi('weather.geocode', { location: searchTerm });

    // Call Open-Meteo geocoding API
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`
    );

    const durationMs = Date.now() - startTime;

    // Check for HTTP errors
    if (!response.ok) {
      logExternalApi('weather.geocode.error', {
        location: searchTerm,
        durationMs,
        error: `HTTP ${response.status}`
      });
      return null;
    }

    const data = await response.json();

    // No results found
    if (!data.results || data.results.length === 0) {
      logExternalApi('weather.geocode.notfound', {
        location: searchTerm,
        durationMs,
        result: 'No results'
      });
      return null;
    }

    // Return first (best) result
    const result = data.results[0];

    logExternalApi('weather.geocode.success', {
      location: searchTerm,
      durationMs,
      result: `lat=${result.latitude.toFixed(2)}, lon=${result.longitude.toFixed(2)}`
    });

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      country: result.country,
      admin1: result.admin1,  // State/province
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logExternalApi('weather.geocode.error', {
      location: searchTerm,
      durationMs,
      error: error.message
    });
    return null;
  }
}

/**
 * geocodeLocation(locationName)
 * -----------------------------
 * Gets coordinates from a location name.
 * Handles full addresses by extracting city names.
 *
 * @param {string} locationName - Location name or address
 *
 * @returns {Object|null} Geocoding result or null if not found
 *
 * SEARCH STRATEGY:
 * 1. First try the full location string as-is
 * 2. If that fails, extract parts and try each one
 * 3. Stop at the first successful match
 *
 * This progressive approach handles various input formats:
 * - "New York" → Direct match
 * - "New York, NY" → Direct match
 * - "123 Main St, New York, NY 10001" → Extracts "New York, NY"
 */
async function geocodeLocation(locationName) {
  // Handle empty input
  if (!locationName) return null;

  // First, try the full location as-is
  let result = await tryGeocode(locationName);
  if (result) return result;

  // If that fails, try extracting parts (city, state, etc.)
  const parts = extractLocationParts(locationName);

  // Try each extracted part until one works
  for (const part of parts) {
    result = await tryGeocode(part);
    if (result) {
      console.log(`Geocoded "${locationName}" using "${part}"`);
      return result;
    }
  }

  // Nothing worked
  console.log(`Failed to geocode: "${locationName}"`);
  return null;
}

// =============================================================================
// WEATHER DATA FETCHING
// =============================================================================

/**
 * getWeatherByCoordinates(latitude, longitude, units)
 * ---------------------------------------------------
 * Fetches weather data for specific coordinates.
 *
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} units - 'metric' or 'imperial' (default: 'metric')
 *
 * @returns {Object} Raw weather data from Open-Meteo API
 *
 * DATA REQUESTED:
 * - CURRENT: Temperature, humidity, feels like, weather code, wind
 * - HOURLY: Temperature, weather code, precipitation probability
 * - DAILY: High/low temps, weather code, precipitation, sunrise/sunset
 *
 * API PARAMETERS:
 * - latitude/longitude: Location coordinates
 * - temperature_unit: celsius or fahrenheit
 * - wind_speed_unit: kmh or mph
 * - timezone: auto (uses location's timezone)
 * - forecast_days: 7 (week forecast)
 */
async function getWeatherByCoordinates(latitude, longitude, units = 'metric') {
  const startTime = Date.now();
  const coordStr = `lat=${latitude.toFixed(2)}, lon=${longitude.toFixed(2)}`;

  try {
    // Log the weather fetch attempt
    logExternalApi('weather.forecast', {
      location: coordStr
    });

    // Set units based on preference
    const temperatureUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const windSpeedUnit = units === 'imperial' ? 'mph' : 'kmh';

    // Build API URL with all required parameters
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}&longitude=${longitude}` +
      // Current conditions
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m` +
      // Hourly forecast
      `&hourly=temperature_2m,weather_code,precipitation_probability` +
      // Daily forecast
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
      // Units and settings
      `&temperature_unit=${temperatureUnit}` +
      `&wind_speed_unit=${windSpeedUnit}` +
      `&timezone=auto` +       // Use location's timezone
      `&forecast_days=7`       // 7-day forecast
    );

    const durationMs = Date.now() - startTime;

    // Check for HTTP errors
    if (!response.ok) {
      logExternalApi('weather.forecast.error', {
        location: coordStr,
        durationMs,
        error: `HTTP ${response.status}`
      });
      throw new Error('Weather API request failed');
    }

    // Return raw data
    const data = await response.json();

    logExternalApi('weather.forecast.success', {
      location: coordStr,
      durationMs,
      result: `${data.current?.temperature_2m}° ${data.timezone || ''}`
    });

    return data;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logExternalApi('weather.forecast.error', {
      location: coordStr,
      durationMs,
      error: error.message
    });
    throw error;
  }
}

// =============================================================================
// DATA FORMATTING
// =============================================================================

/**
 * formatWeatherData(rawData, locationInfo)
 * ----------------------------------------
 * Formats raw API data into a clean structure for the frontend.
 *
 * @param {Object} rawData - Raw data from Open-Meteo API
 * @param {Object} locationInfo - Location details from geocoding
 *
 * @returns {Object} Formatted weather data
 *
 * RETURNED STRUCTURE:
 * ```javascript
 * {
 *   location: {
 *     name: 'New York',
 *     country: 'United States',
 *     admin1: 'New York',
 *     latitude: 40.7128,
 *     longitude: -74.0060,
 *     timezone: 'America/New_York'
 *   },
 *   current: {
 *     temperature: 72,
 *     feelsLike: 74,
 *     humidity: 65,
 *     windSpeed: 8,
 *     windDirection: 180,
 *     weatherCode: 2,
 *     description: 'Partly cloudy',
 *     icon: 'cloud-sun'
 *   },
 *   hourly: [
 *     { time: '2024-01-15T14:00', temperature: 72, ... },
 *     // ... 24 hours
 *   ],
 *   daily: [
 *     { date: '2024-01-15', temperatureMax: 75, temperatureMin: 55, ... },
 *     // ... 7 days
 *   ],
 *   units: {
 *     temperature: '°F',
 *     windSpeed: 'mph'
 *   },
 *   lastUpdated: '2024-01-15T12:00:00Z'
 * }
 * ```
 */
function formatWeatherData(rawData, locationInfo) {
  // Extract raw data sections
  const current = rawData.current;
  const daily = rawData.daily;
  const hourly = rawData.hourly;

  // Get weather description and icon for current conditions
  const weatherInfo = WEATHER_CODES[current.weather_code] || { description: 'Unknown', icon: 'cloud' };

  // =========================================================================
  // FORMAT HOURLY FORECAST
  // =========================================================================
  // Get next 24 hours of hourly data

  const now = new Date();
  const hourlyForecast = [];

  for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
    const hourTime = new Date(hourly.time[i]);

    // Include hours from now onwards (or fill up to 24)
    if (hourTime >= now || i < 24) {
      const hourWeather = WEATHER_CODES[hourly.weather_code[i]] || { description: 'Unknown', icon: 'cloud' };

      hourlyForecast.push({
        time: hourly.time[i],
        temperature: Math.round(hourly.temperature_2m[i]),
        precipitationProbability: hourly.precipitation_probability[i],
        weatherCode: hourly.weather_code[i],
        icon: hourWeather.icon,
        description: hourWeather.description,
      });
    }
  }

  // =========================================================================
  // FORMAT DAILY FORECAST
  // =========================================================================
  // Format 7-day forecast

  const dailyForecast = daily.time.map((date, index) => {
    const dayWeather = WEATHER_CODES[daily.weather_code[index]] || { description: 'Unknown', icon: 'cloud' };

    return {
      date: date,
      temperatureMax: Math.round(daily.temperature_2m_max[index]),
      temperatureMin: Math.round(daily.temperature_2m_min[index]),
      precipitationProbability: daily.precipitation_probability_max[index],
      weatherCode: daily.weather_code[index],
      icon: dayWeather.icon,
      description: dayWeather.description,
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
    };
  });

  // =========================================================================
  // RETURN FORMATTED DATA
  // =========================================================================

  return {
    // Location information
    location: {
      name: locationInfo?.name || 'Unknown',
      country: locationInfo?.country || '',
      admin1: locationInfo?.admin1 || '',
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      timezone: rawData.timezone,
    },

    // Current conditions
    current: {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
    },

    // Forecasts
    hourly: hourlyForecast.slice(0, 24),  // Ensure max 24 hours
    daily: dailyForecast,

    // Units for display
    units: {
      temperature: rawData.current_units?.temperature_2m || '°C',
      windSpeed: rawData.current_units?.wind_speed_10m || 'km/h',
    },

    // Timestamp
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// MAIN WEATHER FUNCTION
// =============================================================================

/**
 * getWeather(location, units)
 * ---------------------------
 * Main function to get weather for a location.
 * Accepts either a location name or coordinates.
 *
 * @param {string|Object} location - Location to get weather for
 *   - String: Location name (e.g., "New York")
 *   - Object: { latitude, longitude, name?, country? }
 * @param {string} units - 'metric' or 'imperial' (default: 'metric')
 *
 * @returns {Object} Formatted weather data
 *
 * EXAMPLES:
 * ```javascript
 * // By name
 * const weather = await getWeather('New York', 'imperial');
 *
 * // By coordinates
 * const weather = await getWeather({
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   name: 'New York'
 * }, 'metric');
 * ```
 *
 * THROWS:
 * - Error('Location not found') - If geocoding fails
 * - Error('Invalid location format') - If location param is invalid
 */
async function getWeather(location, units = 'metric') {
  let coordinates;
  let locationInfo;

  // =========================================================================
  // PARSE LOCATION INPUT
  // =========================================================================

  if (typeof location === 'object' && location.latitude && location.longitude) {
    // Coordinates provided directly - use them
    coordinates = { latitude: location.latitude, longitude: location.longitude };
    locationInfo = location;
  } else if (typeof location === 'string') {
    // Location name provided - need to geocode
    locationInfo = await geocodeLocation(location);

    if (!locationInfo) {
      throw new Error('Location not found');
    }

    coordinates = { latitude: locationInfo.latitude, longitude: locationInfo.longitude };
  } else {
    throw new Error('Invalid location format');
  }

  // =========================================================================
  // FETCH AND FORMAT DATA
  // =========================================================================

  const rawData = await getWeatherByCoordinates(coordinates.latitude, coordinates.longitude, units);
  return formatWeatherData(rawData, locationInfo);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export weather service functions.
 *
 * USAGE:
 * ```javascript
 * import weatherService from './services/weatherService.js';
 *
 * // Get weather by location name
 * const weather = await weatherService.getWeather('London', 'metric');
 *
 * // Get weather by coordinates
 * const weather = await weatherService.getWeather({
 *   latitude: 51.5074,
 *   longitude: -0.1278
 * });
 *
 * // Access weather codes mapping
 * const description = weatherService.WEATHER_CODES[2].description; // 'Partly cloudy'
 * ```
 */
export default {
  getWeather,
  geocodeLocation,
  getWeatherByCoordinates,
  WEATHER_CODES,
};
