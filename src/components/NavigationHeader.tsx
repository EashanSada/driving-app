import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  BarChart3,
  Trophy,
  Award,
  AlertTriangle,
  ShieldCheck,
  User,
  History,
  GraduationCap,
  Users,
  Wifi,
  WifiOff,
  Menu,
  X,
  ChevronDown,
  Globe,
  Sliders,
  Radio
} from 'lucide-react';
import { LanguageCode, NavTab, UnitSystem, UserRole } from '../types';
import { t } from '../translations';
import { UserAccount } from '../lib/accountManager';
import { RadianSymbol } from './RadianSymbol';

interface NavigationHeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  activeUsername: string | null;
  activeAccount: UserAccount | null;
  onOpenLoginModal: () => void;
  onOpenDbModal: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentLanguage,
  setLanguage,
  unitSystem,
  setUnitSystem,
  activeUsername,
  activeAccount,
  onOpenLoginModal,
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const languageNames: Record<LanguageCode, { label: string; code: string }> = {
    en: { label: 'English', code: 'EN' },
    es: { label: 'Español', code: 'ES' },
    fr: { label: 'Français', code: 'FR' },
    zh: { label: 'Mandarin', code: 'ZH' }
  };

  const userRole: UserRole = activeAccount?.role || 'young_driver';

  // Primary High-Level Nav Tabs
  const primaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'hud', label: 'Cockpit', icon: <Activity className="w-4 h-4" /> },
    { id: 'analysis', label: 'Safety Index', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'trips', label: 'Logbook', icon: <History className="w-4 h-4" /> }
  ];

  if (userRole === 'gdl_student' || activeAccount?.licenseStage === 'permit') {
    primaryTabs.push({ id: 'gdl', label: 'GDL Hours', icon: <GraduationCap className="w-4 h-4" /> });
  } else if (userRole === 'parent_mentor' || userRole === 'driving_instructor') {
    primaryTabs.push({ id: 'supervisor', label: 'Circle', icon: <Users className="w-4 h-4" /> });
  }

  // Secondary Tools
  const secondaryTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'community', label: 'Driver Groups', icon: <Users className="w-4 h-4" /> },
    { id: 'hazards', label: 'Road Hazards', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'gamification', label: 'Milestones', icon: <Award className="w-4 h-4" /> }
  ];

  if (!primaryTabs.some(t => t.id === 'gdl')) {
    secondaryTabs.push({ id: 'gdl', label: 'GDL Hours', icon: <GraduationCap className="w-4 h-4" /> });
  }
  if (!primaryTabs.some(t => t.id === 'supervisor')) {
    secondaryTabs.push({ id: 'supervisor', label: 'Supervisor Circle', icon: <Users className="w-4 h-4" /> });
  }

  const allTabs = [
    ...primaryTabs,
    ...secondaryTabs.filter(s => !primaryTabs.some(p => p.id === s.id))
  ];

  const handleTabSelect = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  };

  return (
    <>
      {/* Main Luxury Header Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/70 px-4 lg:px-8 py-3 my-2 mx-2 lg:mx-6 rounded-2xl shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Wordmark & Symbol */}
          <button
            onClick={() => handleTabSelect('hud')}
            className="flex items-center gap-3 cursor-pointer text-left shrink-0 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 p-0.5 shadow-md flex items-center justify-center">
              <RadianSymbol size={24} />
            </div>
            <div className="leading-tight">
              <span className="text-base font-black tracking-tight text-stone-900 font-display">
                RADIAN<span className="text-[#A38258]">DRIVE</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.15em] text-stone-400 font-semibold">
                Precision Telematics
              </span>
            </div>
          </button>

          {/* Desktop Primary Navigation Pills */}
          <nav className="hidden lg:flex items-center bg-stone-100/80 p-1 rounded-xl border border-stone-200/60 gap-1">
            {primaryTabs.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Desktop "More" Dropdown Menu */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  secondaryTabs.some(t => t.id === activeTab)
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white border border-stone-200 shadow-xl p-1.5 z-50 animate-in fade-in space-y-0.5">
                  {secondaryTabs.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabSelect(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                          isActive
                            ? 'bg-stone-900 text-white font-bold'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Quick Actions & Profile Zone */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Minimalist Sync Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border ${
                isOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title={isOnline ? 'Cloud sync active' : 'Offline local queue'}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isOnline ? 'Synced' : 'Offline'}</span>
            </div>

            {/* Units Toggle (MPH / KM/H) */}
            <div className="hidden sm:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                onClick={() => setUnitSystem('imperial')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  unitSystem === 'imperial' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                MPH
              </button>
              <button
                onClick={() => setUnitSystem('metric')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  unitSystem === 'metric' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                KM/H
              </button>
            </div>

            {/* Language Selector */}
            <div className="hidden sm:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              {(Object.keys(languageNames) as LanguageCode[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                    currentLanguage === lang ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title={languageNames[lang].label}
                >
                  {languageNames[lang].code}
                </button>
              ))}
            </div>

            {/* Driver Profile Trigger */}
            {activeUsername && activeAccount ? (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200/70 border border-stone-200 transition-all cursor-pointer group"
                title="View Driver Account Profile"
              >
                <div className="text-right hidden md:block leading-tight">
                  <div className="text-xs font-bold text-stone-900 truncate max-w-[100px]">
                    {activeAccount.fullName || activeAccount.username}
                  </div>
                  <div className="text-[9px] font-mono font-bold text-[#A38258]">
                    {activeAccount.safetyScore} pts
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-[#DEBF97] font-black flex items-center justify-center text-[10px]">
                  {activeAccount.username.substring(0, 2).toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="btn-gold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-stone-200 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-2 gap-2">
              {allTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left border ${
                      isActive
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Units & Language Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => setUnitSystem('imperial')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    unitSystem === 'imperial' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  MPH
                </button>
                <button
                  onClick={() => setUnitSystem('metric')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    unitSystem === 'metric' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  KM/H
                </button>
              </div>

              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {(Object.keys(languageNames) as LanguageCode[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                      currentLanguage === lang ? 'bg-stone-900 text-white' : 'text-stone-500'
                    }`}
                  >
                    {languageNames[lang].code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Thumb Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-200/80 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('hud')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'hud' ? 'text-stone-900 scale-105' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === 'hud' ? 'text-[#A38258]' : ''}`} />
          <span>Drive</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'analysis' ? 'text-stone-900 scale-105' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'analysis' ? 'text-[#A38258]' : ''}`} />
          <span>Safety</span>
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            activeTab === 'trips' ? 'text-stone-900 scale-105' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <History className={`w-4 h-4 ${activeTab === 'trips' ? 'text-[#A38258]' : ''}`} />
          <span>Log</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mobileMenuOpen ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};
