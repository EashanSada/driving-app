import React from 'react';

interface RadianSymbolProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const RadianSymbol: React.FC<RadianSymbolProps> = ({
  className = 'w-8 h-8',
  size = 32,
  glow = false
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div className="absolute inset-0 rounded-full bg-[#C5A880]/25 blur-md pointer-events-none" />
      )}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="radianGoldGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DEBF97" />
            <stop offset="50%" stopColor="#C5A880" />
            <stop offset="100%" stopColor="#A38258" />
          </linearGradient>
          <linearGradient id="radianCoreGrad" x1="16" y1="12" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1C1917" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
        </defs>

        {/* Outer Continuous Radian Arc (270 degree precision track) */}
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="url(#radianGoldGrad)"
          strokeWidth="2.5"
          strokeDasharray="94 32"
          strokeLinecap="round"
          className="opacity-90"
        />

        {/* Inner Micro Radian Compass Track */}
        <circle
          cx="24"
          cy="24"
          r="14"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 4"
          className="text-stone-300"
        />

        {/* Signature Kinetic Geometric 'R' Core Vector */}
        <path
          d="M18 32V16H26.5C29.5 16 31.5 17.8 31.5 20.5C31.5 23.2 29.5 25 26.5 25H18M25 25L31.5 32"
          stroke="url(#radianGoldGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Precision Coordinate Micro-Diamond */}
        <circle cx="38.5" cy="18" r="2" fill="#C5A880" />
      </svg>
    </div>
  );
};
