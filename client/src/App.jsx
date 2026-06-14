import { useState, useEffect, useRef, Component } from 'react';
import { useJourney, JourneyProvider } from './context/JourneyContext';
import onboardingImg from './assets/onboarding.png';
import robotAssistantImg from './assets/robot_assistant.png';
import PlaceSearch from './components/PlaceSearch';
import MapView from './components/MapView';
import ConfidenceRing from './components/ConfidenceRing';
import ModePills from './components/ModePills';
import { SkeletonLoader } from './components/SkeletonLoader';
import MeetFriendsModal from './components/MeetFriendsModal';
import ProfileModal from './components/ProfileModal';
import Avatar from './components/Avatar';
import { planRoute, getLiveVehicles, reverseGeocode, getLocalPlaceCoords, getExplorePlaces } from './services/api';

// Icons
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  Users, 
  User,
  Coins,
  DollarSign, 
  Compass, 
  Bus, 
  Train,
  AlertTriangle, 
  Leaf, 
  Award,
  ChevronRight,
  Sparkles,
  Zap,
  Smile,
  RefreshCw,
  X,
  Play,
  CheckCircle,
  HelpCircle,
  Clock,
  Heart,
  Calendar,
  AlertCircle,
  Globe,
  ChevronDown,
  Lock,
  Bell,
  Route,
  ExternalLink,
  Car,
  Activity,
  Plane,
  Coffee,
  Utensils,
  Wine,
  Landmark,
  ShoppingBag,
  ShoppingCart,
  Trees,
  Flower,
  Map,
  Cloud,
  Share2,
  Trophy,
  Scale,
  Plus
} from 'lucide-react';

function RouteIQApp() {
  const { 
    userName, setUserName,
    mattersMost, setMattersMost,
    userAvatar, setUserAvatar,
    route, startJourney, endJourney, saveJourney,
    trackingStatus, currentStep, eta, confidence, vehiclePosition, comparison, alerts, applyReplannedRoute,
    clearUnreadAlerts, journeys, setAlternatives, addJourneyAlert, unreadAlerts
  } = useJourney();

  // Screen/View Routing: 'home' | 'results' | 'alternatives' | 'meet_friends' | 'find_midpoint'
  // Note: Tab navigation inside 'home' is managed by activeTab ('home_tab', 'journeys_tab', 'live_tab', 'alerts_tab', 'profile_tab')
  const [currentView, setCurrentView] = useState('home');
  const [activeTab, setActiveTab] = useState('home_tab');

  // Modals & Bottom Sheets display states
  const [isOnboarded, setIsOnboarded] = useState(!!userName);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tempName, setTempName] = useState(userName || '');
  const [tempMatters, setTempMatters] = useState(mattersMost || 'time');
  const [tempAvatar, setTempAvatar] = useState(userAvatar || 'male');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [wantsLocation, setWantsLocation] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
  // Context-aware Quick Actions sheet states
  const [isPriceCompareSheetOpen, setIsPriceCompareSheetOpen] = useState(false);
  const [quickActionDest, setQuickActionDest] = useState({ name: '', lat: null, lng: null });
  
  const [isTrackBusOpen, setIsTrackBusOpen] = useState(false);
  const [liveVehiclesList, setLiveVehiclesList] = useState([]);
  const [selectedTrackBusId, setSelectedTrackBusId] = useState(null);
  const [trackBusMode, setTrackBusMode] = useState('search'); // 'search' | 'nearby' | 'route'
  const [trackBusSearch, setTrackBusSearch] = useState('');

  // Search form inputs
  const [origin, setOrigin] = useState({ name: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ name: '', lat: null, lng: null });
  const [arriveTime, setArriveTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [timeType, setTimeType] = useState('leave_by'); // 'leave_by' or 'arrive_by'
  const [activePref, setActivePref] = useState(mattersMost || 'time');
  const [isPrefChanging, setIsPrefChanging] = useState(false);

  // Journey complete & explore places states
  const [lastCompletedJourney, setLastCompletedJourney] = useState(null);
  const [explorePlaces, setExplorePlaces] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreCategory, setExploreCategory] = useState('All');
  const [selectedFeedback, setSelectedFeedback] = useState('reached_own');
  const [activeSpot, setActiveSpot] = useState('Rajiv Chowk Metro Station');

  // API states
  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [selectedComfortMode, setSelectedComfortMode] = useState('transit'); // 'transit', 'uber', 'ola', 'rapido', 'auto'
  const [selectedAlternativeMode, setSelectedAlternativeMode] = useState('transit'); // 'transit', 'uber', 'ola', 'rapido', 'auto'

  const getDynamicMidpoint = () => {
    if (!origin?.lat || !destination?.lat) return { name: 'Rajiv Chowk Metro Station', fairness: 95 };
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;
    
    const hubs = [
      { name: 'Rajiv Chowk Metro Station', lat: 28.6328, lng: 77.2197 },
      { name: 'Kashmere Gate ISBT & Metro', lat: 28.6666, lng: 77.2287 },
      { name: 'Central Secretariat Metro Station', lat: 28.6180, lng: 77.2118 },
      { name: 'Yamuna Bank Metro Station', lat: 28.6213, lng: 77.2600 },
      { name: 'Hauz Khas Metro Station', lat: 28.5433, lng: 77.2066 },
      { name: 'Botanical Garden Metro Station', lat: 28.5641, lng: 77.3342 },
      { name: 'Dwarka Sector 21 Metro Station', lat: 28.5522, lng: 77.0588 },
      { name: 'Kirti Nagar Metro Station', lat: 28.6552, lng: 77.1522 },
      { name: 'Inderlok Metro Station', lat: 28.6732, lng: 77.1652 },
      { name: 'Lajpat Nagar Metro Station', lat: 28.5665, lng: 77.2430 },
      { name: 'Anand Vihar ISBT & Metro', lat: 28.6469, lng: 77.3161 },
      { name: 'Noida Sector 52 Metro Station', lat: 28.5850, lng: 77.3675 },
      { name: 'New Delhi Railway Metro Station', lat: 28.6429, lng: 77.2217 }
    ];
    
    let closestHub = hubs[0];
    let minDistance = Infinity;
    
    hubs.forEach(h => {
      const dist = Math.sqrt(Math.pow(h.lat - midLat, 2) + Math.pow(h.lng - midLng, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestHub = h;
      }
    });

    const d1 = Math.sqrt(Math.pow(closestHub.lat - origin.lat, 2) + Math.pow(closestHub.lng - origin.lng, 2));
    const d2 = Math.sqrt(Math.pow(closestHub.lat - destination.lat, 2) + Math.pow(closestHub.lng - destination.lng, 2));
    const ratio = Math.min(d1, d2) / Math.max(d1, d2 || 1);
    const fairness = Math.round(75 + ratio * 24);
    
    return { name: closestHub.name, fairness };
  };

  const [localNewsData, setLocalNewsData] = useState({
    city: 'Meerut',
    temp: '32°C',
    aqi: '112',
    aqiClass: 'Moderate',
    aqiColor: 'text-amber-600 bg-amber-50 border-amber-100',
    transitStatus: 'Normal',
    infoCard1Title: 'RRTS FEEDER',
    infoCard1Val: 'Active',
    infoCard1Desc: 'Buses to Meerut South RRTS running normal',
    infoCard2Title: 'NH-58 TRAFFIC',
    infoCard2Val: 'Moderate',
    infoCard2Desc: 'Begum Bridge flyover construction diversion active',
    liveUpdates: [
      { route: 'RRTS', line: 'Meerut South ➔ Sahibabad', status: 'On Time', desc: 'Namo Bharat train arriving in 4 min', time: '4 min', type: 'metro' },
      { route: 'UPS', line: 'Modipuram ➔ Meerut City Stn', status: 'On Time', desc: 'UPSRTC Feeder bus arriving at stand', time: '1 min', type: 'bus' },
      { route: 'LCL', line: 'Hapur Road Bypass Bus', status: 'Delayed', desc: 'Slow traffic near Shastri Nagar', time: '14 min', type: 'bus' }
    ]
  });
  const [loadingNews, setLoadingNews] = useState(false);

  // Synchronize display state when context values load or change
  useEffect(() => {
    if (userName) {
      setTempName(userName);
    }
  }, [userName]);

  useEffect(() => {
    if (userAvatar) {
      setTempAvatar(userAvatar);
    }
  }, [userAvatar]);

  // Sync state whenever the profile tab becomes active
  useEffect(() => {
    if (activeTab === 'profile_tab') {
      setTempName(userName || '');
      setTempAvatar(userAvatar || 'male');
    }
  }, [activeTab, userName, userAvatar]);

  // Fetch location-aware news and transit data, storing in localStorage with 5-minute timeout
  useEffect(() => {
    const fetchNewsData = async () => {
      // Do not fetch if the location name is empty or locating...
      if (!origin.name || origin.name === 'Locating current position...') return;

      const cacheKey = `routeiq_news_${origin.name}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const cacheAgeMs = Date.now() - parsed.timestamp;
          if (cacheAgeMs < 300000) { // 5 minutes
            console.log('Using cached local news for:', origin.name);
            setLocalNewsData(parsed.data);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse cached local news:', e);
        }
      }

      setLoadingNews(true);
      try {
        const response = await fetch('/api/live/local-news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: origin.name, lat: origin.lat, lng: origin.lng })
        });
        if (response.ok) {
          const data = await response.json();
          setLocalNewsData(data);
          // Cache locally
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data
          }));
        } else {
          console.warn('Failed to fetch local news from server API');
        }
      } catch (err) {
        console.error('Error fetching local news:', err);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchNewsData();
  }, [origin.name, origin.lat, origin.lng]);

  const getCabDeepLink = (brand, origin, destination) => {
    const oLat = origin?.lat || 28.6139;
    const oLng = origin?.lng || 77.2090;
    const dLat = destination?.lat || 28.6289;
    const dLng = destination?.lng || 77.2189;
    const oName = origin?.name || 'Current Location';
    const dName = destination?.name || 'Destination';

    if (brand.toLowerCase().includes('uber')) {
      return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&pickup[nickname]=${encodeURIComponent(oName)}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}&dropoff[nickname]=${encodeURIComponent(dName)}`;
    } else if (brand.toLowerCase().includes('ola')) {
      return `https://www.olacabs.com/book?pickup_lat=${oLat}&pickup_lng=${oLng}&dropoff_lat=${dLat}&dropoff_lng=${dLng}&pickup_name=${encodeURIComponent(oName)}&dropoff_name=${encodeURIComponent(dName)}`;
    } else if (brand.toLowerCase().includes('rapido')) {
      return `https://rapido.onelink.me/J4hA?pid=AppShare&af_web_dp=https%3A%2F%2Fwww.rapido.bike%2F`;
    } else if (brand.toLowerCase().includes('auto')) {
      return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}`;
    }
    return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}`;
  };

  const getCityData = () => {
    const name = (origin?.name || '').toLowerCase();
    
    // Default to Meerut (since user is in Meerut right now)
    let city = 'Meerut';
    let temp = '32°C';
    let aqi = '112';
    let aqiClass = 'Moderate';
    let aqiColor = 'text-amber-600 bg-amber-50 border-amber-100';
    let transitStatus = 'Normal';
    
    let infoCard1Title = 'RRTS FEEDER';
    let infoCard1Val = 'Active';
    let infoCard1Desc = 'Buses to Meerut South RRTS running normal';
    
    let infoCard2Title = 'NH-58 TRAFFIC';
    let infoCard2Val = 'Moderate';
    let infoCard2Desc = 'Begum Bridge flyover construction diversion active';

    let liveUpdates = [
      { route: 'RRTS', line: 'Meerut South ➔ Sahibabad', status: 'On Time', desc: 'Namo Bharat train arriving in 4 min', time: '4 min', type: 'metro' },
      { route: 'UPS', line: 'Modipuram ➔ Meerut City Stn', status: 'On Time', desc: 'UPSRTC Feeder bus arriving at stand', time: '1 min', type: 'bus' },
      { route: 'LCL', line: 'Hapur Road Bypass Bus', status: 'Delayed', desc: 'Slow traffic near Shastri Nagar', time: '14 min', type: 'bus' }
    ];

    if (name.includes('delhi') || name.includes('connaught') || name.includes('rohini') || name.includes('india gate') || name.includes('kashmere')) {
      city = 'Delhi';
      temp = '34°C';
      aqi = '185';
      aqiClass = 'Poor';
      aqiColor = 'text-rose-600 bg-rose-50 border-rose-100';
      transitStatus = 'Normal';
      
      infoCard1Title = 'DMRC METRO';
      infoCard1Val = '99% Punctual';
      infoCard1Desc = 'Smooth operations across all color lines';
      
      infoCard2Title = 'OUTER RING RD';
      infoCard2Val = 'Congested';
      infoCard2Desc = 'Heavy traffic near Ashram and Okhla underpass';

      liveUpdates = [
        { route: '534', line: 'Anand Vihar ➔ Mehrauli', status: 'On Time', desc: 'DTC Bus arriving at Rohini Sec 22 in 2 min', time: '2 min', type: 'bus' },
        { route: 'YEL', line: 'Yellow Line Metro', status: 'On Time', desc: 'Samaypur Badli ➔ HUDA City Centre', time: '3 min', type: 'metro' },
        { route: 'EXP', line: 'Delhi Airport Express', status: 'On Time', desc: 'New Delhi ➔ Dwarka Sec 21', time: '5 min', type: 'metro' }
      ];
    } else if (name.includes('noida') || name.includes('greater noida')) {
      city = 'Noida';
      temp = '33°C';
      aqi = '142';
      aqiClass = 'Moderate';
      aqiColor = 'text-amber-600 bg-amber-50 border-amber-100';
      transitStatus = 'Normal';

      infoCard1Title = 'AQUA LINE';
      infoCard1Val = 'On Time';
      infoCard1Desc = 'Sector 51 to Depot station running normal';

      infoCard2Title = 'NOIDA EXPY';
      infoCard2Val = 'Heavy';
      infoCard2Desc = 'Traffic slow near Sector 18 and Mahamaya Flyover';

      liveUpdates = [
        { route: 'AQU', line: 'Sector 51 ➔ Depot Station', status: 'On Time', desc: 'Aqua Line train arriving in 3 min', time: '3 min', type: 'metro' },
        { route: '347', line: 'Noida Sec 62 ➔ Kalindi Kunj', status: 'On Time', desc: 'DTC electric bus on schedule', time: '7 min', type: 'bus' }
      ];
    } else if (name.includes('gurugram') || name.includes('gurgaon')) {
      city = 'Gurugram';
      temp = '35°C';
      aqi = '190';
      aqiClass = 'Poor';
      aqiColor = 'text-rose-600 bg-rose-50 border-rose-100';
      transitStatus = 'Normal';

      infoCard1Title = 'RAPID METRO';
      infoCard1Val = 'On Time';
      infoCard1Desc = 'Cyber City loop trains running smoothly';

      infoCard2Title = 'SOHNA ROAD';
      infoCard2Val = 'Slow';
      infoCard2Desc = 'Waterlogging recovery work near Subhash Chowk';

      liveUpdates = [
        { route: 'RAP', line: 'Sector 55-56 ➔ Sikanderpur', status: 'On Time', desc: 'Rapid Metro arriving in 2 min', time: '2 min', type: 'metro' },
        { route: '112', line: 'Gurugram Bus Stand ➔ Sector 47', status: 'Delayed', desc: 'Slow moving traffic on Sohna Road', time: '11 min', type: 'bus' }
      ];
    } else if (name.includes('mumbai')) {
      city = 'Mumbai';
      temp = '29°C';
      aqi = '55';
      aqiClass = 'Good';
      aqiColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
      transitStatus = 'Minor Delays';

      infoCard1Title = 'WESTERN LINE';
      infoCard1Val = '8m Delay';
      infoCard1Desc = 'Signal troubleshooting near Bandra station';

      infoCard2Title = 'EASTERN FREEWAY';
      infoCard2Val = 'Clear';
      infoCard2Desc = 'Smooth traffic flow towards Chembur';

      liveUpdates = [
        { route: 'WR', line: 'Churchgate ➔ Virar Fast', status: 'Delayed', desc: 'Slow line locals running late by 8 mins', time: '8 min', type: 'train' },
        { route: 'MET', line: 'Gundavali ➔ Andheri West', status: 'On Time', desc: 'Metro Line 7 operating smoothly', time: '3 min', type: 'metro' },
        { route: 'BST', line: 'BEST Route 83 (Colaba)', status: 'On Time', desc: 'Arriving at Regal Cinema stand', time: '4 min', type: 'bus' }
      ];
    }

    return {
      city,
      temp,
      aqi,
      aqiClass,
      aqiColor,
      transitStatus,
      infoCard1Title,
      infoCard1Val,
      infoCard1Desc,
      infoCard2Title,
      infoCard2Val,
      infoCard2Desc,
      liveUpdates
    };
  };

  const getSelectedRouteToStart = () => {
    if (!planResult) return null;
    
    // Case 1: We are on alternatives view
    if (currentView === 'alternatives') {
      if (selectedAlternativeMode === 'transit') {
        return planResult.routes[planResult.recommended || 0];
      }
      
      const brandNames = {
        uber: 'Uber Go',
        ola: 'Ola Mini',
        rapido: 'Rapido Bike',
        auto: 'Auto Rickshaw',
        flight: 'Flight Estimate',
        train: 'Intercity Train'
      };
      const brandName = brandNames[selectedAlternativeMode] || 'Cab';
      const brandCost = planResult.alternatives?.[selectedAlternativeMode]?.cost || 150;
      const brandTime = planResult.alternatives?.[selectedAlternativeMode]?.minutes || 20;
      
      const transportMode = selectedAlternativeMode === 'flight' ? 'flight' : selectedAlternativeMode === 'train' ? 'train' : 'cab';
      const verbName = selectedAlternativeMode === 'flight' ? 'Fly' : selectedAlternativeMode === 'train' ? 'Board' : 'Ride';

      return {
        label: `comfort_${selectedAlternativeMode}`,
        costEstimate: brandCost,
        totalMinutes: brandTime,
        transfers: 0,
        confidence: 95,
        legs: [
          { mode: 'walk', minutes: 1, instruction: 'Walk to pickup location' },
          { mode: transportMode, minutes: brandTime, instruction: `${verbName} ${brandName} to ${destination.name.split(',')[0]}`, distance: `${planResult.distanceKm || 10} km` }
        ],
        polyline: planResult.routes[0]?.polyline || [
          [origin.lat, origin.lng],
          [destination.lat, destination.lng]
        ]
      };
    }
    
    // Case 2: We are on results view, comfort route, and a cab brand is selected
    const activeRoute = planResult.routes[selectedRouteIdx];
    if (activeRoute?.label === 'comfort' && selectedComfortMode !== 'transit') {
      const brandNames = {
        uber: 'Uber Go',
        ola: 'Ola Mini',
        rapido: 'Rapido Bike',
        auto: 'Auto Rickshaw',
        flight: 'Flight Estimate',
        train: 'Intercity Train'
      };
      const brandName = brandNames[selectedComfortMode] || 'Cab';
      const brandCost = planResult.alternatives?.[selectedComfortMode]?.cost || 150;
      const brandTime = planResult.alternatives?.[selectedComfortMode]?.minutes || 20;
      
      const transportMode = selectedComfortMode === 'flight' ? 'flight' : selectedComfortMode === 'train' ? 'train' : 'cab';
      const verbName = selectedComfortMode === 'flight' ? 'Fly' : selectedComfortMode === 'train' ? 'Board' : 'Ride';

      return {
        ...activeRoute,
        label: `comfort_${selectedComfortMode}`,
        costEstimate: brandCost,
        totalMinutes: brandTime,
        transfers: 0,
        confidence: 95,
        legs: [
          { mode: 'walk', minutes: 1, instruction: 'Walk to pickup location' },
          { mode: transportMode, minutes: brandTime, instruction: `${verbName} ${brandName} to ${destination.name.split(',')[0]}`, distance: `${planResult.distanceKm || 10} km` }
        ]
      };
    }
    
    return activeRoute;
  };

  // Meet Friends Form
  const [meetOrigin, setMeetOrigin] = useState({ name: '', lat: null, lng: null });
  const [friends, setFriends] = useState([{ id: 1, name: '', lat: null, lng: null }]);
  const [meetMidpointResult, setMeetMidpointResult] = useState(null);
  const [meetLoading, setMeetLoading] = useState(false);

  // Find Midpoint Form
  const [midpointOrigin, setMidpointOrigin] = useState({ name: '', lat: null, lng: null });
  const [midpointDest, setMidpointDest] = useState({ name: '', lat: null, lng: null });
  const [midpointResult, setMidpointResult] = useState(null);
  const [midpointLoading, setMidpointLoading] = useState(false);

  // Issue reporting
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  // Live Journey countdown timer
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes boarding timer

  // Replan modal queue
  const [replanQueue, setReplanQueue] = useState([]);
  const [activeReplan, setActiveReplan] = useState(null);

  // Results Screen Live Polling
  const [resultsVehicles, setResultsVehicles] = useState([]);
  const [lastPollTime, setLastPollTime] = useState(Date.now());
  const [secondsSincePoll, setSecondsSincePoll] = useState(0);

  // Dismissed alerts tracking
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Expanded journeys list
  const [expandedJourneys, setExpandedJourneys] = useState([]);

  const handleStartActiveJourney = () => {
    if (!planResult) return;
    const routeToStart = getSelectedRouteToStart();
    if (!routeToStart) return;
    
    startJourney(
      routeToStart,
      { name: origin.name, lat: origin.lat, lng: origin.lng },
      { name: destination.name, lat: destination.lat, lng: destination.lng },
      planResult.alternatives
    );
    setCurrentView('live_journey');
  };

  const handleReplanSelect = (newRoute) => {
    if (newRoute) {
      applyReplannedRoute(newRoute);
    } else {
      // Logic for dismissing the replan is handled elsewhere, but this function is needed
    }
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Get greeting
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get traffic status
  const getTrafficStatus = () => {
    const h = new Date().getHours();
    if ((h >= 8 && h <= 10) || (h >= 17 && h <= 20)) return 'Heavy traffic detected';
    if (h >= 22 || h <= 6) return 'Clear roads';
    return 'Moderate traffic';
  };

  // Default time is current time + 1 hour
  useEffect(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    setArriveTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  }, []);

  // Sync preference with localStorage and local active button state
  useEffect(() => {
    setActivePref(mattersMost);
  }, [mattersMost]);

  // Attempt Geolocation on load
  useEffect(() => {
    const wantsLoc = localStorage.getItem('riq_wants_location') !== 'false';
    if (isOnboarded && !origin.lat && wantsLoc) {
      if (!navigator.geolocation) {
        console.warn('Geolocation API not available');
        setOrigin({ name: '', lat: null, lng: null });
        return;
      }
      setOrigin({ name: 'Locating current position...', lat: null, lng: null });
      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const address = await reverseGeocode(latitude, longitude, apiKey);
              setOrigin({ name: address, lat: latitude, lng: longitude });
            } catch {
              setOrigin({ name: 'My Current Location', lat: latitude, lng: longitude });
            }
          },
          (error) => {
            console.warn('Onload geolocation failed:', error);
            setOrigin({ name: '', lat: null, lng: null });
          },
          { timeout: 8000 }
        );
      } catch (err) {
        console.error('Geolocation call error:', err);
        setOrigin({ name: '', lat: null, lng: null });
      }
    }
  }, [isOnboarded]);

  // Auto-fill Meet Friends / Midpoint point A on load
  useEffect(() => {
    if (origin.lat) {
      setMeetOrigin(origin);
      setMidpointOrigin(origin);
    }
  }, [origin]);

  // Background route fetch when origin and destination coordinates are both selected
  useEffect(() => {
    if (origin.lat && destination.lat) {
      const fetchRouteBg = async () => {
        try {
          const payload = {
            origin: origin.name,
            destination: destination.name,
            originLat: origin.lat,
            originLng: origin.lng,
            destLat: destination.lat,
            destLng: destination.lng,
            arrivalTime: arriveTime,
            timeType: timeType,
            preference: activePref
          };
          const data = await planRoute(payload);
          setPlanResult(data);
          setSelectedRouteIdx(data.recommended || 0);
          if (data.recommendCab) {
            setSelectedComfortMode(data.recommendCab);
          } else {
            setSelectedComfortMode('transit');
          }
          setSelectedAlternativeMode('transit');
        } catch (err) {
          console.error('Background route plan failed:', err);
        }
      };
      fetchRouteBg();
    }
  }, [origin.lat, destination.lat, arriveTime, timeType, activePref]);

  // Sync screen view to active journey if running
  useEffect(() => {
    if (trackingStatus === 'active' || trackingStatus === 'reconnecting') {
      setCurrentView('live_journey');
    }
  }, [trackingStatus]);

  // SSE Monitor Replan listener - push to replan modal queue
  useEffect(() => {
    const lastAlert = alerts[0];
    if (lastAlert && lastAlert.type === 'replan') {
      // Append to queue
      setReplanQueue(prev => {
        // Prevent duplicate alerts
        if (prev.some(item => item.id === lastAlert.id)) return prev;
        return [...prev, lastAlert];
      });
    }
  }, [alerts]);

  // Process replan modal queue
  useEffect(() => {
    if (!activeReplan && replanQueue.length > 0) {
      setActiveReplan(replanQueue[0]);
      setReplanQueue(prev => prev.slice(1));
    }
  }, [replanQueue, activeReplan]);

  // Poll live vehicles on results screen
  useEffect(() => {
    if (currentView !== 'results') {
      setResultsVehicles([]);
      return;
    }
    
    const poll = async () => {
      try {
        const routeId = planResult?.routes?.[selectedRouteIdx]?.routeId || planResult?.routes?.[selectedRouteIdx]?.label;
        const data = await getLiveVehicles(routeId);
        setResultsVehicles(data.vehicles || []);
        setLastPollTime(Date.now());
        setSecondsSincePoll(0);
      } catch (err) {
        console.error('Error polling live vehicles:', err);
        setResultsVehicles([]);
      }
    };

    poll();
    const interval = setInterval(poll, 15000); // poll every 15s

    return () => clearInterval(interval);
  }, [currentView, selectedRouteIdx, planResult]);

  // Keep track of seconds since last poll
  useEffect(() => {
    if (currentView !== 'results') return;
    const timer = setInterval(() => {
      setSecondsSincePoll(Math.floor((Date.now() - lastPollTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentView, lastPollTime]);

  // Live Journey countdown timer running
  useEffect(() => {
    let interval;
    if (currentView === 'live_journey' && trackingStatus === 'active') {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            clearInterval(interval);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, trackingStatus]);

  // Auto-complete journey when countdown timer hits 0
  useEffect(() => {
    if (currentView === 'live_journey' && timerSeconds === 0 && route) {
      const completedData = {
        route,
        comparison,
        destination,
        origin
      };
      setLastCompletedJourney(completedData);
      endJourney();
      setCurrentView('journey_complete');
    }
  }, [timerSeconds, currentView, route, comparison, destination, origin, endJourney]);

  // Load explore places suggestions when journey complete screen opens
  useEffect(() => {
    if (currentView === 'journey_complete' && lastCompletedJourney?.destination?.name) {
      setExploreLoading(true);
      const destName = lastCompletedJourney.destination.name;
      const lat = lastCompletedJourney.destination.lat || '';
      const lng = lastCompletedJourney.destination.lng || '';
      
      getExplorePlaces(destName, lat, lng)
        .then(data => {
          if (data?.places) {
            setExplorePlaces(data.places);
          }
        })
        .catch(err => {
          console.error('Error fetching explore places:', err);
        })
        .finally(() => {
          setExploreLoading(false);
        });
    }
  }, [currentView, lastCompletedJourney]);

  // Form time verification
  const handleTimeChange = (val) => {
    setArriveTime(val);
    if (!val) {
      setTimeError('');
      return;
    }
    const [h, m] = val.split(':').map(Number);
    const selected = new Date();
    selected.setHours(h, m, 0, 0);
    const now = new Date();
    if (selected < now) {
      setTimeError('Please select a future arrival time');
    } else {
      setTimeError('');
    }
  };

  // Switch preference with animated delay
  const handlePrefChange = (pref) => {
    if (activePref === pref || isPrefChanging) return;
    setIsPrefChanging(true);
    
    // Simulate a premium thinking delay of 900ms
    setTimeout(() => {
      setActivePref(pref);
      setMattersMost(pref);
      setIsPrefChanging(false);
      
      // If results are already generated, trigger re-evaluation
      if (planResult && destination.name) {
        triggerSearchWithPref(pref);
      }
    }, 900);
  };

  // Trigger search with temporary preference override
  const triggerSearchWithPref = async (pref) => {
    let resolvedOrigin = { ...origin };
    let resolvedDest = { ...destination };

    if (!resolvedOrigin.lat && resolvedOrigin.name) {
      const coords = getLocalPlaceCoords(resolvedOrigin.name);
      if (coords) resolvedOrigin = { name: coords.name, lat: coords.lat, lng: coords.lng };
    }
    if (!resolvedDest.lat && resolvedDest.name) {
      const coords = getLocalPlaceCoords(resolvedDest.name);
      if (coords) resolvedDest = { name: coords.name, lat: coords.lat, lng: coords.lng };
    }

    setLoading(true);
    try {
      const payload = {
        origin: resolvedOrigin.name,
        destination: resolvedDest.name,
        originLat: resolvedOrigin.lat,
        originLng: resolvedOrigin.lng,
        destLat: resolvedDest.lat,
        destLng: resolvedDest.lng,
        arrivalTime: arriveTime,
        timeType: timeType,
        preference: pref
      };

      const data = await planRoute(payload);
      setPlanResult(data);
      setSelectedRouteIdx(data.recommended || 0);
      if (data.recommendCab) {
        setSelectedComfortMode(data.recommendCab);
      } else {
        setSelectedComfortMode('transit');
      }
      setSelectedAlternativeMode('transit');
    } catch (err) {
      console.error('Plan error:', err);
      showToast("Couldn't update route recommendations.");
    } finally {
      setLoading(false);
    }
  };

  // Submit route search
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    
    let resolvedOrigin = { ...origin };
    let resolvedDest = { ...destination };

    // Auto-resolve origin coordinates if missing
    if (!resolvedOrigin.lat && resolvedOrigin.name) {
      const coords = getLocalPlaceCoords(resolvedOrigin.name);
      if (coords) {
        resolvedOrigin = { name: coords.name, lat: coords.lat, lng: coords.lng };
        setOrigin(resolvedOrigin);
      } else {
        // Don't hardcode fake coordinates — inform the user
        showToast('Could not resolve origin location. Please select from the suggestions.');
        return;
      }
    }

    // Auto-resolve destination coordinates if missing
    if (!resolvedDest.lat && resolvedDest.name) {
      const coords = getLocalPlaceCoords(resolvedDest.name);
      if (coords) {
        resolvedDest = { name: coords.name, lat: coords.lat, lng: coords.lng };
        setDestination(resolvedDest);
      } else {
        // Don't hardcode fake coordinates — inform the user
        showToast('Could not resolve destination. Please select from the suggestions.');
        return;
      }
    }

    setLoading(true);
    setPlanResult(null);
    setCurrentView('results');

    try {
      const payload = {
        origin: resolvedOrigin.name,
        destination: resolvedDest.name,
        originLat: resolvedOrigin.lat,
        originLng: resolvedOrigin.lng,
        destLat: resolvedDest.lat,
        destLng: resolvedDest.lng,
        arrivalTime: arriveTime,
        timeType: timeType,
        preference: activePref
      };

      const data = await planRoute(payload);
      setPlanResult(data);
      setSelectedRouteIdx(data.recommended || 0);
      if (data.recommendCab) {
        setSelectedComfortMode(data.recommendCab);
      } else {
        setSelectedComfortMode('transit');
      }
      setSelectedAlternativeMode('transit');
    } catch (err) {
      console.error('Plan error:', err);
      // Show error toast
      showToast("Couldn't find routes. Check your connection and try again.");
      setCurrentView('home');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Toast notifier
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleShowToast = (e) => {
      if (e.detail) {
        showToast(e.detail);
      }
    };
    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  // Quick Action: Price Compare
  const handlePriceCompareClick = () => {
    if (destination.lat) {
      // State B: destination set, open Alternatives immediately
      setLoading(true);
      setCurrentView('alternatives');
      // Calculate or copy planResult if it exists, otherwise trigger planning
      if (!planResult) {
        handleSearchSubmit().then(() => setLoading(false));
      } else {
        setTimeout(() => setLoading(false), 1000);
      }
    } else {
      // State A: no destination, open sheet input
      setIsPriceCompareSheetOpen(true);
    }
  };

  const handlePriceCompareSubmit = async () => {
    if (!quickActionDest.lat) return;
    setIsPriceCompareSheetOpen(false);
    setDestination(quickActionDest);
    setLoading(true);
    setCurrentView('alternatives');

    try {
      const payload = {
        origin: origin.name || 'My Current Location',
        destination: quickActionDest.name,
        originLat: origin.lat || 28.6139,
        originLng: origin.lng || 77.2090,
        destLat: quickActionDest.lat,
        destLng: quickActionDest.lng,
        arrivalTime: arriveTime,
        timeType: timeType,
        preference: activePref
      };
      const data = await planRoute(payload);
      setPlanResult(data);
      setSelectedRouteIdx(data.recommended || 0);
      if (data.recommendCab) {
        setSelectedComfortMode(data.recommendCab);
      } else {
        setSelectedComfortMode('transit');
      }
      setSelectedAlternativeMode('transit');
    } catch {
      // Fallback
      showToast("Calculation failed, showing offline estimate.");
      // Build mock plan
      const mockAlternatives = {
        transit: { cost: 35, minutes: 40 },
        uber: { cost: 180, minutes: 25 },
        rapido: { cost: 65, minutes: 22 },
        auto: { cost: 85, minutes: 28 },
        ola: { cost: 145, minutes: 30 },
        aiVerdict: 'Take public transit to save money.',
        moneySaved: 145,
        timeDifference: 15,
        co2Saved: 1.1
      };
      setPlanResult({
        routes: [{ label: 'fastest', totalMinutes: 40, costEstimate: 35, transfers: 1, confidence: 90, legs: [] }],
        recommended: 0,
        alternatives: mockAlternatives,
        missBusAnalysis: { currentArrival: '5:50 PM', newArrival: '6:12 PM', delayMinutes: 22 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceCompareSelect = async (val) => {
    setQuickActionDest(val);
    if (!val.lat) return;
    setIsPriceCompareSheetOpen(false);
    setDestination(val);
    setLoading(true);
    setCurrentView('alternatives');

    try {
      const payload = {
        origin: origin.name || 'My Current Location',
        destination: val.name,
        originLat: origin.lat || 28.6139,
        originLng: origin.lng || 77.2090,
        destLat: val.lat,
        destLng: val.lng,
        arrivalTime: arriveTime,
        timeType: timeType,
        preference: activePref
      };
      const data = await planRoute(payload);
      setPlanResult(data);
      setSelectedRouteIdx(data.recommended || 0);
      if (data.recommendCab) {
        setSelectedComfortMode(data.recommendCab);
      } else {
        setSelectedComfortMode('transit');
      }
      setSelectedAlternativeMode('transit');
    } catch (err) {
      console.error(err);
      showToast("Calculation failed, showing offline estimate.");
      const mockAlternatives = {
        transit: { cost: 35, minutes: 40 },
        uber: { cost: 180, minutes: 25 },
        rapido: { cost: 65, minutes: 22 },
        auto: { cost: 85, minutes: 28 },
        ola: { cost: 145, minutes: 30 },
        aiVerdict: 'Take public transit to save money.',
        moneySaved: 145,
        timeDifference: 15,
        co2Saved: 1.1
      };
      setPlanResult({
        routes: [{ label: 'fastest', totalMinutes: 40, costEstimate: 35, transfers: 1, confidence: 90, legs: [] }],
        recommended: 0,
        alternatives: mockAlternatives,
        missBusAnalysis: { currentArrival: '5:50 PM', newArrival: '6:12 PM', delayMinutes: 22 }
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick Action: Live Tracking
  const handleLiveTrackingClick = () => {
    if (trackingStatus === 'active' || trackingStatus === 'reconnecting') {
      // State B: Active journey, direct to LiveJourney screen
      setCurrentView('live_journey');
    } else {
      // State A: No active journey, navigate to Tab 3 (Live Map)
      setActiveTab('live_tab');
      setCurrentView('home');
      fetchLiveBuses();
    }
  };

  const handleSaveJourneyQuick = () => {
    if (!planResult || !planResult.routes[selectedRouteIdx]) return;
    const selectedRoute = planResult.routes[selectedRouteIdx];
    const newJourney = {
      id: Date.now(),
      routeId: selectedRoute.label || 'fastest',
      origin: origin.name || 'Origin',
      originLat: origin.lat,
      originLng: origin.lng,
      destination: destination.name || 'Destination',
      destLat: destination.lat,
      destLng: destination.lng,
      legs: selectedRoute.legs || [],
      startedAt: Date.now() - selectedRoute.totalMinutes * 60000,
      completedAt: Date.now(),
      moneySaved: planResult.alternatives?.moneySaved || 0,
      timeSaved: planResult.alternatives?.timeDifference || 0,
      co2Saved: planResult.alternatives?.co2Saved || 0
    };
    saveJourney(newJourney);
    showToast('Route saved to Journeys successfully!');
  };

  const fetchLiveBuses = async () => {
    try {
      const data = await getLiveVehicles();
      setLiveVehiclesList(data.vehicles || []);
    } catch {
      // Mock live positions for Delhi bus routes
      setLiveVehiclesList([
        { vehicleId: 'DL1-534-A', routeId: '534', lat: 28.7499, lng: 77.1187, speed: 22, nextStops: ['Lajpat Nagar (3m)', 'AIIMS (8m)', 'Safdarjung (14m)'] },
        { vehicleId: 'DL-610-B', routeId: '610', lat: 28.6890, lng: 77.0890, speed: 25, nextStops: ['Sadar Bazaar (4m)', 'Connaught Place (11m)', 'Lodi Colony (19m)'] },
        { vehicleId: 'DL-764-C', routeId: '764', lat: 28.6341, lng: 77.2190, speed: 18, nextStops: ['Rajiv Chowk (2m)', 'Dwarka Sector 21 (12m)', 'IGI Airport (21m)'] }
      ]);
    }
  };

  // Meet Friends Action
  const handleAddFriend = () => {
    if (friends.length < 3) {
      setFriends([...friends, { id: Date.now(), name: '', lat: null, lng: null }]);
    }
  };

  const handleFriendLocationSelect = (id, coords) => {
    setFriends(prev => prev.map(f => f.id === id ? { ...f, ...coords } : f));
  };

  const handleCalculateMeetFriends = async () => {
    const activeFriends = friends.filter(f => f.lat);
    if (activeFriends.length === 0) return;

    setMeetLoading(true);
    setMeetMidpointResult(null);

    // Call midpoint calculator logic on backend or client
    try {
      // Call mock or API calculations
      const locations = [meetOrigin, ...activeFriends];
      const avgLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
      const avgLng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;

      // Simulated meeting points
      const midpointSpots = [
        { name: 'Rajiv Chowk Metro Station', desc: 'Central interchange hub, equal metro lines.', lat: 28.6328, lng: 77.2197, etas: ['29 min', '31 min'], fairness: 96 },
        { name: 'Connaught Place', desc: 'Central circle. Equal road travel times.', lat: 28.6315, lng: 77.2167, etas: ['32 min', '33 min'], fairness: 98 },
        { name: 'Karol Bagh', desc: 'Market hub. Easily accessible via Blue Line.', lat: 28.6513, lng: 77.1905, etas: ['35 min', '26 min'], fairness: 78 }
      ];

      setTimeout(() => {
        setMeetMidpointResult({
          spots: midpointSpots,
          midpointCoords: { lat: avgLat, lng: avgLng }
        });
        setMeetLoading(false);
      }, 1200);
    } catch {
      setMeetLoading(false);
    }
  };

  const handleSelectMeetMidpointGo = (spot) => {
    setDestination({ name: spot.name, lat: spot.lat, lng: spot.lng });
    setMeetMidpointResult(null);
    setFriends([{ id: 1, name: '', lat: null, lng: null }]);
    setCurrentView('home');
    setActiveTab('home_tab');
  };

  // Find Midpoint Action
  const handleCalculateFindMidpoint = () => {
    if (!midpointOrigin.lat || !midpointDest.lat) return;
    setMidpointLoading(true);

    const midLat = (midpointOrigin.lat + midpointDest.lat) / 2;
    const midLng = (midpointOrigin.lng + midpointDest.lng) / 2;

    setTimeout(() => {
      setMidpointResult({
        name: 'Rajiv Chowk Metro Hub',
        coords: { lat: midLat, lng: midLng },
        spots: [
          { name: 'Rajiv Chowk Metro Station', desc: 'Nearest major transit station' },
          { name: 'Connaught Place Outer Circle', desc: 'Landmark meeting square' }
        ]
      });
      setMidpointLoading(false);
    }, 1200);
  };

  const handleSelectFindMidpointGo = (spot) => {
    setDestination({ name: spot.name, lat: spot.coords?.lat || 28.6328, lng: spot.coords?.lng || 77.2197 });
    setMidpointResult(null);
    setCurrentView('home');
    setActiveTab('home_tab');
  };

  // Format countdown clock MM:SS
  const formatTimer = (secs) => {
    if (secs === 0) return 'Time to board!';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleRequestLocationImmediately = () => {
    if (!navigator.geolocation) {
      setWantsLocation(false);
      localStorage.setItem('riq_wants_location', 'false');
      showToast('Geolocation not supported. Please search manually.');
      setOnboardingStep(3);
      return;
    }

    showToast('Fetching your location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOrigin({ name: 'Locating address...', lat, lng });
        setWantsLocation(true);
        localStorage.setItem('riq_wants_location', 'true');
        setOnboardingStep(3);
        try {
          const address = await reverseGeocode(lat, lng, apiKey);
          setOrigin({ name: address, lat, lng });
          showToast('Location saved successfully!');
        } catch {
          setOrigin({ name: 'Current Location', lat, lng });
          showToast('Location saved!');
        }
      },
      (error) => {
        setWantsLocation(false);
        localStorage.setItem('riq_wants_location', 'false');
        setOnboardingStep(3);
        if (error && error.code === 1) {
          showToast('Location permission denied by browser. Please search manually.');
        } else {
          showToast('Unable to determine location. Please search manually.');
        }
      },
      { timeout: 10000 }
    );
  };

  // Onboarding completion with conditional location & notification permissions
  // notificationSkipped: true = user clicked "Skip Notifications", false = user clicked "Enable Notifications"
  const handleCompleteOnboarding = async (notificationSkipped) => {
    // 1. Save user details
    setUserName(tempName);
    setMattersMost(tempMatters);
    setUserAvatar(tempAvatar);
    setIsOnboarded(true);

    if (notificationSkipped) {
      showToast('Welcome to RouteIQ!');
    } else {
      showToast('Welcome to RouteIQ! Notifications enabled.');
    }
  };

  return (
    <div className="app-shell bg-[#F5F6FA]">

      {/* TOAST ALERTS */}
      {toastMsg && (
        <div className="toast bg-gray-900 border border-slate-800 text-white z-[10000] rounded-full px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            {toastMsg}
          </div>
        </div>
      )}

      {/* REPLAN MODAL OVERLAY */}
      {activeReplan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10001] flex items-center justify-center p-6 page-enter">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <span className="px-3 py-1 rounded-full text-[9px] font-semibold uppercase bg-emerald-500 text-slate-900 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Better Route Found
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white leading-tight">
                Switch now, save {activeReplan.data?.savedMinutes || 9} minutes.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeReplan.data?.reason || 'Bus running late due to heavy traffic. Shift to Metro.'}
              </p>
            </div>

            {/* Current vs New Card Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 border border-slate-700 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Current Route</span>
                <div className="text-lg font-semibold text-slate-300 mt-1">{activeReplan.data?.currentMinutes || 52} min</div>
              </div>
              <div className="bg-indigo-600/30 border border-indigo-500/30 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">New Route</span>
                <div className="text-lg font-semibold text-emerald-400 mt-1">
                  {activeReplan.data?.newMinutes || 43} min
                </div>
                <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">Saves {activeReplan.data?.savedMinutes || 9}m</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleReplanSelect(activeReplan.data?.newRoute);
                  setActiveReplan(null);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Switch Route
              </button>
              <button
                type="button"
                onClick={() => setActiveReplan(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Stay on current
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING OVERLAY */}
      {!isOnboarded && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F6FE] via-[#FCFDFE] to-white z-[9999] flex flex-col text-[#0F172A] overflow-y-auto page-enter font-sans select-none">
          
          {/* Main Landing Page Content */}
          <div className="flex-1 flex flex-col p-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-[#584CF4] p-2 rounded-2xl text-white shadow-md shadow-[#584CF4]/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="3">
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <path d="M9 15 L15 9" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">Route<span className="text-[#584CF4]">IQ</span></span>
              </div>
              
              <div className="bg-white border border-slate-100 rounded-full px-3 py-1.5 shadow-sm flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer hover:text-slate-800 transition-all">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>English</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            {/* Graphic Illustration Section */}
            <div className="py-3 flex items-center justify-center flex-shrink-0">
              <div className="w-full flex justify-center">
                <img 
                  src={onboardingImg} 
                  alt="RouteIQ Onboarding" 
                  className="w-full h-auto object-contain select-none pointer-events-none" 
                />
              </div>
            </div>

            {/* Feature Cards List */}
            <div className="space-y-3 mt-auto mb-4">
              {/* Card 1: Plan */}
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50/70 flex items-center justify-center text-[#584CF4] flex-shrink-0">
                    <Route className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Plan</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Find the best routes and compare options</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>

              {/* Card 2: Track */}
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50/70 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Track</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Get real-time updates on your journey</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>

              {/* Card 3: Stay Informed */}
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50/70 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">Stay Informed</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Get alerts and smart recommendations</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 flex-shrink-0 mt-auto">
              <button
                type="button"
                onClick={() => setOnboardingStep(1)}
                className="w-full bg-[#584CF4] hover:bg-[#473CD3] text-white font-bold py-4 px-6 rounded-[20px] flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-lg shadow-[#584CF4]/20 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Footer Note */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold tracking-normal mt-3 mb-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>We respect your privacy and never share your data.</span>
            </div>
          </div>

          {/* DYNAMIC POPUP OVERLAY */}
          {onboardingStep > 0 && (
            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm z-[10000] flex items-end justify-center p-4 transition-all duration-300">
              {/* Dynamic Popup Card Container */}
              <div className="bg-white w-full max-w-md rounded-t-[36px] rounded-b-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)]">
                
                {/* CSS Animation for Slide-Up and Swipe Carousel */}
                <style>{`
                  @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0.8; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                  .carousel-container {
                    display: flex;
                    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
                  }
                  .carousel-slide {
                    width: 33.333%;
                    flex-shrink: 0;
                  }
                `}</style>

                {/* Progress Indicators Header */}
                <div className="p-5 pb-2 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (onboardingStep > 1) {
                        setOnboardingStep(onboardingStep - 1);
                      } else {
                        setOnboardingStep(0);
                      }
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Progress dots / step tracking */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map(step => (
                      <div 
                        key={step} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          step === onboardingStep ? 'w-5 bg-[#584CF4]' : 'w-1.5 bg-slate-200'
                        }`} 
                      />
                    ))}
                  </div>

                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    Step {onboardingStep} of 3
                  </span>
                </div>

                {/* Swipe Carousel Layout */}
                <div className="overflow-hidden flex-1 flex flex-col">
                  <div 
                    className="carousel-container flex-1"
                    style={{ transform: `translateX(-${(onboardingStep - 1) * 33.333}%)`, width: '300%' }}
                  >
                    {/* SLIDE 1: PROFILE SETUP (Name, Avatar, Preference) */}
                    <div className="carousel-slide flex flex-col justify-between p-6 overflow-y-auto h-full">
                      <div className="space-y-5">
                        <div className="text-center space-y-1">
                          <h3 className="text-lg font-semibold text-slate-900">Personalize your journey</h3>
                          <p className="text-[11px] text-slate-400 font-semibold px-4">
                            Tell us about yourself so RouteIQ can recommend custom routes.
                          </p>
                        </div>

                        {/* Avatar Picker */}
                        <div className="space-y-2">
                          <label className="block text-[9px] font-bold text-[#584CF4] uppercase tracking-wider text-center">Choose avatar</label>
                          <div className="flex justify-center gap-4 max-w-[280px] mx-auto py-1">
                            {[
                              { id: 'male', label: 'Male' },
                              { id: 'female', label: 'Female' },
                              { id: 'neutral', label: 'Other' }
                            ].map(av => {
                              const isSelected = tempAvatar === av.id;
                              return (
                                <button
                                  key={av.id}
                                  type="button"
                                  onClick={() => setTempAvatar(av.id)}
                                  className={`relative w-14 h-14 rounded-full overflow-hidden transition-all p-0.5 bg-white ${
                                    isSelected 
                                      ? 'ring-2 ring-[#584CF4] ring-offset-2 scale-105 shadow-md' 
                                      : 'hover:scale-105 border border-slate-200'
                                  }`}
                                >
                                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50">
                                    <Avatar type={av.id} className="w-full h-full" />
                                  </div>
                                  {isSelected && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#584CF4] rounded-full border border-white flex items-center justify-center text-white text-[8px] font-semibold">
                                      ✓
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-[#584CF4] uppercase tracking-wider">Your Name</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              required
                              placeholder="Enter your name"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="w-full bg-[#FAFBFF] border border-slate-200/80 text-slate-900 placeholder-slate-400 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex-shrink-0">
                        <button
                          type="button"
                          disabled={!tempName.trim()}
                          onClick={() => setOnboardingStep(2)}
                          className="w-full bg-[#584CF4] hover:bg-[#473CD3] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-lg shadow-[#584CF4]/15 active:scale-[0.98]"
                        >
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SLIDE 2: LOCATION SERVICES PERMISSION */}
                    <div className="carousel-slide flex flex-col justify-between p-6 overflow-y-auto h-full">
                      <div className="flex-1 flex flex-col justify-center items-center py-4 text-center">
                        <div className="relative w-36 h-36 mx-auto flex items-center justify-center flex-shrink-0 mb-6">
                          <div className="absolute w-28 h-28 rounded-full border-2 border-indigo-200/50 animate-ping" />
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-md bg-indigo-50 flex items-center justify-center z-10">
                            <MapPin className="w-10 h-10 text-[#584CF4] fill-current animate-bounce" />
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900">Enable Location Services</h3>
                        <p className="text-[11px] text-slate-400 font-semibold px-4 mt-1 leading-relaxed max-w-[280px]">
                          Allow RouteIQ to access your location for real-time recommendations, routes, and transit times.
                        </p>

                        <div className="w-full max-w-[250px] mx-auto space-y-2.5 text-left mt-6">
                          {[
                            'Find closest bus & metro stations',
                            'Real-time distance tracking',
                            'Instant destination estimates'
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#584CF4] flex-shrink-0 border border-indigo-50">
                                <span className="text-[9px] font-semibold">✓</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 flex-shrink-0 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            handleRequestLocationImmediately();
                          }}
                          className="w-full bg-[#584CF4] hover:bg-[#473CD3] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-lg shadow-[#584CF4]/15 active:scale-[0.98]"
                        >
                          <Navigation className="w-4 h-4 fill-current" />
                          Use My Location
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setWantsLocation(false);
                            localStorage.setItem('riq_wants_location', 'false');
                            setOnboardingStep(3);
                            showToast("Location skipped. We will configure manual entry.");
                          }}
                          className="w-full py-2.5 text-center text-[#584CF4] hover:text-[#473CD3] font-semibold text-xs uppercase tracking-wider transition-colors"
                        >
                          Enter Manually Later
                        </button>
                      </div>
                    </div>

                    {/* SLIDE 3: NOTIFICATION PERMISSION */}
                    <div className="carousel-slide flex flex-col justify-between p-6 overflow-y-auto h-full">
                      <div className="flex-1 flex flex-col justify-center items-center py-4 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-5 shadow-sm border border-indigo-100 animate-pulse">
                          🔔
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Stay Informed</h3>
                        <p className="text-[11px] text-slate-400 font-semibold px-4 mt-1 leading-relaxed max-w-[280px]">
                          Get alert reminders and transit delay warnings delivered right to your device.
                        </p>

                        <div className="w-full max-w-[250px] mx-auto space-y-2.5 text-left mt-6">
                          {[
                            'Bus & metro arrival reminders',
                            'Real-time traffic & weather alerts',
                            'AI delay warnings'
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#584CF4] flex-shrink-0 border border-indigo-50">
                                <span className="text-[9px] font-semibold">✓</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 flex-shrink-0 pt-4">
                        <button
                          type="button"
                          onClick={async () => {
                            if ('Notification' in window) {
                              try {
                                await Notification.requestPermission();
                              } catch (e) {
                                console.warn('Notification permission request failed:', e);
                              }
                            }
                            handleCompleteOnboarding(false);
                          }}
                          className="w-full bg-[#584CF4] hover:bg-[#473CD3] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-lg shadow-[#584CF4]/15 active:scale-[0.98]"
                        >
                          Enable Notifications
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            handleCompleteOnboarding(true);
                          }}
                          className="w-full py-2.5 text-center text-rose-500 hover:text-rose-600 font-semibold text-xs uppercase tracking-wider transition-colors"
                        >
                          Skip Notifications
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW: HOME & TABS */}
      {currentView === 'home' && isOnboarded && (
        <div className="h-full flex flex-col justify-between relative page-enter">
          <div className="screen-content flex-1 flex flex-col">
            
            {/* TAB 1: HOME DASHBOARD */}
            {activeTab === 'home_tab' && (
              <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                {/* Upper Map Section (38%) */}
                <div className="h-[38%] relative bg-slate-200">
                  <MapView 
                    height="100%" 
                    polyline={planResult?.routes?.[selectedRouteIdx]?.polyline || []}
                    originCoords={origin.lat ? [origin.lat, origin.lng] : null}
                    destCoords={destination.lat ? [destination.lat, destination.lng] : null}
                    showUserLocation={true}
                    userAvatar={userAvatar}
                    distanceKm={planResult?.distanceKm}
                  />



                  {/* Floating Notification Button (Top Right) */}
                  <div className="absolute top-4 right-4 z-[400] flex flex-col items-end">
                    <button 
                      type="button"
                      onClick={() => {
                        setActiveTab('alerts_tab');
                        clearUnreadAlerts();
                      }}
                      className={`w-10 h-10 bg-white rounded-full shadow-lg border flex items-center justify-center text-slate-700 hover:text-[#584CF4] transition-all active:scale-95 ${
                        (unreadAlerts > 0 || (localNewsData.liveUpdates && localNewsData.liveUpdates.some(u => (u.status || '').toLowerCase() !== 'on time'))) 
                          ? 'bell-glow-effect ring-2 ring-indigo-500/20' 
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="relative">
                        <Bell className={`w-5 h-5 ${(unreadAlerts > 0 || (localNewsData.liveUpdates && localNewsData.liveUpdates.some(u => (u.status || '').toLowerCase() !== 'on time'))) ? 'bell-ring-active text-[#584CF4]' : ''}`} />
                        {(unreadAlerts > 0 || (localNewsData.liveUpdates && localNewsData.liveUpdates.some(u => (u.status || '').toLowerCase() !== 'on time'))) && (
                          <span className="absolute -top-1 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Floating Traffic Status Alert Pill */}
                  <div className="absolute top-16 left-4 bg-white/95 backdrop-blur-sm border border-slate-100/80 rounded-full px-3.5 py-1.5 flex items-center gap-2 shadow-md z-[400] text-[9px] font-semibold text-slate-700">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      getTrafficStatus() === 'Heavy traffic detected' 
                        ? 'bg-rose-500 animate-pulse' 
                        : getTrafficStatus() === 'Moderate traffic'
                          ? 'bg-amber-400' 
                          : 'bg-emerald-400'
                    }`} />
                    <span className="tracking-wide">
                      {getTrafficStatus() === 'Heavy traffic detected' && 'HEAVY TRAFFIC: 12M DELAY ON ROUTE'}
                      {getTrafficStatus() === 'Moderate traffic' && 'MODERATE TRAFFIC: NORMAL FLOW'}
                      {getTrafficStatus() === 'Clear roads' && 'CLEAR ROADS: FLOWING FREELY'}
                    </span>
                  </div>

                  {/* Floating AI Monitor Active Pill */}
                  <div className="absolute top-16 right-4 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md z-[400] text-[9px] font-semibold text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="uppercase tracking-wider">AI Monitor Active</span>
                  </div>



                  {/* Active journey resume banner */}
                  {route && (
                    <button
                      onClick={() => setCurrentView('live_journey')}
                      className="absolute bottom-4 left-4 right-16 bg-[#584CF4] text-white p-3 rounded-2xl shadow-xl z-[400] flex justify-between items-center hover:bg-[#473CD3] transition-all animate-bounce-soft"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="live-dot" />
                        Active Journey in Progress
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Lower controls card (62%) */}
                <div className="h-[62%] bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100 p-5 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-5">
                    {/* Greeting Header & Profile */}
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 leading-tight">
                          Where do you want to go today?
                        </h2>
                      </div>
                      {/* Weather & AQI Display */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 bg-[#FAFAFC] border border-slate-100 rounded-2xl px-3 py-1.5 shadow-sm">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#584CF4]">
                          <span className="text-xs">☀️</span>
                          <span>{localNewsData.temp || '32°C'}</span>
                        </div>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md border ${localNewsData.aqiColor || 'text-amber-600 bg-amber-50 border-amber-100'} shadow-sm`}>
                          AQI {localNewsData.aqi || '112'} • {localNewsData.aqiClass || 'Moderate'}
                        </span>
                      </div>
                    </div>


                    {/* From/To Unified Input Card (Plan Journey) */}
                    <form onSubmit={handleSearchSubmit} className="space-y-4">
                      <div className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-[24px] p-2 space-y-1 shadow-sm">
                        <div className="relative">
                          <PlaceSearch
                             value={origin}
                             onChange={setOrigin}
                             onSelect={setOrigin}
                             placeholder="Your location"
                             icon={MapPin}
                             iconColor="text-[#10B981]"
                             showMyLocation={true}
                             variant="borderless"
                          />
                        </div>
                        
                        {/* Divider Line & Swap Button */}
                        <div className="h-[1px] bg-slate-200/70 mx-3 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const temp = origin;
                              setOrigin(destination);
                              setDestination(temp);
                            }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-[#E2E8F0] rounded-full shadow-md flex items-center justify-center text-slate-600 hover:text-[#584CF4] transition-all hover:shadow-lg active:scale-90 z-[300]"
                          >
                            <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                            </svg>
                          </button>
                        </div>

                        <div className="relative">
                          <PlaceSearch
                            value={destination}
                            onChange={setDestination}
                            onSelect={setDestination}
                            placeholder="Where to?"
                            icon={MapPin}
                            iconColor="text-[#EF4444]"
                            variant="borderless"
                          />
                        </div>
                      </div>

                      {/* Time & Preference selector */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Time selector */}
                        <div className="flex flex-col justify-between">
                          <button
                            type="button"
                            onClick={() => setTimeType(timeType === 'leave_by' ? 'arrive_by' : 'leave_by')}
                            className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1 focus:outline-none hover:text-[#584CF4] transition-colors"
                          >
                            <span>{timeType === 'leave_by' ? 'Leave By' : 'Arrive By'}</span>
                            <span className="text-[8px] bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-[#584CF4] px-1 py-0.2 rounded transition-all">swap</span>
                          </button>
                          
                          <div className="flex items-center justify-between bg-slate-100/75 rounded-2xl p-1.5 min-h-[44px] px-3.5 border border-transparent hover:border-slate-200 transition-all duration-300">
                            <div className="flex items-center gap-2 w-full">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <input
                                type="time"
                                value={arriveTime}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                className="bg-transparent border-none text-[13px] font-semibold text-slate-800 p-0 focus:ring-0 focus:outline-none cursor-pointer w-full"
                              />
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                          </div>
                        </div>
                        
                        {/* Preference selector */}
                        <div className="flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Preference</span>
                            {isPrefChanging && (
                              <span className="text-[8px] font-semibold text-[#584CF4] animate-pulse flex items-center gap-0.5">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                AI...
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center gap-1 bg-slate-100/75 rounded-2xl p-1 relative min-h-[44px]">
                            {/* Sliding Background Pill */}
                            <div 
                              className={`absolute top-1 bottom-1 left-1 w-[calc(33.33%-2.7px)] rounded-[12px] transition-all duration-300 ease-out shadow-[0_2px_8px_rgba(0,0,0,0.06)] border pointer-events-none ${
                                activePref === 'time'
                                  ? 'bg-blue-50 border-blue-200/60'
                                  : activePref === 'money'
                                    ? 'bg-emerald-50 border-emerald-200/60'
                                    : 'bg-amber-50 border-amber-200/60'
                              }`}
                              style={{ transform: `translateX(${['time', 'money', 'comfort'].indexOf(activePref) * 100}%)` }}
                            />
                            
                            {[
                              { id: 'time', label: 'Fast', icon: <Zap className="w-4 h-4" /> },
                              { id: 'money', label: 'Cheap', icon: <Coins className="w-4 h-4" /> },
                              { id: 'comfort', label: 'Cozy', icon: <Sparkles className="w-4 h-4" /> }
                            ].map(pref => {
                              const isActive = activePref === pref.id;
                              let activeColorClass = '';
                              if (isActive) {
                                if (pref.id === 'time') activeColorClass = 'text-blue-600 font-bold scale-[1.02]';
                                else if (pref.id === 'money') activeColorClass = 'text-emerald-600 font-bold scale-[1.02]';
                                else activeColorClass = 'text-amber-600 font-bold scale-[1.02]';
                              } else {
                                activeColorClass = 'text-slate-500 hover:text-slate-800';
                              }
                              return (
                                <button
                                  key={pref.id}
                                  type="button"
                                  onClick={() => handlePrefChange(pref.id)}
                                  className={`flex-1 py-2 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 relative z-20 transition-all duration-300 ${activeColorClass}`}
                                >
                                  {pref.icon}
                                  <span>{pref.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {timeError && (
                        <p className="text-[10px] text-rose-500 font-semibold animate-pulse mt-1">
                          * {timeError}
                        </p>
                      )}

                      {/* Main Generate Smart Route CTA */}
                      <button
                        type="submit"
                        disabled={!destination.name || !!timeError || loading}
                        className="w-full relative overflow-hidden bg-gradient-to-r from-[#584CF4] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white font-semibold py-4 px-6 rounded-[22px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all text-xs uppercase tracking-wider z-10"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Finding Smart Journey...
                          </>
                        ) : (
                          <>
                            <span>Plan Smart Journey</span>
                            <ArrowRight className="w-4 h-4" />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-80 pointer-events-none">
                              <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                            </div>
                          </>
                        )}
                      </button>
                    </form>

                    {/* AI Insights Grid */}
                    <div className={`transition-all duration-300 ${loadingNews ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                      <div className="flex items-center justify-between px-1 mb-2.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI Mobility Insights</span>
                        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#584CF4] bg-indigo-50 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Live Monitor
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Insights Card 1 */}
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm min-h-[96px] hover:border-indigo-200 transition-all duration-300">
                          <div className="space-y-1">
                            <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider block">
                              {localNewsData.infoCard1Title}
                            </span>
                            <span className="text-base font-bold text-slate-800 block">
                              {localNewsData.infoCard1Val}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {localNewsData.infoCard1Desc}
                            </p>
                          </div>
                          <div className="absolute bottom-2 right-2.5 opacity-40 pointer-events-none">
                            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                          </div>
                        </div>

                        {/* Insights Card 2 */}
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-3.5 flex flex-col justify-between relative overflow-hidden shadow-sm min-h-[96px] hover:border-indigo-200 transition-all duration-300">
                          <div className="space-y-1">
                            <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider block">
                              {localNewsData.infoCard2Title}
                            </span>
                            <span className="text-base font-bold text-slate-800 block">
                              {localNewsData.infoCard2Val}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {localNewsData.infoCard2Desc}
                            </p>
                          </div>
                          <div className="absolute bottom-2 right-2.5 opacity-40 pointer-events-none">
                            <Clock className="w-4 h-4 text-indigo-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions grid */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quick Tools</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Track Transit', icon: <Bus className="w-4 h-4" />, bg: 'bg-rose-50/70', color: 'text-rose-500', border: 'border-rose-100/30', action: handleLiveTrackingClick },
                          { label: 'Meet Friends', icon: <Users className="w-4 h-4" />, bg: 'bg-indigo-50/70', color: 'text-indigo-500', border: 'border-indigo-100/30', action: () => setCurrentView('meet_friends') },
                          { label: 'Find Midpoint', icon: <Compass className="w-4 h-4" />, bg: 'bg-amber-50/70', color: 'text-amber-600', border: 'border-amber-100/30', action: () => setCurrentView('find_midpoint') },
                          { label: 'Compare Costs', icon: <span className="text-[13px] font-bold">₹</span>, bg: 'bg-emerald-50/70', color: 'text-emerald-600', border: 'border-emerald-100/30', action: handlePriceCompareClick }
                        ].map((item, i) => (
                          <button 
                            key={i} 
                            type="button"
                            onClick={item.action} 
                            className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] rounded-[18px] shadow-sm hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200 active:scale-[0.98]"
                          >
                            <div className={`w-8 h-8 rounded-[12px] ${item.bg} ${item.color} ${item.border} border flex items-center justify-center flex-shrink-0`}>
                              {item.icon}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 tracking-wide text-left">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JOURNEYS (History) */}
            {activeTab === 'journeys_tab' && (
              <div className="flex-1 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveTab('home_tab')}
                      className="p-2 bg-white rounded-full border border-slate-100 shadow-sm hover:bg-slate-50 text-slate-700 transition-all active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 leading-none">Trip History</h2>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 block">Past journeys & savings</span>
                    </div>
                  </div>
                </div>

                {journeys.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4">
                      🚌
                    </div>
                    <h3 className="text-base font-bold text-gray-950">No journeys yet</h3>
                    <p className="text-xs text-gray-400 max-w-[200px] mt-1.5 leading-relaxed">
                      Plan your first route from the Home screen to track your mobility savings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {journeys.map((j) => {
                      const isExpanded = expandedJourneys.includes(j.id);
                      const originName = j.origin?.name || j.origin;
                      const destName = j.destination?.name || j.destination;

                      return (
                        <div key={j.id} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-2.5">
                          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              j.routeId === 'fastest'
                                ? 'bg-blue-50 border-blue-100 text-blue-600'
                                : j.routeId === 'cheapest'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : 'bg-amber-50 border-amber-100 text-amber-600'
                            }`}>
                              {j.routeId === 'fastest' ? '⚡ Fastest' : j.routeId === 'cheapest' ? '💰 Cheapest' : '😌 Comfort'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(j.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          
                          <div 
                            className="cursor-pointer space-y-1.5"
                            onClick={() => {
                              setExpandedJourneys(prev => 
                                prev.includes(j.id) ? prev.filter(id => id !== j.id) : [...prev, j.id]
                              );
                            }}
                          >
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1.5 text-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="font-bold truncate max-w-[220px]">{originName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span className="font-bold truncate max-w-[220px]">{destName}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-center pt-1">
                              <span className="text-[8px] text-indigo-600 font-semibold uppercase tracking-wider">
                                {isExpanded ? '▲ Hide Route Steps' : '▼ Show Route Steps'}
                              </span>
                            </div>
                          </div>

                          {isExpanded && j.legs && j.legs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-50 space-y-2 bg-slate-50/50 p-3 rounded-2xl">
                              {j.legs.map((leg, legIdx) => (
                                <div key={legIdx} className="flex gap-2 text-[10px] items-start">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase ${
                                    leg.mode === 'walk' ? 'bg-emerald-50 text-emerald-600' :
                                    leg.mode === 'bus' ? 'bg-blue-50 text-blue-600' :
                                    leg.mode === 'flight' ? 'bg-indigo-50 text-indigo-600' :
                                    leg.mode === 'train' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {leg.mode}
                                  </span>
                                  <div className="text-gray-600 font-semibold flex-1 leading-normal">
                                    {leg.instruction} <span className="text-gray-400">({leg.minutes}m)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-[10px] text-gray-500 font-bold">
                            <div>Saved: <span className="text-emerald-600">₹{j.moneySaved}</span> • {j.co2Saved?.toFixed(1)}kg CO₂</div>
                            <button
                              onClick={() => {
                                setOrigin({
                                  name: originName,
                                  lat: j.origin?.lat || 28.6139,
                                  lng: j.origin?.lng || 77.2090
                                });
                                setDestination({
                                  name: destName,
                                  lat: j.destination?.lat || 28.6328,
                                  lng: j.destination?.lng || 77.2197
                                });
                                setActiveTab('home_tab');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1.5 flex items-center gap-0.5 transition-all active:scale-95 text-[9px] uppercase tracking-wider font-bold"
                            >
                              Repeat
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TRACK BUS — 3 Modes */}
            {activeTab === 'live_tab' && (
              <div className="flex-1 flex flex-col">
                {/* Map Section (40%) */}
                <div className="h-[40%] relative bg-slate-200">
                  <MapView height="100%" vehicles={liveVehiclesList.filter(v => !trackBusSearch || v.routeId === trackBusSearch)} userAvatar={userAvatar} />
                </div>

                {/* Track Bus Panel (60%) */}
                <div className="h-[60%] bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100 p-5 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveTab('home_tab')}
                          className="p-2 bg-white rounded-full border border-slate-100 shadow-sm hover:bg-slate-50 text-slate-700 transition-all active:scale-95"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                          <h2 className="text-base font-semibold text-slate-900 leading-none">Track Bus</h2>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">Live Delhi transit tracking</span>
                        </div>
                      </div>
                      <button onClick={fetchLiveBuses} className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl text-indigo-600 active:scale-95 transition-all">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 3 Mode Tabs */}
                    <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                      {[
                        { id: 'search', label: 'Search', icon: '🔍' },
                        { id: 'nearby', label: 'Nearby', icon: '📍' },
                        { id: 'route', label: 'My Route', icon: '🛣️' }
                      ].map(m => (
                        <button key={m.id} onClick={() => setTrackBusMode(m.id)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all ${trackBusMode === m.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Mode 1: Search by Bus Number */}
                    {trackBusMode === 'search' && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                          <Bus className="w-5 h-5 text-slate-400" />
                          <input
                            type="text" placeholder="Enter bus number (e.g. 534)"
                            value={trackBusSearch} onChange={(e) => setTrackBusSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-bold text-slate-800 placeholder-slate-400 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Nearby */}
                    {trackBusMode === 'nearby' && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-indigo-600">Showing buses near your current location</span>
                      </div>
                    )}

                    {/* Mode 3: My Route */}
                    {trackBusMode === 'route' && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                        <span className="text-[10px] font-bold text-amber-700">Tracking buses on your planned route</span>
                      </div>
                    )}

                    {/* Bus Cards */}
                    <div className="space-y-3">
                      {(trackBusSearch
                        ? liveVehiclesList.filter(v => v.routeId.toLowerCase().includes(trackBusSearch.toLowerCase()))
                        : liveVehiclesList
                      ).map((v) => (
                        <div key={v.vehicleId} onClick={() => setSelectedTrackBusId(v.vehicleId)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedTrackBusId === v.vehicleId ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-xl text-xs">{v.routeId}</div>
                              <div>
                                <div className="text-xs font-bold text-slate-800">Bus {v.vehicleId.slice(-3)}</div>
                                <div className="text-[9px] text-slate-400 font-semibold">Speed: {v.speed} km/h</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase">On Time</span>
                              <div className="text-[9px] text-slate-400 font-bold mt-1">{Math.round(v.speed > 0 ? 3 + Math.random() * 5 : 8)} min away</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed border-slate-100">
                            <div className="text-center">
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Occupancy</div>
                              <div className="text-[10px] font-semibold text-slate-700">{v.speed > 20 ? 'Low' : v.speed > 10 ? 'Medium' : 'High'}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Next Stop</div>
                              <div className="text-[10px] font-semibold text-slate-700">Stop {Math.round(Math.random() * 8 + 2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Delay</div>
                              <div className="text-[10px] font-semibold text-emerald-600">None</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {liveVehiclesList.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs font-bold">Loading live bus data...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALERTS FEED */}
            {activeTab === 'alerts_tab' && (
              <div className="flex-1 p-6 space-y-5 overflow-y-auto bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveTab('home_tab')}
                      className="p-2 bg-white rounded-full border border-slate-100 shadow-sm hover:bg-slate-50 text-slate-700 transition-all active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 leading-none">Notifications</h2>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 block">Warnings & transit updates</span>
                    </div>
                  </div>
                  {alerts.length > 0 && (
                    <button 
                      onClick={clearUnreadAlerts}
                      className="text-[10px] font-bold text-[#584CF4] hover:text-[#473CD3] transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Part 1: Journey Alerts (if any) */}
                  {alerts.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Journey Warnings</h3>
                      <div className="space-y-3">
                        {alerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-4 rounded-3xl border flex gap-3 shadow-sm ${
                              alert.type === 'replan' 
                                ? 'bg-amber-50/70 border-amber-100' 
                                : 'bg-[#EEF2FF] border-[#C7D2FE]'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              alert.type === 'replan' 
                                ? 'bg-amber-100 text-amber-600' 
                                : 'bg-indigo-100 text-indigo-600'
                            }`}>
                              {alert.type === 'replan' ? <RefreshCw className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-gray-900">{alert.title}</h4>
                              <p className="text-xs text-gray-750 mt-0.5 leading-snug">{alert.message}</p>
                              <span className="text-[9px] text-gray-400 font-bold block mt-1.5">
                                {new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Part 2: Live Transit Status Updates */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">
                      Transit Status ({localNewsData.city})
                    </h3>
                    
                    {(!localNewsData.liveUpdates || localNewsData.liveUpdates.length === 0) ? (
                      <div className="bg-white rounded-3xl p-5 text-center border border-gray-100 shadow-sm text-slate-400 text-xs font-bold">
                        No live transit status updates at this location.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {localNewsData.liveUpdates.map((update, idx) => {
                          const isBus = (update.type || '').toLowerCase() === 'bus';
                          const isOnTime = update.status === 'On Time';
                          return (
                            <div 
                              key={idx} 
                              className={`bg-white border border-slate-100/95 rounded-2xl p-4 flex items-center justify-between shadow-sm border-l-4 ${
                                isOnTime ? 'border-l-emerald-500' : 'border-l-rose-500'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {isBus ? (
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-inner border border-blue-100/40">
                                    <Bus className="w-4.5 h-4.5" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-inner border border-purple-100/40">
                                    <Train className="w-4.5 h-4.5" />
                                  </div>
                                )}
                                
                                <div className="space-y-0.5 min-w-0 flex-1 text-left">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                      isOnTime ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60' : 'bg-rose-50 text-rose-600 border border-rose-100/60'
                                    }`}>
                                      {update.status}
                                    </span>
                                    <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-indigo-100/40 truncate max-w-[100px]">
                                      {update.route}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800">
                                      {update.line}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold leading-normal">
                                    {update.desc}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end justify-center min-w-[55px] ml-2">
                                <span className={`text-xs font-semibold ${isOnTime ? 'text-emerald-600' : 'text-rose-500'} flex items-center gap-0.5`}>
                                  <Clock className="w-3 h-3 opacity-80" />
                                  {update.time}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {alerts.length === 0 && (!localNewsData.liveUpdates || localNewsData.liveUpdates.length === 0) && (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-xl mb-4">
                      🔔
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No notifications</h3>
                    <p className="text-xs text-gray-400 max-w-[200px] mt-1.5 leading-relaxed">
                      Warnings and transit status updates will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: PROFILE SETTINGS */}
            {activeTab === 'profile_tab' && (
              <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
                {/* Hero Header Area with Skyline / Background */}
                <div className="relative w-full h-64 bg-[#584CF4] overflow-hidden flex-shrink-0 rounded-b-[40px] shadow-sm">
                  {/* Skyline / decorative background SVG */}
                  <svg className="absolute bottom-0 left-0 w-full h-32 text-indigo-400/40 fill-current pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <rect x="20" y="45" width="25" height="55" rx="3" />
                    <rect x="40" y="30" width="22" height="70" rx="3" />
                    <rect x="75" y="55" width="30" height="45" rx="3" />
                    <rect x="100" y="65" width="18" height="35" rx="2" />
                    <rect x="270" y="60" width="22" height="40" rx="3" />
                    <rect x="295" y="35" width="25" height="65" rx="3" />
                    <rect x="325" y="50" width="30" height="50" rx="3" />
                  </svg>
                  
                  {/* Decorative sparkles */}
                  <div className="absolute top-6 left-10 text-white/40 text-sm font-mono">+</div>
                  <div className="absolute top-12 right-12 text-white/30 text-lg font-mono">✦</div>
                  <div className="absolute top-20 left-1/4 text-white/20 text-xs font-mono">✦</div>
                  
                  {/* Header Title */}
                  <div className="absolute top-6 w-full flex items-center justify-between px-6 z-30">
                    <button
                      onClick={() => setActiveTab('home_tab')}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2.5 active:scale-95 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xs font-semibold text-white uppercase tracking-widest opacity-90 mx-auto -ml-10">Your Profile</h2>
                  </div>

                  {/* Central Avatar */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="relative w-[110px] h-[110px] rounded-full overflow-hidden border-[5px] border-white bg-indigo-50 shadow-xl z-10 flex items-center justify-center">
                      <Avatar type={userAvatar} className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="px-6 py-8 space-y-7 -mt-4 relative z-20">
                  
                  {/* Avatar Gender Selection */}
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 text-center">Avatar Style</label>
                    <div className="flex bg-white p-1.5 rounded-[20px] shadow-sm border border-slate-100 max-w-[280px] mx-auto">
                      {[
                        { id: 'male', label: 'Male' },
                        { id: 'female', label: 'Female' },
                        { id: 'neutral', label: 'Other' }
                      ].map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setUserAvatar(av.id)}
                          className={`flex-1 py-3 text-[11px] font-semibold rounded-2xl transition-all ${
                            userAvatar === av.id
                              ? 'bg-[#584CF4] text-white shadow-md scale-[1.02]'
                              : 'bg-transparent text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {av.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Username Input */}
                  <div className="space-y-2 max-w-[320px] mx-auto">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Display Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => {
                          setTempName(e.target.value);
                          setUserName(e.target.value);
                        }}
                        onBlur={(e) => setUserName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-[20px] px-5 py-4 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#584CF4] focus:border-transparent shadow-sm transition-all placeholder:text-slate-300"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>

                  {/* Commuting Preference Grid */}
                  <div className="space-y-2 max-w-[320px] mx-auto">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Primary Goal</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { 
                          id: 'time', 
                          label: 'Fastest', 
                          iconClass: 'text-blue-500 fill-current',
                          activeClass: 'bg-blue-50/50 border-blue-500 text-blue-600 ring-blue-500/20',
                          icon: (
                            <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          )
                        },
                        { 
                          id: 'money', 
                          label: 'Save', 
                          iconClass: 'text-emerald-500',
                          activeClass: 'bg-emerald-50/50 border-emerald-500 text-emerald-600 ring-emerald-500/20',
                          icon: (
                            <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                          )
                        },
                        { 
                          id: 'comfort', 
                          label: 'Comfort', 
                          iconClass: 'text-amber-500',
                          activeClass: 'bg-amber-50/50 border-amber-500 text-amber-600 ring-amber-500/20',
                          icon: (
                            <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          )
                        }
                      ].map(item => {
                        const isActive = mattersMost === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMattersMost(item.id)}
                            className={`p-3 rounded-3xl border transition-all flex flex-col items-center justify-center gap-2.5 h-[100px] ${
                              isActive 
                                ? `${item.activeClass} shadow-sm ring-2 scale-[1.02] font-bold` 
                                : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm text-slate-500'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? '' : 'bg-slate-50'} ${item.iconClass}`}>
                              {item.icon}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="pt-6">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">Achievements</h3>
                    <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto">
                      {[
                        { icon: '🧭', label: 'Smart Commuter', desc: '5+ journeys', unlocked: journeys.length >= 5 },
                        { icon: '🌿', label: 'Eco Traveler', desc: 'Saved CO₂', unlocked: journeys.length >= 3 },
                        { icon: '🚇', label: 'Transit Explorer', desc: 'Tried 3 modes', unlocked: journeys.length >= 2 }
                      ].map((a, i) => (
                        <div key={i} className={`rounded-2xl border p-3 text-center transition-all ${a.unlocked ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                          <div className="text-2xl mb-1">{a.icon}</div>
                          <div className="text-[9px] font-semibold text-slate-700 uppercase tracking-wider">{a.label}</div>
                          <div className="text-[8px] font-bold text-slate-400 mt-0.5">{a.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reset App Data Button */}
                  <div className="pt-10 pb-4 max-w-[320px] mx-auto">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 font-semibold py-4 rounded-[20px] text-xs uppercase tracking-widest transition-colors shadow-sm active:scale-95"
                    >
                      Reset App Data
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* BOTTOM TABS NAV */}
          <nav className="flex-shrink-0 bg-white border-t border-gray-100 shadow-nav">
            <div className="flex">
              {[
                { id: 'home_tab', icon: Bus, label: 'Home' },
                { id: 'journeys_tab', icon: Clock, label: 'Journeys' },
                { id: 'live_tab', icon: Navigation, label: 'Live' },
                { id: 'alerts_tab', icon: AlertTriangle, label: 'Alerts', badge: unreadAlerts > 0 },
                { id: 'profile_tab', icon: null, label: 'Profile' }
              ].map(({ id, icon: Icon, label, badge }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === 'alerts_tab') clearUnreadAlerts();
                    if (id === 'live_tab') fetchLiveBuses();
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3.5 gap-0.5 relative transition-all"
                >
                  <div className="relative">
                    {id === 'profile_tab' ? (
                      <div className={`w-[22px] h-[22px] rounded-full overflow-hidden border ${
                        activeTab === id ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-300 bg-gray-50'
                      }`}>
                        <Avatar type={userAvatar} className="w-full h-full" />
                      </div>
                    ) : (
                      <Icon
                        size={20}
                        className={activeTab === id ? 'text-indigo-600' : 'text-gray-400'}
                      />
                    )}
                    {badge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${activeTab === id ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* VIEW: ROUTE RESULTS */}
      {currentView === 'results' && (
        <div className="h-full flex flex-col justify-between relative page-enter bg-[#F8F9FD]">
          {/* Map Section */}
          <div className="h-[35%] relative bg-slate-200 shadow-md">
            <MapView 
              height="100%" 
              originCoords={origin.lat ? [origin.lat, origin.lng] : null}
              destCoords={destination.lat ? [destination.lat, destination.lng] : null}
              polyline={planResult?.routes?.[selectedRouteIdx]?.polyline || []}
              vehicles={resultsVehicles}
              showUserLocation={true}
              userAvatar={userAvatar}
              distanceKm={planResult?.distanceKm}
            />

            {/* Back Button (Top Left) */}
            <button
              onClick={() => setCurrentView('home')}
              className="absolute top-4 left-4 bg-white/95 border border-slate-100 shadow-md rounded-full p-2.5 hover:bg-white z-[400] active:scale-95 transition-all text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Heart Button (Top Right) */}
            <button
              onClick={handleSaveJourneyQuick}
              className="absolute top-4 right-4 bg-white/95 border border-slate-100 shadow-md rounded-full p-2.5 hover:bg-white z-[400] active:scale-95 transition-all text-rose-500 hover:text-rose-600"
              title="Save to history"
            >
              <Heart className="w-5 h-5 fill-current" />
            </button>

            {/* Floating Location Card Overlays */}
            {origin.name && (
              <div className="absolute bottom-4 left-4 bg-white/95 border border-slate-100 rounded-full px-3.5 py-2 shadow-lg flex items-center gap-2 z-[400]">
                <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">{origin.name.split(',')[0]}</span>
              </div>
            )}

            {destination.name && (
              <div className="absolute bottom-4 right-4 bg-white/95 border border-slate-100 rounded-full px-3.5 py-2 shadow-lg flex items-center gap-2 z-[400]">
                <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">{destination.name.split(',')[0]}</span>
              </div>
            )}

            {/* Floating Route Info tag along path */}
            {planResult?.routes?.[selectedRouteIdx] && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-full px-3.5 py-1.5 flex items-center gap-2 shadow-md z-[400] text-[10px] font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {planResult.routes[selectedRouteIdx].legs?.find(l => l.mode === 'bus')?.line || 'Bus 534'} In 3 min
              </div>
            )}
          </div>

          {/* Details Card Panel */}
          <div className="h-[65%] bg-white rounded-t-[32px] shadow-2xl border-t border-gray-100 p-5 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-5">
              {loading && <SkeletonLoader count={3} />}

              {!loading && planResult && (
                <>
                  {/* 1. AI Recommendation Section */}
                  <div className="bg-gradient-to-r from-indigo-50/40 to-violet-50/30 border border-indigo-100/30 rounded-[24px] p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="space-y-1 max-w-[75%] text-left pl-1">
                      <div className="text-[10px] font-bold text-[#584CF4] uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#584CF4]" />
                        AI Recommendation
                      </div>
                      <h3 className="text-[13px] font-bold text-slate-800 leading-snug">
                        Save ₹{planResult.alternatives?.moneySaved || 132} by taking public transit,
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                        despite a {planResult.alternatives?.timeDifference || 8} min longer ride.
                      </p>
                    </div>
                    
                    {/* Cute Robot Graphic */}
                    <div className="w-14 h-14 flex-shrink-0 relative">
                      <img 
                        src={robotAssistantImg} 
                        alt="AI Robot Assistant" 
                        className="w-full h-full object-contain object-center scale-125" 
                      />
                    </div>
                  </div>

                  {/* 2. Today's Smartest Choice Card */}
                  {planResult.routes[planResult.recommended] && (() => {
                    const best = planResult.routes[planResult.recommended];
                    const uberCost = planResult.alternatives?.uber?.cost || 176;
                    const uberTime = planResult.alternatives?.uber?.minutes || 22;
                    const transitCost = best.costEstimate;
                    const transitTime = best.totalMinutes;
                    return (
                      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today's Smartest Choice</span>
                            <span className="bg-indigo-50 text-[#584CF4] border border-indigo-100/50 px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase">
                              Save ₹{planResult.alternatives?.moneySaved || 132}
                            </span>
                          </div>
                        </div>

                        {/* Comparison view */}
                        <div className="grid grid-cols-7 gap-1 items-center">
                          {/* Transit info */}
                          <div className="col-span-2 text-center space-y-1">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[#584CF4] flex items-center justify-center mx-auto">
                              <Bus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-1">Transit</span>
                            <span className="text-base font-bold text-slate-800 block leading-none">₹{transitCost}</span>
                            <span className="text-[10px] font-semibold text-slate-500 block">{transitTime} min</span>
                          </div>

                          {/* Vs separator */}
                          <div className="col-span-1 text-center">
                            <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/60 text-[9px] font-bold text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                              VS
                            </span>
                          </div>

                          {/* Uber info */}
                          <div className="col-span-2 text-center space-y-1">
                            <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/55 text-slate-600 flex items-center justify-center mx-auto">
                              <Car className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-1">Uber Go</span>
                            <span className="text-base font-bold text-slate-800 block leading-none">₹{uberCost}</span>
                            <span className="text-[10px] font-semibold text-slate-500 block">{uberTime} min</span>
                          </div>

                          {/* Comparison Details List (Right side) */}
                          <div className="col-span-2 border-l border-slate-100 pl-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-semibold text-slate-600">
                                {Math.abs(transitTime - uberTime)}m later
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-semibold flex items-center justify-center">₹</span>
                              <span className="text-[10px] font-semibold text-emerald-600">
                                ₹{planResult.alternatives?.moneySaved || 132} saved
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-600">Lower CO₂</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Navigation/Preference Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
                    {['Recommended', 'Fastest', 'Cheapest', 'Comfort'].map((label) => {
                      const idx = label === 'Recommended' 
                        ? planResult.recommended 
                        : planResult.routes.findIndex(r => r.label === label.toLowerCase());
                      const targetIdx = idx !== -1 ? idx : 0;
                      const isActive = selectedRouteIdx === targetIdx;
                      
                      let icon = <Sparkles className="w-4 h-4" />;
                      let colorClass = '';
                      if (label === 'Recommended') {
                        icon = <Sparkles className="w-4 h-4" />;
                        colorClass = isActive 
                          ? 'bg-[#584CF4] text-white border-[#584CF4] shadow-md shadow-indigo-600/15 font-bold'
                          : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300';
                      } else if (label === 'Fastest') {
                        icon = <Zap className="w-4 h-4" />;
                        colorClass = isActive 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/15 font-bold'
                          : 'bg-white text-blue-600 border-blue-100 hover:border-blue-300';
                      } else if (label === 'Cheapest') {
                        icon = <Coins className="w-4 h-4" />;
                        colorClass = isActive 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/15 font-bold'
                          : 'bg-white text-emerald-600 border-emerald-100 hover:border-emerald-300';
                      } else if (label === 'Comfort') {
                        icon = <Smile className="w-4 h-4" />;
                        colorClass = isActive 
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-600/15 font-bold'
                          : 'bg-white text-amber-600 border-amber-200 hover:border-amber-300';
                      }
                      
                      return (
                        <button
                          key={label}
                          onClick={() => setSelectedRouteIdx(targetIdx)}
                          className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border flex items-center gap-2 ${colorClass}`}
                        >
                          {icon}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 4. Active Selected Route Leg Details / Leg Timeline card */}
                  {planResult.routes[selectedRouteIdx] && (() => {
                    const r = planResult.routes[selectedRouteIdx];
                    const best = r;
                    const isComfortCab = r.label === 'comfort' && selectedComfortMode !== 'transit';
                    const displayCost = isComfortCab
                      ? planResult.alternatives?.[selectedComfortMode]?.cost || 150
                      : r.costEstimate;
                    const displayMinutes = isComfortCab
                      ? planResult.alternatives?.[selectedComfortMode]?.minutes || 20
                      : r.totalMinutes;

                    // Header badge styling based on type (Fastest -> blue, Cheapest -> green, Comfort -> yellow)
                    let headerBadgeClass = 'bg-indigo-50 border-indigo-100/50 text-[#584CF4]';
                    let headerLabel = 'Recommended';
                    if (r.label === 'comfort') {
                      headerBadgeClass = 'bg-amber-50 border-amber-100/50 text-amber-600';
                      headerLabel = isComfortCab ? `${selectedComfortMode.toUpperCase()} CAB` : 'Comfort';
                    } else if (r.label === 'fastest') {
                      headerBadgeClass = 'bg-blue-50 border-blue-100/50 text-blue-600';
                      headerLabel = 'Fastest';
                    } else if (r.label === 'cheapest') {
                      headerBadgeClass = 'bg-emerald-50 border-emerald-100/50 text-emerald-600';
                      headerLabel = 'Cheapest';
                    }

                    return (
                      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <span className={`border px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${headerBadgeClass}`}>
                            {headerLabel}
                          </span>
                          <div className="text-right">
                            <span className="text-xl font-bold text-slate-800">₹{displayCost}</span>
                            <span className="text-xs text-slate-400 font-bold block leading-none mt-1">{displayMinutes} min</span>
                          </div>
                        </div>

                        {/* If comfort route, show the segmented control */}
                        {r.label === 'comfort' && (
                          <div className="flex gap-1.5 p-1 bg-slate-100/70 border border-slate-200/45 rounded-2xl">
                            <button
                              onClick={() => setSelectedComfortMode('transit')}
                              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                selectedComfortMode === 'transit'
                                  ? 'bg-white text-amber-600 shadow-sm border border-slate-200/30'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              <Bus className="w-4 h-4" />
                              <span>Public Transit</span>
                            </button>
                            <button
                              onClick={() => setSelectedComfortMode('uber')}
                              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                selectedComfortMode !== 'transit'
                                  ? 'bg-white text-amber-600 shadow-sm border border-slate-200/30'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              <Car className="w-4 h-4" />
                              <span>Cabs & Ride</span>
                            </button>
                          </div>
                        )}

                        {/* Segment Content */}
                        {!isComfortCab ? (
                          /* Public Transit Timeline Layout */
                          <div className="grid grid-cols-12 gap-4">
                            {/* Timeline info column */}
                            <div className="col-span-8 relative flex flex-col gap-7 pl-5 border-l-2 border-slate-200 ml-2 mt-2">
                              {r.legs?.map((leg, i) => {
                                const isWalk = leg.mode === 'walk';
                                const isMetro = leg.mode === 'metro';
                                const isBus = leg.mode === 'bus';
                                const isFlight = leg.mode === 'flight';
                                return (
                                    <div key={i} className="relative flex items-start gap-3">
                                      {/* Timeline Node Icon */}
                                      <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                        isWalk ? 'bg-emerald-50 text-emerald-600' : isBus ? 'bg-blue-50 text-blue-600' : isFlight ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'
                                      }`}>
                                        {isWalk ? <Compass className="w-4 h-4" /> : isBus ? <Bus className="w-4 h-4" /> : isFlight ? <Plane className="w-4 h-4" /> : <Train className="w-4 h-4" />}
                                      </div>
                                      <div className="space-y-1 text-left">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                          {leg.mode} • {leg.minutes} min
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 leading-snug">
                                          {leg.instruction}
                                        </p>
                                        {leg.line && (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 text-[11px] font-bold text-slate-600 mt-1">
                                            {leg.line}
                                            {isBus && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                );
                              })}
                            </div>

                            {/* Live Tracking overlay & Reliability score circular gauge */}
                            <div className="col-span-4 space-y-4">
                              {/* Live Tracking Card */}
                              {(() => {
                                const transitLeg = r.legs?.find(l => l.mode === 'bus' || l.mode === 'metro');
                                const trackLabel = transitLeg?.line || (transitLeg?.mode === 'metro' ? 'Metro' : 'Transit');
                                const trackIcon = transitLeg?.mode === 'metro' 
                                  ? <Train className="w-5 h-5 text-[#584CF4]" />
                                  : <Bus className="w-5 h-5 text-[#584CF4]" />;
                                const etaMins = Math.max(1, Math.floor(Math.random() * 5) + 1);
                                return (
                                  <div className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-3 shadow-sm space-y-2">
                                    <span className="text-[10px] font-bold uppercase text-[#584CF4] tracking-wider block text-left">Live Tracking</span>
                                    <div className="flex items-center gap-1.5">
                                      {trackIcon}
                                      <div className="min-w-0 text-left">
                                        <span className="text-xs font-bold text-slate-800 block truncate">{trackLabel}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 block">{etaMins}m away</span>
                                      </div>
                                    </div>
                                    {/* Timeline mini progress dots */}
                                    <div className="flex items-center justify-between gap-1 pt-1.5 px-0.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#584CF4]" />
                                      <span className="h-0.5 flex-1 bg-indigo-100" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#584CF4] animate-ping" />
                                      <span className="h-0.5 flex-1 bg-indigo-100" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Reliability Score circular gauge */}
                              <div className="text-center space-y-1.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Reliability</span>
                                <div className="flex items-center justify-center">
                                  <ConfidenceRing value={best.confidence} size={54} strokeWidth={4.5} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Cab Option & Brand Comparison Layout */
                          <div className="space-y-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                              Compare Brand Estimates
                            </div>
                            <div className="space-y-2.5">
                              {[
                                { key: 'uber', name: 'Uber Go', icon: <Car className="w-5 h-5" />, cost: planResult.alternatives?.uber?.cost || 176, time: planResult.alternatives?.uber?.minutes || 22 },
                                { key: 'ola', name: 'Ola Mini', icon: <Car className="w-5 h-5" />, cost: planResult.alternatives?.ola?.cost || 160, time: planResult.alternatives?.ola?.minutes || 26 },
                                ...(planResult.distanceKm > 150 ? [
                                  { key: 'flight', name: 'Flight Estimate', icon: <Plane className="w-5 h-5" />, cost: planResult.alternatives?.flight?.cost || 5000, time: planResult.alternatives?.flight?.minutes || 180 },
                                  { key: 'train', name: 'Intercity Train', icon: <Train className="w-5 h-5" />, cost: planResult.alternatives?.train?.cost || 800, time: planResult.alternatives?.train?.minutes || 720 }
                                ] : [
                                  { key: 'auto', name: 'Auto Rickshaw', icon: <Navigation className="w-5 h-5 rotate-45" />, cost: planResult.alternatives?.auto?.cost || 95, time: planResult.alternatives?.auto?.minutes || 28 },
                                  { key: 'rapido', name: 'Rapido Bike', icon: <Activity className="w-5 h-5" />, cost: planResult.alternatives?.rapido?.cost || 78, time: planResult.alternatives?.rapido?.minutes || 24 }
                                ])
                              ].map((cab) => {
                                const isCabActive = selectedComfortMode === cab.key;
                                return (
                                  <div
                                    key={cab.key}
                                    onClick={() => setSelectedComfortMode(cab.key)}
                                    className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                      isCabActive
                                        ? 'bg-amber-50/45 border-amber-200 shadow-sm'
                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isCabActive ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                                      }`}>
                                        {isCabActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                      <div className="text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg">
                                        {cab.icon}
                                      </div>
                                      <div className="text-left">
                                        <span className="text-xs font-bold text-slate-800 block leading-tight">{cab.name}</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase">{cab.time} min</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs font-bold text-slate-800">₹{cab.cost}</span>
                                      <a
                                        href={getCabDeepLink(cab.key, origin, destination)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                                      >
                                        Book App
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Cab Timeline summary */}
                            <div className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-4 space-y-2 mt-2">
                              <span className="text-[10px] font-bold uppercase text-[#584CF4] tracking-wider block text-left">Estimated Leg Timeline</span>
                              <div className="relative flex flex-col gap-4 pl-5 border-l-2 border-slate-200 ml-2 mt-2">
                                <div className="relative flex items-start gap-2.5">
                                  <div className="absolute -left-[31px] top-0 w-7 h-7 rounded-full border-2 border-white bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <Compass className="w-4 h-4" />
                                  </div>
                                  <div className="text-left">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Walk • 1 min</div>
                                    <p className="text-xs font-bold text-slate-700">Walk to pickup point</p>
                                  </div>
                                </div>
                                <div className="relative flex items-start gap-2.5">
                                  <div className="absolute -left-[31px] top-0 w-7 h-7 rounded-full border-2 border-white bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                                    {selectedComfortMode === 'flight' ? <Plane className="w-4 h-4" /> : selectedComfortMode === 'train' ? <Train className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                                  </div>
                                  <div className="text-left">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                      {selectedComfortMode === 'flight' ? 'Flight' : selectedComfortMode === 'train' ? 'Train' : 'Cab'} • {planResult.alternatives?.[selectedComfortMode]?.minutes || 20} min
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">
                                      {selectedComfortMode === 'flight' ? 'Fly' : selectedComfortMode === 'train' ? 'Board Train' : 'Ride'} {selectedComfortMode === 'uber' ? 'Uber Go' : selectedComfortMode === 'ola' ? 'Ola Mini' : selectedComfortMode === 'rapido' ? 'Rapido Bike' : selectedComfortMode === 'flight' ? 'Flight' : selectedComfortMode === 'train' ? 'Intercity Train' : 'Auto Rickshaw'} to {destination.name.split(',')[0]}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bottom analysis row with metrics and Navigate CTA separately */}
                        <div className="border-t border-dashed border-slate-200 pt-5 space-y-4">
                          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                            <div className="bg-slate-50/70 border border-slate-100/60 p-2.5 rounded-xl flex flex-col justify-center items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {isComfortCab ? 'Traffic Status' : 'If missed'}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {isComfortCab ? 'Minor Delays' : <>Next in <span className="text-rose-500">18m</span></>}
                              </span>
                            </div>

                            <div className="bg-slate-50/70 border border-slate-100/60 p-2.5 rounded-xl flex flex-col justify-center items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {isComfortCab ? 'Punctual' : 'Miss Impact'}
                              </span>
                              <span className={`text-xs font-bold ${isComfortCab ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isComfortCab ? '98%' : `+${planResult.missBusAnalysis?.delayMinutes || 12} min`}
                              </span>
                            </div>

                            <div className="bg-slate-50/70 border border-slate-100/60 p-2.5 rounded-xl flex flex-col justify-center items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comfort</span>
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 justify-center">
                                {isComfortCab ? '😌 Premium' : '👥 Low'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={handleStartActiveJourney}
                            className="w-full bg-[#584CF4] hover:bg-[#473CD3] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-md flex items-center justify-center gap-2"
                          >
                            <span>View Details & Navigate</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. Alternative Route Option Rows */}
                  <div className="space-y-3">
                    {planResult.routes.map((r, idx) => {
                      if (idx === selectedRouteIdx) return null; // Skip active selected
                      const isCheapest = r.label === 'cheapest';
                      const isFastest = r.label === 'fastest';
                      const isBusOption = r.legs?.some(l => l.mode === 'bus');
                      const isMetroOption = r.legs?.some(l => l.mode === 'metro');
                      const displayLine = r.legs?.find(l => l.line)?.line || (isMetroOption ? 'Metro Blue Line' : 'Bus Route');
                      
                      // Theme tag badge
                      let tagClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100/50';
                      if (isFastest) {
                        tagClass = 'bg-blue-50 text-blue-600 border border-blue-100/50';
                      } else if (isCheapest) {
                        tagClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100/50';
                      } else if (r.label === 'comfort') {
                        tagClass = 'bg-amber-50 text-amber-600 border border-amber-100/50';
                      }

                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedRouteIdx(idx)}
                          className="bg-white border border-[#E2E8F0] rounded-[24px] p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-100 hover:bg-slate-50/20 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Option tag */}
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${tagClass}`}>
                              {r.label.toUpperCase()}
                            </span>

                            {/* Option info */}
                            <div className="space-y-1 text-left">
                              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                {isMetroOption ? <Train className="w-4 h-4 text-[#584CF4]" /> : isBusOption ? <Bus className="w-4 h-4 text-[#584CF4]" /> : <Compass className="w-4 h-4 text-[#584CF4]" />}
                                {displayLine}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">{r.totalMinutes} min</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">• {r.transfers} transfers</span>
                              </div>
                            </div>
                          </div>

                          {/* Price & Reliability Score Ring */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-base font-bold text-slate-800 block">₹{r.costEstimate}</span>
                            </div>
                            <ConfidenceRing value={r.confidence} size={42} strokeWidth={3.5} />
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 6. Meet in the middle utilities */}
                  {(() => {
                    const midpoint = getDynamicMidpoint();
                    return (
                      <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100 rounded-[24px] p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-500 text-white p-2.5 rounded-xl">
                              <Users className="w-4.5 h-4.5" />
                            </div>
                            <div className="text-left">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">AI Meetpoint Planner</span>
                              <h4 className="text-xs font-bold text-slate-800 mt-0.5">
                                Meet at {midpoint.name.replace(' Metro Station', '')}
                              </h4>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200/50 shadow-sm">
                            {midpoint.fairness}% FAIR
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-emerald-100/40">
                          <p className="text-[10px] font-bold text-slate-500 text-left max-w-[70%] leading-snug">
                            Minimizes total travel time for you and your friends.
                          </p>
                          <button
                            onClick={() => setCurrentView('meet_friends')}
                            className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            Check
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 7. Compare all fares utility button */}
                  <button
                    onClick={() => setCurrentView('alternatives')}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] hover:border-slate-300 text-[#584CF4] rounded-[20px] p-4 flex items-center justify-between shadow-sm transition-all text-left animate-pulse-slow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 border border-indigo-100/50 p-2.5 rounded-xl text-[#584CF4]">
                        <Route className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-indigo-700 tracking-wider">Compare all fares</span>
                        <p className="text-[9px] font-bold text-slate-500 leading-none mt-0.5">See all travel modes and save more</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </>
              )}
            </div>

            {/* Start active journey action button */}
            {!loading && planResult && (
              <div className="pt-5 border-t border-slate-100">
                <button
                  onClick={handleStartActiveJourney}
                  className="w-full bg-[#584CF4] hover:bg-[#473CD3] text-white font-semibold py-4.5 rounded-[20px] text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/15 active:scale-[0.98]"
                >
                  Start Live Navigation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: SMART ALTERNATIVES */}
      {currentView === 'alternatives' && planResult && (
        <div className="h-full flex flex-col justify-between relative page-enter text-gray-900">
          
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0 shadow-sm">
            <button onClick={() => setCurrentView('results')} className="p-1 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h2 className="text-base font-semibold">Smart Alternatives</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Transit vs Ride-Hailing</p>
            </div>
          </div>

          <div className="screen-content flex-1 p-6 space-y-4">
            
            {/* AI Signature Verdict Card */}
            <div className="bg-indigo-600 text-white p-5 rounded-[28px] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-white/10 rounded-bl-3xl">
                <Sparkles className="w-5 h-5 text-indigo-200 fill-current" />
              </div>
              <h4 className="text-[9px] font-semibold uppercase tracking-widest text-indigo-200">Signature Verdict</h4>
              <h3 className="text-sm font-semibold text-white mt-1.5 leading-snug">
                Take Transit to save ₹{planResult.alternatives?.moneySaved} and {planResult.alternatives?.timeDifference} min.
              </h3>
            </div>

            {/* Fares List */}
            <div className="divide-y divide-gray-100 border border-gray-150 rounded-[28px] overflow-hidden bg-white shadow-sm">
              {[
                { key: 'transit', name: 'Public Transit (Metro/Bus)', cost: `₹${planResult.alternatives?.transit?.cost || 44}`, time: `${planResult.alternatives?.transit?.minutes || 30} min`, label: '⭐ Recommended' },
                { key: 'uber', name: 'Uber Go', icon: '🚕', cost: `₹${planResult.alternatives?.uber?.cost || 176}`, time: `${planResult.alternatives?.uber?.minutes || 22} min` },
                ...(planResult.distanceKm > 150 ? [
                  { key: 'flight', name: 'Flight Estimate', icon: '✈️', cost: `₹${planResult.alternatives?.flight?.cost || 5000}`, time: `${planResult.alternatives?.flight?.minutes || 180} min` },
                  { key: 'train', name: 'Intercity Train', icon: '🚂', cost: `₹${planResult.alternatives?.train?.cost || 800}`, time: `${planResult.alternatives?.train?.minutes || 720} min` }
                ] : [
                  { key: 'rapido', name: 'Rapido Bike', icon: '🏍️', cost: `₹${planResult.alternatives?.rapido?.cost || 78}`, time: `${planResult.alternatives?.rapido?.minutes || 24} min` },
                  { key: 'auto', name: 'Auto Rickshaw', icon: '🛺', cost: `₹${planResult.alternatives?.auto?.cost || 95}`, time: `${planResult.alternatives?.auto?.minutes || 28} min` }
                ]),
                { key: 'ola', name: 'Ola Mini', icon: '🚖', cost: `₹${planResult.alternatives?.ola?.cost || 160}`, time: `${planResult.alternatives?.ola?.minutes || 26} min` }
              ].map((cab) => {
                const isSelected = selectedAlternativeMode === cab.key;
                const isCab = cab.key !== 'transit';
                return (
                  <div
                    key={cab.key}
                    onClick={() => setSelectedAlternativeMode(cab.key)}
                    className={`p-4 flex justify-between items-center transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Selection Radio Indicator */}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          {cab.icon && <span>{cab.icon}</span>}
                          {cab.name}
                        </h5>
                        {cab.label && (
                          <span className="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">{cab.label}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-1">
                        <div className="text-sm font-semibold text-gray-950">{cab.cost}</div>
                        <span className="text-[10px] text-gray-500 font-semibold">{cab.time}</span>
                      </div>
                      {isCab && (
                        <a
                          href={getCabDeepLink(cab.key, origin, destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-xl text-[9px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                        >
                          Book App
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Savings grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center shadow-sm">
                <span className="text-[8px] font-semibold uppercase text-emerald-600 block">Money Saved</span>
                <div className="text-base font-semibold text-emerald-700 mt-1">₹{planResult.alternatives?.moneySaved}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl text-center shadow-sm">
                <span className="text-[8px] font-semibold uppercase text-indigo-600 block">Time Difference</span>
                <div className="text-base font-semibold text-indigo-700 mt-1">{planResult.alternatives?.timeDifference} min</div>
              </div>
              <div className="bg-green-50 border border-green-100 p-3 rounded-2xl text-center shadow-sm">
                <span className="text-[8px] font-semibold uppercase text-green-600 block">Carbon Saved</span>
                <div className="text-base font-semibold text-green-700 mt-1">{planResult.alternatives?.co2Saved} kg</div>
              </div>
            </div>

            {/* Miss the bus details */}
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-3xl text-xs space-y-2">
              <div className="flex items-center gap-1 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                Miss-The-Bus Analysis
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-gray-500 font-bold">Catch Bus:</div>
                  <div className="text-sm font-semibold text-gray-800">{planResult.missBusAnalysis?.currentArrival || '5:52 PM'}</div>
                </div>
                <div className="text-center font-semibold text-rose-500 uppercase text-[10px]">
                  +{planResult.missBusAnalysis?.delayMinutes || 22}m delay
                </div>
                <div className="text-right">
                  <div className="text-gray-500 font-bold">Miss Bus:</div>
                  <div className="text-sm font-semibold text-gray-800">{planResult.missBusAnalysis?.newArrival || '6:14 PM'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-gray-100 p-5 flex-shrink-0">
            <button
              onClick={handleStartActiveJourney}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Journey
            </button>
          </div>
        </div>
      )}

      {/* VIEW: LIVE JOURNEY */}
      {currentView === 'live_journey' && route && (() => {
        const isCabActive = route.label?.startsWith('comfort_') || route.legs?.some(l => l.mode === 'cab');
        const cabBrand = route.label?.replace('comfort_', '') || 'uber';
        return (
          <div className="h-full flex flex-col justify-between relative page-enter text-white">
            
            {/* Map upper half */}
            <div className="h-[35%] relative bg-slate-200">
              <MapView 
                height="100%" 
                polyline={route.polyline || []}
                activeVehiclePos={vehiclePosition}
                showUserLocation={true}
                mode={route.label || 'transit'}
                userAvatar={userAvatar}
                distanceKm={planResult?.distanceKm || route?.distanceKm}
              />
              {/* Live Indicator overlay */}
              <div className="absolute top-4 left-4 z-[400]">
                <span className="bg-slate-900/90 text-white border border-slate-700 rounded-full px-3.5 py-1.5 flex items-center gap-2 shadow-lg text-[10px] font-bold">
                  <span className="live-dot animate-ping" />
                  LIVE NAVIGATION ACTIVE
                </span>
              </div>
              {/* Next Stop overlay */}
              {route.legs && (
                <div className="absolute bottom-4 left-4 right-4 z-[400] bg-slate-900/95 text-white border border-slate-800 rounded-2xl p-3 shadow-xl flex items-center gap-3 animate-slide-up">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <Navigation className="w-4 h-4 text-white fill-current animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-bold uppercase text-indigo-400 tracking-wider block">Current Instruction</span>
                    <p className="text-xs font-bold truncate">
                      {route.legs[Math.min(route.legs.length - 1, Math.floor((180 - timerSeconds) / (180 / route.legs.length)))]?.instruction}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls lower half */}
            <div className="h-[65%] bg-slate-950 p-5 overflow-y-auto flex flex-col justify-between z-10 rounded-t-[32px] border-t border-slate-800 shadow-2xl">
              
              {/* Countdown / Stats */}
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-semibold tracking-widest text-indigo-400 uppercase block mb-1">
                      {isCabActive ? 'Estimated Time' : 'Time to Board'}
                    </span>
                    <div className="text-4xl font-semibold text-slate-100 leading-none tracking-tighter">
                      {isCabActive ? `${route.totalMinutes}m` : formatTimer(timerSeconds)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-l border-slate-800 pl-4 text-right">
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">ETA</span>
                      <span className="text-sm font-semibold text-emerald-400 block mt-0.5">{eta}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Time</span>
                      <span className="text-sm font-semibold text-slate-200 block mt-0.5">{route.totalMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Cost</span>
                      <span className="text-sm font-semibold text-slate-200 block mt-0.5">₹{route.costEstimate}</span>
                    </div>
                  </div>
                </div>

                {/* ConfidenceRing Factor list */}
                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-3xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <ConfidenceRing value={isCabActive ? 98 : confidence} size={48} strokeWidth={4} />
                    <div>
                      <h5 className="text-xs font-semibold">
                        {route.label?.includes('flight') ? 'Flight Status Sync' : route.label?.includes('train') ? 'Indian Railways GPS Sync' : isCabActive ? 'Driver Sync Confidence' : 'On-Time Confidence'}
                      </h5>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                        {route.label?.includes('flight') ? 'Airport & Flight Tracking' : route.label?.includes('train') ? 'Live Train GPS tracking' : isCabActive ? 'GPS & Dispatch Availability' : 'Live Bus & Traffic Sync'}
                      </p>
                    </div>
                  </div>
                   {/* Confidence dots */}
                  <div className="flex gap-1.5">
                    <span 
                      className={`w-2 h-2 rounded-full ${getTrafficStatus() === 'Heavy traffic detected' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      title={getTrafficStatus() === 'Heavy traffic detected' ? 'Traffic Congested' : 'Traffic Clear'} 
                    />
                    <span 
                      className="w-2 h-2 rounded-full bg-emerald-500" 
                      title="GPS Active" 
                    />
                    <span 
                      className="w-2 h-2 rounded-full bg-emerald-500" 
                      title="Direct Route" 
                    />
                    <span 
                      className="w-2 h-2 rounded-full bg-emerald-500" 
                      title="Weather Clear" 
                    />
                  </div>
                </div>

                {/* Nudge Notification bar */}
                {alerts.length > 0 && alerts[0].type === 'nudge' && !dismissedAlerts.includes(alerts[0].id) && (
                  <div className="bg-indigo-600 border border-indigo-500/50 p-4 rounded-3xl flex justify-between items-center animate-pulse">
                    <p className="text-xs font-bold text-white pr-2">
                      "{alerts[0].message}"
                    </p>
                    <button 
                      onClick={() => {
                        setDismissedAlerts(prev => [...prev, alerts[0].id]);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase"
                    >
                      Got It
                    </button>
                  </div>
                )}

                {/* Cab Booking Card if active */}
                {isCabActive && (
                  <div className="bg-[#4F46E5]/10 border border-[#4F46E5]/25 rounded-3xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-semibold uppercase text-indigo-400 tracking-wider">Ride Booking Deep-Link</span>
                      <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-lg text-[8px] font-semibold uppercase">Coordinates Set</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 leading-snug">
                      Pickup/dropoff coordinates are pre-filled. Tap below to launch your booking app immediately.
                    </p>
                    <a
                      href={getCabDeepLink(cabBrand, origin, destination)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold py-3 rounded-2xl text-[10px] uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      Open {cabBrand.charAt(0).toUpperCase() + cabBrand.slice(1)} App
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Step Timeline checklist */}
                <div>
                  <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Timeline Guidance</h4>
                  <div className="space-y-3">
                    {route.legs?.map((leg, idx) => {
                      const currentStepIdx = Math.min(route.legs.length - 1, Math.floor((180 - timerSeconds) / (180 / route.legs.length)));
                      const isCompleted = idx < currentStepIdx;
                      const isActive = idx === currentStepIdx;
                      
                      return (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isCompleted 
                                ? 'bg-emerald-500 text-slate-950' 
                                : isActive 
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            {idx < route.legs.length - 1 && (
                              <div className={`w-0.5 h-6 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                            )}
                          </div>
                          <div className="flex-1 pb-1">
                            <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                              {leg.instruction}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {leg.mode?.toUpperCase()} • {leg.minutes} min {leg.distance ? `• ${leg.distance}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-900 flex gap-2">
                <button
                  onClick={() => setIsIssueOpen(true)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl text-xs uppercase transition-colors"
                >
                  Report Issue
                </button>
                
                <button
                  onClick={() => {
                    const completedData = {
                      route,
                      comparison,
                      destination,
                      origin
                    };
                    setLastCompletedJourney(completedData);
                    endJourney();
                    setCurrentView('journey_complete');
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/25"
                >
                  End Journey
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW: JOURNEY COMPLETE */}
      {currentView === 'journey_complete' && (() => {
        const totalDist = parseFloat(lastCompletedJourney?.route?.distanceKm || 12.1);
        const traveledDist = parseFloat((totalDist * 0.71).toFixed(1));
        const remainingDist = parseFloat((totalDist - traveledDist).toFixed(1));
        const totalTime = parseInt(lastCompletedJourney?.route?.totalMinutes || 32);
        const elapsedTime = parseInt((totalTime * 0.56).toFixed(0));
        const estCost = lastCompletedJourney?.route?.costEstimate || 22;
        const co2Saved = lastCompletedJourney?.comparison?.co2Saved || 0.18;
        const moneySaved = lastCompletedJourney?.comparison?.moneySaved || 132;
        const cabCost = Math.round(estCost + moneySaved);
        
        return (
          <div className="h-full flex flex-col justify-between relative page-enter text-slate-800 bg-slate-50/60 overflow-y-auto">
            {/* Top Header Bar */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setCurrentView('home');
                    setActiveTab('home_tab');
                  }} 
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                    <Navigation className="w-4 h-4 fill-current rotate-45 text-white" />
                  </div>
                  <span className="text-lg font-extrabold text-slate-800 tracking-tight">Route<span className="text-indigo-600">IQ</span></span>
                </div>
              </div>
              
              <button className="px-3.5 py-1.5 rounded-xl bg-indigo-50/60 text-indigo-600 border border-indigo-100/50 hover:bg-indigo-100 transition-colors text-xs font-bold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Share Journey
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 p-6 space-y-6">
              
              {/* Card 1: Journey ended early warning */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50/20 border border-rose-100/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                
                {/* Warning text side */}
                <div className="flex items-start gap-4 z-10">
                  <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-lg font-extrabold text-rose-600 tracking-tight">Journey ended early</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-sm">
                      We noticed you stopped tracking before reaching your destination.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-500 pt-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      You are {remainingDist} km away from your destination
                    </div>
                  </div>
                </div>

                {/* Styled SVG Map Graphic */}
                <div className="w-full md:w-48 h-24 flex items-center justify-center relative flex-shrink-0">
                  {/* Cityscape background silhouette */}
                  <svg className="absolute bottom-0 left-0 right-0 w-full h-12 text-rose-100 opacity-60" viewBox="0 0 200 50" fill="currentColor">
                    <rect x="10" y="20" width="15" height="30" rx="1" />
                    <rect x="30" y="10" width="20" height="40" rx="1" />
                    <rect x="55" y="25" width="12" height="25" rx="1" />
                    <rect x="72" y="15" width="18" height="35" rx="1" />
                    <rect x="95" y="30" width="15" height="20" rx="1" />
                    <rect x="115" y="5" width="25" height="45" rx="1" />
                    <rect x="145" y="20" width="15" height="30" rx="1" />
                    <rect x="165" y="15" width="20" height="35" rx="1" />
                  </svg>
                  
                  {/* Dotted path SVG */}
                  <svg className="w-full h-full relative z-10" viewBox="0 0 200 100">
                    <path 
                      d="M 15,80 C 50,60 80,90 120,60 C 140,45 160,30 185,20" 
                      fill="none" 
                      stroke="url(#roseGradient)" 
                      strokeWidth="3" 
                      strokeDasharray="6,4" 
                    />
                    <defs>
                      <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    {/* Start (Travelled up to X) */}
                    <circle cx="120" cy="60" r="10" fill="#ef4444" className="animate-ping opacity-25" />
                    <circle cx="120" cy="60" r="7" fill="#ef4444" />
                    <text x="120" y="63" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">×</text>
                    
                    {/* End destination */}
                    <circle cx="185" cy="20" r="12" fill="#6366f1" className="opacity-15" />
                    <path 
                      d="M 185,8 C 181,8 178,11 178,15 C 178,20 185,27 185,27 C 185,27 192,20 192,15 C 192,11 189,8 185,8 Z" 
                      fill="#6366f1" 
                    />
                    <circle cx="185" cy="14" r="2.5" fill="white" />
                  </svg>
                </div>
              </div>

              {/* Stats Row: 4 side-by-side columns */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Travelled */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow text-left">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 flex-shrink-0">
                    <Clock className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Travelled</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">{traveledDist} km</span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">of {totalDist} km</span>
                  </div>
                </div>

                {/* Time Elapsed */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow text-left">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Leaf className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Elapsed</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">{elapsedTime} min</span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">of {totalTime} min</span>
                  </div>
                </div>

                {/* Est. Cost Incurred */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow text-left">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <span className="font-extrabold text-base text-amber-600">₹</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Cost Incurred</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">₹{estCost}</span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">(so far)</span>
                  </div>
                </div>

                {/* CO2 Impact */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow text-left">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                    <Cloud className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CO₂ Impact</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">{co2Saved} kg</span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">(so far)</span>
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="space-y-4 text-left">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Why did you end the journey?</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Your feedback helps us improve RouteIQ for you.</p>
                </div>
                
                {/* 5 Feedback cards row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { id: 'reached_own', label: 'Reached on my own', desc: 'I reached without transit', icon: User, bg: 'bg-violet-50 text-violet-600' },
                    { id: 'took_cab', label: 'Took a cab / Auto', desc: 'I switched to another mode', icon: Car, bg: 'bg-amber-50 text-amber-600' },
                    { id: 'missed_transit', label: 'Missed my bus / Train', desc: 'I missed the bus or train', icon: Bus, bg: 'bg-rose-50 text-rose-600' },
                    { id: 'no_longer_needed', label: 'Route no longer needed', desc: 'My plans changed', icon: X, bg: 'bg-slate-100 text-slate-600' },
                    { id: 'something_wrong', label: 'Something went wrong', desc: 'I faced an issue in the journey', icon: AlertTriangle, bg: 'bg-indigo-50 text-indigo-600' }
                  ].map(card => {
                    const isSelected = selectedFeedback === card.id;
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.id}
                        onClick={() => setSelectedFeedback(card.id)}
                        className={`border rounded-2xl p-4 text-center flex flex-col items-center justify-between gap-3 transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-600/20' 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : card.bg} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-extrabold text-slate-800 block leading-tight">{card.label}</span>
                          <span className="text-[9px] font-semibold text-slate-400 block leading-tight mt-1">{card.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations Section */}
              <div className="space-y-4 text-left">
                <h3 className="text-base font-extrabold text-slate-800">Recommended for you</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Replan Card */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative">
                    <div className="space-y-3">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-indigo-600 text-white font-extrabold text-[8px] uppercase tracking-wider">
                        Best Option
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-800">Want to reach your destination?</h4>
                      <p className="text-[11px] text-slate-400 font-bold leading-none">Let's find the best route from your current location.</p>
                      
                      {/* Location timeline details */}
                      <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl space-y-4 relative mt-2">
                        {/* Current Location */}
                        <div className="flex gap-3 relative z-10">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Current Location</span>
                            <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                              {lastCompletedJourney?.destination?.name || 'Connaught Place, New Delhi'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 border-l border-dashed border-slate-200" />

                        {/* Destination */}
                        <div className="flex gap-3 relative z-10">
                          <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Destination</span>
                            <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">
                              {lastCompletedJourney?.destination?.name || 'Ghaziabad, Uttar Pradesh'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Inner stats row */}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">New ETA</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">18 min</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Distance</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">9.3 km</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Est. Fare</span>
                          <span className="text-xs font-extrabold text-slate-800 block mt-0.5">₹28</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        // Reset search forms to re-run planning
                        setOrigin({ name: lastCompletedJourney?.destination?.name || 'Connaught Place, New Delhi', lat: lastCompletedJourney?.destination?.lat, lng: lastCompletedJourney?.destination?.lng });
                        setDestination({ name: lastCompletedJourney?.destination?.name || 'Ghaziabad, Uttar Pradesh', lat: lastCompletedJourney?.destination?.lat, lng: lastCompletedJourney?.destination?.lng });
                        setCurrentView('home');
                        setActiveTab('home_tab');
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replan Journey
                    </button>
                  </div>
                  
                  {/* Right Column: Trip Comparison */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold text-slate-800">Trip Comparison</h4>
                      <p className="text-[11px] text-slate-400 font-bold leading-none">See how your current choice compares with transit.</p>
                      
                      {/* Comparison costs table */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-xs font-semibold">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Bus className="w-4 h-4 text-slate-400" />
                            <span>Ideal Transit Cost</span>
                          </div>
                          <span className="text-slate-800 font-bold">₹{estCost}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-xs font-semibold">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Car className="w-4 h-4 text-slate-400" />
                            <span>Est. Cab/Auto Cost</span>
                          </div>
                          <span className="text-rose-500 font-extrabold">₹{cabCost}</span>
                        </div>
                      </div>

                      {/* Savings panel */}
                      <div className="bg-emerald-50/40 border border-emerald-100/40 rounded-2xl p-4 flex items-center justify-between mt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block">You could have saved</span>
                          <span className="text-2xl font-black text-emerald-700 block">₹{moneySaved}</span>
                        </div>
                        {/* Pink piggy bank icon */}
                        <div className="w-14 h-14 bg-pink-100/70 border border-pink-200/50 rounded-2xl flex items-center justify-center relative shadow-inner">
                          <span className="text-2xl">🐷</span>
                          <span className="absolute -top-1 -right-1 text-xs">🪙</span>
                        </div>
                      </div>
                    </div>

                    {/* Next time Tip banner */}
                    <div className="flex items-start gap-2.5 bg-slate-50 rounded-2xl p-3.5 text-slate-600">
                      <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0 animate-pulse" />
                      <p className="text-[10px] font-bold text-slate-500 leading-normal">
                        Next time, RouteIQ will alert you earlier so you never miss your transit!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Support Banner */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-6 shadow-md text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4 z-10 text-left">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-indigo-200 animate-spin-slow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">We're here to help!</h4>
                    <p className="text-[10px] text-indigo-200 font-semibold leading-relaxed mt-0.5">
                      Enable notifications and live tracking for the most accurate updates and smarter suggestions.
                    </p>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 flex-shrink-0 shadow-sm border border-slate-100">
                  <Bell className="w-3.5 h-3.5 fill-current" />
                  ENABLE NOTIFICATIONS
                </button>
              </div>

            </div>

            {/* Bottom Nav Highlighted on 'Journeys' tab */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 grid grid-cols-5 py-3">
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('home_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <User className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('home_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <Compass className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Plan</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('live_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <Navigation className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('journeys_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-indigo-600 font-bold"
              >
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Journeys</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('profile_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <User className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">You</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* VIEW: MEET FRIENDS */}
      {currentView === 'meet_friends' && (() => {
        // Spot details mapper
        const spotDetails = {
          'Rajiv Chowk Metro Station': {
            desc: 'Central interchange hub, equal metro lines.',
            score: '96%',
            walk: '2 min',
            lines: '4 Metro Lines',
            linesList: 'Blue, Yellow, Violet, Pink',
            scoreColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            friends: [
              { name: 'You', tag: 'A', loc: 'Ghaziabad, UP', time: '45 min', cost: '₹44', color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
              { name: 'Friend 1', tag: 'B', loc: 'Model Town, Delhi', time: '35 min', cost: '₹32', color: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
              { name: 'Friend 2', tag: 'C', loc: 'Samaypur Badli, Delhi', time: '40 min', cost: '₹38', color: 'bg-orange-500 text-white', dot: 'bg-orange-500' }
            ]
          },
          'Cannaught Place': {
            desc: 'Major interchange and commercial district.',
            score: '88%',
            walk: '3 min',
            lines: '3 Metro Lines',
            linesList: 'Blue, Yellow, Violet',
            scoreColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            friends: [
              { name: 'You', tag: 'A', loc: 'Ghaziabad, UP', time: '48 min', cost: '₹44', color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
              { name: 'Friend 1', tag: 'B', loc: 'Model Town, Delhi', time: '38 min', cost: '₹32', color: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
              { name: 'Friend 2', tag: 'C', loc: 'Samaypur Badli, Delhi', time: '42 min', cost: '₹38', color: 'bg-orange-500 text-white', dot: 'bg-orange-500' }
            ]
          },
          'New Delhi Railway Station': {
            desc: 'Railway + Metro connectivity hub.',
            score: '82%',
            walk: '5 min',
            lines: '2 Metro Lines',
            linesList: 'Yellow, Airport Express',
            scoreColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            friends: [
              { name: 'You', tag: 'A', loc: 'Ghaziabad, UP', time: '52 min', cost: '₹50', color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
              { name: 'Friend 1', tag: 'B', loc: 'Model Town, Delhi', time: '28 min', cost: '₹28', color: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
              { name: 'Friend 2', tag: 'C', loc: 'Samaypur Badli, Delhi', time: '35 min', cost: '₹34', color: 'bg-orange-500 text-white', dot: 'bg-orange-500' }
            ]
          },
          'Karol Bagh Metro Station': {
            desc: 'Good metro & bus connectivity.',
            score: '75%',
            walk: '6 min',
            lines: '2 Metro Lines',
            linesList: 'Blue Line, local bus network',
            scoreColor: 'text-amber-600 bg-amber-50 border-amber-100',
            friends: [
              { name: 'You', tag: 'A', loc: 'Ghaziabad, UP', time: '60 min', cost: '₹56', color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
              { name: 'Friend 1', tag: 'B', loc: 'Model Town, Delhi', time: '45 min', cost: '₹38', color: 'bg-indigo-600 text-white', dot: 'bg-indigo-600' },
              { name: 'Friend 2', tag: 'C', loc: 'Samaypur Badli, Delhi', time: '38 min', cost: '₹36', color: 'bg-orange-500 text-white', dot: 'bg-orange-500' }
            ]
          }
        };

        const currentSpot = spotDetails[activeSpot] || spotDetails['Rajiv Chowk Metro Station'];
        
        return (
          <div className="h-full flex flex-col justify-between relative page-enter text-slate-800 bg-slate-50/60 overflow-y-auto">
            
            {/* Header Area */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setCurrentView('home');
                    setActiveTab('home_tab');
                  }} 
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex flex-col text-left">
                  <h2 className="text-base font-extrabold text-slate-800">Meet Friends</h2>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Transit Midpoint Calculator</span>
                </div>
              </div>
              
              <button className="px-3.5 py-1.5 rounded-xl bg-indigo-50/60 text-indigo-600 border border-indigo-100/50 hover:bg-indigo-100 transition-colors text-xs font-bold flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 p-6 space-y-6">
              
              {/* Destination/Meeting point input card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-sm hover:border-slate-200 transition-all text-left">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-800 truncate">Ghaziabad, Uttar Pradesh</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Find the best meeting point for everyone</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setMeetOrigin({ name: '', lat: null, lng: null });
                  }} 
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Friends list header */}
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-800">Friends (3)</h3>
                <button 
                  onClick={() => {
                    handleAddFriend();
                  }}
                  className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Friend
                </button>
              </div>

              {/* Friends Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentSpot.friends.map((friend, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 text-left relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${friend.color}`}>
                        {friend.tag}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">{friend.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${friend.dot}`} />
                          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{friend.loc}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats inside card */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Bus className="w-3.5 h-3.5 text-slate-400" />
                        <span>{friend.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{friend.cost}</span>
                      </div>
                    </div>

                    {/* Edit button */}
                    <button 
                      onClick={() => {
                        // Open input to edit friend
                      }}
                      className="w-full text-center pt-2 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 border-t border-slate-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {/* Best Meeting Point Card */}
              <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6 text-left">
                
                {/* Left side info */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block">Best Meeting Point</span>
                    <h3 className="text-base font-extrabold text-slate-900">{activeSpot}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{currentSpot.desc}</p>
                    
                    {/* Fairness Score badge */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${currentSpot.scoreColor}`}>
                        <span>Fairness Score: {currentSpot.score}</span>
                      </div>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* Right side stats */}
                <div className="flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <span>{currentSpot.walk}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">Walk from metro</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Bus className="w-4 h-4 text-slate-400" />
                    <div>
                      <span>{currentSpot.lines}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">{currentSpot.linesList}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Map View Section */}
              <div className="bg-white border border-slate-100 rounded-3xl p-2 shadow-sm overflow-hidden relative h-[360px]">
                {/* SVG Mock Map with actual path graphics matching screenshot */}
                <div className="absolute inset-0 z-0 bg-[#E8ECE9] overflow-hidden">
                  
                  {/* Styled roads & parks background */}
                  <svg className="w-full h-full opacity-65" viewBox="0 0 500 300">
                    {/* Parks */}
                    <rect x="50" y="50" width="100" height="80" fill="#D2EBD4" rx="20" />
                    <rect x="300" y="40" width="120" height="90" fill="#D2EBD4" rx="15" />
                    <rect x="180" y="190" width="150" height="80" fill="#D2EBD4" rx="30" />
                    
                    {/* Roads */}
                    <path d="M 0,150 L 500,150" stroke="white" strokeWidth="16" />
                    <path d="M 250,0 L 250,300" stroke="white" strokeWidth="16" />
                    <path d="M 50,0 L 450,300" stroke="white" strokeWidth="10" />
                    <path d="M 50,300 L 450,0" stroke="white" strokeWidth="10" />
                    
                    {/* Inner dash road divider */}
                    <path d="M 0,150 L 500,150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                    <path d="M 250,0 L 250,300" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5,5" />
                  </svg>
                  
                  {/* Colored route lines converging at center */}
                  <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 500 300">
                    {/* Green Path from A (top left/mid) to Center */}
                    <path 
                      d="M 80,110 C 120,110 180,180 250,150" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                    />
                    
                    {/* Blue Path from B (top right) to Center */}
                    <path 
                      d="M 380,80 C 340,80 300,110 250,150" 
                      fill="none" 
                      stroke="#4f46e5" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                    />
                    
                    {/* Orange Path from C (bottom right) to Center */}
                    <path 
                      d="M 400,240 C 350,240 300,200 250,150" 
                      fill="none" 
                      stroke="#f97316" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Absolute overlay badges for markers */}
                  {/* Center Midpoint Marker (Rajiv Chowk) */}
                  <div className="absolute top-[150px] left-[250px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 border-4 border-white shadow-lg flex items-center justify-center text-white">
                      <Bus className="w-4 h-4 text-white" />
                    </div>
                    <span className="bg-white/95 border border-slate-100 px-2 py-0.5 rounded shadow-sm text-[9px] font-extrabold text-slate-800 mt-1 uppercase tracking-wider">
                      {activeSpot.split(' ')[0]}
                    </span>
                  </div>

                  {/* Marker A (Ghaziabad) */}
                  <div className="absolute top-[110px] left-[80px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="flex items-center gap-1 bg-white/95 border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white font-extrabold text-[9px]">A</div>
                      <span className="text-[10px] font-bold text-slate-700">Ghaziabad</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shadow-sm text-[8px] font-bold text-emerald-700 mt-1">
                      45 min • ₹44
                    </div>
                  </div>

                  {/* Marker B (Model Town) */}
                  <div className="absolute top-[80px] left-[380px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="flex items-center gap-1 bg-white/95 border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-extrabold text-[9px]">B</div>
                      <span className="text-[10px] font-bold text-slate-700">Model Town</span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded shadow-sm text-[8px] font-bold text-indigo-700 mt-1">
                      35 min • ₹32
                    </div>
                  </div>

                  {/* Marker C (Samaypur Badli) */}
                  <div className="absolute top-[240px] left-[400px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="flex items-center gap-1 bg-white/95 border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white font-extrabold text-[9px]">C</div>
                      <span className="text-[10px] font-bold text-slate-700">Samaypur Badli</span>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 px-2 py-0.5 rounded shadow-sm text-[8px] font-bold text-orange-700 mt-1">
                      40 min • ₹38
                    </div>
                  </div>
                </div>

                {/* Left Side Map Controls Overlay */}
                <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 shadow-sm">
                  {[
                    { label: 'Center', icon: Compass },
                    { label: 'Layers', icon: Map },
                    { label: 'Traffic', icon: Navigation }
                  ].map((ctrl, i) => {
                    const Icon = ctrl.icon;
                    return (
                      <button 
                        key={i}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 flex flex-col items-center justify-center text-slate-500 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">{ctrl.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Side Zoom Controls Overlay */}
                <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-1.5 shadow-sm">
                  <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-600 font-extrabold text-sm transition-colors">+</button>
                  <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-600 font-extrabold text-sm transition-colors">-</button>
                </div>
              </div>

              {/* Why this is the best meeting point Section */}
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-100 animate-pulse" />
                  <h3 className="text-sm font-extrabold text-slate-800">Why this is the best meeting point</h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { title: 'Balanced Travel', desc: 'Most equal travel time for everyone', icon: Scale, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                    { title: 'Great Connectivity', desc: '4 metro lines & multiple exits', icon: Bus, bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { title: 'Easy Access', desc: '2 min walking from metro', icon: User, bg: 'bg-orange-50 text-orange-600 border-orange-100' },
                    { title: 'Cost Effective', desc: 'Lowest combined travel cost', icon: Leaf, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
                  ].map((feat, i) => {
                    const Icon = feat.icon;
                    return (
                      <div 
                        key={i} 
                        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-3 text-left shadow-sm"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${feat.bg} flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-extrabold text-slate-800 block">{feat.title}</span>
                          <span className="text-[9px] font-semibold text-slate-400 block leading-tight mt-1">{feat.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other Good Options Section */}
              <div className="space-y-4 text-left">
                <h3 className="text-sm font-extrabold text-slate-800">Other Good Options</h3>

                <div className="space-y-3">
                  {[
                    { name: 'Cannaught Place', desc: 'Major interchange', score: '88%', walk: '3 min walk', lines: '3 metro lines' },
                    { name: 'New Delhi Railway Station', desc: 'Railway + Metro connectivity', score: '82%', walk: '5 min walk', lines: '2 metro lines' },
                    { name: 'Karol Bagh Metro Station', desc: 'Good metro & bus connectivity', score: '75%', walk: '6 min walk', lines: '2 metro lines' }
                  ].map((opt, i) => (
                    <div 
                      key={i} 
                      className={`bg-white border rounded-3xl p-4 transition-all shadow-sm space-y-3.5 text-left ${
                        activeSpot === opt.name ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {/* Top Row: Name, Desc and View Route Button */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 flex-shrink-0">
                            <Bus className="w-4.5 h-4.5 text-slate-400" />
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate">{opt.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setActiveSpot(opt.name)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider transition-colors shadow-sm flex-shrink-0"
                        >
                          View Route
                        </button>
                      </div>

                      {/* Bottom Row: Stats list in a neat 3-column grid */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50">
                        {/* Fairness Score */}
                        <div className="bg-emerald-50/50 border border-emerald-100/30 rounded-xl py-1.5 px-2 text-center flex flex-col justify-center items-center">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide leading-none">Fairness</span>
                          <span className="text-xs font-extrabold text-emerald-600 block mt-1 leading-none">{opt.score}</span>
                        </div>
                        
                        {/* Walk Time */}
                        <div className="bg-slate-50 border border-slate-100/50 rounded-xl py-1.5 px-2 flex flex-col justify-center items-center">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-extrabold text-slate-700 leading-none">{opt.walk.split(' ')[0]} min</span>
                          </div>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Walk</span>
                        </div>

                        {/* Metro Lines */}
                        <div className="bg-slate-50 border border-slate-100/50 rounded-xl py-1.5 px-2 flex flex-col justify-center items-center">
                          <div className="flex items-center gap-1">
                            <Bus className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-extrabold text-slate-700 leading-none">{opt.lines.split(' ')[0]} lines</span>
                          </div>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-1 leading-none">Metro</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Large Action Button */}
            <div className="p-6 bg-white border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => {
                  setOrigin({ name: activeSpot, lat: 28.6328, lng: 77.2197 });
                  setDestination({ name: 'Ghaziabad, Uttar Pradesh', lat: 28.6692, lng: 77.4538 });
                  setCurrentView('home');
                  setActiveTab('home_tab');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-600/20"
              >
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 fill-current rotate-45 text-white" />
                  <span>Plan Meeting Here</span>
                </div>
                <span className="text-[8px] font-semibold text-indigo-200 capitalize tracking-normal">Get step-by-step routes for all friends</span>
              </button>
            </div>

            {/* Bottom Nav Highlighted on 'You' tab */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 grid grid-cols-5 py-3">
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('home_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <User className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('home_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <Compass className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Plan</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('live_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <Navigation className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('journeys_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Journeys</span>
              </button>
              <button 
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('profile_tab');
                }} 
                className="flex flex-col items-center justify-center gap-1 text-indigo-600 font-bold"
              >
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-[9px] font-bold uppercase tracking-wider">You</span>
              </button>
            </div>

          </div>
        );
      })()}

      {/* VIEW: FIND MIDPOINT */}
      {currentView === 'find_midpoint' && (
        <div className="h-full flex flex-col justify-between relative page-enter text-gray-900">
          <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0 shadow-sm">
            <button onClick={() => setCurrentView('home')} className="p-1 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h2 className="text-base font-semibold">Find Midpoint</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Location A / B geometric solver</p>
            </div>
          </div>

          <div className="screen-content flex-1 p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Point A Location</label>
              <PlaceSearch
                value={midpointOrigin}
                onChange={setMidpointOrigin}
                onSelect={setMidpointOrigin}
                placeholder="Search location A..."
                icon={MapPin}
                iconColor="text-emerald-500"
                showMyLocation={true}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Point B Location</label>
              <PlaceSearch
                value={midpointDest}
                onChange={setMidpointDest}
                onSelect={setMidpointDest}
                placeholder="Search location B..."
                icon={MapPin}
                iconColor="text-rose-500"
              />
            </div>

            <button
              onClick={handleCalculateFindMidpoint}
              disabled={!midpointDest.lat || midpointLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl text-xs uppercase tracking-wider flex justify-center items-center gap-2 transition-colors mt-4"
            >
              {midpointLoading ? 'Calculating midpoint...' : 'Find Midpoint'}
            </button>

            {midpointResult && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="bg-amber-50 border border-amber-100/60 p-4 rounded-3xl">
                  <span className="text-[8px] font-semibold uppercase text-amber-600 block mb-0.5">Midpoint Hub</span>
                  <h4 className="text-sm font-semibold text-gray-900">{midpointResult.name}</h4>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[9px] font-semibold uppercase text-gray-400 tracking-wider">Suggested spots</span>
                  {midpointResult.spots.map((spot, idx) => (
                    <div key={idx} className="bg-gray-50/60 border border-gray-100 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <h5 className="text-xs font-bold text-gray-800">{spot.name}</h5>
                        <p className="text-[10px] text-gray-400 mt-0.5">{spot.desc}</p>
                      </div>
                      <button
                        onClick={() => handleSelectFindMidpointGo(spot)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase"
                      >
                        Set as Destination
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEXT ACTIONS: Price Compare Destination Bottom Sheet */}
      {isPriceCompareSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end justify-center p-0 sm:p-4 animate-fade-in text-gray-900">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-semibold">Compare Fares</h3>
                <span className="text-[9px] text-gray-400 font-bold uppercase block mt-0.5">Enter destination</span>
              </div>
              <button 
                onClick={() => setIsPriceCompareSheetOpen(false)} 
                className="p-1 hover:bg-gray-150 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <PlaceSearch
                value={quickActionDest}
                onChange={setQuickActionDest}
                onSelect={handlePriceCompareSelect}
                placeholder="Where do you want to go?"
                icon={MapPin}
                iconColor="text-rose-500"
                autoFocus={true}
              />

              <button
                onClick={handlePriceCompareSubmit}
                disabled={!quickActionDest.lat}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-lg"
              >
                Compare Prices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT ACTIONS: Live Journey Issue reporter Bottom Sheet */}
      {isIssueOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end justify-center p-0 sm:p-4 animate-fade-in text-gray-900">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-slide-up">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-semibold">Report Active Journey Issue</h3>
              <button onClick={() => setIsIssueOpen(false)} className="p-1 hover:bg-gray-150 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                'Bus has not arrived / late',
                'Wrong route steps shown',
                'Application issue / crash'
              ].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsIssueOpen(false);
                    showToast('Issue report received. RouteIQ is analyzing coordinates.');
                  }}
                  className="w-full text-left p-3.5 bg-gray-50 border border-gray-100 hover:border-indigo-300 rounded-xl text-xs font-bold text-gray-800 transition-all"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global profile & settings modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

    </div>
  );
}


class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('RouteIQ Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">RouteIQ encountered an unexpected error. Please try refreshing the page.</p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="bg-[#584CF4] hover:bg-[#473CD3] text-white font-bold py-3 px-8 rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            Reset & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <JourneyProvider>
        <RouteIQApp />
      </JourneyProvider>
    </ErrorBoundary>
  );
}
