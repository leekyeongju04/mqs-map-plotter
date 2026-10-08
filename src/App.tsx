import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  auth,
  db,
  signOut,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { Pin, Category, MapData, UserAccount } from './types';
import {
  getLocalPins,
  saveLocalPins,
  getLocalCategories,
  saveLocalCategories,
  getLocalMapsList,
  saveLocalMapsList,
  getActiveMapId,
  saveActiveMapId,
  saveCustomMapImage,
  getCustomMapImage,
  deleteCustomMapImage,
  getLocalAccount,
  saveLocalAccount,
} from './utils/storage';
import {
  uploadMapToFirestore,
  fetchMapImageFromFirestore,
  deleteMapFromFirestore,
} from './utils/mapSync';
import { Header } from './components/Header';
import { MapPlotter } from './components/MapPlotter';
import { Dashboard } from './components/Dashboard';
import { Solver } from './components/Solver';
import { PinModal } from './components/PinModal';
import { CategoryModal } from './components/CategoryModal';
import { MapManagerModal } from './components/MapManagerModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'dashboard' | 'solver'>('map');

  // Account state: either Google Auth or persistent Database Account
  const [user, setUser] = useState<UserAccount | null>(() => getLocalAccount());
  const [authReady, setAuthReady] = useState(false);

  // Pins & Categories state (Categories starts empty per user request)
  const [pins, setPins] = useState<Pin[]>(() => getLocalPins());
  const [categories, setCategories] = useState<Category[]>(() => getLocalCategories());

  // Maps List state (stores metadata of all maps)
  const [mapsList, setMapsList] = useState<Omit<MapData, 'url'>[]>(() => {
    const saved = getLocalMapsList();
    if (saved.length > 0) return saved;
    return [
      {
        id: 'wingfril-island',
        name: 'Wingfril Island Beach',
        width: 2048,
        height: 2048,
        isCustom: false,
        userId: 'default',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Active Map state
  const [activeMap, setActiveMap] = useState<MapData>({
    id: 'wingfril-island',
    name: 'Wingfril Island Beach',
    url: '',
    width: 2048,
    height: 2048,
    isCustom: false,
    userId: 'default',
    createdAt: new Date().toISOString(),
  });

  // Modals state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMapManagerOpen, setIsMapManagerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadingMap, setIsUploadingMap] = useState(false);

  const [pendingCoords, setPendingCoords] = useState<{
    xPercent: number;
    yPercent: number;
    pixelX: number;
    pixelY: number;
  } | null>(null);
  const [editingPin, setEditingPin] = useState<Pin | null>(null);

  // Active pin selection (for jumping from dashboard/solver)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [initialPinForSolve, setInitialPinForSolve] = useState<Pin | null>(null);

  // Listen to Firebase Auth state (e.g. Google Sign In)
  useEffect(() => {
    import('./firebase').then(({ getRedirectResult }) => {
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            const googleUser: UserAccount = {
              uid: result.user.uid,
              email: result.user.email,
              displayName:
                result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
              provider: 'google',
            };
            setUser(googleUser);
            saveLocalAccount(googleUser);
          }
        })
        .catch((err) => {
          console.warn('Redirect sign-in notice:', err);
        });
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const googleUser: UserAccount = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Google User',
          provider: 'google',
        };
        setUser(googleUser);
        saveLocalAccount(googleUser);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Restore Active Map image on startup from IndexedDB or Firestore
  useEffect(() => {
    async function restoreMap() {
      const savedActiveId = getActiveMapId() || 'wingfril-island';
      const targetMeta = mapsList.find((m) => m.id === savedActiveId) || mapsList[0];
      if (targetMeta) {
        let dataUrl = await getCustomMapImage(targetMeta.id);
        if (!dataUrl && user) {
          dataUrl = await fetchMapImageFromFirestore(user.uid, targetMeta.id);
        }
        setActiveMap({
          ...targetMeta,
          url: dataUrl || '',
        });
      }
    }
    restoreMap();
  }, [user, mapsList]);

  // Sync with Firestore whenever user is logged in
  useEffect(() => {
    if (!user) return;

    const userId = user.uid;
    const pinsPath = `users/${userId}/pins`;
    const categoriesPath = `users/${userId}/categories`;
    const mapsPath = `users/${userId}/maps`;

    // 1. Sync Pins from Firestore
    const unsubPins = onSnapshot(
      collection(db, 'users', userId, 'pins'),
      (snapshot) => {
        const cloudPins: Pin[] = [];
        snapshot.forEach((docSnap) => {
          cloudPins.push(docSnap.data() as Pin);
        });

        if (cloudPins.length > 0) {
          const localPins = getLocalPins();
          const cloudIds = new Set(cloudPins.map((p) => p.id));
          const unpushed = localPins.filter((p) => !cloudIds.has(p.id));
          if (unpushed.length > 0) {
            unpushed.forEach(async (p) => {
              const updatedPin = { ...p, userId };
              try {
                await setDoc(doc(db, 'users', userId, 'pins', updatedPin.id), updatedPin);
              } catch (err) {
                console.warn('Syncing unpushed pin:', err);
              }
            });
          }
          const allPins = [...cloudPins, ...unpushed.map((p) => ({ ...p, userId }))];
          setPins(allPins);
          saveLocalPins(allPins);
        } else {
          // Push existing local pins to cloud
          const localPins = getLocalPins();
          if (localPins.length > 0) {
            localPins.forEach(async (p) => {
              const updatedPin = { ...p, userId };
              try {
                await setDoc(doc(db, 'users', userId, 'pins', updatedPin.id), updatedPin);
              } catch (err) {
                console.warn('Initial pin sync note:', err);
              }
            });
          }
        }
      },
      (error) => {
        console.warn('Pins snapshot notice:', error);
      }
    );

    // 2. Sync Categories from Firestore
    const unsubCats = onSnapshot(
      collection(db, 'users', userId, 'categories'),
      (snapshot) => {
        const cloudCats: Category[] = [];
        snapshot.forEach((docSnap) => {
          cloudCats.push(docSnap.data() as Category);
        });

        if (cloudCats.length > 0) {
          const localCats = getLocalCategories();
          const cloudIds = new Set(cloudCats.map((c) => c.id));
          const unpushed = localCats.filter((c) => !cloudIds.has(c.id));
          if (unpushed.length > 0) {
            unpushed.forEach(async (c) => {
              const updated = { ...c, userId };
              try {
                await setDoc(doc(db, 'users', userId, 'categories', updated.id), updated);
              } catch (err) {
                console.warn('Syncing unpushed category:', err);
              }
            });
          }
          const allCats = [...cloudCats, ...unpushed.map((c) => ({ ...c, userId }))];
          setCategories(allCats);
          saveLocalCategories(allCats);
        } else {
          const localCats = getLocalCategories();
          if (localCats.length > 0) {
            localCats.forEach(async (c) => {
              const updated = { ...c, userId };
              try {
                await setDoc(doc(db, 'users', userId, 'categories', updated.id), updated);
              } catch (err) {
                console.warn('Initial category sync note:', err);
              }
            });
          }
        }
      },
      (error) => {
        console.warn('Categories snapshot notice:', error);
      }
    );

    // 3. Sync Maps metadata from Firestore
    const unsubMaps = onSnapshot(
      collection(db, 'users', userId, 'maps'),
      (snapshot) => {
        const cloudMaps: Omit<MapData, 'url'>[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudMaps.push({
            id: data.id,
            name: data.name,
            width: data.width,
            height: data.height,
            isCustom: true,
            userId: data.userId,
            createdAt: data.createdAt,
            chunkCount: data.chunkCount,
            totalSize: data.totalSize,
          });
        });

        if (cloudMaps.length > 0) {
          setMapsList(cloudMaps);
          saveLocalMapsList(cloudMaps);
        } else {
          // Push any custom local maps to the cloud
          const localMaps = getLocalMapsList();
          for (const m of localMaps) {
            if (m.isCustom) {
              getCustomMapImage(m.id).then((imgData) => {
                if (imgData) {
                  uploadMapToFirestore(userId, { ...m, url: imgData }).catch(console.warn);
                }
              });
            }
          }
        }
      },
      (error) => {
        console.warn('Maps snapshot notice:', error);
      }
    );

    return () => {
      unsubPins();
      unsubCats();
      unsubMaps();
    };
  }, [user]);

  // Account login handler (from modal)
  const handleAccountLogin = async (account: UserAccount) => {
    setUser(account);
    saveLocalAccount(account);

    // Push existing custom maps to Firestore
    const localMaps = getLocalMapsList();
    for (const m of localMaps) {
      if (m.isCustom) {
        const imgData = await getCustomMapImage(m.id);
        if (imgData) {
          uploadMapToFirestore(account.uid, { ...m, url: imgData }).catch(console.warn);
        }
      }
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      if (user?.provider === 'google') {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setUser(null);
    saveLocalAccount(null);
  };

  // Switch between maps
  const handleSelectMap = async (mapId: string) => {
    const meta = mapsList.find((m) => m.id === mapId);
    if (!meta) return;

    saveActiveMapId(mapId);

    // Check IndexedDB first for instant 0-latency display
    let dataUrl = await getCustomMapImage(mapId);
    if (!dataUrl && user) {
      // Fetch chunks from Firestore
      dataUrl = await fetchMapImageFromFirestore(user.uid, mapId);
    }

    setActiveMap({
      ...meta,
      url: dataUrl || '',
    });
  };

  // Upload a new map (Uncompressed native resolution) and save to account & database
  const handleUploadNewMap = async (file: File, name: string) => {
    setIsUploadingMap(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();

      img.onload = async () => {
        const mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const userId = user ? user.uid : 'local-user';

        const newMapMeta: Omit<MapData, 'url'> = {
          id: mapId,
          name: name.trim() || file.name.replace(/\.[^/.]+$/, ''),
          width: img.naturalWidth || 2048,
          height: img.naturalHeight || 2048,
          isCustom: true,
          userId,
          createdAt: new Date().toISOString(),
        };

        const newMapFull: MapData = {
          ...newMapMeta,
          url: dataUrl,
        };

        // 1. Cache uncompressed image in IndexedDB
        await saveCustomMapImage(mapId, dataUrl);

        // 2. Update local maps list
        const updatedList = [newMapMeta, ...mapsList.filter((m) => m.id !== mapId)];
        setMapsList(updatedList);
        saveLocalMapsList(updatedList);

        // 3. Switch active map immediately
        setActiveMap(newMapFull);
        saveActiveMapId(mapId);

        // 4. If logged in, save metadata & uncompressed chunks to Firestore
        if (user) {
          try {
            await uploadMapToFirestore(user.uid, newMapFull);
          } catch (err) {
            console.error('Failed to sync map to Firestore:', err);
          }
        }

        setIsUploadingMap(false);
        setIsMapManagerOpen(false);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  // Delete Map
  const handleDeleteMap = async (mapId: string) => {
    const updatedList = mapsList.filter((m) => m.id !== mapId);
    setMapsList(updatedList);
    saveLocalMapsList(updatedList);

    await deleteCustomMapImage(mapId);

    if (user) {
      await deleteMapFromFirestore(user.uid, mapId).catch(console.error);
    }

    if (activeMap.id === mapId && updatedList.length > 0) {
      handleSelectMap(updatedList[0].id);
    }
  };

  // Add or Edit Pin (saved pins persist across map switches!)
  const handleSavePin = async (
    pinData: Omit<Pin, 'id' | 'createdAt' | 'userId'>,
    pinId?: string
  ) => {
    const userId = user ? user.uid : 'local-user';
    const now = new Date().toISOString();

    if (pinId) {
      // Edit pin
      const updatedPins = pins.map((p) => {
        if (p.id === pinId) {
          return {
            ...p,
            ...pinData,
            userId,
          };
        }
        return p;
      });
      setPins(updatedPins);
      saveLocalPins(updatedPins);

      if (user) {
        const path = `users/${user.uid}/pins/${pinId}`;
        const pinToSave = updatedPins.find((p) => p.id === pinId);
        if (pinToSave) {
          try {
            await setDoc(doc(db, 'users', user.uid, 'pins', pinId), pinToSave, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, path);
          }
        }
      }
    } else {
      // Create new pin
      const newPin: Pin = {
        ...pinData,
        id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        mapId: activeMap.id,
        userId,
        createdAt: now,
      };

      const updatedPins = [newPin, ...pins];
      setPins(updatedPins);
      saveLocalPins(updatedPins);
      setSelectedPinId(newPin.id);

      if (user) {
        const path = `users/${user.uid}/pins/${newPin.id}`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'pins', newPin.id), newPin);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }
    }

    setEditingPin(null);
    setPendingCoords(null);
  };

  // Delete Pin
  const handleDeletePin = async (pinId: string) => {
    const updatedPins = pins.filter((p) => p.id !== pinId);
    setPins(updatedPins);
    saveLocalPins(updatedPins);
    if (selectedPinId === pinId) setSelectedPinId(null);

    if (user) {
      const path = `users/${user.uid}/pins/${pinId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'pins', pinId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  // Create Category (User-defined only)
  const handleSaveCategory = async (
    catData: Omit<Category, 'id' | 'createdAt' | 'userId'>
  ): Promise<Category> => {
    const userId = user ? user.uid : 'local-user';
    const newCategory: Category = {
      ...catData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      createdAt: new Date().toISOString(),
    };

    const updatedCats = [...categories, newCategory];
    setCategories(updatedCats);
    saveLocalCategories(updatedCats);

    if (user) {
      const path = `users/${user.uid}/categories/${newCategory.id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'categories', newCategory.id), newCategory);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
    return newCategory;
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string) => {
    const updatedCats = categories.filter((c) => c.id !== catId);
    setCategories(updatedCats);
    saveLocalCategories(updatedCats);

    if (user) {
      const path = `users/${user.uid}/categories/${catId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'categories', catId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  // Import JSON Backup
  const handleImportData = async (data: { pins: Pin[]; categories?: Category[] }) => {
    if (data.pins && Array.isArray(data.pins)) {
      const mergedPins = [...data.pins, ...pins.filter((p) => !data.pins.some((dp) => dp.id === p.id))];
      setPins(mergedPins);
      saveLocalPins(mergedPins);

      if (user) {
        for (const pin of data.pins) {
          const pinDoc = { ...pin, userId: user.uid };
          try {
            await setDoc(doc(db, 'users', user.uid, 'pins', pin.id), pinDoc);
          } catch (err) {
            console.error('Error importing pin to Firestore:', err);
          }
        }
      }
    }

    if (data.categories && Array.isArray(data.categories)) {
      const mergedCats = [
        ...data.categories,
        ...categories.filter((c) => !data.categories!.some((dc) => dc.id === c.id)),
      ];
      setCategories(mergedCats);
      saveLocalCategories(mergedCats);
    }
  };

  // Locate Pin on Map from Dashboard or Solver (switches to pin's map if different)
  const handleLocatePinOnMap = (pin: Pin) => {
    if (pin.mapId && pin.mapId !== activeMap.id) {
      handleSelectMap(pin.mapId);
    }
    setSelectedPinId(pin.id);
    setActiveTab('map');
  };

  // Jump to Solver for a pin
  const handleSolveForPin = (pin: Pin) => {
    setInitialPinForSolve(pin);
    setActiveTab('solver');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        pinCount={pins.length}
        activeMap={activeMap}
        mapsCount={mapsList.length}
        onOpenMapManager={() => setIsMapManagerOpen(true)}
      />

      {/* Main Tab View */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'map' && (
          <MapPlotter
            pins={pins}
            categories={categories}
            activeMap={activeMap}
            onUploadMapFile={handleUploadNewMap}
            onOpenPinModal={(coords) => {
              setPendingCoords(coords);
              setEditingPin(null);
              setIsPinModalOpen(true);
            }}
            onEditPin={(pin) => {
              setEditingPin(pin);
              setIsPinModalOpen(true);
            }}
            onDeletePin={handleDeletePin}
            onSolveForPin={handleSolveForPin}
            selectedPinId={selectedPinId}
            onSelectPin={(pin) => setSelectedPinId(pin ? pin.id : null)}
            onOpenMapManager={() => setIsMapManagerOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            pins={pins}
            categories={categories}
            activeMap={activeMap}
            mapsList={mapsList}
            onSelectMap={handleSelectMap}
            onLocatePinOnMap={handleLocatePinOnMap}
            onEditPin={(pin) => {
              setEditingPin(pin);
              setIsPinModalOpen(true);
            }}
            onDeletePin={handleDeletePin}
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            onDeleteCategory={handleDeleteCategory}
            onImportData={handleImportData}
            onSwitchToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'solver' && (
          <Solver
            pins={pins}
            activeMap={activeMap}
            onLocatePinOnMap={handleLocatePinOnMap}
            initialPinForSolve={initialPinForSolve}
          />
        )}
      </main>

      {/* Pin Creation / Edit Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingCoords(null);
          setEditingPin(null);
        }}
        onSave={handleSavePin}
        initialCoords={pendingCoords || undefined}
        categories={categories}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onQuickCreateCategory={(name, color, icon) =>
          handleSaveCategory({ name, color, icon })
        }
        editingPin={editingPin}
        mapId={activeMap.id}
      />

      {/* Category Creation Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />

      {/* Map Switcher & Manager Modal */}
      <MapManagerModal
        isOpen={isMapManagerOpen}
        onClose={() => setIsMapManagerOpen(false)}
        maps={mapsList}
        activeMapId={activeMap.id}
        onSelectMap={handleSelectMap}
        onUploadNewMap={handleUploadNewMap}
        onDeleteMap={handleDeleteMap}
        pins={pins}
        isUploadingMap={isUploadingMap}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onAccountLogin={handleAccountLogin}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
