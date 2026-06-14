import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Navigation } from 'lucide-react';
import { getPlaceSuggestions, getPlaceCoords, getLocalPlaceCoords, reverseGeocode } from '../services/api';

export default function PlaceSearch({ 
  value, 
  onChange, 
  onSelect, 
  placeholder, 
  icon: Icon, 
  iconColor = 'text-primary-600', 
  autoFocus = false,
  showMyLocation = false,
  variant = 'default'
}) {
  const [query, setQuery] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Synchronize internal search query when external value changes
  useEffect(() => {
    setQuery(value?.name || '');
  }, [value]);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    // Always clear coordinates while user is typing — coords are only set on explicit selection
    onChange?.({ name: val, lat: null, lng: null });

    clearTimeout(timeoutRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceSuggestions(val, apiKey);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        console.error('Failed to get suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = async (item) => {
    setLoading(true);
    setOpen(false);
    
    try {
      // If the suggestion already has coordinates (from local fallback), use them directly
      if (item.lat && item.lng) {
        setQuery(item.name);
        onSelect?.({ name: item.name, lat: item.lat, lng: item.lng });
        setLoading(false);
        return;
      }

      // Try Google Place Details API for Google-sourced suggestions
      if (item.placeId && apiKey) {
        const coords = await getPlaceCoords(item.placeId, apiKey);
        if (coords) {
          setQuery(coords.name);
          onSelect?.(coords);
          setLoading(false);
          return;
        }
      }
      
      // Last resort: try to find coords from our local list by name match
      const localMatch = getLocalPlaceCoords(item.name);
      if (localMatch) {
        setQuery(localMatch.name);
        onSelect?.({ name: localMatch.name, lat: localMatch.lat, lng: localMatch.lng });
      } else {
        // Keep the name but don't assign fake coordinates — user must pick a valid suggestion
        setQuery(item.name);
        onSelect?.({ name: item.name, lat: null, lng: null });
        console.warn('Could not resolve coordinates for:', item.name);
      }
    } catch (err) {
      console.error('Error selecting suggestion:', err);
      // Try to resolve coordinates from local list
      if (item.lat && item.lng) {
        setQuery(item.name);
        onSelect?.({ name: item.name, lat: item.lat, lng: item.lng });
      } else {
        const fallbackMatch = getLocalPlaceCoords(item.name);
        setQuery(item.name);
        onSelect?.(fallbackMatch 
          ? { name: fallbackMatch.name, lat: fallbackMatch.lat, lng: fallbackMatch.lng }
          : { name: item.name, lat: null, lng: null }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await reverseGeocode(latitude, longitude, apiKey);
          const resolvedObj = { name: address, lat: latitude, lng: longitude };
          setQuery(address);
          onSelect?.(resolvedObj);
        } catch (err) {
          console.error(err);
          const resolvedObj = { name: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, lat: latitude, lng: longitude };
          setQuery(resolvedObj.name);
          onSelect?.(resolvedObj);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn('Geolocation access denied:', error);
        setLoading(false);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Could not retrieve coordinates. Please search manually.' }));
      },
      { timeout: 8000 }
    );
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onChange?.({ name: '', lat: null, lng: null });
  };

  return (
    <div ref={containerRef} className={`relative w-full ${open ? 'z-[500]' : 'z-10'}`}>
      <div className={variant === 'borderless' 
        ? "relative flex items-center bg-transparent px-2 py-3 transition-all" 
        : "relative flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white focus-within:border-indigo-500 transition-all shadow-sm"
      }>
        {Icon && <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${iconColor}`} />}
        <input
          type="text"
          value={query}
          onChange={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none"
        />
        
        {loading ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin ml-2 flex-shrink-0" />
        ) : query ? (
          <button 
            type="button" 
            onClick={handleClear} 
            className="p-1 hover:bg-gray-200 rounded-full ml-2 flex-shrink-0 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        ) : showMyLocation ? (
          <button
            type="button"
            onClick={handleUseMyLocation}
            title="Use current location"
            className="p-1.5 hover:bg-indigo-100 rounded-full ml-2 flex-shrink-0 text-indigo-600 transition-colors"
          >
            <Navigation className="w-4 h-4 fill-current" />
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-[102%] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-2 divide-y divide-gray-50">
          {suggestions.map((item, idx) => (
            <li key={item.id || idx}>
              <button
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-600 transition-colors flex items-center gap-2.5"
              >
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
