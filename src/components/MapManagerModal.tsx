import React, { useRef, useState } from 'react';
import { MapData, Pin } from '../types';
import { X, Upload, Map as MapIcon, Check, Trash2, Plus, Layers, Image as ImageIcon } from 'lucide-react';

interface MapManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  maps: Omit<MapData, 'url'>[];
  activeMapId: string;
  onSelectMap: (mapId: string) => void;
  onUploadNewMap: (file: File, name: string) => void;
  onDeleteMap: (mapId: string) => void;
  pins: Pin[];
  isUploadingMap?: boolean;
}

export const MapManagerModal: React.FC<MapManagerModalProps> = ({
  isOpen,
  onClose,
  maps,
  activeMapId,
  onSelectMap,
  onUploadNewMap,
  onDeleteMap,
  pins,
  isUploadingMap = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMapName, setNewMapName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newMapName) {
        setNewMapName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setError('');
    }
    e.target.value = '';
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    onUploadNewMap(selectedFile, newMapName.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''));
    setSelectedFile(null);
    setNewMapName('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Switch & Manage Maps</h3>
              <p className="text-xs text-slate-500">
                Upload multiple maps to your account and switch between them seamlessly
              </p>
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
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Upload New Map Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>Upload New Map (Uncompressed)</span>
            </h4>

            {error && (
              <div className="p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 mb-2">
                {error}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedFile ? 'Change File' : 'Select Image File'}</span>
                </button>

                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Map Name (e.g. Wingfril Island Beach)"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                <button
                  type="submit"
                  disabled={!selectedFile || isUploadingMap}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isUploadingMap ? 'Saving to DB...' : 'Save & Open'}
                </button>
              </div>

              {selectedFile && (
                <p className="text-[11px] text-slate-500 truncate">
                  Selected: <span className="font-medium text-slate-700">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB uncompressed)
                </p>
              )}
            </form>
          </div>

          {/* Maps List */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2.5">
              Available Maps ({maps.length})
            </h4>

            {maps.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                No maps saved yet. Upload your map above to start plotting!
              </div>
            ) : (
              <div className="space-y-2">
                {maps.map((map) => {
                  const isActive = map.id === activeMapId;
                  const mapPins = pins.filter((p) => p.mapId === map.id);

                  return (
                    <div
                      key={map.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <MapIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {map.name}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-700 rounded-md">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>{map.width}×{map.height} px</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700">
                              {mapPins.length} {mapPins.length === 1 ? 'pin' : 'pins'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectMap(map.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Switch to Map
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-sky-700 px-2 py-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Active</span>
                          </span>
                        )}

                        {maps.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${map.name}"? Pins will remain saved in your account dashboard.`)) {
                                onDeleteMap(map.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Map"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
