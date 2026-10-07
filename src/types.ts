export interface Pin {
  id: string;
  name: string;
  description?: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  pixelX: number;
  pixelY: number;
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  mapId: string;
  userId: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
  createdAt: string;
}

export interface MapData {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  isCustom: boolean;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}
