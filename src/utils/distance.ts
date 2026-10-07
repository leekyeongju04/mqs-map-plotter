import { Pin } from '../types';

export interface NearestResult {
  pin: Pin;
  distancePixels: number;
  distancePercent: number;
  bearing: string;
}

export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { euclidean: number; manhattan: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const euclidean = Math.sqrt(dx * dx + dy * dy);
  const manhattan = Math.abs(dx) + Math.abs(dy);
  return { euclidean, manhattan };
}

export function calculateBearing(x1: number, y1: number, x2: number, y2: number): string {
  // Screen coordinates: y increases downwards
  const dx = x2 - x1;
  const dy = y2 - y1; // down is positive
  if (dx === 0 && dy === 0) return 'Same Point';

  // Math angle: atan2(-dy, dx) so up is positive y
  let degrees = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (degrees < 0) degrees += 360;

  // Convert to compass bearing (0 deg = North, 90 deg = East, 180 deg = South, 270 deg = West)
  const compassDeg = (90 - degrees + 360) % 360;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(compassDeg / 45) % 8;
  return directions[index];
}

export function findNearestLandmarks(
  targetX: number,
  targetY: number,
  pins: Pin[],
  imageWidth: number = 2048,
  imageHeight: number = 2048,
  limit: number = 5
): NearestResult[] {
  if (pins.length === 0) return [];

  const results: NearestResult[] = pins.map((pin) => {
    const pinPixX = pin.pixelX || (pin.xPercent / 100) * imageWidth;
    const pinPixY = pin.pixelY || (pin.yPercent / 100) * imageHeight;

    const { euclidean: distPix } = calculateDistance(targetX, targetY, pinPixX, pinPixY);

    const targetXPercent = (targetX / imageWidth) * 100;
    const targetYPercent = (targetY / imageHeight) * 100;
    const { euclidean: distPercent } = calculateDistance(
      targetXPercent,
      targetYPercent,
      pin.xPercent,
      pin.yPercent
    );

    const bearing = calculateBearing(targetX, targetY, pinPixX, pinPixY);

    return {
      pin,
      distancePixels: Math.round(distPix),
      distancePercent: Math.round(distPercent * 10) / 10,
      bearing,
    };
  });

  results.sort((a, b) => a.distancePixels - b.distancePixels);
  return results.slice(0, limit);
}
