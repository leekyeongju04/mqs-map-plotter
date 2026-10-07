import React, { useState } from 'react';
import { Category } from '../types';
import { PinIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from './PinIcon';
import { X, Check } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'id' | 'createdAt' | 'userId'>) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(AVAILABLE_COLORS[3].hex);
  const [icon, setIcon] = useState('Landmark');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    onSave({
      name: name.trim(),
      color,
      icon,
    });
    setName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Create New Category</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fishing Spots, Hidden Shrines"
              maxLength={64}
              autoFocus
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Category Color</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((col) => {
                const isSelected = color === col.hex;
                return (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setColor(col.hex)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Default Icon</label>
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-28 overflow-y-auto">
              {AVAILABLE_ICONS.slice(0, 18).map((item) => {
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`h-8 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

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
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
