import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, UserCheck, Plus, User, MapPin } from 'lucide-react';
import { fetchAllAccountsFromSupabase, getActiveUsername, UserAccount } from '../lib/accountManager';
import { LanguageCode, UnitSystem } from '../types';

interface LeaderboardViewProps {
  onOpenLoginModal?: () => void;
  activeAccount?: UserAccount | null;
  unitSystem?: UnitSystem;
  currentLanguage?: LanguageCode;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onOpenLoginModal }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const activeUsername = getActiveUsername();

  useEffect(() => {
    loadAccounts();
  }, [activeUsername]);

  const loadAccounts = async () => {
    const list = await fetchAllAccountsFromSupabase();
    list.sort((a, b) => {
      if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
      return b.totalTrips - a.totalTrips;
    });
    setAccounts(list);
  };

  const getBadgeStyle = (score: number, totalTrips: number) => {
    if (score >= 95 && totalTrips >= 3) {
      return { label: 'PLATINUM', bg: 'bg-[#C5A880]/15 text-[#A38258] border-[#C5A880]/30' };
    }
    if (score >= 85 && totalTrips >= 1) {
      return { label: 'GOLD', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (score >= 70) {
      return { label: 'SILVER', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
    return { label: 'ROOKIE', bg: 'bg-stone-50 text-stone-600 border-stone-200' };
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Safety Standings & Leaderboard
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Ranks drivers by verified telematics safety scores, location, and defensive driving consistency.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenLoginModal}
            className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Driver Account</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="luxury-card overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="card-title block mb-0">
            Registered Drivers ({accounts.length})
          </span>
          <span className="text-xs text-[#A38258] font-mono font-bold">Verified Kinematics</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <User className="w-12 h-12 text-stone-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 font-display">No Driver Accounts Found</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Sign in or register a new account to establish your driver rating and join the leaderboard.
              </p>
            </div>
            <button
              onClick={onOpenLoginModal}
              className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-6">Driver</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6">Safety Score</th>
                  <th className="py-3 px-6">Total Sessions</th>
                  <th className="py-3 px-6">Clean Drives</th>
                  <th className="py-3 px-6 text-right">Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {accounts.map((acc, index) => {
                  const badge = getBadgeStyle(acc.safetyScore, acc.totalTrips);
                  const isCurrent = acc.username === activeUsername;

                  return (
                    <tr
                      key={acc.username}
                      className={`transition-colors ${
                        isCurrent ? 'bg-[#F9F7F2] font-semibold' : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-stone-700">
                        {index === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center text-xs font-black">
                            1
                          </span>
                        ) : index === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-800 border border-stone-300 flex items-center justify-center text-xs font-black">
                            2
                          </span>
                        ) : index === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-xs font-black">
                            3
                          </span>
                        ) : (
                          `#${index + 1}`
                        )}
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-stone-900 text-[#C5A880] flex items-center justify-center text-[10px] font-bold">
                            {acc.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block">{acc.fullName || acc.username}</span>
                            <span className="text-[10px] text-stone-400 uppercase font-mono">@{acc.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 text-stone-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#A38258]" />
                          <span>
                            {acc.city ? `${acc.city}, ` : ''}{acc.country || 'Global'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 font-mono font-bold text-emerald-800 text-sm">
                        {acc.safetyScore} / 100
                      </td>

                      <td className="py-3.5 px-6 font-mono text-stone-700">{acc.totalTrips}</td>

                      <td className="py-3.5 px-6 font-mono text-emerald-700 font-bold">{acc.cleanTrips}</td>

                      <td className="py-3.5 px-6 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold border ${badge.bg}`}>
                          {badge.label}
                        </span>
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
