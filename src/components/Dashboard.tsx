import React, { useState, useRef } from 'react';
import { Pin, Category, MapData } from '../types';
import { PinIcon } from './PinIcon';
import { exportDataAsJson } from '../utils/storage';
import {
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  ExternalLink,
  Layers,
  Calendar,
  Crosshair,
  FileText,
} from 'lucide-react';

interface DashboardProps {
  pins: Pin[];
  categories: Category[];
  activeMap: MapData;
  onLocatePinOnMap: (pin: Pin) => void;
  onEditPin: (pin: Pin) => void;
  onDeletePin: (pinId: string) => void;
  onOpenCategoryModal: () => void;
  onDeleteCategory: (categoryId: string) => void;
  onImportData: (data: { pins: Pin[]; categories?: Category[] }) => void;
  onSwitchToMap: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  pins,
  categories,
  activeMap,
  onLocatePinOnMap,
  onEditPin,
  onDeletePin,
  onOpenCategoryModal,
  onDeleteCategory,
  onImportData,
  onSwitchToMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'date' | 'x' | 'y'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered & Sorted Pins
  const filteredPins = pins
    .filter((pin) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        pin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pin.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pin.description && pin.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'all' || pin.categoryId === selectedCategoryFilter;

      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'x') {
        return sortAsc ? a.pixelX - b.pixelX : b.pixelX - a.pixelX;
      }
      if (sortField === 'y') {
        return sortAsc ? a.pixelY - b.pixelY : b.pixelY - a.pixelY;
      }
      // Date sort
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
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Personal Coordinates Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your saved landmark coordinates, export backups, and inspect locations.
          </p>
        </div>

        {/* Quick Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportDataAsJson(pins, categories)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Export all pins and categories to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Import coordinates from backup JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={onOpenCategoryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Total Saved Pins</span>
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {pins.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Categories</span>
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {categories.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Active Map</span>
          <span className="text-sm font-semibold text-slate-900 truncate block mt-1">
            {activeMap.name}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-400 block font-medium">Map Resolution</span>
          <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums block mt-1">
            {activeMap.width} × {activeMap.height} px
          </span>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>User Defined Categories</span>
          </h3>
          <button
            onClick={onOpenCategoryModal}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Category</span>
          </button>
        </div>
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
                {cat.userId !== 'default' && (
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                    title="Delete custom category"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
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

        {/* Category Filter & Sorting */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Categories ({pins.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="date">Sort: Date Created</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="x">Sort: X Coordinate</option>
            <option value="y">Sort: Y Coordinate</option>
          </select>
        </div>
      </div>

      {/* Pins Table / Grid */}
      {filteredPins.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No landmark pins plotted</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'No pins matched your current filter criteria.'
              : 'You have not placed any pins yet. Go to the Map view to plot key landmarks on Wingfril Island!'}
          </p>
          <button
            onClick={onSwitchToMap}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs"
          >
            Go to Map Plotter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Landmark Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Pixel Coords (X, Y)</th>
                  <th className="py-3 px-3">Normalized (X%, Y%)</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3">Added</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPins.map((pin) => (
                  <tr key={pin.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: pin.color }}
                        >
                          <PinIcon name={pin.icon} className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{pin.name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: pin.color }}
                        />
                        <span className="text-slate-700 truncate max-w-[120px]">
                          {pin.categoryName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-medium text-slate-800 tabular-nums">
                      {pin.pixelX}, {pin.pixelY}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                      {pin.xPercent.toFixed(1)}%, {pin.yPercent.toFixed(1)}%
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
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Locate on Map"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditPin(pin)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Pin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePin(pin.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Pin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
