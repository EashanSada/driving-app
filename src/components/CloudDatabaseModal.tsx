import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, RefreshCw, Copy, Check, Key, Globe, X, ShieldCheck } from 'lucide-react';
import { getSupabaseUrl, getSupabaseAnonKey, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../lib/supabaseClient';

interface CloudDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getSupabaseUrl());
      setKeyInput(getSupabaseAnonKey());
      runTest();
    }
  }, [isOpen]);

  const runTest = async () => {
    setTesting(true);
    const res = await testSupabaseConnection();
    setStatusMsg(res);
    setTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      setStatusMsg({ success: false, message: 'Please provide both Supabase URL and Anon Key.' });
      return;
    }

    saveSupabaseConfig(urlInput.trim(), keyInput.trim());
    await runTest();
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setStatusMsg({ success: false, message: 'Credentials cleared from local device configuration.' });
  };

  const sqlCode = `-- Driver Accounts Table
CREATE TABLE IF NOT EXISTS public.driver_accounts (
    username TEXT PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    safety_score NUMERIC DEFAULT 100.0,
    clean_trips INT DEFAULT 0,
    total_trips INT DEFAULT 0,
    total_distance_miles NUMERIC DEFAULT 0.0,
    points INT DEFAULT 0,
    level INT DEFAULT 1,
    current_xp INT DEFAULT 0,
    next_level_xp INT DEFAULT 1000,
    badges_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
    trip_history JSONB DEFAULT '[]'::jsonb,
    account_data JSONB DEFAULT '{}'::jsonb,
    created_time BIGINT DEFAULT (EXTRACT(epoch FROM NOW()) * 1000),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.driver_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON public.driver_accounts FOR ALL USING (true) WITH CHECK (true);

-- Real-time Road Hazards Table
CREATE TABLE IF NOT EXISTS public.road_hazards (
    id TEXT PRIMARY KEY,
    hazard_type TEXT NOT NULL,
    description TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    upvotes INT DEFAULT 1,
    source_app TEXT DEFAULT 'WEB_APP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.road_hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public hazards all" ON public.road_hazards FOR ALL USING (true) WITH CHECK (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cloud Database & Multi-Device Sync</h2>
            <p className="text-xs text-slate-400">Verifies Supabase connectivity for cross-device logins & live road hazard reports.</p>
          </div>
        </div>

        {/* Live Connection Status Badge */}
        <div className={`p-4 rounded-xl border mb-5 flex items-start gap-3 ${
          statusMsg?.success 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
        }`}>
          {testing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-[#2dd4bf] shrink-0 mt-0.5" />
          ) : statusMsg?.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <div className="font-bold mb-1">
              {testing ? 'Testing Supabase Connection...' : statusMsg?.success ? 'Supabase Connected & Active' : 'Database Connection Required'}
            </div>
            <div>{statusMsg?.message || 'Checking status...'}</div>
          </div>
          <button
            onClick={runTest}
            disabled={testing}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Retest</span>
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#2dd4bf] transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span>Supabase Anon / Public Key</span>
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#2dd4bf] transition-all font-mono"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#2dd4bf] text-slate-950 font-bold text-xs hover:bg-[#2dd4bf]/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save & Connect Database</span>
            </button>
            {(urlInput || keyInput) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Database Schema SQL Copy Tool */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">Supabase SQL Schema Script</span>
            <button
              onClick={copySql}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-[#2dd4bf] hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SQL!' : 'Copy SQL Script'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-28 leading-relaxed">
            {sqlCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
