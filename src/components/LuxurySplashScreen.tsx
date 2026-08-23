import React, { useEffect, useState } from 'react';
import { RadianSymbol } from './RadianSymbol';

interface LuxurySplashScreenProps {
  onComplete: () => void;
}

export const LuxurySplashScreen: React.FC<LuxurySplashScreenProps> = ({ onComplete }) => {
  const [fadeState, setFadeState] = useState<'visible' | 'fading' | 'hidden'>('visible');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress fill
    const progressStart = setTimeout(() => {
      setProgress(100);
    }, 100);

    // Fade out sequence
    const fadeTimer = setTimeout(() => {
      setFadeState('fading');
    }, 2800);

    // Complete and remove
    const completeTimer = setTimeout(() => {
      setFadeState('hidden');
      onComplete();
    }, 3400);

    return () => {
      clearTimeout(progressStart);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setFadeState('fading');
    setTimeout(() => {
      setFadeState('hidden');
      onComplete();
    }, 300);
  };

  if (fadeState === 'hidden') return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#121110] text-stone-100 transition-opacity duration-700 select-none cursor-pointer ${
        fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Radial Illumination */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[#C5A880]/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-72 h-72 rounded-full bg-stone-900/60 blur-2xl pointer-events-none" />

      {/* Luxury Center Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-7 px-6 max-w-sm">
        {/* Glowing Radian Insignia */}
        <div className="relative">
          <div className="w-22 h-22 rounded-3xl bg-[#1A1815] border border-[#C5A880]/35 shadow-2xl flex items-center justify-center relative overflow-hidden transition-transform duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-b from-[#C5A880]/20 via-transparent to-transparent pointer-events-none" />
            <RadianSymbol size={48} glow />
          </div>
          {/* Subtle Outer Animated Aura */}
          <div className="absolute -inset-2.5 rounded-3xl border border-[#C5A880]/20 animate-pulse pointer-events-none" />
          <div className="absolute -inset-5 rounded-full border border-[#C5A880]/10 opacity-60 pointer-events-none" />
        </div>

        {/* Brand Name Typography */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.28em] text-white font-display uppercase">
            RADIAN<span className="text-[#C5A880]">DRIVE</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#C5A880]/85 font-medium font-serif-luxury">
            Precision Telematics
          </p>
        </div>

        {/* Minimalist Hairline Progress Bar */}
        <div className="w-48 pt-2">
          <div className="h-[2px] w-full bg-stone-800/80 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#A38258] via-[#C5A880] to-[#F1E5D5] transition-all duration-[2600ms] ease-out shadow-[0_0_8px_rgba(197,168,128,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
