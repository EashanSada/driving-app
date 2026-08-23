import React, { useEffect, useState } from 'react';
import { RadianSymbol } from './RadianSymbol';

interface LuxurySplashScreenProps {
  onComplete: () => void;
}

export const LuxurySplashScreen: React.FC<LuxurySplashScreenProps> = ({ onComplete }) => {
  const [fadeState, setFadeState] = useState<'visible' | 'fading' | 'hidden'>('visible');
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth progress bar fill
    const progressTimer = setTimeout(() => setProgress(85), 300);
    const finalTimer = setTimeout(() => setProgress(100), 750);

    // Trigger graceful fade out
    const fadeTimer = setTimeout(() => {
      setFadeState('fading');
    }, 1100);

    const completeTimer = setTimeout(() => {
      setFadeState('hidden');
      onComplete();
    }, 1450);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(finalTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (fadeState === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141312] text-stone-100 transition-opacity duration-500 ${
        fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Radial Illumination */}
      <div className="absolute w-96 h-96 rounded-full bg-[#C5A880]/12 blur-3xl pointer-events-none" />

      {/* Luxury Center Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 px-6 max-w-sm">
        {/* Glowing Radian Insignia */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-[#1C1A17] border border-[#C5A880]/30 shadow-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#C5A880]/15 to-transparent pointer-events-none" />
            <RadianSymbol size={44} glow />
          </div>
          {/* Subtle Outer Ping Effect */}
          <div className="absolute -inset-2 rounded-3xl border border-[#C5A880]/20 animate-pulse pointer-events-none" />
        </div>

        {/* Brand Name Typography */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-[0.25em] text-white font-display uppercase">
            RADIAN<span className="text-[#C5A880]">DRIVE</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#C5A880]/80 font-medium font-serif-luxury">
            Precision Telematics
          </p>
        </div>

        {/* Minimalist Hairline Progress Indicator */}
        <div className="w-44 space-y-2 pt-2">
          <div className="h-[2px] w-full bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C5A880] to-[#E5D2BA] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] uppercase tracking-widest text-stone-500 font-mono">
            Calibrating Kinematics
          </p>
        </div>
      </div>
    </div>
  );
};
