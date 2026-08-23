import React, { useState } from 'react';
import { Award, Zap, ShieldCheck, Flame, Star, CheckCircle, Lock, Plus, AlertCircle } from 'lucide-react';
import { BadgeMilestone } from '../types';
import { getAccount, getActiveUsername, UserAccount } from '../lib/accountManager';
import { RadianSymbol } from './RadianSymbol';

interface GamificationViewProps {
  onOpenLoginModal?: () => void;
}

export const GamificationView: React.FC<GamificationViewProps> = ({ onOpenLoginModal }) => {
  const activeUsername = getActiveUsername();
  const account: UserAccount | null = activeUsername ? getAccount(activeUsername) : null;

  if (!activeUsername || !account) {
    return (
      <div className="luxury-card p-10 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 font-display">No Driver Account Active</h2>
        <p className="text-xs text-stone-500">
          Sign in or create an account to view your earned milestones and defensive driving rewards.
        </p>
        <button
          onClick={onOpenLoginModal}
          className="btn-gold px-6 py-2.5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Enter Driver Username</span>
        </button>
      </div>
    );
  }

  // Calculate milestones dynamically
  const milestones: BadgeMilestone[] = [
    {
      id: 'FIRST_SAFE_DRIVE',
      title: 'First Safe Drive',
      description: 'Record and complete your first driving session in the cockpit.',
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
      title: 'Century Club (100 Miles)',
      description: 'Log 100+ total miles of safe highway and street driving.',
      iconName: 'Award',
      unlocked: account.totalDistanceMiles >= 100,
      progress: Math.min(100, Math.round((account.totalDistanceMiles / 100) * 100)),
      unlockedAt: account.totalDistanceMiles >= 100 ? 'Unlocked' : undefined,
      category: 'MILESTONE',
      pointsReward: 500
    },
    {
      id: 'NIGHT_OWL_SAFETY',
      title: 'Night Mastery',
      description: 'Log safe nighttime driving hours with zero sudden maneuvers.',
      iconName: 'Star',
      unlocked: account.totalTrips >= 2,
      progress: Math.min(100, Math.round((account.totalTrips / 2) * 100)),
      unlockedAt: account.totalTrips >= 2 ? 'Unlocked' : undefined,
      category: 'SAFETY',
      pointsReward: 350
    }
  ];

  const unlockedCount = milestones.filter((m) => m.unlocked).length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Driver Milestones & Achievements
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Earn verified defensive driving badges as you log trips and build defensive habits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono font-bold text-stone-800">
              {unlockedCount} of {milestones.length} Badges Unlocked
            </span>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`luxury-card p-5 space-y-3 flex flex-col justify-between transition-all ${
              milestone.unlocked
                ? 'border-[#C5A880]/50 shadow-md'
                : 'opacity-70 bg-white/60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    milestone.unlocked
                      ? 'bg-stone-900 text-[#C5A880]'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {milestone.unlocked ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>

                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  +{milestone.pointsReward} pts
                </span>
              </div>

              <h4 className="text-sm font-bold text-stone-900 font-display">{milestone.title}</h4>
              <p className="text-xs text-stone-500 mt-1">{milestone.description}</p>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>Progress</span>
                <span>{milestone.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C5A880] to-stone-900 rounded-full"
                  style={{ width: `${milestone.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
