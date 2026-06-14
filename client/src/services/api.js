const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function planRoute(payload) {
  const res = await fetch(`${BASE}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLiveVehicles(routeId) {
  const url = routeId ? `${BASE}/api/live?routeId=${routeId}` : `${BASE}/api/live`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Live fetch failed');
  return res.json();
}

const DELHI_PLACES = [
  { name: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
  { name: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
  { name: 'Kashmere Gate ISBT, Delhi', lat: 28.6666, lng: 77.2287 },
  { name: 'Rohini Sector 22, Delhi', lat: 28.7499, lng: 77.1187 },
  { name: 'Rajiv Chowk Metro Station', lat: 28.6328, lng: 77.2197 },
  { name: 'Lajpat Nagar, New Delhi', lat: 28.5665, lng: 77.2430 },
  { name: 'Dwarka Sector 21, Delhi', lat: 28.5522, lng: 77.0588 },
  { name: 'Noida Sector 18', lat: 28.5700, lng: 77.3200 },
  { name: 'Saket, New Delhi', lat: 28.5245, lng: 77.2066 },
  { name: 'Hauz Khas, New Delhi', lat: 28.5433, lng: 77.2066 },
  { name: 'Chandni Chowk, Delhi', lat: 28.6506, lng: 77.2285 },
  { name: 'Nehru Place, New Delhi', lat: 28.5491, lng: 77.2520 },
  { name: 'Greater Kailash, New Delhi', lat: 28.5388, lng: 77.2318 },
  { name: 'Vasant Kunj, New Delhi', lat: 28.5229, lng: 77.1589 },
  { name: 'Red Fort, Delhi', lat: 28.6562, lng: 77.2410 },
  { name: 'Pitampura, Delhi', lat: 28.7041, lng: 77.1318 },
  { name: 'Karol Bagh, New Delhi', lat: 28.6513, lng: 77.1905 },
  { name: 'AIIMS Metro Station', lat: 28.5672, lng: 77.2100 },
  { name: 'IGI Airport Terminal 3, Delhi', lat: 28.5562, lng: 77.1000 },
  { name: 'Janpath, New Delhi', lat: 28.6232, lng: 77.2168 },
  { name: 'Sadar Bazaar, Delhi', lat: 28.6589, lng: 77.1890 },
  { name: 'Paharganj, New Delhi', lat: 28.6448, lng: 77.2167 },
  { name: 'Lodi Colony, New Delhi', lat: 28.5925, lng: 77.2230 },
  { name: 'Ashram, New Delhi', lat: 28.5720, lng: 77.2510 },
  // Extended NCR & surrounding cities
  { name: 'Model Town, Delhi', lat: 28.7153, lng: 77.1928 },
  { name: 'Model Town Metro Station, Delhi', lat: 28.7134, lng: 77.1926 },
  { name: 'Meerut, Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { name: 'Meerut Cantt, Uttar Pradesh', lat: 29.0017, lng: 77.6852 },
  { name: 'Gurgaon (Gurugram), Haryana', lat: 28.4595, lng: 77.0266 },
  { name: 'Cyber City, Gurugram', lat: 28.4940, lng: 77.0880 },
  { name: 'Ghaziabad, Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { name: 'Faridabad, Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Noida City Centre', lat: 28.5749, lng: 77.3568 },
  { name: 'Greater Noida, Uttar Pradesh', lat: 28.4744, lng: 77.5040 },
  { name: 'Anand Vihar ISBT, Delhi', lat: 28.6469, lng: 77.3161 },
  { name: 'Sarai Kale Khan ISBT, Delhi', lat: 28.5897, lng: 77.2556 },
  { name: 'Majnu Ka Tilla, Delhi', lat: 28.6917, lng: 77.2287 },
  { name: 'Nirman Vihar, Delhi', lat: 28.6361, lng: 77.3001 },
  { name: 'Preet Vihar, Delhi', lat: 28.6384, lng: 77.2972 },
  { name: 'Dilshad Garden, Delhi', lat: 28.6791, lng: 77.3116 },
  { name: 'Shahdara, Delhi', lat: 28.6726, lng: 77.2877 },
  { name: 'Mundka, Delhi', lat: 28.6843, lng: 77.0295 },
  { name: 'Janakpuri, Delhi', lat: 28.6279, lng: 77.0795 },
  { name: 'Rajouri Garden, Delhi', lat: 28.6454, lng: 77.1201 },
  { name: 'Patel Nagar, New Delhi', lat: 28.6474, lng: 77.1685 },
  { name: 'Okhla, New Delhi', lat: 28.5329, lng: 77.2711 },
  { name: 'Defence Colony, New Delhi', lat: 28.5741, lng: 77.2302 },
  { name: 'South Extension, New Delhi', lat: 28.5726, lng: 77.2200 },
  { name: 'Green Park, New Delhi', lat: 28.5597, lng: 77.2066 },
  { name: 'Malviya Nagar, New Delhi', lat: 28.5313, lng: 77.2097 },
];

function getLocalSuggestions(query) {
  if (!query) return [];
  const queryTokens = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && t !== 'new' && t !== 'delhi' && t !== 'india');

  const searchTokens = queryTokens.length > 0 ? queryTokens : [query.toLowerCase()];

  return DELHI_PLACES
    .map(p => {
      const nameLower = p.name.toLowerCase();
      let score = 0;
      for (const token of searchTokens) {
        if (nameLower.includes(token)) {
          score += 1;
        }
      }
      return { p, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(item => ({ id: item.p.name, name: item.p.name, lat: item.p.lat, lng: item.p.lng }));
}

export function getLocalPlaceCoords(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  
  // Exact match
  const exact = DELHI_PLACES.find(p => p.name.toLowerCase() === lower);
  if (exact) return exact;

  // Substring match
  const fuzzy = DELHI_PLACES.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
  if (fuzzy) return fuzzy;

  // Token-based matching
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && t !== 'new' && t !== 'delhi' && t !== 'india');
  
  if (tokens.length > 0) {
    let bestMatch = null;
    let bestScore = 0;
    for (const p of DELHI_PLACES) {
      const nameLower = p.name.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (nameLower.includes(token)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }
    if (bestMatch && bestScore >= Math.min(tokens.length, 1)) {
      return bestMatch;
    }
  }

  return null;
}

export async function getPlaceSuggestions(input, apiKey = null) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Use proxy to avoid CORS
    const url = `/api/places/autocomplete?input=${encodeURIComponent(input)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('API proxy returned error');
    
    const data = await res.json();
    if (!data || !Array.isArray(data.predictions)) {
      throw new Error(data?.error_message || 'Predictions not returned as an array');
    }
    
    return data.predictions.map(p => ({
      id: p.place_id,
      placeId: p.place_id,
      name: p.description
    }));
  } catch (err) {
    console.warn('Autocomplete proxy failed, falling back to local list', err);
    return getLocalSuggestions(input);
  }
}

export async function getPlaceCoords(placeId, apiKey = null) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const url = `/api/places/details?placeId=${placeId}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('Details proxy returned error');
    
    const data = await res.json();
    if (data.result && data.result.geometry) {
      return {
        name: data.result.name,
        lat: data.result.geometry.location.lat,
        lng: data.result.geometry.location.lng
      };
    }
    return null;
  } catch (err) {
    console.error('Details proxy error:', err);
    return null;
  }
}

export async function reverseGeocode(lat, lng, apiKey) {
  if (apiKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK') return data.results[0]?.formatted_address || 'Current location';
    } catch {}
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return data.display_name?.split(',').slice(0, 2).join(', ') || 'Current location';
  } catch {}
  return 'Current location';
}

export async function getExplorePlaces(name, lat, lng) {
  try {
    const url = `/api/places/explore?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Explore proxy failed');
    return res.json();
  } catch (err) {
    console.error('Explore places fetch error:', err);
    return { places: [] };
  }
}
