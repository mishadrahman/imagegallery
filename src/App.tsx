import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GalleryView } from './components/GalleryView';
import { BulkUploadStudio } from './components/BulkUploadStudio';
import { AlbumsView } from './components/AlbumsView';
import { SyncHub } from './components/SyncHub';
import { LightboxModal } from './components/LightboxModal';
import { GalleryImage } from './types';
import { 
  subscribeToGalleryImages, 
  updateImageDetails, 
  deleteGalleryImage, 
  batchDeleteGalleryImages,
  getLocalCache 
} from './services/firebase';
import { deleteTelegramMessage } from './services/telegramService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload' | 'albums' | 'sync'>('gallery');
  const [images, setImages] = useState<GalleryImage[]>(() => getLocalCache());
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Lightbox modal state
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    setIsSyncing(true);
    const unsubscribe = subscribeToGalleryImages(
      (updatedImages) => {
        setImages(updatedImages);
        setIsSyncing(false);
      },
      (err) => {
        console.warn('Firestore sync error, running with local cache fallback:', err);
        setIsSyncing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute unique albums
  const existingAlbums = Array.from(
    new Set(images.map((img) => img.album).filter(Boolean))
  );
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
        prev.map((img) => (img.id === id ? { ...img, isFavorite: !current } : img))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteImage = async (id: string, tgMessageId?: number) => {
    try {
      // Optimistically update UI and local state immediately
      setImages((prev) => prev.filter((img) => img.id !== id));
      
      // Delete from Firestore & local storage
      await deleteGalleryImage(id);
      
      // Clean up message from Telegram channel if ID exists
      if (tgMessageId) {
        deleteTelegramMessage(tgMessageId).catch((e) =>
          console.warn('Telegram channel message deletion skipped/failed:', e)
        );
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      const idSet = new Set(ids);
      const itemsToDelete = images.filter((img) => idSet.has(img.id));

      // Optimistically update UI and local state immediately
      setImages((prev) => prev.filter((img) => !idSet.has(img.id)));

      // Delete in batch from Firestore & local storage
      await batchDeleteGalleryImages(ids);

      // Clean up from Telegram channel
      itemsToDelete.forEach((img) => {
        if (img.telegramMessageId) {
          deleteTelegramMessage(img.telegramMessageId).catch(() => {});
        }
      });
    } catch (err) {
      console.error('Failed to batch delete images:', err);
    }
  };

  const handleUploadSuccess = (newImages: GalleryImage[]) => {
    setImages((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const filteredNew = newImages.filter((i) => !existingIds.has(i.id));
      return [...filteredNew, ...prev];
    });
    // Switch to gallery view to preview the new photos
    setActiveTab('gallery');
  };

  const handleSelectAlbumFromView = (albumName: string) => {
    setSelectedAlbum(albumName);
    setActiveTab('gallery');
  };

  const handleSwitchToUploadWithAlbum = (albumName?: string) => {
    setActiveTab('upload');
  };

  const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      
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
        
        {activeTab === 'gallery' && (
          <GalleryView
            images={images}
            selectedAlbum={selectedAlbum}
            setSelectedAlbum={setSelectedAlbum}
            onOpenLightbox={handleOpenLightbox}
            onToggleFavorite={handleToggleFavorite}
            onDeleteImage={handleDeleteImage}
            onBatchDelete={handleBatchDelete}
            searchQuery={searchQuery}
            onSwitchToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'upload' && (
          <BulkUploadStudio
            existingAlbums={existingAlbums}
            onUploadSuccess={handleUploadSuccess}
            onGoToGallery={() => setActiveTab('gallery')}
          />
        )}

        {activeTab === 'albums' && (
          <AlbumsView
            images={images}
            onSelectAlbum={handleSelectAlbumFromView}
            onSwitchToUpload={handleSwitchToUploadWithAlbum}
          />
        )}

        {activeTab === 'sync' && (
          <SyncHub
            totalImages={images.length}
            totalSize={totalSize}
          />
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
            CloudPic Personal Gallery • Powered by Telegram Cloud & Firebase Firestore
          </p>
          <div className="flex items-center gap-4 text-neutral-400">
            <button 
              onClick={() => setActiveTab('sync')} 
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
  );
}
