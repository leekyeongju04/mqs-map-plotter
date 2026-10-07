import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pin, Category, MapData, ViewportTransform } from '../types';
import { PinIcon } from './PinIcon';
import { PinDetailDrawer } from './PinDetailDrawer';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Upload,
  Crosshair,
  FileImage,
  ArrowUpCircle,
  Layers,
  MapPin,
} from 'lucide-react';

interface MapPlotterProps {
  pins: Pin[];
  categories: Category[];
  activeMap: MapData;
  onUploadMapFile: (file: File, name: string) => void;
  onOpenPinModal: (coords: { xPercent: number; yPercent: number; pixelX: number; pixelY: number }) => void;
  onEditPin: (pin: Pin) => void;
  onDeletePin: (pinId: string) => void;
  onSolveForPin?: (pin: Pin) => void;
  selectedPinId?: string | null;
  onSelectPin?: (pin: Pin | null) => void;
  onOpenMapManager?: () => void;
}

export const MapPlotter: React.FC<MapPlotterProps> = ({
  pins,
  categories,
  activeMap,
  onUploadMapFile,
  onOpenPinModal,
  onEditPin,
  onDeletePin,
  onSolveForPin,
  selectedPinId,
  onSelectPin,
  onOpenMapManager,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pan & Zoom viewport state
  const [transform, setTransform] = useState<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDropPinMode, setIsDropPinMode] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);

  // Pin scope filter: 'current' (pins on this map) vs 'all' (all saved pins)
  const [pinScope, setPinScope] = useState<'current' | 'all'>('current');

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Live coordinate HUD
  const [cursorCoords, setCursorCoords] = useState<{
    pixelX: number;
    pixelY: number;
    xPercent: number;
    yPercent: number;
  } | null>(null);

  // Hovered pin for tooltip
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);
  const [activePin, setActivePin] = useState<Pin | null>(null);

  // Synchronize external selectedPinId
  useEffect(() => {
    if (selectedPinId) {
      const found = pins.find((p) => p.id === selectedPinId);
      if (found) {
        setActivePin(found);
        // Center view on this pin
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const targetX = (found.xPercent / 100) * (activeMap.width * transform.scale);
          const targetY = (found.yPercent / 100) * (activeMap.height * transform.scale);
          setTransform((prev) => ({
            ...prev,
            x: rect.width / 2 - targetX,
            y: rect.height / 2 - targetY,
          }));
        }
      }
    }
  }, [selectedPinId, pins, activeMap]);

  // Fit image to container on initial load or map change
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !activeMap.url) return;
    const container = containerRef.current.getBoundingClientRect();
    const mapW = activeMap.width || 2048;
    const mapH = activeMap.height || 2048;

    const scaleX = (container.width * 0.92) / mapW;
    const scaleY = (container.height * 0.92) / mapH;
    const initialScale = Math.min(scaleX, scaleY, 1.0);

    const initialX = (container.width - mapW * initialScale) / 2;
    const initialY = (container.height - mapH * initialScale) / 2;

    setTransform({
      x: initialX,
      y: initialY,
      scale: initialScale,
    });
  }, [activeMap.url, activeMap.width, activeMap.height]);

  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Zoom handler
  const handleZoom = (direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    const factor = direction === 'in' ? 1.25 : 0.8;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, 0.1), 6.0);
      if (clientX !== undefined && clientY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
        const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);

        return { x: newX, y: newY, scale: newScale };
      }
      return { ...prev, scale: newScale };
    });
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 'in' : 'out';
    handleZoom(direction, e.clientX, e.clientY);
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Drag Panning
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }

    // 2. Track Coordinates on the Map Canvas
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      if (relativeX >= 0 && relativeX <= rect.width && relativeY >= 0 && relativeY <= rect.height) {
        const xPercent = (relativeX / rect.width) * 100;
        const yPercent = (relativeY / rect.height) * 100;

        const pixelX = Math.round((xPercent / 100) * (activeMap.width || 2048));
        const pixelY = Math.round((yPercent / 100) * (activeMap.height || 2048));

        setCursorCoords({
          pixelX,
          pixelY,
          xPercent: Math.round(xPercent * 10) / 10,
          yPercent: Math.round(yPercent * 10) / 10,
        });
      } else {
        setCursorCoords(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support (Pinch to Zoom and Pan)
  const touchStartRef = useRef<{ dist: number; x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!activeMap.url) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        dist,
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeMap.url) return;
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setTransform((prev) => ({
        ...prev,
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }));
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / touchStartRef.current.dist;

      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale * factor, 0.1), 6.0);
        return { ...prev, scale: newScale };
      });
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  // Map Click handler to drop pin
  const handleMapClick = (e: React.MouseEvent) => {
    if (isDropPinMode && cursorCoords) {
      onOpenPinModal({
        xPercent: cursorCoords.xPercent,
        yPercent: cursorCoords.yPercent,
        pixelX: cursorCoords.pixelX,
        pixelY: cursorCoords.pixelY,
      });
      setIsDropPinMode(false);
    }
  };

  // File Upload Handlers (Preserves 100% uncompressed quality)
  const processImageFile = (file: File) => {
    onUploadMapFile(file, file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverWindow(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverWindow(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverWindow(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  // Filter pins based on scope ('current' vs 'all')
  const currentMapPins = pins.filter((p) => p.mapId === activeMap.id);
  const scopedPins = pinScope === 'current' ? (currentMapPins.length > 0 ? currentMapPins : pins) : pins;

  // Filter Pins based on search and category
  const filteredPins = scopedPins.filter((pin) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      pin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pin.description && pin.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === 'all' || pin.categoryId === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden flex flex-col select-none"
    >
      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag Over Overlay */}
      {isDragOverWindow && (
        <div className="absolute inset-0 z-50 bg-sky-950/80 backdrop-blur-sm border-4 border-dashed border-sky-400 flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-100">
          <ArrowUpCircle className="w-16 h-16 text-sky-400 animate-bounce mb-3" />
          <h3 className="text-xl font-bold">Drop Map Image Here</h3>
          <p className="text-sm text-sky-200 mt-1">
            Image will be loaded completely uncompressed and saved to your account
          </p>
        </div>
      )}

      {/* Top Search & Filter Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        {/* Search Input */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 p-1.5 flex items-center gap-2 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search landmark pins..."
            className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-1 font-mono cursor-pointer"
            >
              clear
            </button>
          )}
        </div>

        {/* Map Pin Scope Toggle: This Map vs All Saved Pins */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md rounded-xl p-0.5 border border-slate-800 flex items-center shadow-md">
          <button
            onClick={() => setPinScope('current')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              pinScope === 'current'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Show pins for this map"
          >
            This Map ({currentMapPins.length})
          </button>
          <button
            onClick={() => setPinScope('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              pinScope === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Show all saved pins across all maps"
          >
            All Pins ({pins.length})
          </button>
        </div>

        {/* Category Filters Carousel */}
        {categories.length > 0 && (
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-white text-slate-900 font-semibold'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const count = scopedPins.filter((p) => p.categoryId === cat.id).length;
              const isSelected = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 font-semibold'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Interactive Canvas OR Upload Dropzone */}
      {!activeMap.url ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 mx-auto mb-4">
              <FileImage className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Load Map Image: {activeMap.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Drop your map image file here (e.g. <span className="text-sky-300 font-medium">Wingfril_Island_Beach.webp</span>), or click below to select it from your device. It will be loaded completely uncompressed and saved directly to your account.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-900/30 transition-all flex items-center justify-center gap-2 mb-3 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select Map Image File</span>
            </button>

            {onOpenMapManager && (
              <button
                onClick={onOpenMapManager}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch to Another Saved Map</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative flex-1 overflow-hidden select-none bg-slate-950 ${
            isDropPinMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Scalable & Pannable World Container */}
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
            className="absolute top-0 left-0"
          >
            {/* The Map Image */}
            <img
              ref={imageRef}
              src={activeMap.url}
              alt={activeMap.name}
              draggable={false}
              onClick={handleMapClick}
              className="max-w-none block shadow-2xl pointer-events-auto"
              style={{
                width: `${activeMap.width}px`,
                height: `${activeMap.height}px`,
                imageRendering: 'auto',
              }}
            />

            {/* Placed Pins Overlay */}
            {filteredPins.map((pin) => {
              const isHovered = hoveredPin?.id === pin.id;
              const isActive = activePin?.id === pin.id;

              return (
                <div
                  key={pin.id}
                  style={{
                    left: `${pin.xPercent}%`,
                    top: `${pin.yPercent}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePin(pin);
                    if (onSelectPin) onSelectPin(pin);
                  }}
                  onMouseEnter={() => setHoveredPin(pin)}
                  onMouseLeave={() => setHoveredPin(null)}
                  className="absolute z-10 cursor-pointer group"
                >
                  {/* Pin Icon Marker */}
                  <div
                    className={`relative flex items-center justify-center p-1.5 rounded-full transition-all duration-150 shadow-md ${
                      isActive
                        ? 'ring-4 ring-sky-400 scale-125'
                        : isHovered
                        ? 'scale-115 ring-2 ring-white'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: pin.color }}
                  >
                    <PinIcon name={pin.icon} className="w-4 h-4 text-white stroke-[2.5]" />
                    {/* Pin Tail / Arrow */}
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6"
                      style={{ borderTopColor: pin.color }}
                    />
                  </div>

                  {/* Hover Tooltip showing pin name and coords */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900/95 text-white rounded-lg shadow-lg text-xs whitespace-nowrap pointer-events-none transition-all duration-150 ${
                      isHovered || isActive
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
                    }`}
                  >
                    <p className="font-semibold text-xs">{pin.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono tabular-nums">
                      <span>{pin.categoryName}</span>
                      <span>·</span>
                      <span>
                        ({pin.pixelX}, {pin.pixelY})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating HUD Controls */}
      {activeMap.url && (
        <>
          {/* Bottom-Right Zoom & View Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
            {/* Drop Pin Mode Trigger */}
            <button
              onClick={() => setIsDropPinMode(!isDropPinMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                isDropPinMode
                  ? 'bg-sky-600 text-white ring-4 ring-sky-400/30 animate-pulse'
                  : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200'
              }`}
              title="Click on the map to place a new landmark pin"
            >
              <Crosshair className="w-4 h-4" />
              <span>{isDropPinMode ? 'Click Map to Place Pin' : 'Drop Pin'}</span>
            </button>

            {/* Zoom Controls HUD */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-1 flex flex-col gap-1">
              <button
                onClick={() => handleZoom('in')}
                className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-mono text-center text-slate-500 py-0.5 select-none">
                {Math.round(transform.scale * 100)}%
              </div>
              <button
                onClick={() => handleZoom('out')}
                className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-200 my-0.5" />
              <button
                onClick={fitToScreen}
                className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Fit to Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Reset to 100%"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom-Left Live Reticle HUD & Map Info */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            {/* Live Coordinate Reticle */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/90 px-3 py-1.5 flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Crosshair className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-sans text-[11px] text-slate-400">Target</span>
              </div>
              <div className="tabular-nums font-semibold text-slate-800">
                {cursorCoords ? (
                  <span>
                    X: {cursorCoords.pixelX} · Y: {cursorCoords.pixelY}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({cursorCoords.xPercent}%, {cursorCoords.yPercent}%)
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-sans text-[11px]">Hover over map</span>
                )}
              </div>
            </div>

            {/* Map Switcher & Manage */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/90 p-2 flex items-center gap-2">
              <div className="text-xs truncate max-w-[140px] sm:max-w-[180px] font-semibold text-slate-800">
                {activeMap.name}
              </div>
              {onOpenMapManager && (
                <button
                  onClick={onOpenMapManager}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Switch between maps or upload new maps"
                >
                  <Layers className="w-3 h-3 text-sky-600" />
                  <span>Switch Map</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Selected Pin Detail Drawer */}
      <PinDetailDrawer
        pin={activePin}
        onClose={() => {
          setActivePin(null);
          if (onSelectPin) onSelectPin(null);
        }}
        onEdit={onEditPin}
        onDelete={onDeletePin}
        onSolveForPin={onSolveForPin}
      />
    </div>
  );
};
