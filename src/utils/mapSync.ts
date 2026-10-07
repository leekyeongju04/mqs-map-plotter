import { doc, setDoc, getDocs, deleteDoc, collection, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MapData } from '../types';
import { saveCustomMapImage, getCustomMapImage } from './storage';

const CHUNK_SIZE = 400000; // ~400KB per chunk, well within 1MB Firestore limit

export async function uploadMapToFirestore(userId: string, map: MapData): Promise<void> {
  if (!map.url) return;

  const mapPath = `users/${userId}/maps/${map.id}`;
  const dataString = map.url;
  const chunkCount = Math.ceil(dataString.length / CHUNK_SIZE);

  // 1. Save Map Metadata doc
  try {
    await setDoc(doc(db, 'users', userId, 'maps', map.id), {
      id: map.id,
      name: map.name,
      width: map.width,
      height: map.height,
      chunkCount,
      totalSize: dataString.length,
      userId,
      createdAt: map.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, mapPath);
  }

  // 2. Save chunks in parallel batches
  const chunkPromises: Promise<void>[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const chunkData = dataString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const chunkId = `chunk_${i}`;
    const chunkPath = `${mapPath}/chunks/${chunkId}`;

    chunkPromises.push(
      setDoc(doc(db, 'users', userId, 'maps', map.id, 'chunks', chunkId), {
        id: chunkId,
        chunkIndex: i,
        data: chunkData,
        userId,
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, chunkPath);
      })
    );
  }

  await Promise.all(chunkPromises);
}

export async function fetchMapImageFromFirestore(userId: string, mapId: string): Promise<string | null> {
  // Check IndexedDB cache first for instant retrieval
  const cached = await getCustomMapImage(mapId);
  if (cached) return cached;

  const chunksPath = `users/${userId}/maps/${mapId}/chunks`;
  try {
    const q = query(
      collection(db, 'users', userId, 'maps', mapId, 'chunks'),
      orderBy('chunkIndex', 'asc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    let fullData = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.data === 'string') {
        fullData += data.data;
      }
    });

    if (fullData) {
      // Cache in IndexedDB for 0-latency future loads
      await saveCustomMapImage(mapId, fullData);
      return fullData;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load map chunks from Firestore:', err);
    return null;
  }
}

export async function deleteMapFromFirestore(userId: string, mapId: string, chunkCount = 20): Promise<void> {
  const mapPath = `users/${userId}/maps/${mapId}`;
  try {
    // Delete chunks
    const deletePromises: Promise<void>[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkId = `chunk_${i}`;
      deletePromises.push(
        deleteDoc(doc(db, 'users', userId, 'maps', mapId, 'chunks', chunkId)).catch(() => {})
      );
    }
    await Promise.all(deletePromises);
    // Delete map metadata doc
    await deleteDoc(doc(db, 'users', userId, 'maps', mapId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, mapPath);
  }
}
