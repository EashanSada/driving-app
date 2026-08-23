import React from 'react';
import { User, Phone, Mail, Users, ShieldCheck, LogOut, X, Calendar } from 'lucide-react';
import { UserAccount } from '../lib/accountManager';
import { RadianSymbol } from './RadianSymbol';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="luxury-card max-w-md w-full p-6 sm:p-7 border border-[#C5A880]/30 shadow-2xl relative text-left text-stone-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3.5 border-b border-stone-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center font-black text-sm shadow-md shrink-0">
              {account.username.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-900 font-display">@{account.username}</h3>
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-[#C5A880]/15 text-[#A38258] border border-[#C5A880]/30 rounded-full font-mono">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-stone-600 font-medium">{account.fullName || account.username}</p>
              <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-[#A38258]" /> Joined {new Date(account.createdTime).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <div>
              <div className="text-[9px] font-bold text-stone-400 uppercase">Safety Score</div>
              <div className="text-base font-black text-emerald-800 font-mono">{account.safetyScore}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-stone-400 uppercase">Total Drives</div>
              <div className="text-base font-black text-stone-900 font-mono">{account.totalTrips}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-stone-400 uppercase">Logged Miles</div>
              <div className="text-base font-black text-stone-900 font-mono">{account.totalDistanceMiles.toFixed(1)}</div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-1.5">
            <span className="card-title block">Driver Profile Record</span>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-stone-700">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone:</span>
                <span className="font-mono text-stone-900">{account.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email:</span>
                <span className="font-mono text-stone-900">{account.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Supervisor Link */}
          <div className="space-y-1.5">
            <span className="card-title block">Supervisor Key</span>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex items-center justify-between">
              <span className="text-stone-500">Pairing Code:</span>
              <span className="font-mono font-bold text-[#A38258]">{account.supervisorCode}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              onClick={onSwitchAccount}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-all cursor-pointer"
            >
              Switch User
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
