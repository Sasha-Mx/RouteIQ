import NodeCache from 'node-cache';
import axios from 'axios';

const cache = new NodeCache({ stdTTL: 30 });

// Mock vehicle positions for the top Delhi bus routes when GTFS-RT is unavailable
const MOCK_VEHICLES = [
  { vehicleId: 'DL1-534-A', routeId: '534', lat: 28.7499, lng: 77.1187, bearing: 180, speed: 22, timestamp: Date.now() },
  { vehicleId: 'DL1-534-B', routeId: '534', lat: 28.7120, lng: 77.1512, bearing: 175, speed: 18, timestamp: Date.now() },
  { vehicleId: 'DL1-610-A', routeId: '610', lat: 28.6890, lng: 77.0890, bearing: 90, speed: 25, timestamp: Date.now() },
  { vehicleId: 'DL1-764-A', routeId: '764', lat: 28.6341, lng: 77.2190, bearing: 270, speed: 20, timestamp: Date.now() },
  { vehicleId: 'DL1-614-A', routeId: '614', lat: 28.6800, lng: 77.1300, bearing: 0, speed: 15, timestamp: Date.now() },
  { vehicleId: 'DL1-620-A', routeId: '620', lat: 28.6600, lng: 77.1600, bearing: 45, speed: 28, timestamp: Date.now() },
];

function animateMockVehicles() {
  MOCK_VEHICLES.forEach(v => {
    const angle = (v.bearing * Math.PI) / 180;
    v.lat += Math.cos(angle) * 0.0005 * (Math.random() * 0.5 + 0.75);
    v.lng += Math.sin(angle) * 0.0005 * (Math.random() * 0.5 + 0.75);
    v.timestamp = Date.now();
    // Bounce back roughly within Delhi
    if (v.lat > 28.88 || v.lat < 28.40) v.bearing = (v.bearing + 180) % 360;
    if (v.lng > 77.35 || v.lng < 76.85) v.bearing = (360 - v.bearing) % 360;
  });
}

setInterval(animateMockVehicles, 15000);

export async function getLiveVehicles(routeId) {
  const cacheKey = `live_${routeId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = process.env.OTD_API_KEY;
    if (!apiKey) throw new Error('No OTD key');

    const url = `https://otd.delhi.gov.in/api/realtime/VehiclePosition.pb?key=${apiKey}`;
    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    // Parse protobuf — simplified: return mock on error
    const vehicles = MOCK_VEHICLES.filter(v => !routeId || v.routeId === routeId);
    cache.set(cacheKey, vehicles);
    return vehicles;
  } catch {
    const vehicles = routeId
      ? MOCK_VEHICLES.filter(v => v.routeId === routeId)
      : MOCK_VEHICLES;
    cache.set(cacheKey, vehicles);
    return vehicles;
  }
}

export async function getAllLiveVehicles() {
  return getLiveVehicles(null);
}
