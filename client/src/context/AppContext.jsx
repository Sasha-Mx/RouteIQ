import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [userName, setUserName] = useState(() => localStorage.getItem('riq_name') || '');
  const [activeJourney, setActiveJourney] = useState(() => {
    try { return JSON.parse(localStorage.getItem('riq_active_journey') || 'null'); } catch { return null; }
  });
  const [journeys, setJourneys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('riq_journeys') || '[]'); } catch { return []; }
  });
  const [alerts, setAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [preference, setPreference] = useState(() => localStorage.getItem('riq_preference') || 'fastest');

  useEffect(() => { if (userName) localStorage.setItem('riq_name', userName); }, [userName]);
  useEffect(() => { localStorage.setItem('riq_preference', preference); }, [preference]);
  useEffect(() => {
    if (activeJourney) localStorage.setItem('riq_active_journey', JSON.stringify(activeJourney));
    else localStorage.removeItem('riq_active_journey');
  }, [activeJourney]);
  useEffect(() => { localStorage.setItem('riq_journeys', JSON.stringify(journeys)); }, [journeys]);

  const startJourney = useCallback((route, origin, destination) => {
    const journey = { ...route, origin, destination, startedAt: Date.now(), sessionId: `s_${Date.now()}` };
    setActiveJourney(journey);
    return journey;
  }, []);

  const endJourney = useCallback(() => {
    if (activeJourney) {
      const completed = { ...activeJourney, completedAt: Date.now() };
      setJourneys(prev => [completed, ...prev].slice(0, 50));
    }
    setActiveJourney(null);
    setAlerts([]);
    setUnreadAlerts(0);
  }, [activeJourney]);

  const addAlert = useCallback((alert) => {
    setAlerts(prev => [{ ...alert, id: Date.now(), timestamp: new Date().toISOString(), read: false }, ...prev]);
    setUnreadAlerts(n => n + 1);
  }, []);

  const clearUnread = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadAlerts(0);
  }, []);

  return (
    <AppContext.Provider value={{
      userName, setUserName,
      activeJourney, startJourney, endJourney,
      journeys,
      alerts, addAlert, unreadAlerts, clearUnread,
      preference, setPreference
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
