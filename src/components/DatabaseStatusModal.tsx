import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, X, Key, Globe, UploadCloud, ShieldCheck, Copy } from 'lucide-react';
import { getSupabaseUrl, getSupabaseAnonKey, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabaseClient';
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

    const clientRes = await testSupabaseConnection();
    setTestResult(clientRes);

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
        setSyncMessage(`Successfully synced ${successCount} account(s) to Supabase!`);
      } else {
        setSyncMessage(`Sync status: ${lastErr}`);
      }
      runDiagnostics();
    } catch (err: any) {
      setSyncMessage(`Sync notice: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="luxury-card max-w-xl w-full p-6 sm:p-7 border border-[#C5A880]/30 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto text-stone-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-display">Supabase Cloud Database Diagnostics</h3>
              <p className="text-xs text-stone-500">Live multi-device telematics sync and account persistence.</p>
            </div>
          </div>

          {/* Test Status Bar */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#A38258]" /> Database Sync Status
              </span>
              <button
                onClick={runDiagnostics}
                disabled={isTesting}
                className="text-[#A38258] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Checking...' : 'Run Check'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Account Sync Action */}
          <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#C5A880]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Manual Account Push</span>
                <span className="text-[10px] text-stone-500">Push local cached profiles to remote Supabase tables</span>
              </div>
              <button
                onClick={handleSyncAllAccounts}
                disabled={isSyncing}
                className="btn-gold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Syncing...' : 'Sync Accounts'}</span>
              </button>
            </div>

            {syncMessage && (
              <p className="text-xs font-semibold text-stone-800 pt-1">{syncMessage}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-3 pt-2 border-t border-stone-100">
            <span className="card-title block">Supabase Credentials Override</span>
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">Project URL</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">Anon Public API Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <button
              type="submit"
              className="w-full btn-gold py-2 rounded-xl text-xs cursor-pointer"
            >
              Save Credentials
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
