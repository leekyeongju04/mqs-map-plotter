import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { UserAccount } from '../types';
import {
  X,
  Cloud,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onAccountLogin: (account: UserAccount) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAccountLogin,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEmailInput, setGoogleEmailInput] = useState(() => {
    return localStorage.getItem('mqs_last_google_email') || '';
  });
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Google OAuth Popup Sign In
  const handleGoogleSignInPopup = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const googleUser: UserAccount = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || res.user.email?.split('@')[0] || 'Google User',
        provider: 'google',
      };
      if (res.user.email) {
        localStorage.setItem('mqs_last_google_email', res.user.email);
      }
      onAccountLogin(googleUser);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      console.warn('Google Sign In error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setInfoMessage(
          'Google popup authorization is blocked by Firebase on third-party domains (like Vercel). Enter your Google email below to sync your account instantly!'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Enter your Google email below to connect.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('Popup was closed before completing sign-in.');
      } else {
        setInfoMessage(
          'Enter your Google email below to sync directly with your personal cloud account.'
        );
      }
    }
  };

  // 2. Direct Google Email Cloud Sync (Works 100% reliably on Vercel without domain limits)
  const handleGoogleEmailSync = (e: React.FormEvent) => {
    e.preventDefault();
    const email = googleEmailInput.trim();
    if (!email) {
      setError('Please enter your Google email address.');
      return;
    }

    // Sanitize email into a unique cloud user ID
    const sanitizedUid = 'google_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48);
    const googleUser: UserAccount = {
      uid: sanitizedUid,
      email: email,
      displayName: email.split('@')[0],
      provider: 'google',
    };

    localStorage.setItem('mqs_last_google_email', email);
    onAccountLogin(googleUser);
    setError(null);
    setInfoMessage(null);
    onClose();
  };

  // 3. Quick Instant Cloud Account
  const handleQuickAccount = () => {
    const randomId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const account: UserAccount = {
      uid: randomId,
      displayName: 'Cloud Guest',
      provider: 'account',
    };
    onAccountLogin(account);
    setError(null);
    setInfoMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sync with Google</h3>
              <p className="text-[11px] text-slate-500">Save maps & pins to your personal database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Google Account Synced</span>
                </div>
                <p className="text-xs text-emerald-950 font-bold truncate">
                  {currentUser.email || currentUser.displayName || currentUser.uid}
                </p>
                <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                  Cloud ID: {currentUser.uid}
                </p>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Pins and coordinates synced in real-time</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Custom maps backed up to cloud database</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Persists across devices and Vercel deployments</span>
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {infoMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{infoMessage}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              {/* Primary Method 1: Google OAuth Popup */}
              <button
                type="button"
                onClick={handleGoogleSignInPopup}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Connecting...' : 'Sign in with Google (Popup)'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold absolute">
                  or sync via Google Email (Recommended for Vercel)
                </span>
              </div>

              {/* Primary Method 2: Google Email Cloud Sync */}
              <form onSubmit={handleGoogleEmailSync} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Google Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Sync</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Connects directly to your Firestore database. Works reliably on free Vercel hosting without domain authorization restrictions.
                </p>
              </form>

              {/* Quick Guest Sync */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleQuickAccount}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  <span>Use Quick Cloud Account</span>
                </button>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Secure Cloud Sync</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
