const modeConfig = {
  walk: { label: '🚶', bg: '#DCFCE7', color: '#059669', border: '#BBF7D0' },
  bus: { label: '🚌', bg: '#EEF2FF', color: '#4F46E5', border: '#E0E7FF' },
  metro: { label: '🚇', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  auto: { label: '🛺', bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
  cab: { label: '🚕', bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
  uber: { label: '🚕', bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' }
};

export default function ModePills({ legs = [] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {legs.map((leg, i) => {
        const mode = leg.mode?.toLowerCase() || 'walk';
        const cfg = modeConfig[mode] || { label: '•', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
        
        return (
          <div key={i} className="flex items-center gap-1">
            <span 
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
              <span className="text-sm leading-none">{cfg.label}</span>
              <span>
                {leg.line ? `${mode === 'bus' ? '' : ''}${leg.line}` : leg.mode}
              </span>
              {leg.minutes && (
                <span className="opacity-75 font-normal">({leg.minutes}m)</span>
              )}
            </span>
            {i < legs.length - 1 && (
              <span className="text-gray-300 font-medium select-none">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
