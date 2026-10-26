import React, { useState, useRef, useMemo } from 'react';
import { Pin, Category, MapData, PersonBot, PinDailyStats, BotStatus } from '../types';
import { PinIcon } from './PinIcon';
import { exportDataAsJson, calculateAllPinsDailyStats } from '../utils/storage';
import { BotsTab } from './BotsTab';
import { BudgetTab } from './BudgetTab';
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
  onAddPerson: (name: string, assignedPinId?: string, status?: BotStatus, banLiftDate?: string) => void;
  onUpdatePerson: (
    personId: string,
    name: string,
    newPinId?: string,
    status?: BotStatus,
    banLiftDate?: string
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

  // Pre-calculate daily coin accumulation rate for each pin based on all logged coins
  const pinDailyStatsMap = useMemo(() => {
    return calculateAllPinsDailyStats(pins, persons);
  }, [pins, persons]);

  // Total daily coin projection across all pins
  const totalDailyCoinsYield = useMemo(() => {
    return Object.values(pinDailyStatsMap).reduce((sum, s) => sum + s.coinsPerDay, 0);
  }, [pinDailyStatsMap]);

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
      {/* Dashboard Sub-Tabs Header: Pins, Bots, Budget */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {/* Pins Tab */}
        <button
          type="button"
          onClick={() => setActiveDashboardTab('pins')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeDashboardTab === 'pins'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Pins</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeDashboardTab === 'pins'
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {pins.length}
          </span>
        </button>

        {/* Bots Tab */}
        <button
          type="button"
          onClick={() => setActiveDashboardTab('bots')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeDashboardTab === 'bots'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Bots</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeDashboardTab === 'bots'
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {persons.length}
          </span>
        </button>

        {/* Budget Tab (under construction) */}
        <button
          type="button"
          onClick={() => setActiveDashboardTab('budget')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeDashboardTab === 'budget'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Budget</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.2 rounded-full hidden sm:inline">
            Under Construction
          </span>
        </button>
      </div>

      {/* --- TAB 1: PINS (Contains all current dashboard components) --- */}
      {activeDashboardTab === 'pins' && (
        <div className="space-y-6">
          {/* Top Banner & Quick Tools (Buttons use icon only with tooltips) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Personal Coordinates Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your saved landmark coordinates across all maps, export backups, and inspect locations.
              </p>
            </div>

            {/* Quick Action Tools (Icon only per user instruction) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportDataAsJson(pins, categories, mapsList)}
                className="p-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Export JSON"
                aria-label="Export JSON"
              >
                <Download className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Import JSON"
                aria-label="Import JSON"
              >
                <Upload className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenCategoryModal}
                className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                title="New Category"
                aria-label="New Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 block font-medium">Total Saved Pins</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {pins.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 block font-medium">Est. Daily Coins</span>
              <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums flex items-center gap-1">
                <Coins className="w-5 h-5 text-amber-500 shrink-0" />
                {totalDailyCoinsYield.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal">/day</span>
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 block font-medium">Top Yield Pin</span>
              {topDailyPin ? (
                <div className="mt-1">
                  <span className="text-sm font-semibold text-slate-900 truncate block">
                    {topDailyPin.pin.name}
                  </span>
                  <span className="text-xs text-amber-600 font-mono font-medium">
                    +{topDailyPin.stats.coinsPerDay.toLocaleString()}/day
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic block mt-2">No coins logged yet</span>
              )}
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 block font-medium">Active Map</span>
              <span className="text-sm font-semibold text-slate-900 truncate block mt-1">
                {activeMap.name}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-400 block font-medium">Custom Categories</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {categories.length}
              </span>
            </div>
          </div>

          {/* User Defined Categories Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom Categories ({categories.length})</span>
              </h3>
              <button
                onClick={onOpenCategoryModal}
                className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                title="Create Category"
                aria-label="Create Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No categories created yet. Click "+" above to organize your landmark pins.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const count = pins.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-slate-800">{cat.name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">({count})</span>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                        title="Delete custom category"
                        aria-label="Delete custom category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter pins by name, category, or notes..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Map Filter & Category Filter & Sorting */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Map Filter */}
              <select
                value={selectedMapFilter}
                onChange={(e) => setSelectedMapFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortField}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSortField(val);
                  if (val === 'name') setSortAsc(true);
                  if (val === 'coins') setSortAsc(false);
                }}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700 cursor-pointer shadow-2xs"
              >
                <option value="date">Sort: Date Created</option>
                <option value="name">Sort: Name (A-Z / 0-9)</option>
                <option value="coins">Sort: Est. Coins / Day</option>
                <option value="x">Sort: X Coordinate</option>
                <option value="y">Sort: Y Coordinate</option>
              </select>

              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="p-2 text-xs bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                title={sortAsc ? 'Ascending (A-Z, 0-9) - click to reverse' : 'Descending (Z-A, 9-0) - click to reverse'}
                aria-label={sortAsc ? 'Sort Ascending' : 'Sort Descending'}
              >
                {sortAsc ? <ArrowUpAZ className="w-4 h-4 text-sky-600" /> : <ArrowDownZA className="w-4 h-4 text-sky-600" />}
              </button>
            </div>
          </div>

          {/* Pins Table / Grid (Actions use icon only per user instruction) */}
          {filteredPins.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No landmark pins found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {searchQuery || selectedCategoryFilter !== 'all' || selectedMapFilter !== 'all'
                  ? 'No pins matched your current filter criteria.'
                  : 'You have not placed any pins yet. Go to the Map view to plot key landmarks!'}
              </p>
              <button
                onClick={onSwitchToMap}
                title="Go to Map Plotter"
                aria-label="Go to Map Plotter"
                className="p-2.5 text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                      <th className="py-3 px-4">Pin Name</th>
                      <th className="py-3 px-3">Map</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Exact Pixels (X, Y)</th>
                      <th className="py-3 px-3">Percent (%)</th>
                      <th className="py-3 px-3">Est. Coins / Day</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPins.map((pin) => {
                      const pinMapMeta = mapsList.find((m) => m.id === pin.mapId);
                      const mapDisplayName = pinMapMeta?.name || 'Wingfril Beach';

                      return (
                        <tr key={pin.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                                style={{ backgroundColor: pin.color }}
                              >
                                <PinIcon name={pin.icon} className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 block">{pin.name}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-slate-600 font-medium truncate max-w-[130px] block">
                              {mapDisplayName}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: pin.color }}
                              />
                              <span className="text-slate-700 truncate max-w-[120px]">
                                {pin.categoryName || 'General'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono font-medium text-slate-800 tabular-nums">
                            {pin.pixelX}, {pin.pixelY}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                            {pin.xPercent.toFixed(1)}%, {pin.yPercent.toFixed(1)}%
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {(() => {
                              const stat = pinDailyStatsMap[pin.id];
                              if (!stat || (stat.coinsPerDay === 0 && stat.totalCoins === 0)) {
                                return (
                                  <span className="text-slate-300 font-mono text-[11px] italic">
                                    0 / day
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-amber-600 font-mono flex items-center gap-1 text-xs">
                                    <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    +{stat.coinsPerDay.toLocaleString()} / day
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Total: {stat.totalCoins.toLocaleString()} • Today: {stat.todayCoins.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                            {pin.description || <span className="text-slate-300 italic">—</span>}
                          </td>

                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(pin.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onLocatePinOnMap(pin)}
                                className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                title="Locate on Map"
                                aria-label="Locate on Map"
                              >
                                <Crosshair className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEditPin(pin)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Pin"
                                aria-label="Edit Pin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeletePin(pin.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Pin"
                                aria-label="Delete Pin"
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

      {/* --- TAB 2: BOTS (Person management, coin logging with 12-hr PH time, history, pin changes) --- */}
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

      {/* --- TAB 3: BUDGET (Under Construction) --- */}
      {activeDashboardTab === 'budget' && <BudgetTab />}
    </div>
  );
};
