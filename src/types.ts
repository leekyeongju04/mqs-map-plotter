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
  userId: string;
  createdAt: string;
  chunkCount?: number;
  totalSize?: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface UserAccount {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  isAnonymous?: boolean;
  provider: 'google' | 'account';
}

export type BotStatus = 'working' | 'banned';

export interface CoinLogEntry {
  id: string;
  type: 'coins' | 'pin_change' | 'status_change';
  amount?: number;
  pinId?: string;
  pinName?: string;
  oldPinId?: string;
  oldPinName?: string;
  newPinId?: string;
  newPinName?: string;
  oldStatus?: BotStatus;
  newStatus?: BotStatus;
  banLiftDate?: string;
  timestamp: string;
  phTime: string;
  note?: string;
}

export interface PersonBot {
  id: string;
  name: string;
  botNumber?: string;
  assignedPinId?: string;
  assignedPinName?: string;
  status?: BotStatus;
  banLiftDate?: string;
  totalCoins: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  logs: CoinLogEntry[];
}

export interface PinDailyStats {
  pinId: string;
  totalCoins: number;
  coinsPerDay: number;
  todayCoins: number;
  logCount: number;
  lastLoggedAt?: string;
}
