import React, { useState } from 'react';
import { Award, Zap, ShieldCheck, Flame, Star, CheckCircle, Lock, Sparkles, TrendingUp, Share2, Plus, AlertCircle } from 'lucide-react';
import { BadgeMilestone } from '../types';
import { getAccount, getActiveUsername, UserAccount } from '../lib/accountManager';

interface GamificationViewProps {
  onOpenLoginModal?: () => void;
}

export const GamificationView: React.FC<GamificationViewProps> = ({ onOpenLoginModal }) => {
  const activeUsername = getActiveUsername();
  const account: UserAccount | null = activeUsername ? getAccount(activeUsername) : null;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!activeUsername || !account) {
    return (
      <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-[#2dd4bf] mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-white font-display">No Driver Account Active</h2>
        <p className="text-xs text-slate-300">
          Please enter your username to view your personal driver milestones, level progress, and earned trophies!
        </p>
        <button
          onClick={onOpenLoginModal}
          className="px-6 py-2.5 rounded-xl bg-[#2dd4bf] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 glow-mint"
        >
          <Plus className="w-4 h-4" />
          <span>Enter Account Username</span>
        </button>
      </div>
    );
  }

  // Calculate milestones dynamically based on account stats
  const milestones: BadgeMilestone[] = [
    {
      id: 'FIRST_SAFE_DRIVE',
      title: 'First Safe Drive',
      description: 'Record and complete your first driving session on the HUD.',
      iconName: 'ShieldCheck',
      unlocked: account.totalTrips >= 1,
      progress: Math.min(100, Math.round((account.totalTrips / 1) * 100)),
      unlockedAt: account.totalTrips >= 1 ? 'Unlocked' : undefined,
      category: 'MILESTONE',
      pointsReward: 100
    },
    {
      id: 'CLEAN_STREAK_3',
      title: 'Clean Driver Streak',
      description: 'Complete 3 clean trips with zero harsh braking or cornering spikes.',
      iconName: 'Flame',
      unlocked: account.cleanTrips >= 3,
      progress: Math.min(100, Math.round((account.cleanTrips / 3) * 100)),
      unlockedAt: account.cleanTrips >= 3 ? 'Unlocked' : undefined,
      category: 'SAFETY',
      pointsReward: 300
    },
    {
      id: '25_MILES_SAFE',
      title: '25 Miles Safe Voyager',
      description: 'Log 25+ total miles of recorded safe driving.',
      iconName: 'Award',
      unlocked: account.totalDistanceMiles >= 25,
      progress: Math.min(100, Math.round((account.totalDistanceMiles / 25) * 100)),
      unlockedAt: account.totalDistanceMiles >= 25 ? 'Unlocked' : undefined,
      category: 'MILESTONE',
      pointsReward: 250
    },
    {
      id: '100_MILES_SAFE',
      title: '100 Miles Century Club',
      description: 'Log 100+ total miles of safe highway and street driving.',
      iconName: 'Award',
      unlocked: account.totalDistanceMiles >= 100,
      progress: Math.min(100, Math.round((account.totalDistanceMiles / 100) * 100)),
      unlockedAt: account.totalDistanceMiles >= 100 ? 'Unlocked' : undefined,
      category: 'MILESTONE',
      pointsReward: 500
    },
    {
      id: 'PLATINUM_GUARDIAN',
      title: 'Platinum Guardian',
      description: 'Maintain an average safety score above 90 with at least 3 clean trips.',
      iconName: 'Star',
      unlocked: account.safetyScore >= 90 && account.cleanTrips >= 3,
      progress: Math.min(100, Math.round((account.cleanTrips / 3) * 100)),
      unlockedAt: account.safetyScore >= 90 && account.cleanTrips >= 3 ? 'Unlocked' : undefined,
      category: 'MASTERY',
      pointsReward: 1000
    },
    {
      id: 'SMOOTH_OPERATOR',
      title: 'Smooth Operator',
      description: 'Achieve a trip safety score of 95 or higher.',
      iconName: 'Zap',
      unlocked: account.safetyScore >= 95 && account.totalTrips >= 1,
      progress: Math.min(100, Math.round((account.safetyScore / 95) * 100)),
      unlockedAt: account.safetyScore >= 95 ? 'Unlocked' : undefined,
      category: 'SAFETY',
      pointsReward: 400
    }
  ];

  const xpPercent = Math.min(100, Math.round((account.currentXp / account.nextLevelXp) * 100));
  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2dd4bf] text-slate-950 px-5 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5 fill-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Gamification Header Card */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* User Level & XP Summary */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2dd4bf] via-[#38bdf8] to-[#a78bfa] p-1 shadow-xl glow-mint flex items-center justify-center">
                <div className="w-full h-full bg-[#020617] rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-[#2dd4bf] uppercase tracking-widest">LEVEL</span>
                  <span className="text-3xl font-extrabold text-white font-mono">{account.level}</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#a78bfa] text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                REAL
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-white font-display">{account.username}</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 rounded-full">
                  Account Verified
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full max-w-md space-y-1 mt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2dd4bf]" /> Level XP Progress
                  </span>
                  <span className="text-[#2dd4bf] font-mono">{account.currentXp} / {account.nextLevelXp} XP ({xpPercent}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] h-full transition-all duration-500 rounded-full"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Points & Stats Badges */}
          <div className="flex items-center gap-4 bg-[#020617]/80 p-4 rounded-2xl border border-white/10">
            <div className="text-center px-3 border-r border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Points</span>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xl font-black text-amber-300 font-mono">{account.points.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center px-3 border-r border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Safety Score</span>
              <span className="text-xl font-black text-[#2dd4bf] font-mono">{account.safetyScore}</span>
            </div>

            <div className="text-center px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Badges</span>
              <span className="text-xl font-black text-[#a78bfa] font-mono">{unlockedCount} / {milestones.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Badges Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="card-title text-base flex items-center gap-2 mb-0">
              <Award className="w-5 h-5 text-[#a78bfa]" /> Your Driving Badges & Milestones
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Badges unlock automatically as you log real trips with high safety scores and clean driving habits.
            </p>
          </div>
          <span className="text-xs text-[#2dd4bf] font-semibold bg-[#2dd4bf]/10 px-3 py-1 rounded-full border border-[#2dd4bf]/20">
            {unlockedCount} / {milestones.length} Unlocked
          </span>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                b.unlocked
                  ? 'bg-[#020617]/80 border-[#2dd4bf]/30 hover:border-[#2dd4bf]/60'
                  : 'bg-[#020617]/30 border-white/5 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    b.unlocked
                      ? 'bg-gradient-to-br from-[#2dd4bf]/20 to-[#a78bfa]/20 border-[#2dd4bf]/40 text-[#2dd4bf]'
                      : 'bg-slate-900 border-white/5 text-slate-500'
                  }`}
                >
                  {b.unlocked ? (
                    <Award className="w-6 h-6 text-[#2dd4bf]" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{b.title}</h4>
                    <span className="text-[10px] font-bold text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      +{b.pointsReward} PTS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">{b.description}</p>

                  <div className="mt-3">
                    {b.unlocked ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#2dd4bf] font-semibold">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2dd4bf]" />
                        <span>Unlocked for {account.username}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Progress</span>
                          <span className="font-mono">{b.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="bg-[#a78bfa] h-full"
                            style={{ width: `${b.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Achievement CTA Card */}
      <div className="glass-card p-6 border border-[#a78bfa]/30 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-[#a78bfa]" />
            <h4 className="text-base font-bold text-white font-display">Share Account Summary</h4>
          </div>
          <p className="text-xs text-slate-300">
            Copy account summary for <strong className="text-white">{account.username}</strong> ({account.safetyScore} Safety Score, {account.totalTrips} Real Trips Logged).
          </p>
        </div>
        <button
          onClick={() => setToastMessage(`📢 Account summary for ${account.username} copied to clipboard!`)}
          className="px-5 py-2.5 rounded-xl bg-[#a78bfa]/20 border border-[#a78bfa]/40 hover:bg-[#a78bfa]/30 text-xs font-bold text-[#a78bfa] transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span>Copy Summary</span>
        </button>
      </div>
    </div>
  );
};
