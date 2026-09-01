import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Layers, 
  Tag, 
  Camera, 
  Share2, 
  Check, 
  Image as ImageIcon, 
  ArrowRight,
  FolderPlus,
  RefreshCw,
  Copy,
  Folder,
  Zap,
  Smartphone,
  SlidersHorizontal,
  HardDrive
} from 'lucide-react';
import { UploadQueueItem, GalleryImage } from '../types';
import { saveGalleryImage } from '../services/firebase';
import { uploadImageToTelegram } from '../services/telegramService';
import { compressImage, CompressionQuality } from '../utils/imageCompressor';

interface BulkUploadStudioProps {
  existingAlbums: string[];
  onUploadSuccess: (newImages: GalleryImage[]) => void;
  onGoToGallery: () => void;
}

export const BulkUploadStudio: React.FC<BulkUploadStudioProps> = ({
  existingAlbums,
  onUploadSuccess,
  onGoToGallery,
}) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [batchAlbum, setBatchAlbum] = useState<string>('Personal');
  const [newAlbumInput, setNewAlbumInput] = useState<string>('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState<boolean>(false);
  const [batchTags, setBatchTags] = useState<string>('Personal');
  const [compressionMode, setCompressionMode] = useState<CompressionQuality>('smart');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Listen for clipboard paste events for quick image pasting
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        addFilesToQueue(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [batchAlbum, batchTags, compressionMode]);

  const addFilesToQueue = async (files: FileList | File[]) => {
    setIsOptimizing(true);
    const rawFiles = Array.from(files);

    const initialItems: UploadQueueItem[] = rawFiles.map((file) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const formattedTitle = nameWithoutExt
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: formattedTitle || 'My Photo',
        caption: '',
        album: batchAlbum,
        tags: batchTags.split(',').map((t) => t.trim()).filter(Boolean),
        status: 'idle',
        progress: 0,
        originalSize: file.size,
      };
    });

    setQueue((prev) => [...prev, ...initialItems]);

    // Asynchronously optimize image files to save MBs & bandwidth
    for (let i = 0; i < initialItems.length; i++) {
      const item = initialItems[i];
      try {
        const comp = await compressImage(item.file, compressionMode);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  file: comp.file,
                  optimizedSize: comp.compressedSize,
                  savedPercent: comp.savedPercent,
                  previewUrl: comp.thumbnailBase64 || q.previewUrl,
                }
              : q
          )
        );
      } catch (err) {
        console.warn('Compression skipped for item:', item.title, err);
      }
    }
    setIsOptimizing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<Pick<UploadQueueItem, 'title' | 'caption' | 'album' | 'tags'>>
  ) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleApplyPresetToAll = () => {
    const targetTags = batchTags.split(',').map((t) => t.trim()).filter(Boolean);
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        album: batchAlbum,
        tags: targetTags,
      }))
    );
  };

  // Upload single item to Telegram -> Firestore
  const uploadSingleItem = async (item: UploadQueueItem): Promise<GalleryImage> => {
    // Update item to uploading state
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q
      )
    );

    const imageDoc = await uploadImageToTelegram(item.file, {
      title: item.title,
      caption: item.caption,
      album: item.album,
      tags: item.tags,
    });

    // Attach client-side micro-thumbnail (LQIP) and size savings if present
    if (item.previewUrl && item.previewUrl.startsWith('data:image')) {
      imageDoc.microThumbnail = item.previewUrl;
    }
    if (item.originalSize) {
      imageDoc.originalFileSize = item.originalSize;
    }
    if (item.savedPercent) {
      imageDoc.savedPercent = item.savedPercent;
    }

    // Save record to Firestore for permanent persistence
    await saveGalleryImage(imageDoc);

    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? { ...q, status: 'success', progress: 100, resultImage: imageDoc }
          : q
      )
    );

    return imageDoc;
  };

  // Batch upload handler with concurrency pool
  const handleStartBulkUpload = async () => {
    const pendingItems = queue.filter(
      (item) => item.status === 'idle' || item.status === 'error'
    );
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    const uploadedImages: GalleryImage[] = [];

    // Concurrent pool worker of 3 items at a time
    const CONCURRENCY = 3;
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < pendingItems.length) {
        const item = pendingItems[currentIndex++];
        try {
          const result = await uploadSingleItem(item);
          uploadedImages.push(result);
        } catch (err: any) {
          console.error(`Error uploading item ${item.title}:`, err);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'error', error: err.message || 'Upload failed' }
                : q
            )
          );
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, pendingItems.length) },
      () => worker()
    );
    await Promise.all(workers);

    setIsUploading(false);

    if (uploadedImages.length > 0) {
      onUploadSuccess(uploadedImages);
    }
  };

  const handleClearFinished = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'success'));
  };

  const handleClearAll = () => {
    setQueue([]);
  };

  const pendingCount = queue.filter(
    (i) => i.status === 'idle' || i.status === 'error'
  ).length;
  const successCount = queue.filter((i) => i.status === 'success').length;
  const uploadingCount = queue.filter((i) => i.status === 'uploading').length;

  const defaultAlbums = ['Personal', 'Family', 'Friends', 'Travel', 'Portraits', 'Events', 'Work'];
  const allAvailableAlbums = Array.from(new Set([...defaultAlbums, ...existingAlbums]));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold uppercase tracking-wider">
              Bulk Photo Uploader
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
            Add Your Personal Photos
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Photos are saved permanently to your Telegram Cloud Channel and synced to Firestore.
          </p>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            {successCount > 0 && (
              <button
                onClick={handleClearFinished}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-all border border-neutral-700/50"
              >
                Clear Done ({successCount})
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/60'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-xl shadow-indigo-500/10">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
              Select or Drop Photos
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Supports JPEG, PNG, WEBP, HEIC, GIF • Upload 100+ images in parallel
            </p>
          </div>

          {/* Action Buttons for Mobile & Desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Choose Photos from Device</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold border border-neutral-700 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Take Photo (Camera)</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 hidden sm:block">
            Tip: You can also press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-300 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste copied images.
          </p>
        </div>
      </div>

      {/* Batch Configuration Preset Panel */}
      <div className="bg-neutral-900/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-800 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-200">
              Batch Album & Tag Presets
            </h3>
          </div>
          {queue.length > 0 && (
            <button
              onClick={handleApplyPresetToAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Apply Preset to All ({queue.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Target Album Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-neutral-500" />
              <span>Target Album for new items:</span>
            </label>

            {!isCreatingAlbum ? (
              <div className="flex items-center gap-2">
                <select
                  value={batchAlbum}
                  onChange={(e) => setBatchAlbum(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                >
                  {allAvailableAlbums.map((alb) => (
                    <option key={alb} value={alb}>
                      📁 {alb}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingAlbum(true)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-xl border border-neutral-700 whitespace-nowrap transition-colors"
                >
                  + New Album
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New album name..."
                  value={newAlbumInput}
                  onChange={(e) => setNewAlbumInput(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-indigo-500 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAlbumInput.trim()) {
                      setBatchAlbum(newAlbumInput.trim());
                      setIsCreatingAlbum(false);
                      setNewAlbumInput('');
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingAlbum(false)}
                  className="px-2.5 py-2 text-neutral-400 hover:text-neutral-200 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Batch Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              <span>Default Tags (comma separated):</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2026, Birthday, Vacation, Portrait"
              value={batchTags}
              onChange={(e) => setBatchTags(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

        </div>

        {/* Smart Compression & Data Saver Bar */}
        <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-neutral-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">
                Bandwidth & Speed Optimizer (স্মার্ট কম্প্রেশন)
              </div>
              <div className="text-[10px] text-neutral-400">
                স্বয়ংক্রিয়ভাবে 70-90% এমবি সাশ্রয় করে এবং ব্রাউজারে নিমিষে লোড করায়।
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setCompressionMode('smart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                compressionMode === 'smart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Best balance: Crystal clear quality + 85% size reduction"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Smart (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setCompressionMode('saver')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                compressionMode === 'saver'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Mobile Data Saver: Ultra fast upload, ~150KB per photo"
            >
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>Data Saver</span>
            </button>

            <button
              type="button"
              onClick={() => setCompressionMode('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                compressionMode === 'original'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Keep full uncompressed original size (larger file size)"
            >
              <HardDrive className="w-3 h-3 text-neutral-400" />
              <span>Original</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Queue Section */}
      {queue.length > 0 && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Upload Queue ({queue.length})
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-medium">
                    {pendingCount} Pending
                  </span>
                )}
                {uploadingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {uploadingCount} Uploading
                  </span>
                )}
                {successCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-medium">
                    {successCount} Finished
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleStartBulkUpload}
              disabled={isUploading || pendingCount === 0 || isOptimizing}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing {pendingCount} Photos...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Upload ({pendingCount} Photos)</span>
                </>
              )}
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="bg-neutral-900/70 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col group hover:border-neutral-700 transition-all"
              >
                {/* Preview Thumbnail */}
                <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                  <img
                    src={item.previewUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Status Overlay Badge */}
                  <div className="absolute top-2 left-2">
                    {item.status === 'idle' && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md text-[10px] text-neutral-300 font-medium border border-neutral-700">
                        Ready
                      </span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 border border-indigo-400/30">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Uploading
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 border border-emerald-400/30">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Saved
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 border border-rose-400/30">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Error
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  {item.status !== 'uploading' && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-900/80 backdrop-blur-md text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Photo Title"
                        value={item.title}
                        disabled={item.status === 'uploading'}
                        onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                        className="w-full bg-neutral-950/80 border border-neutral-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={item.album}
                        disabled={item.status === 'uploading'}
                        onChange={(e) => handleUpdateItem(item.id, { album: e.target.value })}
                        className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg px-2 py-1 text-[11px] text-neutral-300 focus:outline-none focus:border-indigo-500"
                      >
                        {allAvailableAlbums.map((alb) => (
                          <option key={alb} value={alb}>
                            {alb}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Tags..."
                        value={item.tags.join(', ')}
                        disabled={item.status === 'uploading'}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg px-2 py-1 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Item Footer */}
                  <div className="pt-1 border-t border-neutral-800/50 flex items-center justify-between text-[10px] text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <span>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      {item.savedPercent && item.savedPercent > 0 ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[9px]">
                          -{item.savedPercent}%
                        </span>
                      ) : null}
                    </div>

                    {item.status === 'success' && item.resultImage && (
                      <button
                        onClick={onGoToGallery}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                      >
                        <span>View in Gallery</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={async () => {
                          try {
                            const img = await uploadSingleItem(item);
                            onUploadSuccess([img]);
                          } catch (e: any) {
                            console.error("Retry failed:", e);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 font-semibold underline"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* Floating Sticky Bottom Mobile Upload Bar */}
      {queue.length > 0 && pendingCount > 0 && (
        <div className="fixed bottom-16 md:hidden left-0 right-0 p-3 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 z-20 shadow-2xl">
          <button
            onClick={handleStartBulkUpload}
            disabled={isUploading || isOptimizing}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading {uploadingCount || pendingCount} Photos...</span>
              </>
            ) : isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compressing...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Start Upload ({pendingCount} Photos)</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
};
