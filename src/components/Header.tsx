import React from 'react';
import { Map, LayoutDashboard, Compass, LogIn, LogOut, Cloud, HardDrive, Layers } from 'lucide-react';
import { MapData, UserAccount } from '../types';

interface HeaderProps {
  activeTab: 'map' | 'dashboard' | 'solver';
  setActiveTab: (tab: 'map' | 'dashboard' | 'solver') => void;
  user: UserAccount | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  pinCount: number;
  activeMap: MapData;
  mapsCount: number;
  onOpenMapManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuthModal,
  onSignOut,
  pinCount,
  activeMap,
  mapsCount,
  onOpenMapManager,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Title & Maps Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            M
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hidden sm:inline">
            MQS Map Plotter
          </span>

          {/* Maps Switcher Button */}
          <button
            onClick={onOpenMapManager}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/80 cursor-pointer"
            title="Switch between maps or upload new maps"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">{activeMap.name}</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {mapsCount}
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
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
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 text-xs text-slate-700 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                title="Account Settings"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[130px] font-medium">
                  {user.displayName || user.email || user.uid}
                </span>
              </button>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500">
                <HardDrive className="w-3 h-3 text-slate-400" />
                Local Mode
              </span>
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                title="Sign in to save maps and pins to database"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Sync</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
