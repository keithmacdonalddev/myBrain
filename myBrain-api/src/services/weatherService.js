/**
 * Weather Service - Fetches weather data from Open-Meteo API
 * Free API, no key required
 */

// Weather code to description mapping
const WEATHER_CODES = {
  0: { description: 'Clear sky', icon: 'sun' },
  1: { description: 'Mainly clear', icon: 'sun' },
  2: { description: 'Partly cloudy', icon: 'cloud-sun' },
  3: { description: 'Overcast', icon: 'cloud' },
  45: { description: 'Foggy', icon: 'cloud-fog' },
  48: { description: 'Depositing rime fog', icon: 'cloud-fog' },
  51: { description: 'Light drizzle', icon: 'cloud-drizzle' },
  53: { description: 'Moderate drizzle', icon: 'cloud-drizzle' },
  55: { description: 'Dense drizzle', icon: 'cloud-drizzle' },
  56: { description: 'Light freezing drizzle', icon: 'cloud-drizzle' },
  57: { description: 'Dense freezing drizzle', icon: 'cloud-drizzle' },
  61: { description: 'Slight rain', icon: 'cloud-rain' },
  63: { description: 'Moderate rain', icon: 'cloud-rain' },
  65: { description: 'Heavy rain', icon: 'cloud-rain' },
  66: { description: 'Light freezing rain', icon: 'cloud-rain' },
  67: { description: 'Heavy freezing rain', icon: 'cloud-rain' },
  71: { description: 'Slight snow', icon: 'cloud-snow' },
  73: { description: 'Moderate snow', icon: 'cloud-snow' },
  75: { description: 'Heavy snow', icon: 'cloud-snow' },
  77: { description: 'Snow grains', icon: 'cloud-snow' },
  80: { description: 'Slight rain showers', icon: 'cloud-rain' },
  81: { description: 'Moderate rain showers', icon: 'cloud-rain' },
  82: { description: 'Violent rain showers', icon: 'cloud-rain' },
  85: { description: 'Slight snow showers', icon: 'cloud-snow' },
  86: { description: 'Heavy snow showers', icon: 'cloud-snow' },
  95: { description: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { description: 'Thunderstorm with slight hail', icon: 'cloud-lightning' },
  99: { description: 'Thunderstorm with heavy hail', icon: 'cloud-lightning' },
};

/**
 * Extract searchable location parts from a full address
 * Returns array of search terms to try, from most specific to least
 */
function extractLocationParts(fullAddress) {
  const parts = [];

  // Split by comma and clean up
  const segments = fullAddress.split(',').map(s => s.trim()).filter(Boolean);

  // Try different combinations
  // Skip street addresses (usually first segment with numbers)
  const cityIndex = segments.findIndex(s => !/^\d/.test(s) && !/\d{5}/.test(s));

  if (cityIndex >= 0 && segments.length > cityIndex) {
    // Try city + province/state + country
    if (segments.length > cityIndex + 2) {
      parts.push(segments.slice(cityIndex, cityIndex + 3).join(', '));
    }
    // Try city + province/state
    if (segments.length > cityIndex + 1) {
      parts.push(segments.slice(cityIndex, cityIndex + 2).join(', '));
    }
    // Try just the city
    parts.push(segments[cityIndex]);
  }

  // Also try segments that look like city names (no numbers, reasonable length)
  segments.forEach(seg => {
    const cleaned = seg.replace(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/gi, '').trim(); // Remove postal codes
    if (cleaned && !/^\d/.test(cleaned) && cleaned.length > 2 && cleaned.length < 50) {
      if (!parts.includes(cleaned)) {
        parts.push(cleaned);
      }
    }
  });

  return parts;
}

/**
 * Try to geocode with Open-Meteo API
 */
async function tryGeocode(searchTerm) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      country: result.country,
      admin1: result.admin1,
    };
  } catch (error) {
    console.error('Geocoding attempt failed:', error);
    return null;
  }
}

/**
 * Get coordinates from location name using Open-Meteo Geocoding API
 * Handles full addresses by extracting city names
 */
async function geocodeLocation(locationName) {
  if (!locationName) return null;

  // First, try the full location as-is
  let result = await tryGeocode(locationName);
  if (result) return result;

  // If that fails, try extracting parts (city, state, etc.)
  const parts = extractLocationParts(locationName);

  for (const part of parts) {
    result = await tryGeocode(part);
    if (result) {
      console.log(`Geocoded "${locationName}" using "${part}"`);
      return result;
    }
  }

  console.log(`Failed to geocode: "${locationName}"`);
  return null;
}

/**
 * Get weather data for coordinates
 */
async function getWeatherByCoordinates(latitude, longitude, units = 'metric') {
  try {
    const temperatureUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const windSpeedUnit = units === 'imperial' ? 'mph' : 'kmh';

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
      `&temperature_unit=${temperatureUnit}` +
      `&wind_speed_unit=${windSpeedUnit}` +
      `&timezone=auto` +
      `&forecast_days=7`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Weather API error:', error);
    throw error;
  }
}

/**
 * Format weather data for frontend consumption
 */
function formatWeatherData(rawData, locationInfo) {
  const current = rawData.current;
  const daily = rawData.daily;
  const hourly = rawData.hourly;

  const weatherInfo = WEATHER_CODES[current.weather_code] || { description: 'Unknown', icon: 'cloud' };

  // Get next 24 hours of hourly data
  const now = new Date();
  const hourlyForecast = [];
  for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
    const hourTime = new Date(hourly.time[i]);
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

  // Format daily forecast
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

  return {
    location: {
      name: locationInfo?.name || 'Unknown',
      country: locationInfo?.country || '',
      admin1: locationInfo?.admin1 || '',
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      timezone: rawData.timezone,
    },
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
    hourly: hourlyForecast.slice(0, 24),
    daily: dailyForecast,
    units: {
      temperature: rawData.current_units?.temperature_2m || '°C',
      windSpeed: rawData.current_units?.wind_speed_10m || 'km/h',
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get weather for a location (by name or coordinates)
 */
async function getWeather(location, units = 'metric') {
  let coordinates;
  let locationInfo;

  if (typeof location === 'object' && location.latitude && location.longitude) {
    // Coordinates provided directly
    coordinates = { latitude: location.latitude, longitude: location.longitude };
    locationInfo = location;
  } else if (typeof location === 'string') {
    // Location name - need to geocode
    locationInfo = await geocodeLocation(location);
    if (!locationInfo) {
      throw new Error('Location not found');
    }
    coordinates = { latitude: locationInfo.latitude, longitude: locationInfo.longitude };
  } else {
    throw new Error('Invalid location format');
  }

  const rawData = await getWeatherByCoordinates(coordinates.latitude, coordinates.longitude, units);
  return formatWeatherData(rawData, locationInfo);
}

export default {
  getWeather,
  geocodeLocation,
  getWeatherByCoordinates,
  WEATHER_CODES,
};
