import React from 'react';
import { ShieldAlert, Activity, BarChart3, Trophy, AlertTriangle, Smartphone, Award, User, LogOut } from 'lucide-react';
import { LanguageCode, NavTab, UnitSystem } from '../types';
import { t } from '../translations';
import { UserAccount } from '../lib/accountManager';

interface NavigationHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (unit: UnitSystem) => void;
  hasNativeBridge: boolean;
  activeUsername: string | null;
  activeAccount: UserAccount | null;
  onOpenLoginModal: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentLanguage,
  setLanguage,
  unitSystem,
  setUnitSystem,
  hasNativeBridge,
  activeUsername,
  activeAccount,
  onOpenLoginModal
}) => {
  const languageNames: Record<LanguageCode, { label: string; flag: string }> = {
    en: { label: 'English', flag: '🇺🇸' },
    es: { label: 'Español', flag: '🇪🇸' },
    fr: { label: 'Français', flag: '🇫🇷' },
    zh: { label: '中文 (Mandarin)', flag: '🇨🇳' }
  };

  const navItems: { id: NavTab; key: Parameters<typeof t>[0]; icon: React.ReactNode }[] = [
    { id: 'hud', key: 'nav_hud', icon: <Activity className="w-4 h-4" /> },
    { id: 'analysis', key: 'nav_analysis', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'leaderboard', key: 'nav_leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'gamification', key: 'nav_gamification', icon: <Award className="w-4 h-4" /> },
    { id: 'hazards', key: 'nav_hazards', icon: <AlertTriangle className="w-4 h-4" /> }
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
                {t('non_profit', currentLanguage)}
              </span>
            </div>
            <p className="text-xs text-slate-400">{t('subtitle', currentLanguage)}</p>
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
                <span>{t(item.key, currentLanguage)}</span>
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
            <span className="hidden sm:inline">{t('gps_active', currentLanguage)}</span>
          </div>

          {/* Unit System Switcher (mph / km/h) */}
          <div className="flex items-center bg-[#020617]/50 p-1 rounded-lg border border-white/10" title="Switch speed and distance units">
            <button
              onClick={() => setUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                unitSystem === 'imperial'
                  ? 'bg-[#2dd4bf] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>MPH</span>
            </button>
            <button
              onClick={() => setUnitSystem('metric')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                unitSystem === 'metric'
                  ? 'bg-[#2dd4bf] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>KM/H</span>
            </button>
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

          {/* User Profile Badge / Switch Account */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            {activeUsername && activeAccount ? (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#020617]/70 border border-white/10 hover:border-[#2dd4bf]/40 transition-all cursor-pointer group"
                title="Click to Switch Account"
              >
                <div className="text-right leading-tight">
                  <div className="text-xs font-bold text-white group-hover:text-[#2dd4bf] transition-colors">
                    {activeAccount.username}
                  </div>
                  <div className="text-[10px] font-semibold text-[#2dd4bf]">
                    Score: {activeAccount.safetyScore}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#2dd4bf]/20 border-2 border-[#2dd4bf] flex items-center justify-center text-xs font-bold text-[#2dd4bf] group-hover:bg-[#2dd4bf] group-hover:text-slate-950 transition-all">
                  {activeAccount.username.substring(0, 2).toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer glow-mint"
              >
                <User className="w-3.5 h-3.5" />
                <span>Enter Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
