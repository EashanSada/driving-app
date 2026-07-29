import React, { useEffect, useState } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { TelematicsHudView } from './components/TelematicsHudView';
import { RiskAnalysisView } from './components/RiskAnalysisView';
import { LeaderboardView } from './components/LeaderboardView';
import { GamificationView } from './components/GamificationView';
import { CommunityView } from './components/CommunityView';
import { HazardMapView } from './components/HazardMapView';
import { LanguageCode, NavTab, UnitSystem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('hud');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [hasNativeBridge, setHasNativeBridge] = useState(false);
  const [lastTripSummary, setLastTripSummary] = useState<any>(null);

  useEffect(() => {
    // Check if Native Android Bridge is present
    if (typeof (window as any).AndroidBridge !== 'undefined') {
      setHasNativeBridge(true);
    }

    // Initialize App Controller
    if ((window as any).DriveSafeApp) {
      (window as any).DriveSafeApp.setLanguage(currentLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    if ((window as any).DriveSafeApp) {
      (window as any).DriveSafeApp.setLanguage(lang);
    }
  };

  const handleTripCompleted = (summary: any) => {
    setLastTripSummary(summary);
    // Switch to ML Risk Analysis view automatically on trip completion
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans selection:bg-[#2dd4bf] selection:text-slate-950">
      {/* Sticky Header */}
      <NavigationHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLanguage={currentLanguage}
        setLanguage={handleSetLanguage}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        hasNativeBridge={hasNativeBridge}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'hud' && (
          <TelematicsHudView
            currentLanguage={currentLanguage}
            unitSystem={unitSystem}
            onTripCompleted={handleTripCompleted}
            hasNativeBridge={hasNativeBridge}
          />
        )}

        {activeTab === 'analysis' && (
          <RiskAnalysisView
            lastTripSummary={lastTripSummary}
            currentLanguage={currentLanguage}
            unitSystem={unitSystem}
          />
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'gamification' && <GamificationView />}

        {activeTab === 'community' && <CommunityView />}

        {activeTab === 'hazards' && <HazardMapView unitSystem={unitSystem} />}
      </main>

      {/* Public App Footer */}
      <footer className="glass border-t border-white/10 my-4 mx-4 lg:mx-8 py-4 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            <span>DriveSafe Youth Network • Live Safety Active</span>
          </div>
          <p className="font-medium text-[11px] text-slate-400">
            © {new Date().getFullYear()} DriveSafe Youth Initiative • Keeping young drivers safe on every road.
          </p>
        </div>
      </footer>
    </div>
  );
}
