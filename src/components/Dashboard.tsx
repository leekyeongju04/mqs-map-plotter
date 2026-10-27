import React, { useState, useRef, useMemo } from 'react';
import { Pin, Category, MapData, PersonBot, PinDailyStats, BotStatus } from '../types';
import { PinIcon } from './PinIcon';
import { exportDataAsJson, calculateAllPinsDailyStats } from '../utils/storage';
import { BotsTab } from './BotsTab';
import { BudgetTab } from './BudgetTab';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  Layers,
  Crosshair,
  Map as MapIcon,
  ArrowUpAZ,
  ArrowDownZA,
  Bot,
  Wallet,
  Coins,
  TrendingUp,
  Sparkles,
  Trophy,
  AlertTriangle,
  X,
  Smartphone,
  Check,
  Award,
  Clock,
  Copy,
  CheckCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface DashboardProps {
  pins: Pin[];
  categories: Category[];
  activeMap: MapData;
  mapsList: Omit<MapData, 'url'>[];
  persons: PersonBot[];
  onSelectMap: (mapId: string) => void;
  onLocatePinOnMap: (pin: Pin) => void;
  onEditPin: (pin: Pin) => void;
  onDeletePin: (pinId: string) => void;
  onOpenCategoryModal: () => void;
  onDeleteCategory: (categoryId: string) => void;
  onImportData: (data: { pins: Pin[]; categories?: Category[] }) => void;
  onSwitchToMap: () => void;
  onAddPerson: (
    name: string,
    assignedPinId?: string,
    status?: BotStatus,
    banLiftDate?: string,
    botNumber?: string
  ) => void;
  onUpdatePerson: (
    personId: string,
    name: string,
    newPinId?: string,
    status?: BotStatus,
    banLiftDate?: string,
    botNumber?: string
  ) => void;
  onDeletePerson: (personId: string) => void;
  onLogCoins: (personId: string, amount: number) => void;
  onDeleteLogEntry: (personId: string, logId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  pins,
  categories,
  activeMap,
  mapsList,
  persons,
  onSelectMap,
  onLocatePinOnMap,
  onEditPin,
  onDeletePin,
  onOpenCategoryModal,
  onDeleteCategory,
  onImportData,
  onSwitchToMap,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onLogCoins,
  onDeleteLogEntry,
}) => {
  // 3 Dashboard Tabs: 'pins' (current dashboard components), 'bots', 'budget'
  const [activeDashboardTab, setActiveDashboardTab] = useState<'pins' | 'bots' | 'budget'>('pins');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedMapFilter, setSelectedMapFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'date' | 'x' | 'y' | 'coins'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy feedback state for coordinates
  const [copiedCoordPinId, setCopiedCoordPinId] = useState<string | null>(null);

  // Confirmation prompts state
  const [pinToDelete, setPinToDelete] = useState<Pin | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // PWA / APK modal state
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Pre-calculate daily coin accumulation rate for each pin based on all logged coins
  const pinDailyStatsMap = useMemo(() => {
    return calculateAllPinsDailyStats(pins, persons);
  }, [pins, persons]);

  // Total daily coin projection across all pins
  const totalDailyCoinsYield = useMemo(() => {
    return Object.values(pinDailyStatsMap).reduce((sum, s) => sum + s.coinsPerDay, 0);
  }, [pinDailyStatsMap]);

  // Hourly projection rate
  const totalHourlyCoinsYield = useMemo(() => {
    return Math.round(totalDailyCoinsYield / 24);
  }, [totalDailyCoinsYield]);

  // Bot workforce metrics
  const botStats = useMemo(() => {
    const working = persons.filter((p) => (p.status || 'working') === 'working').length;
    const banned = persons.filter((p) => p.status === 'banned').length;
    return { total: persons.length, working, banned };
  }, [persons]);

  // Top performing pin by daily coin rate
  const topDailyPin = useMemo(() => {
    let best: { pin: Pin; stats: PinDailyStats } | null = null;
    for (const pin of pins) {
      const s = pinDailyStatsMap[pin.id];
      if (s && s.coinsPerDay > 0) {
        if (!best || s.coinsPerDay > best.stats.coinsPerDay) {
          best = { pin, stats: s };
        }
      }
    }
    return best;
  }, [pins, pinDailyStatsMap]);

  // Filter for the Gold Yield section: 'all' pins or 'active' (yielding) only
  const [goldYieldFilter, setGoldYieldFilter] = useState<'all' | 'active'>('all');
  const [goldYieldSearch, setGoldYieldSearch] = useState('');

  // Map of bots assigned to each pin
  const assignedBotsByPinId = useMemo(() => {
    const map: Record<string, PersonBot[]> = {};
    for (const person of persons) {
      if (person.assignedPinId) {
        if (!map[person.assignedPinId]) {
          map[person.assignedPinId] = [];
        }
        map[person.assignedPinId].push(person);
      }
    }
    return map;
  }, [persons]);

  // Pins sorted by Gold Yield Per Day (descending)
  const pinsYieldList = useMemo(() => {
    const sorted = [...pins].sort((a, b) => {
      const yieldA = pinDailyStatsMap[a.id]?.coinsPerDay || 0;
      const yieldB = pinDailyStatsMap[b.id]?.coinsPerDay || 0;
      if (yieldB !== yieldA) return yieldB - yieldA;
      const totalA = pinDailyStatsMap[a.id]?.totalCoins || 0;
      const totalB = pinDailyStatsMap[b.id]?.totalCoins || 0;
      if (totalB !== totalA) return totalB - totalA;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    let list = sorted;
    if (goldYieldFilter === 'active') {
      list = list.filter((pin) => {
        const s = pinDailyStatsMap[pin.id];
        return s && (s.coinsPerDay > 0 || s.totalCoins > 0);
      });
    }

    if (goldYieldSearch.trim()) {
      const q = goldYieldSearch.toLowerCase();
      list = list.filter(
        (pin) =>
          pin.name.toLowerCase().includes(q) ||
          pin.categoryName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [pins, pinDailyStatsMap, goldYieldFilter, goldYieldSearch]);

  // Max yield rate among all pins (used to scale progress bars)
  const maxPinYield = useMemo(() => {
    let max = 0;
    for (const pin of pins) {
      const y = pinDailyStatsMap[pin.id]?.coinsPerDay || 0;
      if (y > max) max = y;
    }
    return max || 1;
  }, [pins, pinDailyStatsMap]);

  // Total pins currently producing yield
  const pinsWithYieldCount = useMemo(() => {
    return pins.filter((p) => {
      const s = pinDailyStatsMap[p.id];
      return s && (s.coinsPerDay > 0 || s.totalCoins > 0);
    }).length;
  }, [pins, pinDailyStatsMap]);

  // Filtered & Sorted Pins (for Pins tab)
  const filteredPins = pins
    .filter((pin) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        pin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pin.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pin.description && pin.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'all' || pin.categoryId === selectedCategoryFilter;

      const matchesMap =
        selectedMapFilter === 'all' || pin.mapId === selectedMapFilter;

      return matchesSearch && matchesCat && matchesMap;
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        return sortAsc ? cmp : -cmp;
      }
      if (sortField === 'coins') {
        const cA = pinDailyStatsMap[a.id]?.coinsPerDay || 0;
        const cB = pinDailyStatsMap[b.id]?.coinsPerDay || 0;
        return sortAsc ? cA - cB : cB - cA;
      }
      if (sortField === 'x') {
        return sortAsc ? a.pixelX - b.pixelX : b.pixelX - a.pixelX;
      }
      if (sortField === 'y') {
        return sortAsc ? a.pixelY - b.pixelY : b.pixelY - a.pixelY;
      }
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });

  const handleCopyCoords = (pin: Pin) => {
    const text = `${pin.pixelX}, ${pin.pixelY}`;
    navigator.clipboard?.writeText(text);
    setCopiedCoordPinId(pin.id);
    setTimeout(() => {
      setCopiedCoordPinId(null);
    }, 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.pins)) {
          onImportData(parsed);
        } else if (Array.isArray(parsed)) {
          onImportData({ pins: parsed });
        }
      } catch (err) {
        console.error('Invalid JSON file format', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* =========================================================================
          TOP COMMAND BAR: Segmented Sub-Tabs + Icon-Only Quick Actions
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Sub-Tabs: Pins, Bots, Budget */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
          {/* Pins Tab Button */}
          <button
            type="button"
            onClick={() => setActiveDashboardTab('pins')}
            title="Landmark Pins & Gold Yield Dashboard"
            aria-label="Pins Tab"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeDashboardTab === 'pins'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="font-medium">Pins</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                activeDashboardTab === 'pins'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pins.length}
            </span>
          </button>

          {/* Bots Tab Button */}
          <button
            type="button"
            onClick={() => setActiveDashboardTab('bots')}
            title="Bot & Worker Farming Roster"
            aria-label="Bots Tab"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeDashboardTab === 'bots'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span className="font-medium">Bots</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                activeDashboardTab === 'bots'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {persons.length}
            </span>
          </button>

          {/* Budget Tab Button */}
          <button
            type="button"
            onClick={() => setActiveDashboardTab('budget')}
            title="Budget & Financial Analytics"
            aria-label="Budget Tab"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeDashboardTab === 'budget'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span className="font-medium">Budget</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Coming Soon" />
          </button>
        </div>

        {/* Action Tools (Icon Only with Rich Tooltips per user instructions) */}
        <div className="flex items-center justify-end gap-1.5">
          {/* Build APK / Mobile App Install Modal Button */}
          <button
            type="button"
            onClick={() => setIsApkModalOpen(true)}
            title="Build / Install Android APK & PWA"
            aria-label="Build / Install Android APK & PWA"
            className="p-2 text-slate-700 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 border border-slate-200 rounded-xl transition-colors cursor-pointer relative shadow-2xs"
          >
            <Smartphone className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          </button>

          {/* Export JSON Button (Icon Only) */}
          <button
            type="button"
            onClick={() => exportDataAsJson(pins, categories, mapsList)}
            className="p-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Export JSON Data Backup"
            aria-label="Export JSON Data Backup"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Hidden File Input & Import Button (Icon Only) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Import JSON Data Backup"
            aria-label="Import JSON Data Backup"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* New Category Button (Icon Only) */}
          <button
            type="button"
            onClick={onOpenCategoryModal}
            className="p-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Add Custom Pin Category"
            aria-label="Add Custom Pin Category"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Switch to Map View (Icon Only) */}
          <button
            type="button"
            onClick={onSwitchToMap}
            className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Open Interactive Map Plotter"
            aria-label="Open Interactive Map Plotter"
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- TAB 1: PINS DASHBOARD --- */}
      {activeDashboardTab === 'pins' && (
        <div className="space-y-6">
          {/* =========================================================================
              METRICS & KPI OVERVIEW CARDS
              ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Saved Pins */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Pins</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {pins.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">landmarks</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                Mapped across {mapsList.length} {mapsList.length === 1 ? 'map' : 'maps'}
              </p>
            </div>

            {/* Card 2: Projected Daily Coins (Gold Yield) */}
            <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-4 rounded-2xl border border-amber-200/90 shadow-xs hover:border-amber-300 transition-colors relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span>Est. Daily Gold</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tabular-nums">
                  +{totalDailyCoinsYield.toLocaleString()}
                </span>
                <span className="text-xs text-amber-700/80 font-normal">/day</span>
              </div>
              <p className="text-[11px] text-amber-700/70 font-mono mt-1">
                ~{totalHourlyCoinsYield.toLocaleString()} gold / hour
              </p>
            </div>

            {/* Card 3: Top Yielding Landmark Pin */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Top Pin Yield</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </div>
              {topDailyPin ? (
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-slate-900 truncate block" title={topDailyPin.pin.name}>
                      {topDailyPin.pin.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onLocatePinOnMap(topDailyPin.pin)}
                      title="Locate Top Pin on Map"
                      aria-label="Locate Top Pin on Map"
                      className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-amber-600 font-mono font-bold block mt-0.5">
                    +{topDailyPin.stats.coinsPerDay.toLocaleString()} gold/day
                  </span>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="text-xs text-slate-400 italic block">No yield logged yet</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Assign bots in Bots tab</span>
                </div>
              )}
            </div>

            {/* Card 4: Workforce / Bot Operations */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Farming Workforce</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {botStats.total}
                </span>
                <span className="text-xs text-slate-500 font-medium">bots</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {botStats.working} active
                </span>
                {botStats.banned > 0 && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {botStats.banned} banned
                  </span>
                )}
              </div>
            </div>

            {/* Card 5: Active Map & Dimensions */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Map</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MapIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 truncate block mt-0.5" title={activeMap.name}>
                {activeMap.name}
              </span>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                {activeMap.width} × {activeMap.height} px
              </p>
            </div>
          </div>

          {/* =========================================================================
              CUSTOM CATEGORIES STRIP
              ========================================================================= */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Custom Categories ({categories.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                title="Create New Category"
                aria-label="Create New Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No categories created yet. Click the "+" button to organize your landmark pins.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const count = pins.filter((p) => p.categoryId === cat.id).length;
                  const isSelected = selectedCategoryFilter === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.id)}
                        className="flex items-center gap-2 cursor-pointer"
                        title={`Filter pins by ${cat.name}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold">{cat.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>

                      {/* Delete Category Button (Icon Only) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                        }}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isSelected
                            ? 'text-slate-400 hover:text-rose-300'
                            : 'text-slate-300 hover:text-red-500'
                        }`}
                        title={`Delete ${cat.name} category`}
                        aria-label={`Delete ${cat.name} category`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION: GOLD YIELD PER DAY IN EACH PIN (Leaderboard & Cards)
              ========================================================================= */}
          <div className="bg-white rounded-2xl border border-amber-200/90 shadow-xs overflow-hidden">
            {/* Header with Title, Live Badge, and Yield Controls */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-transparent border-b border-amber-200/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Coins className="w-5 h-5 text-amber-50" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Gold Yield Per Day in Each Pin
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                      Live Rate
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculated daily gold accumulation per landmark pin from bot harvest logs.
                  </p>
                </div>
              </div>

              {/* Live Yield Summary Pill & Filter Controls */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <div className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-amber-800">Total Projection:</span>
                  <span className="text-sm font-extrabold font-mono text-amber-600 flex items-center gap-1 tabular-nums">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    +{totalDailyCoinsYield.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-slate-400">/day</span>
                  </span>
                </div>

                {/* Filter toggle: All Pins vs Producing Only */}
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
                  <button
                    type="button"
                    onClick={() => setGoldYieldFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      goldYieldFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({pins.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoldYieldFilter('active')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      goldYieldFilter === 'active'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Yielding ({pinsWithYieldCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Content: Cards or Empty States */}
            {pins.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No landmark pins registered yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Place pins on the map to start tracking gold accumulation rates.
                </p>
                <button
                  type="button"
                  onClick={onSwitchToMap}
                  title="Open Map to Drop Pins"
                  aria-label="Open Map to Drop Pins"
                  className="mt-4 p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            ) : pinsYieldList.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">No active gold logged yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Assign bots to your landmark pins in the Bots tab and log coins to see live daily gold generation here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab('bots')}
                  title="Switch to Bots Tab"
                  aria-label="Switch to Bots Tab"
                  className="mt-4 p-2 text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pinsYieldList.map((pin, idx) => {
                    const stats = pinDailyStatsMap[pin.id] || {
                      totalCoins: 0,
                      coinsPerDay: 0,
                      todayCoins: 0,
                      logCount: 0,
                    };
                    const assignedBots = assignedBotsByPinId[pin.id] || [];
                    const pinMapMeta = mapsList.find((m) => m.id === pin.mapId);
                    const yieldRatio =
                      maxPinYield > 0
                        ? Math.min(100, Math.round((stats.coinsPerDay / maxPinYield) * 100))
                        : 0;

                    const isTopThree = stats.coinsPerDay > 0 && idx < 3;

                    return (
                      <div
                        key={pin.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${
                          stats.coinsPerDay > 0
                            ? 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-md'
                            : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          {/* Card Top: Pin Avatar, Name, Category & Action Buttons */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs relative"
                                style={{ backgroundColor: pin.color }}
                              >
                                <PinIcon name={pin.icon} className="w-4 h-4 stroke-[2.5]" />
                                {isTopThree && (
                                  <span
                                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white shadow-2xs ${
                                      idx === 0
                                        ? 'bg-amber-400 text-amber-950'
                                        : idx === 1
                                        ? 'bg-slate-300 text-slate-800'
                                        : 'bg-amber-700 text-white'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className="font-bold text-slate-900 text-sm truncate"
                                  title={pin.name}
                                >
                                  {pin.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                                  <span className="truncate text-slate-500 font-medium">
                                    {pinMapMeta?.name || 'Map'}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate text-slate-600 font-medium">
                                    {pin.categoryName || 'General'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Top Action Buttons (Icon Only) */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onLocatePinOnMap(pin)}
                                title="Locate Pin on Map"
                                aria-label="Locate Pin on Map"
                                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Crosshair className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditPin(pin)}
                                title="Edit Pin"
                                aria-label="Edit Pin"
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Primary Metric: Gold Yield Per Day */}
                          <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                                Daily Yield
                              </span>
                              <span className="text-base font-extrabold font-mono text-amber-600 tabular-nums">
                                {stats.coinsPerDay > 0
                                  ? `+${stats.coinsPerDay.toLocaleString()} gold / day`
                                  : '0 gold / day'}
                              </span>
                            </div>

                            {/* Micro progress bar relative to top yield */}
                            {maxPinYield > 0 && stats.coinsPerDay > 0 && (
                              <div className="mt-2 w-full bg-amber-100/60 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-400 to-amber-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(6, yieldRatio)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* 2-Column Sub Metrics: Today & Lifetime Total */}
                          <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                            <div className="bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 font-mono">
                              <span className="text-slate-400 text-[10px] block">Today's Harvest</span>
                              <span className="font-bold text-slate-800">
                                {stats.todayCoins.toLocaleString()} gold
                              </span>
                            </div>
                            <div className="bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 font-mono">
                              <span className="text-slate-400 text-[10px] block">All-Time Total</span>
                              <span className="font-bold text-slate-800">
                                {stats.totalCoins.toLocaleString()} gold
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Assigned Bots (No hashtags, avatar bot numbers) */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                            <Bot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-400 text-[10px]">Bots:</span>
                            {assignedBots.length === 0 ? (
                              <span className="italic text-slate-400 text-[10px]">Unassigned</span>
                            ) : (
                              <div className="flex items-center gap-1 overflow-hidden truncate">
                                {assignedBots.slice(0, 3).map((b) => (
                                  <span
                                    key={b.id}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold truncate flex items-center gap-1 ${
                                      b.status === 'banned'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}
                                    title={`${b.name} (${b.status || 'working'})${
                                      b.banLiftDate ? ` - lifts ${b.banLiftDate}` : ''
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        b.status === 'banned' ? 'bg-rose-500' : 'bg-emerald-500'
                                      }`}
                                    />
                                    {b.botNumber ? b.botNumber : b.name}
                                  </span>
                                ))}
                                {assignedBots.length > 3 && (
                                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                                    +{assignedBots.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {stats.logCount} {stats.logCount === 1 ? 'log' : 'logs'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SEARCH & FILTER TOOLBAR FOR LANDMARKS TABLE
              ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pins by name, category, or notes..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search query"
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters & Sorting Tools */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Map Filter */}
              <select
                value={selectedMapFilter}
                onChange={(e) => setSelectedMapFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="all">All Maps ({pins.length} pins)</option>
                {mapsList.map((m) => {
                  const count = pins.filter((p) => p.mapId === m.id).length;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({count} pins)
                    </option>
                  );
                })}
              </select>

              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort Field Selector */}
              <select
                value={sortField}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSortField(val);
                  if (val === 'name') setSortAsc(true);
                  if (val === 'coins') setSortAsc(false);
                }}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="date">Sort: Date Created</option>
                <option value="name">Sort: Name (A-Z / 0-9)</option>
                <option value="coins">Sort: Daily Gold Yield</option>
                <option value="x">Sort: X Coordinate</option>
                <option value="y">Sort: Y Coordinate</option>
              </select>

              {/* Sort Order Toggle Button (Icon Only) */}
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                title={sortAsc ? 'Sort Order: Ascending (Click to reverse)' : 'Sort Order: Descending (Click to reverse)'}
                aria-label={sortAsc ? 'Sort Ascending' : 'Sort Descending'}
              >
                {sortAsc ? <ArrowUpAZ className="w-4 h-4 text-sky-600" /> : <ArrowDownZA className="w-4 h-4 text-sky-600" />}
              </button>
            </div>
          </div>

          {/* =========================================================================
              LANDMARK PINS TABLE (Action buttons: ICON ONLY)
              ========================================================================= */}
          {filteredPins.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No landmark pins found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {searchQuery || selectedCategoryFilter !== 'all' || selectedMapFilter !== 'all'
                  ? 'No pins match your current filter search. Try resetting your filters.'
                  : 'You have not added any pins yet. Go to the interactive map to plot landmark points.'}
              </p>
              <button
                type="button"
                onClick={onSwitchToMap}
                title="Go to Map Plotter"
                aria-label="Go to Map Plotter"
                className="p-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Pin Name</th>
                      <th className="py-3 px-3">Map</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Exact Pixels (X, Y)</th>
                      <th className="py-3 px-3">Percent (%)</th>
                      <th className="py-3 px-3">Daily Gold Yield</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPins.map((pin) => {
                      const pinMapMeta = mapsList.find((m) => m.id === pin.mapId);
                      const mapDisplayName = pinMapMeta?.name || 'Wingfril Island';
                      const isCopied = copiedCoordPinId === pin.id;

                      return (
                        <tr key={pin.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Pin Name + Icon */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                                style={{ backgroundColor: pin.color }}
                              >
                                <PinIcon name={pin.icon} className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                              <span className="font-bold text-slate-900 block truncate max-w-[160px]" title={pin.name}>
                                {pin.name}
                              </span>
                            </div>
                          </td>

                          {/* Map Name */}
                          <td className="py-3 px-3">
                            <span className="text-slate-600 font-medium truncate max-w-[130px] block" title={mapDisplayName}>
                              {mapDisplayName}
                            </span>
                          </td>

                          {/* Category Tag */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: pin.color }}
                              />
                              <span className="text-slate-700 font-medium truncate max-w-[120px]">
                                {pin.categoryName || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* Exact Pixel Coordinates with Quick Copy */}
                          <td className="py-3 px-3 font-mono font-medium text-slate-800 tabular-nums">
                            <button
                              type="button"
                              onClick={() => handleCopyCoords(pin)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
                              title="Click to copy coordinates"
                            >
                              <span>{pin.pixelX}, {pin.pixelY}</span>
                              {isCopied ? (
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </td>

                          {/* Percent Coordinates */}
                          <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">
                            {pin.xPercent.toFixed(1)}%, {pin.yPercent.toFixed(1)}%
                          </td>

                          {/* Daily Gold Yield */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {(() => {
                              const stat = pinDailyStatsMap[pin.id];
                              if (!stat || (stat.coinsPerDay === 0 && stat.totalCoins === 0)) {
                                return (
                                  <span className="text-slate-300 font-mono text-[11px] italic">
                                    0 gold / day
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col">
                                  <span className="font-bold text-amber-600 font-mono flex items-center gap-1 text-xs">
                                    <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    +{stat.coinsPerDay.toLocaleString()} / day
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Total: {stat.totalCoins.toLocaleString()} gold
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Description */}
                          <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                            {pin.description || <span className="text-slate-300 italic">—</span>}
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(pin.createdAt).toLocaleDateString()}
                          </td>

                          {/* Row Actions (ICON ONLY per user instruction) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => onLocatePinOnMap(pin)}
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                title="Locate on Map"
                                aria-label="Locate on Map"
                              >
                                <Crosshair className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditPin(pin)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Pin Details"
                                aria-label="Edit Pin Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPinToDelete(pin)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Landmark Pin"
                                aria-label="Delete Landmark Pin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: BOTS TAB --- */}
      {activeDashboardTab === 'bots' && (
        <BotsTab
          persons={persons}
          pins={pins}
          onAddPerson={onAddPerson}
          onUpdatePerson={onUpdatePerson}
          onDeletePerson={onDeletePerson}
          onLogCoins={onLogCoins}
          onDeleteLogEntry={onDeleteLogEntry}
        />
      )}

      {/* --- TAB 3: BUDGET TAB --- */}
      {activeDashboardTab === 'budget' && <BudgetTab />}

      {/* =========================================================================
          CONFIRMATION MODAL: Delete Landmark Pin (Buttons: ICON ONLY)
          ========================================================================= */}
      {pinToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Landmark Pin</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Are you sure you want to delete landmark pin <strong>{pinToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPinToDelete(null)}
                title="Cancel"
                aria-label="Cancel"
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePin(pinToDelete.id);
                  setPinToDelete(null);
                }}
                title="Confirm Delete"
                aria-label="Confirm Delete"
                className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL: Delete Category (Buttons: ICON ONLY)
          ========================================================================= */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Category</h3>
                <p className="text-xs text-slate-500">Pins in this category will keep their coordinates.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Are you sure you want to delete category <strong>{categoryToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                title="Cancel"
                aria-label="Cancel"
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                title="Confirm Delete"
                aria-label="Confirm Delete"
                className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Android APK & PWA Mobile App Installation
          ========================================================================= */}
      {isApkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Android APK & Mobile App</h3>
                  <p className="text-xs text-slate-500">Native standalone installation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApkModalOpen(false)}
                title="Close"
                aria-label="Close"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900">WebAPK Ready</p>
                  <p>
                    This app includes full Web App Manifest, auto-updating service workers, and high-res maskable Android icons for native WebAPK generation.
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>App is already running as an installed standalone app!</span>
                </div>
              ) : isInstallable ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Click the install button below to generate and install the native Android WebAPK on your device:
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        await install();
                        setIsApkModalOpen(false);
                      }}
                      title="Install Native App / APK"
                      aria-label="Install Native App / APK"
                      className="p-3 text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 w-full font-semibold text-xs"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : isIOS ? (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-indigo-950">Install on iPhone / iPad:</p>
                  <p>1. Tap the <strong>Share</strong> icon in Safari toolbar.</p>
                  <p>2. Select <strong>Add to Home Screen</strong>.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-slate-900">How to Install on Android:</p>
                  <p>
                    1. Open this app in Chrome on your Android device.
                  </p>
                  <p>
                    2. Tap the browser menu (⋮) and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                  <p>
                    3. Android will automatically package and install the app as an APK on your home screen.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer (ICON ONLY per user instruction) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsApkModalOpen(false)}
                title="Close"
                aria-label="Close"
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
