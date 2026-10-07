import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Map, LayoutDashboard, Compass, LogIn, LogOut, Cloud, HardDrive } from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'dashboard' | 'solver';
  setActiveTab: (tab: 'map' | 'dashboard' | 'solver') => void;
  user: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  pinCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onSignIn,
  onSignOut,
  pinCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            M
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            MQS Map Plotter
          </span>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Map</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                activeTab === 'map' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pinCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('solver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'solver'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Solver</span>
          </button>
        </nav>

        {/* Zone 3: Account & Sync State */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[120px]">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign out of Firebase"
                className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500">
                <HardDrive className="w-3 h-3 text-slate-400" />
                Local Storage
              </span>
              <button
                onClick={onSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Sync coordinates with Firebase cloud storage"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span>Sync with Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
