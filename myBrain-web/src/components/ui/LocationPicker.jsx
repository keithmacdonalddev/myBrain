import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Search, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { savedLocationsApi } from '../../lib/api';
import { savedLocationsKeys } from '../../hooks/useSavedLocations';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

/**
 * LocationPicker - Address autocomplete component using Google Places API
 *
 * @param {string} value - Current location value
 * @param {function} onChange - Callback when location changes
 * @param {string} placeholder - Input placeholder text
 * @param {string} className - Additional CSS classes
 * @param {Array} savedLocations - Array of saved locations [{id, name, address}]
 * @param {function} onSaveLocation - Callback to save a location (address) => void
 * @param {boolean} showSaveOption - Whether to show the save location option
 * @param {boolean} autoSave - Automatically save new locations when selected (default: true)
 */
function LocationPicker({
  value,
  onChange,
  placeholder = "Search for an address...",
  className = "",
  savedLocations = [],
  onSaveLocation,
  showSaveOption = false,
  autoSave = true
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [lastSelectedAddress, setLastSelectedAddress] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Generate a new session token for Google Places billing optimization
  useEffect(() => {
    setSessionToken(crypto.randomUUID());
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for addresses using Google Places Autocomplete
  const searchAddresses = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    // If no API key, fall back to OpenStreetMap
    if (!GOOGLE_API_KEY) {
      return searchAddressesOSM(searchQuery);
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
          },
          body: JSON.stringify({
            input: searchQuery,
            sessionToken: sessionToken,
            includedRegionCodes: ['ca', 'us'], // Canada and US
            languageCode: 'en',
          }),
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      const formattedSuggestions = (data.suggestions || [])
        .filter(s => s.placePrediction)
        .map((item) => ({
          id: item.placePrediction.placeId,
          displayName: item.placePrediction.text?.text || item.placePrediction.structuredFormat?.mainText?.text || '',
          shortName: item.placePrediction.structuredFormat?.mainText?.text || '',
          secondaryText: item.placePrediction.structuredFormat?.secondaryText?.text || '',
          placeId: item.placePrediction.placeId,
        }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Google Places search error:', error);
      // Fall back to OSM on error
      return searchAddressesOSM(searchQuery);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: Search using OpenStreetMap Nominatim
  const searchAddressesOSM = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=ca,us`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      const formattedSuggestions = data.map((item) => ({
        id: item.place_id,
        displayName: item.display_name,
        shortName: formatShortAddress(item),
        secondaryText: '',
        placeId: null,
        osmData: item,
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format a shorter address from OSM response (fallback)
  const formatShortAddress = (item) => {
    const addr = item.address || {};
    const parts = [];

    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`);
    } else if (addr.road) {
      parts.push(addr.road);
    } else if (item.name && item.name !== addr.city) {
      parts.push(item.name);
    }

    const city = addr.city || addr.town || addr.village || addr.municipality;
    if (city) parts.push(city);

    if (addr.state || addr.province) {
      parts.push(addr.state || addr.province);
    }

    if (addr.country) parts.push(addr.country);

    return parts.join(', ') || item.display_name;
  };

  // Get place details from Google to get full address
  const getPlaceDetails = async (placeId) => {
    if (!GOOGLE_API_KEY || !placeId) return null;

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'formattedAddress,displayName',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to get place details');

      const data = await response.json();

      // Generate new session token after place details request
      setSessionToken(crypto.randomUUID());

      return data.formattedAddress || data.displayName?.text || null;
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setLastSelectedAddress(null);

    // Show dropdown immediately if there might be matching saved locations
    if (newValue.length > 0) {
      setShowSuggestions(true);
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    if (newValue.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchAddresses(newValue);
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  // Auto-save a location if it doesn't already exist
  const autoSaveLocation = async (address, shortName) => {
    if (!autoSave || !address) return;

    // Check if this address is already saved
    const alreadySaved = savedLocations.some(
      loc => loc.address.toLowerCase() === address.toLowerCase()
    );

    if (alreadySaved) return;

    try {
      // Use shortName as the location name, or extract from address
      let name = shortName || address.split(',')[0].trim();

      // Limit name length
      if (name.length > 100) {
        name = name.substring(0, 97) + '...';
      }

      await savedLocationsApi.createLocation({
        name,
        address,
        category: 'other'
      });

      // Invalidate the saved locations cache so it updates everywhere
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
    } catch (error) {
      // Silently fail - auto-save is a convenience feature
      console.error('Auto-save location failed:', error);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion) => {
    let addressToUse = suggestion.displayName;
    let shortName = suggestion.shortName || suggestion.displayName.split(',')[0];

    // If it's a Google Place, get the full formatted address
    if (suggestion.placeId) {
      setIsLoading(true);
      const fullAddress = await getPlaceDetails(suggestion.placeId);
      if (fullAddress) {
        addressToUse = fullAddress;
      }
      setIsLoading(false);
    }

    setQuery(addressToUse);
    onChange(addressToUse);
    setLastSelectedAddress(addressToUse);
    setShowSuggestions(false);
    setSuggestions([]);

    // Auto-save the location
    autoSaveLocation(addressToUse, shortName);
  };

  // Handle saved location selection
  const handleSelectSavedLocation = (savedLocation) => {
    setQuery(savedLocation.address);
    onChange(savedLocation.address);
    setLastSelectedAddress(savedLocation.address);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const totalItems = suggestions.length + filteredSavedLocations.length;

    if (!showSuggestions || totalItems === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < filteredSavedLocations.length) {
            handleSelectSavedLocation(filteredSavedLocations[selectedIndex]);
          } else {
            const suggestionIndex = selectedIndex - filteredSavedLocations.length;
            if (suggestions[suggestionIndex]) {
              handleSelectSuggestion(suggestions[suggestionIndex]);
            }
          }
        } else {
          onChange(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Handle focus - show saved locations or suggestions
  const handleFocus = () => {
    if (savedLocations.length > 0 || suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle blur - save current value
  const handleBlur = () => {
    setTimeout(() => {
      if (query !== value) {
        onChange(query);
      }
    }, 200);
  };

  // Clear input
  const handleClear = () => {
    setQuery('');
    onChange('');
    setSuggestions([]);
    setLastSelectedAddress(null);
    inputRef.current?.focus();
  };

  // Handle save location
  const handleSaveLocation = () => {
    if (lastSelectedAddress && onSaveLocation) {
      onSaveLocation(lastSelectedAddress);
      setLastSelectedAddress(null);
    }
  };

  // Filter saved locations based on query
  const filteredSavedLocations = query.trim().length > 0
    ? savedLocations.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.address.toLowerCase().includes(query.toLowerCase())
      )
    : savedLocations;

  const hasResults = filteredSavedLocations.length > 0 || suggestions.length > 0;
  const showDropdown = showSuggestions && hasResults;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-muted animate-spin" />
          )}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-panel rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-3 h-3 text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Save location button */}
      {showSaveOption && lastSelectedAddress && onSaveLocation && (
        <button
          type="button"
          onClick={handleSaveLocation}
          className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          <Star className="w-3 h-3" />
          Save this location
        </button>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating max-h-60 overflow-auto">
          {/* Saved locations section */}
          {filteredSavedLocations.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted bg-bg/50 border-b border-border">
                Saved Locations
              </div>
              {filteredSavedLocations.map((location, index) => (
                <button
                  key={location.id || location._id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSavedLocation(location);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
                    index === selectedIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-bg text-text'
                  }`}
                >
                  <Star className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {location.name}
                    </div>
                    <div className="text-xs text-muted truncate mt-0.5">
                      {location.address}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Search results section */}
          {suggestions.length > 0 && (
            <>
              {filteredSavedLocations.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-medium text-muted bg-bg/50 border-b border-border">
                  Search Results
                </div>
              )}
              {suggestions.map((suggestion, index) => {
                const adjustedIndex = index + filteredSavedLocations.length;
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${
                      adjustedIndex === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-bg text-text'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {suggestion.shortName || suggestion.displayName}
                      </div>
                      {suggestion.secondaryText && (
                        <div className="text-xs text-muted truncate mt-0.5">
                          {suggestion.secondaryText}
                        </div>
                      )}
                      {!suggestion.secondaryText && suggestion.shortName !== suggestion.displayName && (
                        <div className="text-xs text-muted truncate mt-0.5">
                          {suggestion.displayName}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          <div className="px-3 py-1.5 text-xs text-muted border-t border-border bg-bg/50">
            {GOOGLE_API_KEY ? 'Powered by Google' : 'Powered by OpenStreetMap'}
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && query.length >= 2 && !hasResults && !isLoading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating p-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Search className="w-4 h-4" />
            No locations found. Try a different search.
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
