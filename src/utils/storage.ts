import { Pin, Category, MapData, UserAccount } from '../types';

// Pre-added categories are empty per user request
export const DEFAULT_CATEGORIES: Category[] = [];

const LOCAL_PINS_KEY = 'mqs_map_pins_local';
const LOCAL_CATEGORIES_KEY = 'mqs_map_categories_local';
const LOCAL_MAPS_LIST_KEY = 'mqs_maps_list_local';
const LOCAL_ACTIVE_MAP_KEY = 'mqs_active_map_id';
const LOCAL_ACCOUNT_KEY = 'mqs_user_account';

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
