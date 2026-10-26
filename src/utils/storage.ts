import { Pin, Category, MapData, UserAccount, PersonBot, PinDailyStats } from '../types';

// Pre-added categories are empty per user request
export const DEFAULT_CATEGORIES: Category[] = [];

const LOCAL_PINS_KEY = 'mqs_map_pins_local';
const LOCAL_CATEGORIES_KEY = 'mqs_map_categories_local';
const LOCAL_MAPS_LIST_KEY = 'mqs_maps_list_local';
const LOCAL_ACTIVE_MAP_KEY = 'mqs_active_map_id';
const LOCAL_ACCOUNT_KEY = 'mqs_user_account';
const LOCAL_PERSONS_KEY = 'mqs_persons_bots_local';

export function getLocalAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveLocalAccount(account: UserAccount | null) {
  try {
    if (account) {
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(LOCAL_ACCOUNT_KEY);
    }
  } catch (e) {
    console.error('Failed to save local account', e);
  }
}

export function getLocalPins(): Pin[] {
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load local pins', e);
    return [];
  }
}

export function saveLocalPins(pins: Pin[]) {
  try {
    localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(pins));
  } catch (e) {
    console.error('Failed to save local pins', e);
  }
}

// Purge any legacy pre-added hardcoded categories
const LEGACY_CATEGORY_IDS = new Set([
  'cat-npc',
  'cat-monster',
  'cat-portal',
  'cat-chest',
  'cat-camp',
  'cat-hazard',
  'cat-quest',
  'cat-landmark',
]);

export function getLocalCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed: Category[] = JSON.parse(raw);
    const userOnly = parsed.filter((c) => !LEGACY_CATEGORY_IDS.has(c.id));
    if (userOnly.length !== parsed.length) {
      saveLocalCategories(userOnly);
    }
    return userOnly;
  } catch (e) {
    console.error('Failed to load local categories', e);
    return [];
  }
}

export function saveLocalCategories(cats: Category[]) {
  try {
    const userOnly = cats.filter((c) => !LEGACY_CATEGORY_IDS.has(c.id));
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(userOnly));
  } catch (e) {
    console.error('Failed to save local categories', e);
  }
}

export function getLocalMapsList(): Omit<MapData, 'url'>[] {
  try {
    const raw = localStorage.getItem(LOCAL_MAPS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalMapsList(maps: Omit<MapData, 'url'>[]) {
  try {
    localStorage.setItem(LOCAL_MAPS_LIST_KEY, JSON.stringify(maps));
  } catch (e) {
    console.error('Failed to save local maps list', e);
  }
}

export function getActiveMapId(): string | null {
  return localStorage.getItem(LOCAL_ACTIVE_MAP_KEY);
}

export function saveActiveMapId(id: string) {
  localStorage.setItem(LOCAL_ACTIVE_MAP_KEY, id);
}

// IndexedDB helper for storing uncompressed map images safely
const DB_NAME = 'mqs_map_plotter_db';
const STORE_NAME = 'map_assets';

function openMapDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomMapImage(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(dataUrl, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save custom map to IndexedDB', err);
  }
}

export async function getCustomMapImage(id: string): Promise<string | null> {
  try {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get custom map from IndexedDB', err);
    return null;
  }
}

export async function deleteCustomMapImage(id: string): Promise<void> {
  try {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete custom map from IndexedDB', err);
  }
}

export function exportDataAsJson(
  pins: Pin[],
  categories: Category[],
  maps?: Omit<MapData, 'url'>[]
): void {
  const exportPayload = {
    version: '1.0',
    title: 'MQS Map Plotter Export',
    exportedAt: new Date().toISOString(),
    pins,
    categories,
    maps: maps || [],
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mqs-map-pins-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getLocalPersons(): PersonBot[] {
  try {
    const raw = localStorage.getItem(LOCAL_PERSONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load local persons', e);
    return [];
  }
}

export function saveLocalPersons(persons: PersonBot[]) {
  try {
    localStorage.setItem(LOCAL_PERSONS_KEY, JSON.stringify(persons));
  } catch (e) {
    console.error('Failed to save local persons', e);
  }
}

export function formatPHTime(dateInput: Date | string | number = new Date()): string {
  try {
    const date =
      typeof dateInput === 'string' || typeof dateInput === 'number'
        ? new Date(dateInput)
        : dateInput;
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date) + ' (PHT)'
    );
  } catch (e) {
    return new Date().toLocaleTimeString();
  }
}

export function calculatePinDailyStats(pinId: string, persons: PersonBot[]): PinDailyStats {
  const pinLogs: { amount: number; time: number; timestamp: string }[] = [];

  for (const person of persons) {
    for (const log of person.logs || []) {
      if (
        log.type === 'coins' &&
        (log.pinId === pinId || (!log.pinId && person.assignedPinId === pinId))
      ) {
        const time = new Date(log.timestamp).getTime();
        const amt = typeof log.amount === 'number' ? log.amount : 0;
        if (!isNaN(time) && amt > 0) {
          pinLogs.push({ amount: amt, time, timestamp: log.timestamp });
        }
      }
    }
  }

  if (pinLogs.length === 0) {
    return {
      pinId,
      totalCoins: 0,
      coinsPerDay: 0,
      todayCoins: 0,
      logCount: 0,
    };
  }

  pinLogs.sort((a, b) => a.time - b.time);
  const totalCoins = pinLogs.reduce((sum, l) => sum + l.amount, 0);

  const getPHDateString = (d: number | string | Date) => {
    try {
      const dt = typeof d === 'number' || typeof d === 'string' ? new Date(d) : d;
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(dt);
    } catch {
      return new Date(d).toISOString().slice(0, 10);
    }
  };

  const todayPHStr = getPHDateString(new Date());
  const todayCoins = pinLogs
    .filter((l) => getPHDateString(l.time) === todayPHStr)
    .reduce((sum, l) => sum + l.amount, 0);

  const uniqueDays = new Set(pinLogs.map((l) => getPHDateString(l.time)));
  const firstTime = pinLogs[0].time;
  const lastTime = pinLogs[pinLogs.length - 1].time;
  const hoursSpan = (lastTime - firstTime) / (1000 * 60 * 60);

  let coinsPerDay = 0;
  if (uniqueDays.size > 1) {
    const daysSpan = Math.max(uniqueDays.size, Math.ceil(hoursSpan / 24));
    coinsPerDay = Math.round(totalCoins / daysSpan);
  } else if (hoursSpan >= 1) {
    coinsPerDay = Math.round((totalCoins / hoursSpan) * 24);
  } else {
    // If only one entry or within an hour, daily capacity baseline is the accumulated coins today
    coinsPerDay = todayCoins > 0 ? todayCoins : totalCoins;
  }

  return {
    pinId,
    totalCoins,
    coinsPerDay,
    todayCoins,
    logCount: pinLogs.length,
    lastLoggedAt: pinLogs[pinLogs.length - 1].timestamp,
  };
}

export function calculateAllPinsDailyStats(
  pins: Pin[],
  persons: PersonBot[]
): Record<string, PinDailyStats> {
  const result: Record<string, PinDailyStats> = {};
  for (const pin of pins) {
    result[pin.id] = calculatePinDailyStats(pin.id, persons);
  }
  return result;
}

