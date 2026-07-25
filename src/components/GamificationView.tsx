import React, { useState } from 'react';
import { Award, Zap, ShieldCheck, Flame, Star, CheckCircle, Lock, Sparkles, TrendingUp, Compass, Share2 } from 'lucide-react';
import { BadgeMilestone, UserProfile } from '../types';

export const GamificationView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Alex Rivera',
    email: 'alex.rivera@drivesafe.org',
    youth_cohort: 'West Coast Youth Safety Club',
    level: 4,
    current_xp: 3450,
    next_level_xp: 5000,
    total_points: 2420,
    safety_score: 98.5,
    total_distance_miles: 320.5,
    clean_trips_count: 40,
    badges_unlocked: ['100_MILES_SAFE', 'PERFECT_WEEK', 'PLATINUM_GUARDIAN', 'SMOOTH_OPERATOR'],
    joined_date: 'Oct 2024'
  });

  const [milestones, setMilestones] = useState<BadgeMilestone[]>([
    {
      id: '100_MILES_SAFE',
      title: '100 Miles Safe',
      description: 'Log 100+ miles without any harsh braking or g-force spikes.',
      iconName: 'ShieldCheck',
      unlocked: true,
      progress: 100,
      unlockedAt: '2 days ago',
      category: 'MILESTONE',
      pointsReward: 250
    },
    {
      id: 'PERFECT_WEEK',
      title: 'Perfect Week',
      description: 'Maintain an average safety score above 95.0 for 7 consecutive days.',
      iconName: 'Flame',
      unlocked: true,
      progress: 100,
      unlockedAt: 'Yesterday',
      category: 'SAFETY',
      pointsReward: 500
    },
    {
      id: 'PLATINUM_GUARDIAN',
      title: 'Platinum Guardian',
      description: 'Achieve top 1% safety classification with 40+ clean trips.',
      iconName: 'Award',
      unlocked: true,
      progress: 100,
      unlockedAt: '3 days ago',
      category: 'MASTERY',
      pointsReward: 1000
    },
    {
      id: 'HAZARD_HERO',
      title: 'Community Hazard Hero',
      description: 'Report 5 verified road hazards to keep fellow youth drivers safe.',
      iconName: 'Compass',
      unlocked: false,
      progress: 60,
      category: 'COMMUNITY',
      pointsReward: 300
    },
    {
      id: 'NIGHT_NAVIGATOR',
      title: 'Night Navigator',
      description: 'Complete 10 safe evening drives with zero speed variances.',
      iconName: 'Star',
      unlocked: false,
      progress: 40,
      category: 'MASTERY',
      pointsReward: 400
    },
    {
      id: 'ECO_SMOOTH_CRUISER',
      title: 'Eco Smooth Cruiser',
      description: 'Keep jerk index under 0.20 m/s³ for 5 consecutive trips.',
      iconName: 'Zap',
      unlocked: false,
      progress: 80,
      category: 'SAFETY',
      pointsReward: 350
    }
  ]);

  const [dailyQuests, setDailyQuests] = useState([
    { id: 'quest_1', title: 'Complete 2 Smooth Trips', reward: 100, progress: 2, total: 2, completed: true, claimed: false },
    { id: 'quest_2', title: 'Maintain G-Force < 0.40G', reward: 150, progress: 1, total: 1, completed: true, claimed: false },
    { id: 'quest_3', title: 'Report 1 Road Hazard', reward: 200, progress: 0, total: 1, completed: false, claimed: false },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClaimQuest = (questId: string, reward: number) => {
    setDailyQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q));
    setProfile(prev => {
      const newXp = prev.current_xp + reward;
      let newLevel = prev.level;
      let nextXp = prev.next_level_xp;
      if (newXp >= nextXp) {
        newLevel += 1;
        nextXp += 2500;
      }
      return {
        ...prev,
        total_points: prev.total_points + reward,
        current_xp: newXp,
        level: newLevel,
        next_level_xp: nextXp
      };
    });
    setToastMessage(`🎉 Claimed +${reward} Points & XP! Keep up the safe driving!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const xpPercent = Math.min(100, Math.round((profile.current_xp / profile.next_level_xp) * 100));

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
                  <span className="text-3xl font-extrabold text-white font-mono">{profile.level}</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#a78bfa] text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                PRO
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-white font-display">{profile.full_name}</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 rounded-full">
                  {profile.youth_cohort}
                </span>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full max-w-md space-y-1 mt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2dd4bf]" /> Level XP Progress
                  </span>
                  <span className="text-[#2dd4bf] font-mono">{profile.current_xp} / {profile.next_level_xp} XP ({xpPercent}%)</span>
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
                <span className="text-xl font-black text-amber-300 font-mono">{profile.total_points.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center px-3 border-r border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Safety Score</span>
              <span className="text-xl font-black text-[#2dd4bf] font-mono">{profile.safety_score.toFixed(1)}</span>
            </div>

            <div className="text-center px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Badges</span>
              <span className="text-xl font-black text-[#a78bfa] font-mono">{profile.badges_unlocked.length} Unlocked</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Badges & Milestone Rewards (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="card-title text-base flex items-center gap-2 mb-0">
                  <Award className="w-5 h-5 text-[#a78bfa]" /> Driver Milestone Badges & Trophies
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Earn points and unlock badges by maintaining safe driving habits and contributing to road safety.
                </p>
              </div>
              <span className="text-xs text-[#2dd4bf] font-semibold bg-[#2dd4bf]/10 px-3 py-1 rounded-full border border-[#2dd4bf]/20">
                {milestones.filter(m => m.unlocked).length} / {milestones.length} Unlocked
              </span>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                      {/* Progress or Unlocked Timestamp */}
                      <div className="mt-3">
                        {b.unlocked ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#2dd4bf] font-semibold">
                            <CheckCircle className="w-3.5 h-3.5 text-[#2dd4bf]" />
                            <span>Unlocked {b.unlockedAt}</span>
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
        </div>

        {/* Right Column: Daily Quests & Level Rewards (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6">
            <h3 className="card-title text-base flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#2dd4bf]" /> Daily Youth Quests
            </h3>
            <p className="text-xs text-slate-400 mb-4">Complete daily driving challenges for bonus points.</p>

            <div className="space-y-3">
              {dailyQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="p-3.5 rounded-xl bg-[#020617]/70 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-200 block">{quest.title}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-amber-300 font-mono font-bold">+{quest.reward} PTS</span>
                      <span>•</span>
                      <span>{quest.progress}/{quest.total} Done</span>
                    </div>
                  </div>

                  {quest.claimed ? (
                    <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
                      Claimed
                    </span>
                  ) : quest.completed ? (
                    <button
                      onClick={() => handleClaimQuest(quest.id, quest.reward)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 text-xs font-bold hover:shadow transition-all cursor-pointer glow-mint"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
                      In Progress
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Milestone Share CTA Card */}
          <div className="glass-card p-6 border border-[#a78bfa]/30 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <Share2 className="w-5 h-5 text-[#a78bfa]" />
              <h4 className="text-sm font-bold text-white font-display">Share Achievement Card</h4>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Show off your 98.5 Safety Score and Platinum Badge to your Youth Driver Group or school safety team.
            </p>
            <button
              onClick={() => setToastMessage('📢 Achievement Card copied to clipboard! Share with your group.')}
              className="w-full py-2.5 rounded-xl bg-[#a78bfa]/20 border border-[#a78bfa]/40 hover:bg-[#a78bfa]/30 text-xs font-bold text-[#a78bfa] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Copy Achievement Card</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
