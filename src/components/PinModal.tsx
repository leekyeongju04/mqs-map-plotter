import React, { useState, useEffect } from 'react';
import { Pin, Category } from '../types';
import { PinIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from './PinIcon';
import { X, Plus, Check, Tag } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pinData: Omit<Pin, 'id' | 'createdAt' | 'userId'>, pinId?: string) => void;
  initialCoords?: { xPercent: number; yPercent: number; pixelX: number; pixelY: number };
  categories: Category[];
  onOpenCategoryModal: () => void;
  onQuickCreateCategory?: (name: string, color: string, icon: string) => Promise<Category>;
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
  onQuickCreateCategory,
  editingPin,
  mapId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('MapPin');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPin) {
      setName(editingPin.name);
      setDescription(editingPin.description || '');
      setCategoryId(editingPin.categoryId);
      setCustomCategoryName(editingPin.categoryName || '');
      setIsCreatingNewCat(false);
      setSelectedColor(editingPin.color || AVAILABLE_COLORS[0].hex);
      setSelectedIcon(editingPin.icon || 'MapPin');
    } else {
      setName('');
      setDescription('');
      if (categories.length > 0) {
        setCategoryId(categories[0].id);
        setCustomCategoryName(categories[0].name);
        setIsCreatingNewCat(false);
        setSelectedColor(categories[0].color);
        setSelectedIcon(categories[0].icon);
      } else {
        setCategoryId('');
        setCustomCategoryName('');
        setIsCreatingNewCat(true); // Default to creating a category when none exist
        setSelectedColor(AVAILABLE_COLORS[0].hex);
        setSelectedIcon('MapPin');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a landmark or pin name.');
      return;
    }

    let finalCatId = categoryId;
    let finalCatName = '';

    // If user typed a new category name or has no existing categories
    if ((isCreatingNewCat || categories.length === 0) && customCategoryName.trim() && onQuickCreateCategory) {
      try {
        const createdCat = await onQuickCreateCategory(
          customCategoryName.trim(),
          selectedColor,
          selectedIcon
        );
        finalCatId = createdCat.id;
        finalCatName = createdCat.name;
      } catch (err) {
        console.error('Failed to quick create category', err);
        finalCatName = customCategoryName.trim();
        finalCatId = `cat-${Date.now()}`;
      }
    } else {
      const selectedCat = categories.find((c) => c.id === finalCatId);
      finalCatName = selectedCat ? selectedCat.name : customCategoryName.trim() || 'Landmark';
      if (!finalCatId) finalCatId = `cat-${Date.now()}`;
    }

    onSave(
      {
        name: name.trim(),
        description: description.trim(),
        xPercent: Math.round(currentCoords.xPercent * 100) / 100,
        yPercent: Math.round(currentCoords.yPercent * 100) / 100,
        pixelX: Math.round(currentCoords.pixelX),
        pixelY: Math.round(currentCoords.pixelY),
        categoryId: finalCatId,
        categoryName: finalCatName,
        color: selectedColor,
        icon: selectedIcon,
        mapId,
      },
      editingPin?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <PinIcon name={selectedIcon} className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingPin ? 'Edit Landmark Pin' : 'Plot New Landmark Pin'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Coords: ({currentCoords.pixelX}, {currentCoords.pixelY}) · {currentCoords.xPercent}%, {currentCoords.yPercent}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Pin Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pin / Landmark Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Secret Cave, Merchant Tent, Quest NPC"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes or Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key notes, NPC dialogue, loot hints..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white resize-none"
            />
          </div>

          {/* Category Section */}
          <div className="pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Category</span>
              </label>
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCat(!isCreatingNewCat)}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
                >
                  {isCreatingNewCat ? 'Choose existing' : '+ Create new category'}
                </button>
              )}
            </div>

            {/* Choose existing vs make new category */}
            {!isCreatingNewCat && categories.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setSelectedColor(cat.color);
                        setSelectedIcon(cat.icon);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 text-sky-950 font-semibold ring-1 ring-sky-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <PinIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>Create Custom Category</span>
                </div>
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="e.g. Shops, Monsters, Treasure, Teleport"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pin Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    selectedColor === c.hex ? 'scale-120 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {selectedColor === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pin Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title={item.name}
                  >
                    <PinIcon name={item.id} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingPin ? 'Save Changes' : 'Plot Pin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
