import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  X,
  MapPin,
  Globe,
  Gauge,
  Languages,
  Phone,
  Mail,
  Building2,
  Compass
} from 'lucide-react';
import {
  accountExists,
  createAccountAsync,
  fetchAccountFromSupabase,
  getAllAccounts,
  getUnitSystemForCountry,
  setActiveUsername,
  UserAccount
} from '../lib/accountManager';
import { LanguageCode, UnitSystem, UserRole } from '../types';
import { RadianSymbol } from './RadianSymbol';

interface UserLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (username: string, account?: UserAccount) => void;
  onClose?: () => void;
  allowCancel?: boolean;
}

const COUNTRIES_LIST = [
  { name: 'United States', code: 'US', defaultUnit: 'imperial' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'United Kingdom', code: 'UK', defaultUnit: 'imperial' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Canada', code: 'CA', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Australia', code: 'AU', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Mexico', code: 'MX', defaultUnit: 'metric' as UnitSystem, defaultLang: 'es' as LanguageCode },
  { name: 'Spain', code: 'ES', defaultUnit: 'metric' as UnitSystem, defaultLang: 'es' as LanguageCode },
  { name: 'France', code: 'FR', defaultUnit: 'metric' as UnitSystem, defaultLang: 'fr' as LanguageCode },
  { name: 'Germany', code: 'DE', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Italy', code: 'IT', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Japan', code: 'JP', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'China', code: 'CN', defaultUnit: 'metric' as UnitSystem, defaultLang: 'zh' as LanguageCode },
  { name: 'India', code: 'IN', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Brazil', code: 'BR', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Netherlands', code: 'NL', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Sweden', code: 'SE', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'South Korea', code: 'KR', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
  { name: 'Other Country', code: 'OTHER', defaultUnit: 'metric' as UnitSystem, defaultLang: 'en' as LanguageCode },
];

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  allowCancel = false
}) => {
  const [step, setStep] = useState<'LOGIN' | 'LOCATION' | 'PROFILE' | 'PREFERENCES'>('LOGIN');
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Questionnaire Data
  const [selectedRole, setSelectedRole] = useState<UserRole>('young_driver');
  const [fullName, setFullName] = useState('');
  
  // Location & Localization
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('United States');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Contact Details
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Preferences
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [autoTripDetect, setAutoTripDetect] = useState(true);

  // Update unit system automatically when country changes
  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry);
    const countryConfig = COUNTRIES_LIST.find(c => c.name === selectedCountry);
    if (countryConfig) {
      setUnitSystem(countryConfig.defaultUnit);
      if (countryConfig.defaultLang && preferredLanguage === 'en') {
        setPreferredLanguage(countryConfig.defaultLang);
      }
    } else {
      setUnitSystem(getUnitSystemForCountry(selectedCountry));
    }
  };

  const existingAccounts = getAllAccounts();

  if (!isOpen) return null;

  const handleLoginCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean) {
      setErrorMsg('Please enter a username (letters, numbers, and underscores).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const cloudAccount = await fetchAccountFromSupabase(clean);
      if (cloudAccount) {
        setActiveUsername(clean);
        onLoginSuccess(clean, cloudAccount);
        resetState();
        return;
      }

      if (accountExists(clean)) {
        const localAcc = getAllAccounts().find(a => a.username.toLowerCase() === clean);
        setActiveUsername(clean);
        onLoginSuccess(clean, localAcc);
        resetState();
        return;
      }

      // If account does not exist, navigate to Questionnaire starting with Location & Language
      setStep('LOCATION');
    } catch (err: any) {
      if (accountExists(clean)) {
        const localAcc = getAllAccounts().find(a => a.username.toLowerCase() === clean);
        setActiveUsername(clean);
        onLoginSuccess(clean, localAcc);
        resetState();
      } else {
        setStep('LOCATION');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccountFinal = async () => {
    if (!city.trim()) {
      setErrorMsg('Please enter your city.');
      setStep('LOCATION');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const cleanUser = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    try {
      const { account } = await createAccountAsync({
        username: cleanUser,
        fullName: fullName.trim() || cleanUser,
        city: city.trim(),
        stateProvince: stateProvince.trim(),
        country: country.trim(),
        preferredLanguage,
        unitSystem,
        role: selectedRole,
        phone: phone.trim(),
        email: email.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim()
      });

      setActiveUsername(cleanUser);
      onLoginSuccess(cleanUser, account);
      resetState();
    } catch (err: any) {
      setErrorMsg('Failed to save account: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep('LOGIN');
    setUsernameInput('');
    setErrorMsg('');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="luxury-card max-w-lg w-full p-6 sm:p-8 border border-[#C5A880]/30 shadow-2xl relative text-left max-h-[92vh] overflow-y-auto">
        {allowCancel && onClose && (
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* STEP 1: Quick Username Lookup / Login */}
        {step === 'LOGIN' && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center mx-auto shadow-md">
                <RadianSymbol size={32} />
              </div>
              <h2 className="text-2xl font-black text-stone-900 font-display uppercase tracking-[0.2em]">
                RADIAN<span className="text-[#A38258]">DRIVE</span>
              </h2>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Precision telematics, safety scoring, and driver localization. Sign in or register below.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginCheck} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Driver Username
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. alex_driver, sarah_k"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  New users will automatically be directed to the account registration questionnaire.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-gold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-bold"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Continue to Cockpit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access Switcher for Existing Accounts */}
            {existingAccounts.length > 0 && (
              <div className="pt-4 border-t border-stone-100 space-y-2">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                  Registered Drivers On System
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {existingAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      onClick={() => {
                        setActiveUsername(acc.username);
                        onLoginSuccess(acc.username, acc);
                        resetState();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs font-bold text-stone-800 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{acc.fullName || acc.username}</span>
                      <span className="text-[10px] text-[#A38258]">
                        ({acc.country || 'Global'} • {acc.unitSystem === 'metric' ? 'KM/H' : 'MPH'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Location, Region & Preferred Language Questionnaire */}
        {step === 'LOCATION' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 1 of 3 • Location & Localization
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">
                Where are you driving?
              </h3>
              <p className="text-xs text-stone-500">
                Your location automatically configures your telematics speed units (MPH vs KM/H) and interface language.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              {/* Country Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                  <Globe className="w-3.5 h-3.5 text-[#A38258]" />
                  <span>Country</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880] cursor-pointer"
                >
                  {COUNTRIES_LIST.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.defaultUnit === 'imperial' ? 'MPH' : 'KM/H'})
                    </option>
                  ))}
                </select>
              </div>

              {/* City & State/Province Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-[#A38258]" />
                    <span>City *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco, Toronto, London"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A38258]" />
                    <span>State / Province</span>
                  </label>
                  <input
                    type="text"
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder="e.g. California, Ontario, NSW"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {/* Preferred Language Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                  <Languages className="w-3.5 h-3.5 text-[#A38258]" />
                  <span>Preferred Language</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { code: 'en' as LanguageCode, label: 'English', native: 'English' },
                    { code: 'es' as LanguageCode, label: 'Spanish', native: 'Español' },
                    { code: 'fr' as LanguageCode, label: 'French', native: 'Français' },
                    { code: 'zh' as LanguageCode, label: 'Chinese', native: '中文' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setPreferredLanguage(lang.code)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        preferredLanguage === lang.code
                          ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="text-[11px]">{lang.native}</div>
                      <div className="text-[9px] opacity-70 uppercase tracking-wider">{lang.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Configuration Summary Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 block">
                      Auto-Configured: {unitSystem === 'imperial' ? 'MPH (Miles/Hour)' : 'KM/H (Kilometers/Hour)'}
                    </span>
                    <span className="text-[10px] text-amber-800">
                      Matched to {country} road standards
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-100/80 p-0.5 rounded-lg border border-amber-300">
                  <button
                    type="button"
                    onClick={() => setUnitSystem('imperial')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      unitSystem === 'imperial' ? 'bg-amber-900 text-white' : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    MPH
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem('metric')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      unitSystem === 'metric' ? 'bg-amber-900 text-white' : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    KM/H
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('LOGIN')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!city.trim()) {
                    setErrorMsg('Please enter your city to proceed.');
                    return;
                  }
                  setErrorMsg('');
                  setStep('PROFILE');
                }}
                className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <span>Next: Profile Info</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Profile Details & Role Questionnaire */}
        {step === 'PROFILE' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 2 of 3 • Driver Profile
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">Driver & Role Information</h3>
            </div>

            <div className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'young_driver' as UserRole, label: 'Young Driver', desc: 'Licensed driver tracking habits' },
                    { id: 'gdl_student' as UserRole, label: 'Permit Student', desc: '50-hour GDL licensing log' },
                    { id: 'parent_mentor' as UserRole, label: 'Parent / Mentor', desc: 'Supervisory oversight' },
                    { id: 'driving_instructor' as UserRole, label: 'Instructor', desc: 'Professional telematics scoring' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                        selectedRole === r.id
                          ? 'border-[#C5A880] bg-[#C5A880]/10 text-stone-900 shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[9px] text-stone-500 leading-tight mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Rivera"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3 text-[#A38258]" /> Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-1">
                    <Mail className="w-3 h-3 text-[#A38258]" /> Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {(selectedRole === 'young_driver' || selectedRole === 'gdl_student') && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">
                    Parent / Supervisor Contact (For emergency alerts & circle)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Supervisor / Parent Name"
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="Supervisor Phone"
                      className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('LOCATION')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('PREFERENCES')}
                className="btn-gold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <span>Next: Safety Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Preferences & Confirmation */}
        {step === 'PREFERENCES' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-[#A38258] uppercase font-bold tracking-widest font-mono">
                Step 3 of 3 • Safety Coaching
              </span>
              <h3 className="text-lg font-bold text-stone-900 font-display mt-0.5">Telematics Preferences</h3>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => setVoiceAlerts(!voiceAlerts)}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Voice Safety Coach</span>
                  <span className="text-[10px] text-stone-500">Real-time spoken feedback on sudden braking and high G-forces</span>
                </div>
                <input type="checkbox" checked={voiceAlerts} readOnly className="rounded text-[#A38258]" />
              </div>

              <div
                onClick={() => setAutoTripDetect(!autoTripDetect)}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Automatic Trip Detection</span>
                  <span className="text-[10px] text-stone-500">Auto-start session recording when vehicle motion is sensed</span>
                </div>
                <input type="checkbox" checked={autoTripDetect} readOnly className="rounded text-[#A38258]" />
              </div>
            </div>

            {/* Final Profile Verification Snapshot */}
            <div className="p-3 rounded-xl bg-stone-100/70 border border-stone-200 text-xs space-y-1">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Account Summary</div>
              <div className="flex justify-between font-mono text-stone-800 text-[11px]">
                <span>Driver:</span>
                <span className="font-bold">@{usernameInput.trim()}</span>
              </div>
              <div className="flex justify-between text-stone-800 text-[11px]">
                <span>Location:</span>
                <span className="font-semibold">{city}{stateProvince ? `, ${stateProvince}` : ''}, {country}</span>
              </div>
              <div className="flex justify-between text-stone-800 text-[11px]">
                <span>Speed Telematics:</span>
                <span className="font-bold text-[#A38258]">{unitSystem.toUpperCase()} ({unitSystem === 'imperial' ? 'MPH' : 'KM/H'})</span>
              </div>
              <div className="flex justify-between text-stone-800 text-[11px]">
                <span>App Language:</span>
                <span className="font-bold uppercase text-[#A38258]">{preferredLanguage}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStep('PROFILE')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateAccountFinal}
                disabled={isSubmitting}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 font-bold"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Complete & Enter Cockpit</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
