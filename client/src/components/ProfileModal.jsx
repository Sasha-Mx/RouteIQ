import { X, Award, Coins, Flame, ShieldCheck, Trash2 } from 'lucide-react';
import { useJourney } from '../context/JourneyContext';
import Avatar from './Avatar';

export default function ProfileModal({ isOpen, onClose }) {
  const { userName, setUserName, mattersMost, setMattersMost, userAvatar, setUserAvatar, getStats, journeys, endJourney } = useJourney();

  if (!isOpen) return null;

  const stats = getStats();

  const handleClearHistory = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mobility Analytics</h2>
              <p className="text-xs text-gray-500">Your RouteIQ impact dashboard</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Money Saved</span>
              <Coins className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold text-emerald-700 leading-none">₹{stats.moneySaved}</div>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">vs Ride-Hailing</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Time Saved</span>
              <Flame className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold text-indigo-700 leading-none">{stats.timeSaved}m</div>
              <p className="text-[10px] text-indigo-600 font-medium mt-1">Smart decisions</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 p-4 rounded-3xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">CO₂ Saved</span>
              <span className="text-base">🌱</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold text-green-700 leading-none">{stats.co2Saved.toFixed(1)} kg</div>
              <p className="text-[10px] text-green-600 font-medium mt-1">Eco-friendly choices</p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-100 p-4 rounded-3xl flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Total Runs</span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold text-purple-700 leading-none">{stats.totalJourneys}</div>
              <p className="text-[10px] text-purple-600 font-medium mt-1">AI Guided trips</p>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4 border-t border-gray-100 pt-5 mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Settings</h4>
          
          {/* Profile Avatar Selection */}
          <div className="flex flex-col items-center gap-3 py-2 bg-slate-50/50 rounded-3xl border border-slate-100 p-4">
            <div className="w-16 h-16 shadow-md rounded-full overflow-hidden border-2 border-indigo-600/20 bg-indigo-50">
              <Avatar type={userAvatar} className="w-full h-full" />
            </div>
            <div className="flex gap-2">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'neutral', label: 'Neutral' }
              ].map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setUserAvatar(av.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    userAvatar === av.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {av.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Display Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Route Preference</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'time', label: '⚡ Save Time', activeClass: 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' },
                { id: 'money', label: '💰 Save Money', activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' },
                { id: 'comfort', label: '😌 Comfort', activeClass: 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20' },
                { id: 'sustainability', label: '🌱 Eco-Friendly', activeClass: 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20' }
              ].map((pref) => {
                const isActive = mattersMost === pref.id;
                return (
                  <button
                    key={pref.id}
                    type="button"
                    onClick={() => setMattersMost(pref.id)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      isActive
                        ? pref.activeClass
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pref.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-auto border-t border-gray-100 pt-4 flex gap-2">
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-xs"
          >
            <Trash2 className="w-4 h-4" />
            Reset Data
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-2xl transition-colors text-xs text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
