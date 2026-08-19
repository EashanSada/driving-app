import React, { useEffect, useState } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { TelematicsHudView } from './components/TelematicsHudView';
import { RiskAnalysisView } from './components/RiskAnalysisView';
import { LeaderboardView } from './components/LeaderboardView';
import { GamificationView } from './components/GamificationView';
import { HazardMapView } from './components/HazardMapView';
import { GdlTrackerView } from './components/GdlTrackerView';
import { SupervisorCircleView } from './components/SupervisorCircleView';
import { TripHistoryReplayModal } from './components/TripHistoryReplayModal';
import { UserLoginModal } from './components/UserLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import { LanguageCode, NavTab, UnitSystem } from './types';
import { fetchAccountFromSupabase, getAccount, getActiveUsername, UserAccount } from './lib/accountManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('hud');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [hasNativeBridge, setHasNativeBridge] = useState(false);
  const [lastTripSummary, setLastTripSummary] = useState<any>(null);

  // User Account State
  const [activeUsername, setActiveUsernameState] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<UserAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  useEffect(() => {
    // Check if Native Android Bridge is present
    if (typeof (window as any).AndroidBridge !== 'undefined') {
      setHasNativeBridge(true);
    }

    // Initialize active username
    const savedUser = getActiveUsername();
    if (savedUser) {
      const localAcc = getAccount(savedUser);
      if (localAcc) {
        setActiveUsernameState(savedUser);
        setActiveAccount(localAcc);
      } else {
        fetchAccountFromSupabase(savedUser).then((cloudAcc) => {
          if (cloudAcc) {
            setActiveUsernameState(savedUser);
            setActiveAccount(cloudAcc);
          } else {
            setIsLoginModalOpen(true);
          }
        });
      }
    } else {
      // Auto open login modal if no valid user logged in
      setIsLoginModalOpen(true);
    }

    // Initialize App Controller
    if ((window as any).DriveSafeApp) {
      (window as any).DriveSafeApp.setLanguage(currentLanguage);
    }
  }, []);

  const handleLoginSuccess = (username: string) => {
    setActiveUsernameState(username);
    const acc = getAccount(username);
    setActiveAccount(acc);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setActiveUsernameState(null);
    setActiveAccount(null);
    setIsLoginModalOpen(true);
  };

  const handleSetLanguage = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    if ((window as any).DriveSafeApp) {
      (window as any).DriveSafeApp.setLanguage(lang);
    }
  };

  const handleTripCompleted = (summary: any) => {
    setLastTripSummary(summary);
    // Refresh active account state
    if (activeUsername) {
      setActiveAccount(getAccount(activeUsername));
    }
    // Switch to Risk Analysis view automatically on trip completion
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans selection:bg-[#2dd4bf] selection:text-slate-950">
      {/* User Login & Questionnaire Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsLoginModalOpen(false)}
        allowCancel={Boolean(activeUsername && activeAccount)}
      />

      {/* User Profile View Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        account={activeAccount}
        onClose={() => setIsProfileModalOpen(false)}
        onSwitchAccount={() => {
          setIsProfileModalOpen(false);
          setIsLoginModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Database Status Modal */}
      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      {/* Sticky Top Header */}
      <NavigationHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLanguage={currentLanguage}
        setLanguage={handleSetLanguage}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        activeUsername={activeUsername}
        activeAccount={activeAccount}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onOpenLoginModal={() => {
          if (activeUsername && activeAccount) {
            setIsProfileModalOpen(true);
          } else {
            setIsLoginModalOpen(true);
          }
        }}
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

        {activeTab === 'trips' && (
          <TripHistoryReplayModal
            isOpen={true}
            onClose={() => setActiveTab('hud')}
            unitSystem={unitSystem}
          />
        )}

        {activeTab === 'gdl' && <GdlTrackerView />}

        {activeTab === 'supervisor' && <SupervisorCircleView unitSystem={unitSystem} />}

        {activeTab === 'leaderboard' && (
          <LeaderboardView onOpenLoginModal={() => setIsLoginModalOpen(true)} />
        )}

        {activeTab === 'gamification' && (
          <GamificationView onOpenLoginModal={() => setIsLoginModalOpen(true)} />
        )}

        {activeTab === 'hazards' && <HazardMapView unitSystem={unitSystem} />}
      </main>

      {/* Public App Footer */}
      <footer className="glass border-t border-white/10 my-4 mx-4 lg:mx-8 py-4 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            <span>
              DriveSafe Telematics • Active User:{' '}
              <strong className="text-white">{activeUsername || 'Guest'}</strong> (
              {activeAccount?.role || 'Young Driver'})
            </span>
          </div>
          <p className="font-medium text-[11px] text-slate-400">
            © {new Date().getFullYear()} DriveSafe Youth Initiative • Real Telematics & Safety Tracking.
          </p>
        </div>
      </footer>
    </div>
  );
}
