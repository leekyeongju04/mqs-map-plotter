import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
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
  googleProvider,
  signInWithPopup,
  signOut,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { Pin, Category, MapData } from './types';
import {
  getLocalPins,
  saveLocalPins,
  getLocalCategories,
  saveLocalCategories,
  DEFAULT_CATEGORIES,
  getSavedMapMeta,
  saveSavedMapMeta,
  getCustomMapImage,
  saveCustomMapImage,
} from './utils/storage';
import { Header } from './components/Header';
import { MapPlotter } from './components/MapPlotter';
import { Dashboard } from './components/Dashboard';
import { Solver } from './components/Solver';
import { PinModal } from './components/PinModal';
import { CategoryModal } from './components/CategoryModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'dashboard' | 'solver'>('map');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Pins & Categories state
  const [pins, setPins] = useState<Pin[]>(() => getLocalPins());
  const [categories, setCategories] = useState<Category[]>(() => getLocalCategories());

  // Active Map state - initial starts as Wingfril Island Beach, loaded from IndexedDB if saved
  const [activeMap, setActiveMap] = useState<MapData>({
    id: 'wingfril-island',
    name: 'Wingfril Island Beach',
    url: '',
    width: 2048,
    height: 2048,
    isCustom: false,
  });

  // Restore saved map from IndexedDB on startup
  useEffect(() => {
    async function restoreMap() {
      const meta = getSavedMapMeta();
      if (meta) {
        const dataUrl = await getCustomMapImage(meta.id);
        if (dataUrl) {
          setActiveMap({
            ...meta,
            url: dataUrl,
          });
        }
      }
    }
    restoreMap();
  }, []);

  // Modal states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore when user is authenticated
  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.uid;
    const pinsPath = `users/${userId}/pins`;
    const categoriesPath = `users/${userId}/categories`;

    // 1. Sync Pins from Firestore
    const unsubPins = onSnapshot(
      collection(db, 'users', userId, 'pins'),
      (snapshot) => {
        const cloudPins: Pin[] = [];
        snapshot.forEach((docSnap) => {
          cloudPins.push(docSnap.data() as Pin);
        });

        if (cloudPins.length > 0) {
          setPins(cloudPins);
          saveLocalPins(cloudPins);
        } else {
          const localPins = getLocalPins();
          if (localPins.length > 0) {
            localPins.forEach(async (p) => {
              const updatedPin = { ...p, userId };
              try {
                await setDoc(doc(db, 'users', userId, 'pins', updatedPin.id), updatedPin);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `${pinsPath}/${updatedPin.id}`);
              }
            });
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pinsPath);
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
          setCategories(cloudCats);
          saveLocalCategories(cloudCats);
        } else {
          DEFAULT_CATEGORIES.forEach(async (cat) => {
            const userCat = { ...cat, userId };
            try {
              await setDoc(doc(db, 'users', userId, 'categories', userCat.id), userCat);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `${categoriesPath}/${userCat.id}`);
            }
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, categoriesPath);
      }
    );

    return () => {
      unsubPins();
      unsubCats();
    };
  }, [user]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign In failed:', err);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setPins(getLocalPins());
      setCategories(getLocalCategories());
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  // Update Map and store in IndexedDB without compression
  const handleUpdateMap = async (newMap: MapData) => {
    setActiveMap(newMap);
    saveSavedMapMeta({
      id: newMap.id,
      name: newMap.name,
      width: newMap.width,
      height: newMap.height,
      isCustom: newMap.isCustom,
    });
    if (newMap.url) {
      await saveCustomMapImage(newMap.id, newMap.url);
    }
  };

  // Add or Edit Pin
  const handleSavePin = async (
    pinData: Omit<Pin, 'id' | 'createdAt' | 'userId'>,
    pinId?: string
  ) => {
    const userId = user ? user.uid : 'local-guest';
    const now = new Date().toISOString();

    if (pinId) {
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
      const newPin: Pin = {
        ...pinData,
        id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

  // Add Category
  const handleSaveCategory = async (
    catData: Omit<Category, 'id' | 'createdAt' | 'userId'>
  ) => {
    const userId = user ? user.uid : 'local-guest';
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

  // Locate Pin on Map from Dashboard or Solver
  const handleLocatePinOnMap = (pin: Pin) => {
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
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        pinCount={pins.length}
      />

      {/* Main Tab View */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'map' && (
          <MapPlotter
            pins={pins}
            categories={categories}
            activeMap={activeMap}
            onUpdateMap={handleUpdateMap}
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
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            pins={pins}
            categories={categories}
            activeMap={activeMap}
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
        editingPin={editingPin}
        mapId={activeMap.id}
      />

      {/* Category Creation Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
