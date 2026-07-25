import React from 'react';
import { ShieldAlert, Activity, BarChart3, Trophy, AlertTriangle, Globe, Smartphone, Award, Users } from 'lucide-react';
import { LanguageCode, NavTab } from '../types';

interface NavigationHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  hasNativeBridge: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentLanguage,
  setLanguage,
  hasNativeBridge
}) => {
  const languageNames: Record<LanguageCode, { label: string; flag: string }> = {
    en: { label: 'English', flag: '🇺🇸' },
    es: { label: 'Español', flag: '🇪🇸' },
    fr: { label: 'Français', flag: '🇫🇷' },
    zh: { label: '中文 (Mandarin)', flag: '🇨🇳' }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'hud', label: 'Drive Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'analysis', label: 'Safety Score', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'gamification', label: 'Badges & Rewards', icon: <Award className="w-4 h-4" /> },
    { id: 'community', label: 'Youth Groups', icon: <Users className="w-4 h-4" /> },
    { id: 'hazards', label: 'Road Hazards', icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10 px-4 lg:px-8 py-3 my-2 mx-2 lg:mx-4 rounded-2xl shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2dd4bf] to-[#a78bfa] p-0.5 shadow-lg shadow-[#2dd4bf]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#020617] rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-[#2dd4bf]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white font-display">
                DRIVESAFE <span className="text-[#2dd4bf]">YOUTH</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 rounded-full">
                NON-PROFIT
              </span>
            </div>
            <p className="text-xs text-slate-400">Empowering Safe Driving for Youth & Teens</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-[#020617]/60 p-1.5 rounded-xl border border-white/10 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/40 shadow-sm glow-violet'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Language Pills & User Profile */}
        <div className="flex items-center gap-3">
          {/* GPS Live Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30"
            title="Real-Time Location & Safety Sensors Active"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span className="hidden sm:inline">GPS Active</span>
          </div>

          {/* i18n Language Buttons (EN, ES, FR, ZH) */}
          <div className="flex items-center gap-1.5 bg-[#020617]/50 p-1 rounded-lg border border-white/10">
            {(Object.keys(languageNames) as LanguageCode[]).map((lang) => {
              const isActive = currentLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`lang-btn ${isActive ? 'active' : ''}`}
                  title={languageNames[lang].label}
                >
                  {lang.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* User Profile Badge */}
          <div className="hidden lg:flex items-center gap-2.5 pl-2 border-l border-white/10">
            <div className="text-right leading-tight">
              <div className="text-xs font-bold text-slate-100">Alex Rivera</div>
              <div className="text-[10px] font-semibold text-[#2dd4bf]">Safe Driver</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#2dd4bf] overflow-hidden flex items-center justify-center text-xs font-bold text-[#2dd4bf]">
              AR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
