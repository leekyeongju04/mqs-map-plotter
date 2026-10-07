import React, { useState, useEffect } from 'react';
import { Pin, MapData } from '../types';
import { PinIcon } from './PinIcon';
import {
  calculateDistance,
  calculateBearing,
  findNearestLandmarks,
  NearestResult,
} from '../utils/distance';
import { Compass, Crosshair, ArrowRight, MapPin, Calculator, Info } from 'lucide-react';

interface SolverProps {
  pins: Pin[];
  activeMap: MapData;
  onLocatePinOnMap: (pin: Pin) => void;
  initialPinForSolve?: Pin | null;
}

export const Solver: React.FC<SolverProps> = ({
  pins,
  activeMap,
  onLocatePinOnMap,
  initialPinForSolve,
}) => {
  // Proximity solver inputs
  const [targetX, setTargetX] = useState<number>(1024);
  const [targetY, setTargetY] = useState<number>(1024);
  const [nearestResults, setNearestResults] = useState<NearestResult[]>([]);

  // Two-point distance solver
  const [pinAId, setPinAId] = useState<string>('');
  const [pinBId, setPinBId] = useState<string>('');

  useEffect(() => {
    if (initialPinForSolve) {
      setTargetX(initialPinForSolve.pixelX);
      setTargetY(initialPinForSolve.pixelY);
      setPinAId(initialPinForSolve.id);
    } else if (pins.length > 0) {
      if (!pinAId) setPinAId(pins[0].id);
      if (!pinBId && pins.length > 1) setPinBId(pins[1].id);
    }
  }, [initialPinForSolve, pins]);

  // Recalculate nearest landmarks
  useEffect(() => {
    const results = findNearestLandmarks(
      targetX,
      targetY,
      pins,
      activeMap.width,
      activeMap.height,
      6
    );
    setNearestResults(results);
  }, [targetX, targetY, pins, activeMap]);

  // Two-point calculations
  const pinA = pins.find((p) => p.id === pinAId);
  const pinB = pins.find((p) => p.id === pinBId);

  let pointDistance: { euclidean: number; manhattan: number } | null = null;
  let pointBearing = '';
  let midpoint = { x: 0, y: 0 };

  if (pinA && pinB) {
    pointDistance = calculateDistance(pinA.pixelX, pinA.pixelY, pinB.pixelX, pinB.pixelY);
    pointBearing = calculateBearing(pinA.pixelX, pinA.pixelY, pinB.pixelX, pinB.pixelY);
    midpoint = {
      x: Math.round((pinA.pixelX + pinB.pixelX) / 2),
      y: Math.round((pinA.pixelY + pinB.pixelY) / 2),
    };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Solver Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-600" />
          <span>Coordinate Solver</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Calculate direct distances between landmarks, locate nearest pins from given coordinates, and find midpoints.
        </p>
      </div>

      {pins.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No Plotted Pins Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You need to plot landmark pins on the Map tab to use distance solving and proximity queries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tool 1: Proximity / Nearest Landmark Resolver */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-sky-600" />
                <span>Proximity Landmark Finder</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enter target coordinates to identify closest landmarks.
              </p>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target X (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={activeMap.width}
                  value={targetX}
                  onChange={(e) => setTargetX(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Y (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={activeMap.height}
                  value={targetY}
                  onChange={(e) => setTargetY(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Quick Presets from Saved Pins */}
            <div>
              <span className="block text-[11px] text-slate-400 mb-1">Or sample from saved pin:</span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {pins.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setTargetX(p.pixelX);
                      setTargetY(p.pixelY);
                    }}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors truncate max-w-[140px]"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Nearest Results List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-700 block">
                Nearest Landmarks ({nearestResults.length})
              </span>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {nearestResults.map(({ pin, distancePixels, bearing }) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: pin.color }}
                      >
                        <PinIcon name={pin.icon} className="w-3 h-3" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {pin.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({pin.pixelX}, {pin.pixelY})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <span className="font-bold text-slate-800 block text-xs">
                          {distancePixels} px
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          Bearing: {bearing}
                        </span>
                      </div>
                      <button
                        onClick={() => onLocatePinOnMap(pin)}
                        className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                        title="View on Map"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tool 2: Point-to-Point Distance Solver */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-sky-600" />
                <span>Two-Point Distance Calculator</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Measure Euclidean and grid distance between two landmarks.
              </p>
            </div>

            {/* Select Point A */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Point A (Origin)
              </label>
              <select
                value={pinAId}
                onChange={(e) => setPinAId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {pins.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.pixelX}, {p.pixelY})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Point B */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Point B (Destination)
              </label>
              <select
                value={pinBId}
                onChange={(e) => setPinBId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {pins.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.pixelX}, {p.pixelY})
                  </option>
                ))}
              </select>
            </div>

            {/* Distance Results Box */}
            {pointDistance && pinA && pinB && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Euclidean Distance:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm tabular-nums">
                    {Math.round(pointDistance.euclidean)} pixels
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Manhattan (Grid) Distance:</span>
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {Math.round(pointDistance.manhattan)} pixels
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Directional Bearing:</span>
                  <span className="font-semibold text-sky-700 font-mono">
                    {pointBearing} ({pinA.name} → {pinB.name})
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500">Calculated Midpoint:</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    X: {midpoint.x}, Y: {midpoint.y}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => onLocatePinOnMap(pinA)}
                    className="flex-1 py-1.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors text-center"
                  >
                    Locate Point A
                  </button>
                  <button
                    onClick={() => onLocatePinOnMap(pinB)}
                    className="flex-1 py-1.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors text-center"
                  >
                    Locate Point B
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
