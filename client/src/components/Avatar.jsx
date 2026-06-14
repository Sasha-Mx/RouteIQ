import React from 'react';

export default function Avatar({ type = 'male', className = 'w-full h-full' }) {
  if (type === 'female') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background circle */}
        <circle cx="50" cy="50" r="50" fill="#FEE2E2" />
        {/* Hair Back */}
        <path d="M25 50 C25 25, 75 25, 75 50 C75 62, 70 75, 70 82 L30 82 C30 75, 25 62, 25 50 Z" fill="#78350F" />
        {/* Shirt */}
        <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#EC4899" />
        {/* Neck */}
        <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
        {/* Face */}
        <circle cx="50" cy="42" r="18" fill="#FDBA74" />
        {/* Hair Front */}
        <path d="M32 38 C32 24, 40 20, 50 20 C60 20, 68 24, 68 38 C68 38, 64 30, 50 30 C36 30, 32 38, 32 38 Z" fill="#78350F" />
        <path d="M32 38 C30 42, 30 46, 31 50 C32 48, 33 42, 33 42 Z" fill="#78350F" />
        <path d="M68 38 C70 42, 70 46, 69 50 C68 48, 67 42, 67 42 Z" fill="#78350F" />
        {/* Blush */}
        <circle cx="38" cy="46" r="2" fill="#F87171" opacity="0.6" />
        <circle cx="62" cy="46" r="2" fill="#F87171" opacity="0.6" />
        {/* Eyes */}
        <circle cx="44" cy="41" r="2" fill="#1E293B" />
        <circle cx="56" cy="41" r="2" fill="#1E293B" />
        {/* Smile */}
        <path d="M46 48.5 Q50 51.5 54 48.5" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'neutral') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background circle */}
        <circle cx="50" cy="50" r="50" fill="#FEF3C7" />
        {/* Shirt */}
        <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#10B981" />
        {/* Neck */}
        <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
        {/* Face */}
        <circle cx="50" cy="42" r="18" fill="#FDBA74" />
        {/* Cap (Stylish Cap) */}
        <path d="M31 38 C31 24, 40 18, 50 18 C60 18, 69 24, 69 38 L31 38 Z" fill="#3B82F6" />
        {/* Cap Visor */}
        <path d="M28 38 C38 34, 62 34, 72 38" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="44" cy="42" r="2" fill="#1E293B" />
        <circle cx="56" cy="42" r="2" fill="#1E293B" />
        {/* Smile */}
        <path d="M46 49 Q50 52 54 49" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Default: Male Avatar
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="50" cy="50" r="50" fill="#E0E7FF" />
      {/* Shirt */}
      <path d="M25 90 C25 74, 38 68, 50 68 C62 68, 75 74, 75 90" fill="#4F46E5" />
      {/* Neck */}
      <rect x="44" y="55" width="12" height="15" rx="3" fill="#FDBA74" />
      {/* Face */}
      <circle cx="50" cy="42" r="18" fill="#FDBA74" />
      {/* Hair */}
      <path d="M31 36 C31 22, 40 18, 50 18 C60 18, 69 22, 69 36 C63 36, 60 30, 50 30 C40 30, 37 36, 31 36 Z" fill="#1E293B" />
      {/* Eyes */}
      <circle cx="44" cy="42" r="2" fill="#1E293B" />
      <circle cx="56" cy="42" r="2" fill="#1E293B" />
      {/* Smile */}
      <path d="M46 49 Q50 52 54 49" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
