import { Pin, Category, MapData } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-npc', name: 'NPC & Merchants', color: '#10B981', icon: 'User', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-monster', name: 'Boss & Monsters', color: '#EF4444', icon: 'Skull', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-portal', name: 'Portals & Docks', color: '#8B5CF6', icon: 'Navigation', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-chest', name: 'Chests & Treasures', color: '#F59E0B', icon: 'Sparkles', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-quest', name: 'Quest Locations', color: '#3B82F6', icon: 'Flag', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-poi', name: 'Points of Interest', color: '#EC4899', icon: 'Landmark', userId: 'default', createdAt: new Date().toISOString() },
  { id: 'cat-camp', name: 'Camps & Safe Zones', color: '#06B6D4', icon: 'Tent', userId: 'default', createdAt: new Date().toISOString() },
];

const LOCAL_PINS_KEY = 'mqs_map_pins_local';
const LOCAL_CATEGORIES_KEY = 'mqs_map_categories_local';
const LOCAL_SAVED_MAP_META = 'mqs_active_map_metadata';

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

export function getLocalCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Failed to load local categories', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveLocalCategories(cats: Category[]) {
  try {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(cats));
  } catch (e) {
    console.error('Failed to save local categories', e);
  }
}

export function getSavedMapMeta(): Omit<MapData, 'url'> | null {
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_MAP_META);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveSavedMapMeta(meta: Omit<MapData, 'url'>) {
  try {
    localStorage.setItem(LOCAL_SAVED_MAP_META, JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save map metadata', e);
  }
}

// IndexedDB helper for storing uploaded map images safely without compression
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

export function exportDataAsJson(pins: Pin[], categories: Category[]): void {
  const exportPayload = {
    version: '1.0',
    title: 'MQS Map Plotter Export',
    exportedAt: new Date().toISOString(),
    pins,
    categories,
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
