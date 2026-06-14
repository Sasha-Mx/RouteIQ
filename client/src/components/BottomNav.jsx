import { Home, Route, MapPin, Bell, User } from 'lucide-react';
import { useJourney } from '../context/JourneyContext';

const tabs = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'journeys', icon: Route, label: 'Journeys' },
  { id: 'live', icon: MapPin, label: 'Live' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ active, onTabChange }) {
  const { unreadAlerts } = useJourney();
  return (
    <nav className="flex-shrink-0 bg-white border-t border-gray-100" style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.04)' }}>
      <div className="flex">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all"
          >
            <div className="relative">
              <Icon
                size={22}
                strokeWidth={active === id ? 2.5 : 1.8}
                className={active === id ? 'text-indigo-600' : 'text-gray-400'}
              />
              {id === 'alerts' && unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white px-0.5" style={{ fontSize: '9px' }}>
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </div>
            <span className={`text-xs ${active === id ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>{label}</span>
            {active === id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
