import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, UserCheck, Plus, User, ShieldCheck } from 'lucide-react';
import { fetchAllAccountsFromSupabase, getAllAccounts, getActiveUsername, UserAccount } from '../lib/accountManager';

interface LeaderboardViewProps {
  onOpenLoginModal?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onOpenLoginModal }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const activeUsername = getActiveUsername();

  useEffect(() => {
    loadAccounts();
  }, [activeUsername]);

  const loadAccounts = async () => {
    const list = await fetchAllAccountsFromSupabase();
    // Sort accounts by safetyScore descending, then totalTrips descending
    list.sort((a, b) => {
      if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
      return b.totalTrips - a.totalTrips;
    });
    setAccounts(list);
  };

  const getBadgeStyle = (score: number, totalTrips: number) => {
    if (score >= 95 && totalTrips >= 3) {
      return { label: 'PLATINUM GUARDIAN', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
    }
    if (score >= 85 && totalTrips >= 1) {
      return { label: 'GOLD GUARDIAN', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    }
    if (score >= 70) {
      return { label: 'SILVER GUARDIAN', bg: 'bg-slate-400/10 text-slate-300 border-slate-400/30' };
    }
    return { label: 'ROOKIE DRIVER', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
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
              <h2 className="text-xl font-bold text-white font-display">Registered Driver Leaderboard</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Ranks registered drivers based on real logged trip safety scores, clean driving records, and accumulated points across all devices in real-time.
            </p>
          </div>

          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2dd4bf] text-slate-950 font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer glow-mint shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Switch / Add Account</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <span className="card-title flex items-center gap-2 mb-0">
            <UserCheck className="w-4 h-4 text-[#2dd4bf]" /> Real Local Driver Accounts ({accounts.length})
          </span>
          <span className="text-xs text-[#2dd4bf] font-mono">Live Account Sync</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <User className="w-12 h-12 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Driver Accounts Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Enter a username to create your account and start logging real trips to build your safety rank!
              </p>
            </div>
            <button
              onClick={onOpenLoginModal}
              className="px-5 py-2.5 rounded-xl bg-[#2dd4bf] text-slate-950 font-bold text-xs hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#020617]/80 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-6">Rank</th>
                  <th className="py-3.5 px-6">Account Username</th>
                  <th className="py-3.5 px-6">Safety Score</th>
                  <th className="py-3.5 px-6">Trips Logged</th>
                  <th className="py-3.5 px-6">Total Miles</th>
                  <th className="py-3.5 px-6">Rank Title</th>
                  <th className="py-3.5 px-6 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts.map((acc, index) => {
                  const badge = getBadgeStyle(acc.safetyScore, acc.totalTrips);
                  const isCurrent = acc.username.toLowerCase() === activeUsername?.toLowerCase();

                  return (
                    <tr
                      key={acc.username}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-[#2dd4bf]/10 border-l-4 border-l-[#2dd4bf]'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{acc.username}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#2dd4bf] text-slate-950 uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Account created {new Date(acc.createdTime).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-[#2dd4bf]">
                          <Star className="w-3.5 h-3.5 fill-[#2dd4bf] text-[#2dd4bf]" />
                          <span>{acc.safetyScore}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-300">
                        {acc.totalTrips} ({acc.cleanTrips} clean)
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-300">
                        {acc.totalDistanceMiles.toFixed(1)} mi
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold text-[#a78bfa]">
                        {acc.points.toLocaleString()} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
