import React from 'react';
import { User, Phone, Mail, Users, Trophy, ShieldCheck, LogOut, X, Calendar, Award } from 'lucide-react';
import { clearActiveUsername, UserAccount } from '../lib/accountManager';

interface UserProfileModalProps {
  isOpen: boolean;
  account: UserAccount | null;
  onClose: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  account,
  onClose,
  onSwitchAccount,
  onLogout
}) => {
  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 border border-[#2dd4bf]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 space-y-6 text-left">
          {/* Header Badge */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2dd4bf] to-[#a78bfa] p-0.5 shadow-xl glow-mint flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#020617] rounded-[14px] flex items-center justify-center font-black text-[#2dd4bf] text-lg font-mono">
                {account.username.substring(0, 2).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white font-display">@{account.username}</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/40 rounded-full">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{account.fullName || account.username}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-[#2dd4bf]" /> Joined {new Date(account.createdTime).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#020617]/80 border border-white/10 text-center">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Safety Score</div>
              <div className="text-lg font-black text-[#2dd4bf] font-mono">{account.safetyScore}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Trips Logged</div>
              <div className="text-lg font-black text-white font-mono">{account.totalTrips}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Miles</div>
              <div className="text-lg font-black text-white font-mono">{account.totalDistanceMiles.toFixed(1)}</div>
            </div>
          </div>

          {/* Driver Contact Info */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#2dd4bf] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Driver Contact Information
            </div>

            <div className="p-3 rounded-xl bg-[#020617]/50 border border-white/10 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone:</span>
                <span className="font-mono text-white">{account.phone || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email:</span>
                <span className="font-mono text-white">{account.email || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Parent / Guardian Contact Info */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Parent / Guardian Contact
            </div>

            <div className="p-3 rounded-xl bg-[#020617]/50 border border-white/10 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Parent Name:</span>
                <span className="font-bold text-white">{account.parentName || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone:</span>
                <span className="font-mono text-white">{account.parentPhone || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email:</span>
                <span className="font-mono text-white">{account.parentEmail || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <button
              onClick={() => {
                onClose();
                onSwitchAccount();
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#2dd4bf]/20 border border-[#2dd4bf]/40 text-[#2dd4bf] font-bold text-xs hover:bg-[#2dd4bf]/30 transition-all cursor-pointer text-center"
            >
              Switch Account
            </button>

            <button
              onClick={() => {
                clearActiveUsername();
                onLogout();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
