import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { UserAccount } from '../types';
import {
  X,
  Cloud,
  ShieldCheck,
  LogIn,
  AlertCircle,
  Sparkles,
  User,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
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
  const [usernameInput, setUsernameInput] = useState('');
  const [domainWarning, setDomainWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setDomainWarning(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const googleUser: UserAccount = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || res.user.email?.split('@')[0] || 'Google User',
        provider: 'google',
      };
      onAccountLogin(googleUser);
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      console.warn('Google Sign In error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setDomainWarning(
          'Your hosting domain is not authorized in Firebase Console yet. You can use Account Login below to save and sync with Firestore database immediately!'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Account Login below.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setError('The sign-in popup was closed before completion. Please try again.');
      } else {
        setError(err?.message || 'Google Sign In could not complete. Use Account Login below.');
      }
    }
  };

  // 2. Direct Account Login (connects straight to Firestore database!)
  const handleCustomAccountLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setError('Please enter an account username or email.');
      return;
    }

    // Sanitize to a valid ID (alphanumeric and dashes)
    const sanitizedId = 'usr_' + trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 32);
    const account: UserAccount = {
      uid: sanitizedId,
      displayName: trimmed,
      email: trimmed.includes('@') ? trimmed : undefined,
      provider: 'account',
    };

    onAccountLogin(account);
    setUsernameInput('');
    setError(null);
    onClose();
  };

  // 3. One-Click Instant Cloud Account
  const handleQuickAccount = () => {
    const randomId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const account: UserAccount = {
      uid: randomId,
      displayName: 'Plotter User',
      provider: 'account',
    };
    onAccountLogin(account);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Account & Cloud Sync</h3>
              <p className="text-[11px] text-slate-500">Save maps and pins directly to database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Account Connected</span>
                </div>
                <p className="text-xs text-emerald-950 font-bold truncate">
                  {currentUser.displayName || currentUser.email || currentUser.uid}
                </p>
                <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                  ID: {currentUser.uid} ({currentUser.provider === 'google' ? 'Google Auth' : 'Database Account'})
                </p>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>✓ All uploaded maps are stored in your Firestore database.</p>
                <p>✓ All plotted pins and categories persist across devices and reloads.</p>
              </div>

              <div className="flex gap-2 pt-2">
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
                  className="flex-1 py-2 px-3 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {domainWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-start gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{domainWarning}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed pl-5">
                    For Vercel hosting, add your domain in Firebase Console → Authentication → Settings → Authorized domains.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your account so your uploaded maps and pins are automatically saved to your persistent database.
              </p>

              {/* Method 1: Account Login (Instant & 100% reliable on Vercel & AI Studio) */}
              <form onSubmit={handleCustomAccountLogin} className="space-y-2 pt-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Account Name or Email
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="e.g. Kesha or my-account"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                  or
                </span>
              </div>

              {/* Method 2: Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
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
                <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>

              {/* Method 3: 1-Click Quick Account */}
              <button
                type="button"
                onClick={handleQuickAccount}
                className="w-full py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>1-Click Quick Account</span>
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Connects directly to your Firebase Firestore database</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
