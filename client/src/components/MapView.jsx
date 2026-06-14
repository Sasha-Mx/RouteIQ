import { useEffect, useRef, useState } from 'react';
import { Route } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

let L;

const getAvatarSvgHtml = (avatarType) => {
  if (avatarType === 'female') {
    return `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <circle cx="50" cy="50" r="50" fill="#FEE2E2" />
        <path d="M25 50 C25 25, 75 25, 75 50 C75 62, 70 75, 70 82 L30 82 C30 75, 25 62, 25 50 Z" fill="#78350F" />
        <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#EC4899" />
        <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
        <circle cx="50" cy="42" r="18" fill="#FDBA74" />
        <path d="M32 38 C32 24, 40 20, 50 20 C60 20, 68 24, 68 38 C68 38, 64 30, 50 30 C36 30, 32 38, 32 38 Z" fill="#78350F" />
        <path d="M32 38 C30 42, 30 46, 31 50 C32 48, 33 42, 33 42 Z" fill="#78350F" />
        <path d="M68 38 C70 42, 70 46, 69 50 C68 48, 67 42, 67 42 Z" fill="#78350F" />
        <circle cx="38" cy="46" r="2" fill="#F87171" opacity="0.6" />
        <circle cx="62" cy="46" r="2" fill="#F87171" opacity="0.6" />
        <circle cx="44" cy="41" r="2" fill="#1E293B" />
        <circle cx="56" cy="41" r="2" fill="#1E293B" />
        <path d="M46 48.5 Q50 51.5 54 48.5" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    `;
  }
  if (avatarType === 'neutral') {
    return `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <circle cx="50" cy="50" r="50" fill="#FEF3C7" />
        <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#10B981" />
        <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
        <circle cx="50" cy="42" r="18" fill="#FDBA74" />
        <path d="M31 38 C31 24, 40 18, 50 18 C60 18, 69 24, 69 38 L31 38 Z" fill="#3B82F6" />
        <path d="M28 38 C38 34, 62 34, 72 38" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="44" cy="42" r="2" fill="#1E293B" />
        <circle cx="56" cy="42" r="2" fill="#1E293B" />
        <path d="M46 49 Q50 52 54 49" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    `;
  }
  // Default: Male
  return `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
      <circle cx="50" cy="50" r="50" fill="#E0E7FF" />
      <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#4F46E5" />
      <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
      <circle cx="50" cy="42" r="18" fill="#FDBA74" />
      <path d="M31 36 C31 22, 40 18, 50 18 C60 18, 69 22, 69 36 C63 36, 60 30, 50 30 C40 30, 37 36, 31 36 Z" fill="#1E293B" />
      <circle cx="44" cy="42" r="2" fill="#1E293B" />
      <circle cx="56" cy="42" r="2" fill="#1E293B" />
      <path d="M46 49 Q50 52 54 49" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  `;
};

export default function MapView({ 
  polyline = [], 
  vehicles = [], 
  originCoords = null, 
  destCoords = null, 
  height = '100%',
  activeVehiclePos = null,
  showUserLocation = false,
  mode = 'transit',
  userAvatar = 'male',
  distanceKm = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const vehicleMarkersRef = useRef([]);
  const activeVehicleMarkerRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const geoWatchIdRef = useRef(null);

  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Dynamically import Leaflet on client side
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      L = leaflet.default;
      setIsLeafletLoaded(true);
    }).catch(err => console.error('Failed to load Leaflet:', err));
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Connaught Place by default if no coordinates provided
    const initialCenter = originCoords || activeVehiclePos || [28.6304, 77.2177];
    const initialZoom = polyline.length > 0 ? 12 : 13;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, initialZoom);

    // Google Maps standard roadmap tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    mapInstanceRef.current = map;
  }, [isLeafletLoaded, originCoords, activeVehiclePos]);

  // Handle Polyline changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLeafletLoaded) return;

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (polyline && polyline.length > 1) {
      polylineRef.current = L.polyline(polyline, {
        color: '#584CF4', // Premium Indigo
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds to the polyline with padding
      map.fitBounds(polylineRef.current.getBounds(), {
        padding: [50, 50]
      });
    }
  }, [polyline, isLeafletLoaded]);

  // Handle Origin and Destination Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLeafletLoaded) return;

    // Origin Pin (Custom white circle with indigo ring)
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (originCoords) {
      const originIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-6 h-6 bg-[#584CF4]/20 rounded-full animate-ping"></div>
            <div class="w-5 h-5 bg-white border-[4px] border-[#584CF4] rounded-full shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-[#584CF4] rounded-full"></div>
            </div>
          </div>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      originMarkerRef.current = L.marker(originCoords, { icon: originIcon }).addTo(map);
    }

    // Destination Pin (Beautiful glowing pointer)
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (destCoords) {
      const destIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-8 h-8 bg-indigo-600/35 rounded-full animate-ping z-0"></div>
            <div class="relative z-10 w-6.5 h-6.5 bg-[#584CF4] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      destMarkerRef.current = L.marker(destCoords, { icon: destIcon }).addTo(map);
    }

    // Auto-pan / fit bounds to contain the newly set markers
    if (originCoords && destCoords) {
      const group = L.featureGroup([originMarkerRef.current, destMarkerRef.current].filter(Boolean));
      map.fitBounds(group.getBounds(), { padding: [60, 60] });
    } else if (originCoords) {
      map.setView(originCoords, 14, { animate: true });
    } else if (destCoords) {
      map.setView(destCoords, 14, { animate: true });
    }
  }, [originCoords, destCoords, isLeafletLoaded]);

  // Handle Live Vehicles Layer (general tracking)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLeafletLoaded) return;

    // Clear old vehicle markers
    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    // Add new ones
    vehicles.forEach((v) => {
      const busIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 bg-[#584CF4] border-2 border-white rounded-full shadow-md text-white text-[10px] font-bold bus-marker-inner">
            🚌
            <span class="absolute -bottom-1 bg-gray-900 text-[8px] px-1 py-0.2 rounded scale-90">${v.routeId || 'Bus'}</span>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([v.lat, v.lng], { icon: busIcon })
        .addTo(map)
        .bindPopup(`<b>Bus Route ${v.routeId}</b><br/>Speed: ${Math.round(v.speed || 15)} km/h`);
        
      vehicleMarkersRef.current.push(marker);
    });
  }, [vehicles, isLeafletLoaded]);

  // Handle Active Vehicle position during Live journey tracking
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLeafletLoaded) return;

    if (activeVehicleMarkerRef.current) {
      activeVehicleMarkerRef.current.remove();
      activeVehicleMarkerRef.current = null;
    }

    if (activeVehiclePos) {
      const getMarkerEmoji = () => {
        const lowerMode = mode.toLowerCase();
        if (lowerMode.includes('uber') || lowerMode.includes('ola') || lowerMode.includes('cab')) return '🚕';
        if (lowerMode.includes('auto')) return '🛺';
        if (lowerMode.includes('rapido') || lowerMode.includes('bike')) return '🏍️';
        return '🚌';
      };

      const activeIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-10 h-10 bg-emerald-500 border-2 border-white rounded-full shadow-xl text-white text-sm bus-marker-inner animate-bounce">
            ${getMarkerEmoji()}
          </div>
        `,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      activeVehicleMarkerRef.current = L.marker(activeVehiclePos, { icon: activeIcon }).addTo(map);
      
      // Auto-pan / animate camera to follow bus
      map.panTo(activeVehiclePos, { animate: true });
    }
  }, [activeVehiclePos, isLeafletLoaded]);

  // Real-time user GPS tracking — like a real navigation app
  useEffect(() => {
    if (!showUserLocation || !isLeafletLoaded) return;
    
    const map = mapInstanceRef.current;
    if (!map || !navigator.geolocation) return;

    // Watch user's position in real-time
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, accuracy } = position.coords;
        const userPos = [latitude, longitude];

        // Create or update user location marker
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng(userPos);
        } else {
          const userIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-10 h-10 animate-fade-in">
                <div class="absolute inset-0 rounded-full bg-[#584CF4]/25 animate-ping"></div>
                <div class="relative z-10 w-8.5 h-8.5 border-2 border-white rounded-full shadow-md overflow-hidden bg-white">
                  ${getAvatarSvgHtml(userAvatar)}
                </div>
              </div>
            `,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          userLocationMarkerRef.current = L.marker(userPos, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        }

        // Pan map to follow user (only if they're near the route)
        if (polyline && polyline.length > 0) {
          // Don't auto-pan if user is zoomed out examining the full route
          const currentZoom = map.getZoom();
          if (currentZoom >= 14) {
            map.panTo(userPos, { animate: true, duration: 0.5 });
          }
        }
      },
      (error) => {
        console.warn('GPS tracking error:', error.message);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [showUserLocation, isLeafletLoaded, polyline, userAvatar]);

  return (
    <div className="relative w-full overflow-hidden shadow-inner" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {distanceKm && (
        <div className="absolute top-4 left-4 z-[999] bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 transition-all duration-200 hover:scale-105 select-none">
          <Route className="w-4 h-4 text-[#584CF4]" />
          <span className="text-[11px] font-extrabold text-slate-800 tracking-wide">
            {distanceKm > 99 ? Math.round(distanceKm) : distanceKm.toFixed(1)} km
          </span>
        </div>
      )}
    </div>
  );
}
