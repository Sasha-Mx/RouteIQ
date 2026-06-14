import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { connectSSE, disconnectSSE, onSSEEvent } from '../services/sse';

const JourneyContext = createContext(null);

export function JourneyProvider({ children }) {
  // User Profile / Settings
  const [userName, setUserName] = useState(() => localStorage.getItem('riq_name') || '');
  const [mattersMost, setMattersMost] = useState(() => localStorage.getItem('riq_matters_most') || 'time'); // 'time', 'money', 'comfort', 'sustainability'
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('riq_avatar') || 'male');

  // Global Journey History / Stats
  const [journeys, setJourneys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('riq_journeys') || '[]');
    } catch {
      return [];
    }
  });

  // Active Journey State (Single Store)
  const [route, setRoute] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [eta, setEta] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [vehiclePosition, setVehiclePosition] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [trackingStatus, setTrackingStatus] = useState('idle'); // 'idle' | 'active' | 'reconnecting' | 'completed'

  // SSE Reconnect Settings
  const sseSessionIdRef = useRef(null);
  const sseRouteRef = useRef(null);
  const sseBackoffRef = useRef(3000); // starts at 3s
  const reconnectTimeoutRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Sync profile options to localStorage
  useEffect(() => {
    localStorage.setItem('riq_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('riq_matters_most', mattersMost);
  }, [mattersMost]);

  useEffect(() => {
    localStorage.setItem('riq_avatar', userAvatar);
  }, [userAvatar]);

  useEffect(() => {
    localStorage.setItem('riq_journeys', JSON.stringify(journeys));
  }, [journeys]);

  // Compute profile analytics
  const getStats = useCallback(() => {
    return journeys.reduce(
      (acc, j) => {
        acc.moneySaved += j.moneySaved || 0;
        acc.timeSaved += j.timeSaved || 0;
        acc.co2Saved += j.co2Saved || 0;
        acc.totalJourneys += 1;
        return acc;
      },
      { moneySaved: 0, timeSaved: 0, co2Saved: 0, totalJourneys: 0 }
    );
  }, [journeys]);

  // Handle SSE connection and auto-reconnect with backoff
  const establishSSEConnection = useCallback((sessionId, routeData) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    console.log(`Connecting to SSE. Session: ${sessionId}, backoff: ${sseBackoffRef.current}ms`);
    
    try {
      const es = connectSSE(sessionId, routeData);
      eventSourceRef.current = es;

      // Reset backoff on successful connection
      es.onopen = () => {
        console.log('SSE connection successfully established');
        setTrackingStatus('active');
        sseBackoffRef.current = 3000; // Reset backoff to 3s
      };

      // Set up error listener for auto-reconnect
      es.onerror = () => {
        console.warn('SSE connection lost. Reconnecting...');
        setTrackingStatus('reconnecting');
        es.close();

        // Increment backoff: 3s -> 5s -> 10s -> 10s (max 10s)
        const currentBackoff = sseBackoffRef.current;
        let nextBackoff = 3000;
        if (currentBackoff === 3000) nextBackoff = 5000;
        else if (currentBackoff === 5000 || currentBackoff === 10000) nextBackoff = 10000;
        sseBackoffRef.current = nextBackoff;

        reconnectTimeoutRef.current = setTimeout(() => {
          establishSSEConnection(sessionId, routeData);
        }, nextBackoff);
      };
    } catch (err) {
      console.error('SSE establish error:', err);
    }
  }, []);

  const addJourneyAlert = useCallback((newAlert) => {
    const alertItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...newAlert
    };
    setAlerts(prev => [alertItem, ...prev]);
    setUnreadAlerts(n => n + 1);
  }, []);

  // SSE event hooks
  useEffect(() => {
    if (trackingStatus === 'idle') return;

    // Listen to nudge events
    const unsubNudge = onSSEEvent('nudge', (data) => {
      console.log('SSE Nudge received:', data);
      addJourneyAlert({
        type: 'nudge',
        title: 'AI Mobility Nudge',
        message: data.message,
        data: data
      });
    });

    // Listen to replan events
    const unsubReplan = onSSEEvent('replan', (data) => {
      console.log('SSE Replan received:', data);
      addJourneyAlert({
        type: 'replan',
        title: 'Replan Suggestion',
        message: data.reason,
        data: data
      });
    });

    // Listen to heartbeat / stats updates
    const unsubHeartbeat = onSSEEvent('heartbeat', (data) => {
      // Periodic updates simulate vehicle progress
      if (route && route.legs) {
        // Simple step simulation based on time elapsed
        const elapsed = (Date.now() - (route.startedAt || Date.now())) / 1000; // in seconds
        const legDuration = 10; // simulate step change every 10 seconds for demo
        const stepIdx = Math.min(route.legs.length - 1, Math.floor(elapsed / legDuration));
        
        const nextStep = route.legs[stepIdx];
        if (nextStep) {
          setCurrentStep(`Step ${stepIdx + 1}: ${nextStep.instruction}`);
          // Update vehicle coordinates if moving (bus/metro)
          if (nextStep.mode === 'bus' || nextStep.mode === 'metro') {
            // slightly offset coordinates to simulate active movement
            const basePos = route.polyline ? route.polyline[Math.min(route.polyline.length - 1, stepIdx)] : [28.6139, 77.2090];
            const deltaLat = (Math.random() - 0.5) * 0.005;
            const deltaLng = (Math.random() - 0.5) * 0.005;
            setVehiclePosition([basePos[0] + deltaLat, basePos[1] + deltaLng]);
          } else {
            setVehiclePosition(null);
          }
        }
      }
    });

    return () => {
      unsubNudge();
      unsubReplan();
      unsubHeartbeat();
    };
  }, [trackingStatus, route, addJourneyAlert]);

  // Start tracking a journey
  const startJourney = useCallback((selectedRoute, origin, destination, comparisonFares) => {
    const sessionId = `session_${Date.now()}`;
    const startedAt = Date.now();
    const journeyData = {
      ...selectedRoute,
      origin,
      destination,
      startedAt,
      sessionId
    };

    setRoute(journeyData);
    setRouteId(selectedRoute.label || 'fastest');
    setConfidence(selectedRoute.confidence || 92);
    setEta(selectedRoute.liveEta || 'Calculating...');
    setCurrentStep(selectedRoute.legs?.[0]?.instruction || 'Proceeding to start...');
    setVehiclePosition(null);
    setComparison(comparisonFares);
    setTrackingStatus('active');
    setAlerts([]);
    setUnreadAlerts(0);

    // Save refs for potential reconnection
    sseSessionIdRef.current = sessionId;
    sseRouteRef.current = selectedRoute;
    sseBackoffRef.current = 3000;

    establishSSEConnection(sessionId, selectedRoute);
  }, [establishSSEConnection]);

  // Replan a route dynamically
  const applyReplannedRoute = useCallback((newRoute) => {
    if (!route) return;
    addJourneyAlert({
      type: 'system',
      title: 'Route Updated',
      message: `Switched to faster route: saved ${newRoute.savedMinutes || 9} minutes.`,
    });
    setRoute(prev => ({
      ...prev,
      ...newRoute,
      legs: newRoute.legs && newRoute.legs.length > 0 ? newRoute.legs : prev.legs
    }));
    setRouteId(newRoute.label || 'alternative');
    if (newRoute.totalMinutes) {
      const now = new Date();
      const currentArrival = new Date(now.getTime() + newRoute.totalMinutes * 60000);
      setEta(currentArrival.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }
  }, [route, addJourneyAlert]);

  // End active journey
  const endJourney = useCallback(() => {
    if (trackingStatus !== 'idle') {
      const completedJourney = {
        id: Date.now(),
        routeId: routeId,
        origin: route?.origin || { name: 'Origin', lat: null, lng: null },
        destination: route?.destination || { name: 'Destination', lat: null, lng: null },
        legs: route?.legs || [],
        startedAt: route?.startedAt,
        completedAt: Date.now(),
        moneySaved: comparison?.moneySaved || 0,
        timeSaved: comparison?.timeDifference || 0,
        co2Saved: comparison?.co2Saved || 0
      };

      setJourneys(prev => [completedJourney, ...prev].slice(0, 50));
    }

    // Clear SSE
    disconnectSSE();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setRoute(null);
    setRouteId(null);
    setConfidence(null);
    setEta(null);
    setCurrentStep(null);
    setVehiclePosition(null);
    setAlternatives([]);
    setComparison(null);
    setAlerts([]);
    setUnreadAlerts(0);
    setTrackingStatus('idle');

    sseSessionIdRef.current = null;
    sseRouteRef.current = null;
  }, [trackingStatus, route, routeId, comparison]);

  const saveJourney = useCallback((journey) => {
    setJourneys(prev => {
      if (prev.some(j => j.id === journey.id)) return prev;
      return [journey, ...prev].slice(0, 50);
    });
  }, []);

  const clearUnreadAlerts = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadAlerts(0);
  }, []);

  return (
    <JourneyContext.Provider value={{
      // Onboarding & settings
      userName, setUserName,
      mattersMost, setMattersMost,
      userAvatar, setUserAvatar,

      // Active journey state
      route,
      routeId,
      confidence,
      eta,
      currentStep,
      vehiclePosition,
      alternatives,
      comparison,
      alerts,
      unreadAlerts,
      trackingStatus,
      setAlternatives,
      journeys,

      // Operations
      startJourney,
      endJourney,
      saveJourney,
      applyReplannedRoute,
      clearUnreadAlerts,
      addJourneyAlert,
      getStats
    }}>
      {children}
    </JourneyContext.Provider>
  );
}

export const useJourney = () => useContext(JourneyContext);

// Backwards compatibility mapper for BottomNav or other components importing useApp/AppContext
export const useApp = useJourney;
