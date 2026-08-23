import React, { useEffect, useState } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { TelematicsHudView } from './components/TelematicsHudView';
import { RiskAnalysisView } from './components/RiskAnalysisView';
import { LeaderboardView } from './components/LeaderboardView';
import { GamificationView } from './components/GamificationView';
import { HazardMapView } from './components/HazardMapView';
import { CommunityGroupsView } from './components/CommunityGroupsView';
import { GdlTrackerView } from './components/GdlTrackerView';
import { SupervisorCircleView } from './components/SupervisorCircleView';
import { TripHistoryReplayModal } from './components/TripHistoryReplayModal';
import { UserLoginModal } from './components/UserLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import { LuxurySplashScreen } from './components/LuxurySplashScreen';
import { LanguageCode, NavTab, UnitSystem } from './types';
import { fetchAccountFromSupabase, getAccount, getActiveUsername, UserAccount } from './lib/accountManager';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
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

  const applyAccountPreferences = (acc: UserAccount | null) => {
    if (!acc) return;
    if (acc.unitSystem) {
      setUnitSystem(acc.unitSystem);
    }
    if (acc.preferredLanguage) {
      setCurrentLanguage(acc.preferredLanguage);
      if ((window as any).DriveSafeApp) {
        (window as any).DriveSafeApp.setLanguage(acc.preferredLanguage);
      }
    }
  };

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
        applyAccountPreferences(localAcc);
      } else {
        fetchAccountFromSupabase(savedUser).then((cloudAcc) => {
          if (cloudAcc) {
            setActiveUsernameState(savedUser);
            setActiveAccount(cloudAcc);
            applyAccountPreferences(cloudAcc);
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

  const handleLoginSuccess = (username: string, accountObj?: UserAccount) => {
    setActiveUsernameState(username);
    const acc = accountObj || getAccount(username);
    setActiveAccount(acc || null);
    if (acc) {
      applyAccountPreferences(acc);
    }
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
    if (activeUsername) {
      const refreshed = getAccount(activeUsername);
      setActiveAccount(refreshed);
      applyAccountPreferences(refreshed);
    }
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col font-sans selection:bg-[#C5A880] selection:text-stone-950">
      {/* Luxury Loading Splash Screen */}
      {showSplash && <LuxurySplashScreen onComplete={() => setShowSplash(false)} />}

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

      {/* Sticky Top Luxury Header */}
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

      {/* Main Responsive Body Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 mb-16 lg:mb-6">
        {activeTab === 'hud' && (
          <TelematicsHudView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            onTripCompleted={handleTripCompleted}
            activeAccount={activeAccount}
            onRequireAccount={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'analysis' && (
          <RiskAnalysisView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            lastTripSummary={lastTripSummary}
            activeAccount={activeAccount}
            onNavigateToCockpit={() => setActiveTab('hud')}
          />
        )}

        {activeTab === 'trips' && (
          <TripHistoryReplayModal
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeUsername={activeUsername}
          />
        )}

        {activeTab === 'gdl' && (
          <GdlTrackerView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeUsername={activeUsername}
            activeAccount={activeAccount}
          />
        )}

        {activeTab === 'supervisor' && (
          <SupervisorCircleView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeUsername={activeUsername}
            activeAccount={activeAccount}
          />
        )}

        {activeTab === 'hazards' && (
          <HazardMapView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeUsername={activeUsername}
          />
        )}

        {activeTab === 'community' && (
          <CommunityGroupsView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeUsername={activeUsername}
            activeAccount={activeAccount}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeAccount={activeAccount}
          />
        )}

        {activeTab === 'gamification' && (
          <GamificationView
            unitSystem={unitSystem}
            currentLanguage={currentLanguage}
            activeAccount={activeAccount}
          />
        )}
      </main>
    </div>
  );
}
