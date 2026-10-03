import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { GalleryView } from "./components/GalleryView";
import { BulkUploadStudio } from "./components/BulkUploadStudio";
import { AlbumsView } from "./components/AlbumsView";
import { SyncHub } from "./components/SyncHub";
import { LightboxModal } from "./components/LightboxModal";
import { LoadingSplash } from "./components/LoadingSplash";
import { AnimatePresence } from "motion/react";
import { GalleryImage } from "./types";
import {
  subscribeToGalleryImages,
  updateImageDetails,
  deleteGalleryImage,
  batchDeleteGalleryImages,
  getLocalCache,
  getLockedAlbumsCache,
  subscribeToAlbums,
  setAlbumLock,
  removeAlbumLock,
  verifyEmailAuthorized,
  ensureAllowedEmailInFirestore,
  OWNER_ALLOWED_EMAIL,
  auth,
} from "./services/firebase";
import { AuthScreen } from "./components/AuthScreen";
import { onAuthStateChanged, User, signOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authDeniedError, setAuthDeniedError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "gallery" | "upload" | "albums" | "sync"
  >("gallery");
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [images, setImages] = useState<GalleryImage[]>(() => getLocalCache());
  const [persistentAlbums, setPersistentAlbums] = useState<string[]>([]);
  const [lockedAlbums, setLockedAlbums] = useState<Record<string, string>>(() =>
    getLockedAlbumsCache()
  );
  const [unlockedInSession, setUnlockedInSession] = useState<Set<string>>(
    new Set()
  );
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxList, setLightboxList] = useState<GalleryImage[]>([]);

  // Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    // Ensure owner Gmail is persisted in Firestore security config
    ensureAllowedEmailInFirestore().catch(() => {});

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const cleanEmail = (currentUser.email || "").trim().toLowerCase();
        const isAuthorized =
          cleanEmail === OWNER_ALLOWED_EMAIL &&
          (await verifyEmailAuthorized(cleanEmail));

        if (!isAuthorized) {
          setAuthDeniedError(
            "Access Denied! শুধুমাত্র অনুমোদিত জিমেইল দিয়ে লগইন করা যাবে। অন্য কোনো ইমেইল দিয়ে প্রবেশাধিকার নেই।"
          );
          setUser(null);
          setAuthLoading(false);
          await signOut(auth).catch(() => {});
          return;
        }

        setAuthDeniedError("");
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    setIsSyncing(true);
    const unsubscribeImages = subscribeToGalleryImages(
      (updatedImages) => {
        setImages(updatedImages);
        setIsSyncing(false);
      },
      (err) => {
        console.warn(
          "Firestore sync error, running with local cache fallback:",
          err
        );
        setIsSyncing(false);
      }
    );

    const unsubscribeAlbums = subscribeToAlbums(
      (updatedAlbums, updatedLockedMap) => {
        setPersistentAlbums(updatedAlbums);
        setLockedAlbums(updatedLockedMap);
      }
    );

    return () => {
      unsubscribeImages();
      unsubscribeAlbums();
      unsubscribeAuth();
    };
  }, []);

  // Compute public images (excluding any image in a locked album)
  const publicImages = useMemo(() => {
    return images.filter((img) => {
      const albKey = (img.album || "").trim().toLowerCase();
      return !(albKey && lockedAlbums[albKey]);
    });
  }, [images, lockedAlbums]);

  // Compute unique albums
  const existingAlbums = useMemo(() => {
    return Array.from(
      new Set([
        ...persistentAlbums,
        ...images.map((img) => img.album).filter(Boolean),
      ])
    ).sort();
  }, [persistentAlbums, images]);

  const totalAlbums = existingAlbums.length || 1;

  // Album selection handler that auto-relocks when navigating away from a locked album
  const handleSelectAlbum = (albumName: string) => {
    const nextKey = albumName.trim().toLowerCase();
    setUnlockedInSession((prev) => {
      // Keep only the target album unlocked if we are entering it; otherwise relock all
      if (lockedAlbums[nextKey] && prev.has(nextKey)) {
        return new Set([nextKey]);
      }
      return new Set();
    });
    setSelectedAlbum(albumName);
  };

  const handleTabChange = (tab: "gallery" | "upload" | "albums" | "sync") => {
    if (tab !== "gallery") {
      // Auto-lock any unlocked album when leaving gallery tab for maximum privacy
      setUnlockedInSession(new Set());
      if (
        selectedAlbum !== "all" &&
        selectedAlbum !== "favorites" &&
        lockedAlbums[selectedAlbum.trim().toLowerCase()]
      ) {
        setSelectedAlbum("all");
      }
    }
    setActiveTab(tab);
  };

  // Lock & Unlock Handlers
  const handleLockAlbum = async (albumName: string, password: string) => {
    const hash = await setAlbumLock(albumName, password);
    const key = albumName.trim().toLowerCase();
    setLockedAlbums((prev) => ({ ...prev, [key]: hash }));
    // Lock it immediately and return to All Photos if we were inside it
    setUnlockedInSession((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (selectedAlbum.trim().toLowerCase() === key) {
      setSelectedAlbum("all");
    }
  };

  const handleUnlockAlbumPermanently = async (albumName: string) => {
    await removeAlbumLock(albumName);
    const key = albumName.trim().toLowerCase();
    setLockedAlbums((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setUnlockedInSession((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleUnlockAlbumSession = (albumName: string) => {
    const key = albumName.trim().toLowerCase();
    setUnlockedInSession(new Set([key]));
  };

  const handleRelockAlbumSession = (albumName: string) => {
    const key = albumName.trim().toLowerCase();
    setUnlockedInSession((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Handlers
  const handleOpenLightbox = (
    image: GalleryImage,
    index: number,
    currentList: GalleryImage[]
  ) => {
    const listToUse = currentList.length > 0 ? currentList : publicImages;
    const realIndex = listToUse.findIndex((i) => i.id === image.id);
    setLightboxList(listToUse);
    setLightboxIndex(realIndex >= 0 ? realIndex : index);
    setLightboxOpen(true);
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await updateImageDetails(id, { isFavorite: !current });
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, isFavorite: !current } : img
        )
      );
      setLightboxList((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, isFavorite: !current } : img
        )
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      setImages((prev) => prev.filter((img) => img.id !== id));
      setLightboxList((prev) => prev.filter((img) => img.id !== id));
      await deleteGalleryImage(id);
    } catch (err) {
      console.error("Failed to delete image from Firebase:", err);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      const idSet = new Set(ids);
      setImages((prev) => prev.filter((img) => !idSet.has(img.id)));
      setLightboxList((prev) => prev.filter((img) => !idSet.has(img.id)));
      await batchDeleteGalleryImages(ids);
    } catch (err) {
      console.error("Failed to batch delete images from Firebase:", err);
    }
  };

  const handleUploadSuccess = (newImages: GalleryImage[]) => {
    setImages((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const filteredNew = newImages.filter((i) => !existingIds.has(i.id));
      return [...filteredNew, ...prev];
    });
    setActiveTab("gallery");
  };

  const handleSelectAlbumFromView = (albumName: string) => {
    handleSelectAlbum(albumName);
    setActiveTab("gallery");
  };

  const handleOpenLockedAlbumFromView = (albumName: string) => {
    const key = albumName.trim().toLowerCase();
    setUnlockedInSession(new Set([key]));
    setSelectedAlbum(albumName);
    setActiveTab("gallery");
  };

  const handleSwitchToUploadWithAlbum = () => {
    setActiveTab("upload");
  };

  const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen images={publicImages} externalError={authDeniedError} />;
  }

  return (
    <div className="min-h-screen text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white relative bg-neutral-950">
      <AnimatePresence>
        {showSplash && (
          <LoadingSplash
            images={publicImages}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Top Header Navigation */}
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalImages={publicImages.length}
          totalAlbums={totalAlbums}
          isSyncing={isSyncing}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "gallery" && (
            <GalleryView
              images={images}
              existingAlbums={existingAlbums}
              lockedAlbums={lockedAlbums}
              unlockedInSession={unlockedInSession}
              selectedAlbum={selectedAlbum}
              setSelectedAlbum={handleSelectAlbum}
              onUnlockAlbumSession={handleUnlockAlbumSession}
              onRelockAlbumSession={handleRelockAlbumSession}
              onLockAlbum={handleLockAlbum}
              onUnlockAlbumPermanently={handleUnlockAlbumPermanently}
              onOpenLightbox={handleOpenLightbox}
              onToggleFavorite={handleToggleFavorite}
              onDeleteImage={handleDeleteImage}
              onBatchDelete={handleBatchDelete}
              searchQuery={searchQuery}
              onSwitchToUpload={() => handleTabChange("upload")}
            />
          )}

          {activeTab === "upload" && (
            <BulkUploadStudio
              existingAlbums={existingAlbums}
              onUploadSuccess={handleUploadSuccess}
              onGoToGallery={() => handleTabChange("gallery")}
            />
          )}

          {activeTab === "albums" && (
            <AlbumsView
              images={images}
              existingAlbums={existingAlbums}
              lockedAlbums={lockedAlbums}
              onSelectAlbum={handleSelectAlbumFromView}
              onOpenLockedAlbum={handleOpenLockedAlbumFromView}
              onLockAlbum={handleLockAlbum}
              onUnlockAlbumPermanently={handleUnlockAlbumPermanently}
              onSwitchToUpload={handleSwitchToUploadWithAlbum}
            />
          )}

          {activeTab === "sync" && (
            <SyncHub totalImages={images.length} totalSize={totalSize} />
          )}
        </main>

        {/* Lightbox / Fullscreen Viewer (Scoped strictly to active visible list) */}
        {lightboxOpen && lightboxList.length > 0 && (
          <LightboxModal
            images={lightboxList}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onChangeIndex={(idx) => setLightboxIndex(idx)}
            onToggleFavorite={handleToggleFavorite}
            onDeleteImage={handleDeleteImage}
          />
        )}

        {/* Footer */}
        <footer className="border-t border-neutral-900 bg-neutral-950 py-6 mt-12 text-center text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              CloudPic Personal Gallery • Powered by Telegram Cloud & Firebase
              Firestore
            </p>
            <div className="flex items-center gap-4 text-neutral-400">
              <button
                onClick={() => handleTabChange("sync")}
                className="hover:text-indigo-400 transition-colors"
              >
                Storage Status
              </button>
              <span>•</span>
              <a
                href="https://t.me/+V3OkDk0rM_82MmRl"
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-400 transition-colors"
              >
                Telegram Channel
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
