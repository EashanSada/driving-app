import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, Users, Database } from 'lucide-react';
import { LeaderboardUser } from '../types';

export const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [sourceInfo, setSourceInfo] = useState<string>('Verified Leaderboard');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      if (window.DriveSafeBackend) {
        const backend = typeof window.DriveSafeBackend === 'function' && window.DriveSafeBackend.getGlobalLeaderboard
          ? window.DriveSafeBackend
          : (typeof window.DriveSafeBackend === 'function' ? new (window.DriveSafeBackend as any)() : window.DriveSafeBackend);
        
        if (backend && typeof backend.getGlobalLeaderboard === 'function') {
          const result = await backend.getGlobalLeaderboard();
          if (result?.data) {
            setLeaderboard(result.data);
            setSourceInfo(result.source || 'Local Store');
          }
        }
      }
    } catch (err) {
      console.warn('Leaderboard fetch warning:', err);
    }
  };

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'PLATINUM_GUARDIAN':
        return { label: 'PLATINUM GUARDIAN', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
      case 'GOLD_GUARDIAN':
        return { label: 'GOLD GUARDIAN', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'SILVER_GUARDIAN':
        return { label: 'SILVER GUARDIAN', bg: 'bg-slate-400/10 text-slate-300 border-slate-400/30' };
      default:
        return { label: 'BRONZE GUARDIAN', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 border border-[#a78bfa]/20 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#a78bfa]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-[#a78bfa]" />
              <h2 className="text-xl font-bold text-white font-display">Global Safe-Driver Leaderboard</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Recognizes youth drivers maintaining consecutive safe trips with smooth speed control and zero harsh braking.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#020617]/70 border border-white/10 text-xs text-slate-300">
            <Award className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span>Community Verified Ranks</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="card-title flex items-center gap-2 mb-0">
            <Users className="w-4 h-4 text-[#2dd4bf]" /> Top Youth Safety Champions
          </span>
          <span className="text-xs text-[#2dd4bf] font-mono">Synced Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020617]/80 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-6">Rank</th>
                <th className="py-3.5 px-6">Youth Driver & Cohort</th>
                <th className="py-3.5 px-6">Safety Score</th>
                <th className="py-3.5 px-6">Clean Trips</th>
                <th className="py-3.5 px-6">Badge Status</th>
                <th className="py-3.5 px-6 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.map((user, index) => {
                const badge = getBadgeStyle(user.badge);
                return (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold">
                      {index === 0 ? (
                        <div className="w-7 h-7 rounded-full bg-[#2dd4bf]/20 text-[#2dd4bf] flex items-center justify-center border border-[#2dd4bf]/40 glow-mint">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : index === 1 ? (
                        <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] flex items-center justify-center border border-[#a78bfa]/40 glow-violet">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : index === 2 ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
                          <Award className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-slate-400 pl-2">#{index + 1}</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{user.full_name}</div>
                      <div className="text-xs text-slate-400">{user.cohort}</div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-[#2dd4bf]">
                        <Star className="w-3.5 h-3.5 fill-[#2dd4bf] text-[#2dd4bf]" />
                        <span>{user.safety_score.toFixed(1)}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-300">
                      {user.clean_trips} trips
                    </td>

                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-[#a78bfa]">
                      {user.points.toLocaleString()} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
