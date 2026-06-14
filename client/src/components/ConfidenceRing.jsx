import { useEffect, useState } from 'react';

export default function ConfidenceRing({ value = 92, size = 64, strokeWidth = 5 }) {
  const [animated, setAnimated] = useState(0);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  
  // Custom curated colors
  const getColor = (val) => {
    if (val >= 88) return '#10B981'; // emerald green
    if (val >= 75) return '#F59E0B'; // amber orange
    return '#EF4444'; // rose red
  };
  
  const offset = circ - (animated / 100) * circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 150);
    return () => clearTimeout(t);
  }, [value]);

  const getFontSizeClass = () => {
    if (size <= 40) return 'text-[9px]';
    if (size <= 50) return 'text-[11px]';
    return 'text-sm';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={r} 
          fill="none" 
          stroke="#E5E7EB" 
          strokeWidth={strokeWidth} 
        />
        {/* Progress circle */}
        <circle
          cx={size/2} 
          cy={size/2} 
          r={r}
          fill="none" 
          stroke={getColor(value)} 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`${getFontSizeClass()} font-bold tracking-tight text-gray-900`}>{value}%</span>
      </div>
    </div>
  );
}
