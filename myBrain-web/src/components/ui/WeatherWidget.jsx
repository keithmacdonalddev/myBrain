import { useState } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  Trash2,
  Settings
} from 'lucide-react';
import {
  useWeather,
  useWeatherLocations,
  useAddWeatherLocation,
  useRemoveWeatherLocation,
} from '../../hooks/useWeather';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { Link } from 'react-router-dom';

// Map weather icon names to Lucide icons
const WEATHER_ICONS = {
  'sun': Sun,
  'cloud': Cloud,
  'cloud-sun': CloudSun,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'cloud-lightning': CloudLightning,
  'cloud-drizzle': CloudDrizzle,
  'cloud-fog': CloudFog,
};

function WeatherIcon({ icon, className = "w-6 h-6" }) {
  const IconComponent = WEATHER_ICONS[icon] || Cloud;
  return <IconComponent className={className} />;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
}

function formatDay(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString([], { weekday: 'short' });
}

// Add Location Modal
function AddLocationModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const addMutation = useAddWeatherLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;

    try {
      await addMutation.mutateAsync({ name: name.trim(), location: location.trim() });
      onAdd?.();
      onClose();
    } catch (err) {
      // Error is shown via mutation state
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel border border-border rounded-xl shadow-theme-2xl z-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Add Weather Location</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home, Office, Vacation"
              autoFocus
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Toronto, Ontario"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted mt-1">Use city name for best results</p>
          </div>

          {addMutation.error && (
            <p className="text-sm text-danger">
              {addMutation.error?.response?.data?.error || addMutation.error?.message || 'Failed to add location'}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !location.trim() || addMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Manage Locations Modal
function ManageLocationsModal({ locations, onClose }) {
  const removeMutation = useRemoveWeatherLocation();

  const handleRemove = async (id) => {
    if (id === 'profile') return; // Can't remove profile location
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel border border-border rounded-xl shadow-theme-2xl z-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Weather Locations</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {locations.map((loc, index) => (
            <div
              key={loc._id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                loc.isProfileLocation ? 'bg-primary/10 border border-primary/20' : 'bg-bg'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text truncate">{loc.name}</span>
                  {loc.isProfileLocation && (
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-medium rounded">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted truncate">{loc.location}</div>
              </div>
              {!loc.isProfileLocation && (
                <button
                  onClick={() => handleRemove(loc._id)}
                  disabled={removeMutation.isPending}
                  className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted mt-3">
          Your profile location is always the default. Change it in Profile Settings.
        </p>

        <button
          onClick={onClose}
          className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          Done
        </button>
      </div>
    </>
  );
}

function WeatherWidget({ units = 'metric', compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  // Check if weather feature is enabled
  const weatherEnabled = useFeatureFlag('weatherEnabled');

  // If weather is not enabled, don't render anything
  if (!weatherEnabled) {
    return null;
  }

  // Get saved weather locations
  const { data: locations = [], isLoading: locationsLoading } = useWeatherLocations();

  // Get current location to show weather for
  const currentLocation = locations[currentIndex];
  const locationQuery = currentLocation?.location || null;

  // Fetch weather for current location
  const { data: weather, isLoading, error, refetch, isRefetching } = useWeather(locationQuery, units);

  // Navigate between locations
  const goToNext = () => {
    if (locations.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % locations.length);
    }
  };

  const goToPrev = () => {
    if (locations.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + locations.length) % locations.length);
    }
  };

  // Handle location added - go to the new location
  const handleLocationAdded = () => {
    // After adding, the new location will be at the end
    setCurrentIndex(locations.length); // Will be valid after refetch
  };

  if (locationsLoading || isLoading) {
    return (
      <div className="bg-panel border border-border rounded-xl p-4 shadow-theme-card">
        <div className="flex items-center justify-center gap-2 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMsg = error?.message || '';
    const isNoLocation = errorMsg.includes('No location') || errorMsg.includes('no default location');
    const isNotFound = errorMsg.includes('not found') || errorMsg.includes('Location not found');

    return (
      <div className="bg-panel border border-border rounded-xl p-4 shadow-theme-card">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-muted mt-0.5" />
          <div className="flex-1 min-w-0">
            {isNoLocation ? (
              <div>
                <p className="text-sm text-muted mb-2">No weather location set.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add a location
                </button>
              </div>
            ) : isNotFound ? (
              <div>
                <p className="text-sm text-muted">Could not find weather for this location.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Try a different location
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">Unable to load weather data.</p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
        {showAddModal && (
          <AddLocationModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleLocationAdded}
          />
        )}
      </div>
    );
  }

  if (!weather) return null;

  const { current, daily, hourly, location: loc } = weather;
  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const hasMultipleLocations = locations.length > 1;

  // Compact view for sidebar or small spaces
  if (compact) {
    return (
      <div className="bg-panel border border-border rounded-xl p-3">
        <div className="flex items-center gap-3">
          <WeatherIcon icon={current.icon} className="w-8 h-8 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-text">
                {current.temperature}{tempUnit}
              </span>
              <span className="text-sm text-muted truncate">
                {current.description}
              </span>
            </div>
            <p className="text-xs text-muted truncate">
              {currentLocation?.name || loc.name}{loc.admin1 ? `, ${loc.admin1}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-xl overflow-hidden">
      {/* Header - Location selector */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasMultipleLocations && (
              <button
                onClick={goToPrev}
                className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-muted flex-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-sm truncate font-medium">
                {currentLocation?.name || loc.name}
              </span>
              {hasMultipleLocations && (
                <span className="text-xs text-muted">
                  ({currentIndex + 1}/{locations.length})
                </span>
              )}
            </div>
            {hasMultipleLocations && (
              <button
                onClick={goToNext}
                className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-text"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowManageModal(true)}
              className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-text"
              title="Manage locations"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-text"
              title="Add location"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-text"
              title="Refresh weather"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <WeatherIcon icon={current.icon} className="w-16 h-16 text-primary" />
          <div>
            <div className="text-4xl font-bold text-text">
              {current.temperature}{tempUnit}
            </div>
            <p className="text-sm text-muted">{current.description}</p>
          </div>
        </div>

        {/* Weather details */}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4" />
            <span>Feels {current.feelsLike}{tempUnit}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4" />
            <span>{current.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="w-4 h-4" />
            <span>{current.windSpeed} {units === 'imperial' ? 'mph' : 'km/h'}</span>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted hover:text-text hover:bg-bg/50 transition-colors border-t border-border"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            7-Day Forecast
          </>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <>
          {/* Hourly Forecast */}
          <div className="px-4 py-3 border-t border-border">
            <h4 className="text-xs font-medium text-muted mb-2">Next Hours</h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {hourly.slice(0, 12).map((hour, index) => (
                <div key={index} className="flex flex-col items-center min-w-[3rem]">
                  <span className="text-xs text-muted">{formatTime(hour.time)}</span>
                  <WeatherIcon icon={hour.icon} className="w-5 h-5 text-text my-1" />
                  <span className="text-sm font-medium text-text">{hour.temperature}°</span>
                  {hour.precipitationProbability > 0 && (
                    <span className="text-xs text-blue-500">{hour.precipitationProbability}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Daily Forecast */}
          <div className="px-4 py-3 border-t border-border">
            <h4 className="text-xs font-medium text-muted mb-2">7-Day Forecast</h4>
            <div className="space-y-2">
              {daily.map((day, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-text font-medium">{formatDay(day.date)}</span>
                  <WeatherIcon icon={day.icon} className="w-5 h-5 text-text" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-text font-medium">{day.temperatureMax}°</span>
                    <span className="text-muted">{day.temperatureMin}°</span>
                  </div>
                  {day.precipitationProbability > 0 && (
                    <span className="text-xs text-blue-500 flex items-center gap-0.5">
                      <Droplets className="w-3 h-3" />
                      {day.precipitationProbability}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddLocationModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleLocationAdded}
        />
      )}
      {showManageModal && (
        <ManageLocationsModal
          locations={locations}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </div>
  );
}

export default WeatherWidget;
