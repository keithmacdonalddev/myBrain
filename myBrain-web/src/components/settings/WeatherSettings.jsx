/**
 * =============================================================================
 * WEATHERSETTINGS.JSX - Weather Settings Component
 * =============================================================================
 *
 * Settings for weather feature including:
 * - Saved locations management
 * - Temperature unit preference (Celsius/Fahrenheit)
 * - Default location selection
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  Sun,
  MapPin,
  Plus,
  Trash2,
  Loader2,
  X,
  Check,
  ThermometerSun
} from 'lucide-react';
import {
  useWeatherLocations,
  useAddWeatherLocation,
  useRemoveWeatherLocation
} from '../../hooks/useWeather';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

/**
 * WeatherSettings
 * ---------------
 * Main weather settings component for the Settings page
 */
export default function WeatherSettings() {
  const { data: locations = [], isLoading } = useWeatherLocations();
  const [showAddModal, setShowAddModal] = useState(false);
  const [tempUnit, setTempUnit] = useState('celsius'); // TODO: Get from user preferences
  const queryClient = useQueryClient();

  // Mutation to update temperature unit preference
  const updateTempUnit = useMutation({
    mutationFn: async (unit) => {
      const response = await api.patch('/profile/preferences', {
        weatherUnit: unit
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  const handleUnitChange = (unit) => {
    setTempUnit(unit);
    updateTempUnit.mutate(unit);
  };

  return (
    <div className="space-y-8">
      {/* Temperature Unit */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Temperature Unit</h3>
        <p className="text-sm text-muted mb-4">Choose how temperatures are displayed</p>

        <div className="flex gap-3">
          <button
            onClick={() => handleUnitChange('celsius')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all
              ${tempUnit === 'celsius'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-bg border-border text-muted hover:text-text hover:border-text/20'}`}
          >
            <ThermometerSun className="w-5 h-5" />
            <span className="font-medium">Celsius (°C)</span>
            {tempUnit === 'celsius' && <Check className="w-4 h-4 ml-auto" />}
          </button>

          <button
            onClick={() => handleUnitChange('fahrenheit')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all
              ${tempUnit === 'fahrenheit'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-bg border-border text-muted hover:text-text hover:border-text/20'}`}
          >
            <ThermometerSun className="w-5 h-5" />
            <span className="font-medium">Fahrenheit (°F)</span>
            {tempUnit === 'fahrenheit' && <Check className="w-4 h-4 ml-auto" />}
          </button>
        </div>
      </div>

      {/* Weather Locations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Weather Locations</h3>
            <p className="text-sm text-muted">Manage locations for weather display</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 bg-bg rounded-xl border border-border">
            <Sun className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-muted mb-4">No weather locations saved</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-primary hover:underline text-sm"
            >
              Add your first location
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => (
              <LocationRow key={loc._id || loc.id} location={loc} />
            ))}
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <AddLocationModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

/**
 * LocationRow
 * -----------
 * Single location row with delete option
 */
function LocationRow({ location }) {
  const removeMutation = useRemoveWeatherLocation();
  const isProfileLocation = location._id === 'profile' || location.id === 'profile';

  const handleRemove = async () => {
    if (isProfileLocation) return;
    try {
      await removeMutation.mutateAsync(location._id || location.id);
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-bg rounded-xl border border-border">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <MapPin className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-text">{location.name}</div>
        <div className="text-sm text-muted truncate">{location.location}</div>
      </div>

      {isProfileLocation ? (
        <span className="text-xs px-2 py-1 bg-panel2 text-muted rounded-full">
          From Profile
        </span>
      ) : (
        <button
          onClick={handleRemove}
          disabled={removeMutation.isPending}
          className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Remove location"
        >
          {removeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * AddLocationModal
 * ----------------
 * Modal for adding new weather locations
 */
function AddLocationModal({ onClose }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const addMutation = useAddWeatherLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;

    try {
      await addMutation.mutateAsync({ name: name.trim(), location: location.trim() });
      onClose();
    } catch (err) {
      // Error is shown via mutation state
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel glass-heavy border border-border rounded-xl shadow-2xl z-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Add Weather Location</h3>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home, Office, Vacation"
              autoFocus
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Toronto, Ontario"
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted mt-1.5">Use city name for best results</p>
          </div>

          {addMutation.error && (
            <p className="text-sm text-danger">
              {addMutation.error?.response?.data?.error || addMutation.error?.message || 'Failed to add location'}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-text hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !location.trim() || addMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add Location'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
