import React, { useState } from 'react';
import { Pin } from '../types';
import { PinIcon } from './PinIcon';
import { X, Edit2, Trash2, Copy, Check, Navigation, Calendar } from 'lucide-react';

interface PinDetailDrawerProps {
  pin: Pin | null;
  onClose: () => void;
  onEdit: (pin: Pin) => void;
  onDelete: (pinId: string) => void;
  onSolveForPin?: (pin: Pin) => void;
}

export const PinDetailDrawer: React.FC<PinDetailDrawerProps> = ({
  pin,
  onClose,
  onEdit,
  onDelete,
  onSolveForPin,
}) => {
  const [copied, setCopied] = useState(false);

  if (!pin) return null;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`X: ${pin.pixelX}, Y: ${pin.pixelY}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-4 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ backgroundColor: pin.color }}
          >
            <PinIcon name={pin.icon} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{pin.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: pin.color }} />
              <span className="truncate">{pin.categoryName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {pin.description && (
        <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
          {pin.description}
        </p>
      )}

      {/* Coordinate Badges */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 block font-sans">Pixels (X, Y)</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {pin.pixelX}, {pin.pixelY}
          </span>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 block font-sans">Map Normalized</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {pin.xPercent.toFixed(1)}%, {pin.yPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-3">
        <Calendar className="w-3 h-3" />
        <span>Added {new Date(pin.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
        <button
          onClick={handleCopyCoords}
          className="flex-1 py-1.5 px-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
          title="Copy coordinates"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {onSolveForPin && (
          <button
            onClick={() => onSolveForPin(pin)}
            className="flex-1 py-1.5 px-2 text-xs font-medium text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center justify-center gap-1"
            title="Inspect in Solver tab"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span>Solve</span>
          </button>
        )}

        <button
          onClick={() => onEdit(pin)}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Edit Pin"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(pin.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Pin"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
