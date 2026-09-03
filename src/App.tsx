import React, { useState, useEffect } from "react";
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
  subscribeToAlbums,
  saveAlbum,
  auth,
} from "./services/firebase";
import { deleteTelegramMessage } from "./services/telegramService";
import { AuthScreen } from "./components/AuthScreen";
import { onAuthStateChanged, User, signOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "gallery" | "upload" | "albums" | "sync"
  >("gallery");
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [images, setImages] = useState<GalleryImage[]>(() => getLocalCache());
  const [persistentAlbums, setPersistentAlbums] = useState<string[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
          err,
        );
        setIsSyncing(false);
      },
    );

    const unsubscribeAlbums = subscribeToAlbums((updatedAlbums) => {
      setPersistentAlbums(updatedAlbums);
    });

    return () => {
      unsubscribeImages();
      unsubscribeAlbums();
      unsubscribeAuth();
    };
  }, []);

  // Compute unique albums
  const existingAlbums = Array.from(
    new Set([
      ...persistentAlbums,
      ...images.map((img) => img.album).filter(Boolean),
    ]),
  ).sort();
  const totalAlbums = existingAlbums.length || 1;

  // Handlers
  const handleOpenLightbox = (image: GalleryImage, index: number) => {
    // Determine the index in the current images array
    const realIndex = images.findIndex((i) => i.id === image.id);
    setLightboxIndex(realIndex >= 0 ? realIndex : index);
    setLightboxOpen(true);
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await updateImageDetails(id, { isFavorite: !current });
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, isFavorite: !current } : img,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      // Optimistically update UI and local state immediately
      setImages((prev) => prev.filter((img) => img.id !== id));

      // Delete from Firestore & local storage (Telegram media remains safe in channel)
      await deleteGalleryImage(id);
    } catch (err) {
      console.error("Failed to delete image from Firebase:", err);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      const idSet = new Set(ids);

      // Optimistically update UI and local state immediately
      setImages((prev) => prev.filter((img) => !idSet.has(img.id)));

      // Delete in batch from Firestore & local storage (Telegram media remains safe in channel)
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
    // Switch to gallery view to preview the new photos
    setActiveTab("gallery");
  };

  const handleSelectAlbumFromView = (albumName: string) => {
    setSelectedAlbum(albumName);
    setActiveTab("gallery");
  };

  const handleSwitchToUploadWithAlbum = (albumName?: string) => {
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
    return <AuthScreen images={images} />;
  }

  return (
    <div className="min-h-screen text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white relative bg-neutral-950">
      <AnimatePresence>
        {showSplash && (
          <LoadingSplash
            images={images}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Top Header Navigation */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalImages={images.length}
          totalAlbums={totalAlbums}
          isSyncing={isSyncing}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "gallery" && (
            <GalleryView
              images={images}
              selectedAlbum={selectedAlbum}
              setSelectedAlbum={setSelectedAlbum}
              onOpenLightbox={handleOpenLightbox}
              onToggleFavorite={handleToggleFavorite}
              onDeleteImage={handleDeleteImage}
              onBatchDelete={handleBatchDelete}
              searchQuery={searchQuery}
              onSwitchToUpload={() => setActiveTab("upload")}
            />
          )}

          {activeTab === "upload" && (
            <BulkUploadStudio
              existingAlbums={existingAlbums}
              onUploadSuccess={handleUploadSuccess}
              onGoToGallery={() => setActiveTab("gallery")}
            />
          )}

          {activeTab === "albums" && (
            <AlbumsView
              images={images}
              existingAlbums={existingAlbums}
              onSelectAlbum={handleSelectAlbumFromView}
              onSwitchToUpload={handleSwitchToUploadWithAlbum}
            />
          )}

          {activeTab === "sync" && (
            <SyncHub totalImages={images.length} totalSize={totalSize} />
          )}
        </main>

        {/* Lightbox / Fullscreen Viewer */}
        {lightboxOpen && images.length > 0 && (
          <LightboxModal
            images={images}
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
                onClick={() => setActiveTab("sync")}
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
