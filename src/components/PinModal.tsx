import React, { useState, useEffect } from 'react';
import { Pin, Category } from '../types';
import { PinIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from './PinIcon';
import { X, Plus, Check } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pinData: Omit<Pin, 'id' | 'createdAt' | 'userId'>, pinId?: string) => void;
  initialCoords?: { xPercent: number; yPercent: number; pixelX: number; pixelY: number };
  categories: Category[];
  onOpenCategoryModal: () => void;
  editingPin?: Pin | null;
  mapId: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCoords,
  categories,
  onOpenCategoryModal,
  editingPin,
  mapId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('MapPin');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPin) {
      setName(editingPin.name);
      setDescription(editingPin.description || '');
      setCategoryId(editingPin.categoryId);
      setSelectedColor(editingPin.color || AVAILABLE_COLORS[0].hex);
      setSelectedIcon(editingPin.icon || 'MapPin');
    } else {
      setName('');
      setDescription('');
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
        setSelectedColor(categories[0].color);
        setSelectedIcon(categories[0].icon);
      }
    }
    setError('');
  }, [editingPin, isOpen, categories]);

  if (!isOpen) return null;

  const currentCoords = editingPin
    ? {
        xPercent: editingPin.xPercent,
        yPercent: editingPin.yPercent,
        pixelX: editingPin.pixelX,
        pixelY: editingPin.pixelY,
      }
    : initialCoords || { xPercent: 50, yPercent: 50, pixelX: 1024, pixelY: 1024 };

  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && !editingPin) {
      setSelectedColor(cat.color);
      setSelectedIcon(cat.icon);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Pin name is required');
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCat ? selectedCat.name : 'General';

    onSave(
      {
        name: name.trim(),
        description: description.trim(),
        xPercent: Math.round(currentCoords.xPercent * 100) / 100,
        yPercent: Math.round(currentCoords.yPercent * 100) / 100,
        pixelX: Math.round(currentCoords.pixelX),
        pixelY: Math.round(currentCoords.pixelY),
        categoryId: categoryId || 'general',
        categoryName,
        color: selectedColor,
        icon: selectedIcon,
        mapId,
      },
      editingPin?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <PinIcon name={selectedIcon} className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {editingPin ? 'Edit Landmark Pin' : 'Plot New Landmark Pin'}
              </h3>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                X: {Math.round(currentCoords.pixelX)} ({currentCoords.xPercent.toFixed(1)}%), Y:{' '}
                {Math.round(currentCoords.pixelY)} ({currentCoords.yPercent.toFixed(1)}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Pin Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Landmark Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pirate Shipwreck, Boar Field, Mystic Shrine"
              maxLength={100}
              autoFocus
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">Category</label>
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>New Category</span>
              </button>
            </div>
            <select
              value={categoryId}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Marker Icon
            </label>
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    title={item.name}
                    className={`h-9 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Pin Color
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((col) => {
                const isSelected = selectedColor === col.hex;
                return (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setSelectedColor(col.hex)}
                    title={col.name}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Landmark Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Spawns every 15 minutes, requires key from pirate quest."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              {editingPin ? 'Save Changes' : 'Plot Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
