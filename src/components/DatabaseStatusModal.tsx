import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, X, Key, Globe, UploadCloud, ShieldCheck, Copy, ArrowRight, Code } from 'lucide-react';
import { getSupabaseUrl, getSupabaseAnonKey, saveSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../lib/supabaseClient';
import { getAllAccounts, saveAccountAsync } from '../lib/accountManager';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState(getSupabaseUrl());
  const [keyInput, setKeyInput] = useState(getSupabaseAnonKey());
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getSupabaseUrl());
      setKeyInput(getSupabaseAnonKey());
      runDiagnostics();
    }
  }, [isOpen]);

  const runDiagnostics = async () => {
    setIsTesting(true);
    setTestResult(null);

    // 1. Client Test
    const clientRes = await testSupabaseConnection();
    setTestResult(clientRes);

    // 2. Server Test
    try {
      const headers: Record<string, string> = {};
      const u = urlInput || getSupabaseUrl();
      const k = keyInput || getSupabaseAnonKey();
      if (u) headers['x-supabase-url'] = u;
      if (k) headers['x-supabase-key'] = k;

      const res = await fetch('/api/accounts?action=test', { headers });
      if (res.ok) {
        const json = await res.json();
        setServerStatus(json);
      }
    } catch (err: any) {
      setServerStatus({ status: 'error', message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      alert('Please enter both Supabase URL and Anon Key.');
      return;
    }
    saveSupabaseConfig(urlInput.trim(), keyInput.trim());
    runDiagnostics();
  };

  const handleSyncAllAccounts = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const accounts = getAllAccounts();
      if (accounts.length === 0) {
        setSyncMessage('No local accounts found to sync.');
        return;
      }

      let successCount = 0;
      let lastErr = '';
      for (const acc of accounts) {
        const res = await saveAccountAsync(acc);
        if (res.success) {
          successCount++;
        } else {
          lastErr = res.message || 'Failed';
        }
      }

      if (successCount > 0) {
        setSyncMessage(`Successfully synced ${successCount} account(s) to Supabase!${lastErr ? ` (Notice: ${lastErr})` : ''}`);
      } else {
        setSyncMessage(`Sync failed: ${lastErr}`);
      }
      runDiagnostics();
    } catch (err: any) {
      setSyncMessage(`Sync notice: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySchemaSql = () => {
    const sql = `-- DriveSafe Youth Initiative - Supabase Database Schema
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
DROP POLICY IF EXISTS "Allow public select driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public select driver_accounts" ON public.driver_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public insert driver_accounts" ON public.driver_accounts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public update driver_accounts" ON public.driver_accounts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public delete driver_accounts" ON public.driver_accounts FOR DELETE USING (true);
GRANT ALL ON public.driver_accounts TO anon, authenticated, postgres, service_role;

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
DROP POLICY IF EXISTS "Allow public select road_hazards" ON public.road_hazards;
CREATE POLICY "Allow public select road_hazards" ON public.road_hazards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert road_hazards" ON public.road_hazards;
CREATE POLICY "Allow public insert road_hazards" ON public.road_hazards FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update road_hazards" ON public.road_hazards;
CREATE POLICY "Allow public update road_hazards" ON public.road_hazards FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete road_hazards" ON public.road_hazards;
CREATE POLICY "Allow public delete road_hazards" ON public.road_hazards FOR DELETE USING (true);
GRANT ALL ON public.road_hazards TO anon, authenticated, postgres, service_role;`;

    navigator.clipboard.writeText(sql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="glass-card max-w-lg w-full p-6 border border-[#2dd4bf]/30 shadow-2xl relative my-8 overflow-hidden text-left">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2dd4bf] to-[#38bdf8] p-0.5 shadow-lg glow-mint flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#020617] rounded-[14px] flex items-center justify-center">
                <Database className="w-6 h-6 text-[#2dd4bf]" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-display">Supabase Cloud Database Status</h3>
              <p className="text-xs text-slate-300 font-medium">Verify connection & sync driver accounts to Supabase</p>
            </div>
          </div>

          {/* Diagnostic Status Box */}
          <div className="p-4 rounded-xl bg-[#020617]/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" /> Live Diagnostics
              </span>

              <button
                onClick={runDiagnostics}
                disabled={isTesting}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#2dd4bf]' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{testResult.success ? 'Supabase Connected' : 'Supabase Status Notice'}</span>
                </div>
                <p>{testResult.message}</p>
              </div>
            )}

            {serverStatus && (
              <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-1 border-t border-white/5">
                <div>Server API Status: <span className="text-white font-bold">{serverStatus.status}</span></div>
                {serverStatus.writePermission !== undefined && (
                  <div>Write Permission: <span className={serverStatus.writePermission ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{serverStatus.writePermission ? 'CONFIRMED' : 'RESTRICTED'}</span></div>
                )}
                {serverStatus.message && <div>Server Message: <span className="text-slate-300">{serverStatus.message}</span></div>}
              </div>
            )}
          </div>

          {/* Schema Copy Action */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#2dd4bf]" /> Supabase SQL Schema
              </div>
              <p className="text-[11px] text-slate-400">
                Copy SQL code to paste in Supabase SQL Editor to create tables & policies.
              </p>
            </div>

            <button
              onClick={handleCopySchemaSql}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>

          {/* Sync All Accounts Action */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#2dd4bf]/10 to-[#38bdf8]/10 border border-[#2dd4bf]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-[#2dd4bf]" /> Push Accounts to Supabase
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Force-sync registered driver accounts into your Supabase <code className="text-[#2dd4bf] font-mono">driver_accounts</code> table.
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncAllAccounts}
              disabled={isSyncing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-extrabold text-xs hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to Supabase...' : 'Sync All Accounts to Supabase Now'}</span>
            </button>

            {syncMessage && (
              <p className="text-xs font-semibold text-emerald-400 pt-1">{syncMessage}</p>
            )}
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Supabase Project Credentials
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#2dd4bf]" /> Supabase URL
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 rounded-lg bg-[#020617] border border-white/20 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-[#2dd4bf]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Key className="w-3 h-3 text-[#2dd4bf]" /> Supabase Anon / Public Key
              </label>
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 rounded-lg bg-[#020617] border border-white/20 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-[#2dd4bf] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Save Credentials & Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
