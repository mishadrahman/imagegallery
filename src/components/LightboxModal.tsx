import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Copy, 
  Heart, 
  Trash2, 
  Info, 
  Edit3, 
  Check, 
  Calendar, 
  Tag, 
  Folder
} from 'lucide-react';
import { GalleryImage } from '../types';
import { updateImageDetails, saveAlbum } from '../services/firebase';
import { resolveImageUrl } from '../services/telegramService';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface LightboxModalProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onDeleteImage: (id: string, tgMessageId?: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
  onToggleFavorite,
  onDeleteImage,
}) => {
  const currentImage = images[currentIndex];

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isSlideshow, setIsSlideshow] = useState<boolean>(false);
  const [slideshowInterval] = useState<number>(4000);
  const [showInfoDrawer, setShowInfoDrawer] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedFileId, setCopiedFileId] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [fullImgLoaded, setFullImgLoaded] = useState<boolean>(false);

  // Touch swipe state for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCaption, setEditCaption] = useState<string>('');
  const [editAlbum, setEditAlbum] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync edit state when image changes
  useEffect(() => {
    if (currentImage) {
      setEditTitle(currentImage.title || '');
      setEditCaption(currentImage.caption || '');
      setEditAlbum(currentImage.album || '');
      setEditTags(currentImage.tags?.join(', ') || '');
      setZoom(1);
      setRotation(0);
      setFullImgLoaded(false);
    }
  }, [currentIndex, currentImage]);

  // Slideshow timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSlideshow && images.length > 1) {
      timer = setInterval(() => {
        onChangeIndex((currentIndex + 1) % images.length);
      }, slideshowInterval);
    }
    return () => clearInterval(timer);
  }, [isSlideshow, currentIndex, images.length, slideshowInterval, onChangeIndex]);

  // Mutable ref for onClose to avoid re-triggering effect
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle safe closing (pops state if we are in lightbox history state)
  const handleSafeClose = useCallback(() => {
    if (window.history.state?.lightboxOpen) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') {
        handleSafeClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) onChangeIndex(currentIndex - 1);
        else onChangeIndex(images.length - 1);
      } else if (e.key === 'ArrowRight') {
        onChangeIndex((currentIndex + 1) % images.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsSlideshow((prev) => !prev);
      }
    },
    [isEditing, currentIndex, images.length, onChangeIndex, handleSafeClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle mobile/hardware back button
  useEffect(() => {
    // Only push state if we haven't already (handles React 18 StrictMode double mount)
    if (!window.history.state?.lightboxOpen) {
      window.history.pushState({ lightboxOpen: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      // If we navigated back to a state that is NOT the lightbox, we close it
      if (!e.state?.lightboxOpen) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // DO NOT call history.back() here. It causes race conditions in StrictMode.
      // We handle popping history on deliberate UI closes via `handleSafeClose`.
    };
  }, []); // Run only once on mount

  if (!currentImage) return null;

  const handleNext = () => {
    onChangeIndex((currentIndex + 1) % images.length);
  };

  const handlePrev = () => {
    if (currentIndex > 0) onChangeIndex(currentIndex - 1);
    else onChangeIndex(images.length - 1);
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleCopyLink = async () => {
    const fullLink = `${window.location.origin}${currentImage.directUrl}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyFileId = async () => {
    try {
      await navigator.clipboard.writeText(currentImage.fileId);
      setCopiedFileId(true);
      setTimeout(() => setCopiedFileId(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const tagsArray = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const finalAlbum = editAlbum.trim() || '';
      await updateImageDetails(currentImage.id, {
        title: editTitle.trim() || 'Untitled',
        caption: editCaption.trim(),
        album: finalAlbum,
        tags: tagsArray,
      });

      if (finalAlbum) {
        await saveAlbum(finalAlbum);
      }

      currentImage.title = editTitle;
      currentImage.caption = editCaption;
      currentImage.album = finalAlbum;
      currentImage.tags = tagsArray;

      setIsEditing(false);
    } catch (err) {
      alert('Failed to save changes to Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = resolveImageUrl(currentImage);
    a.download = `${currentImage.title.replace(/\s+/g, '_') || 'photo'}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        
        {/* Left: Counter & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] sm:text-xs font-mono font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-neutral-900/90 border border-neutral-800 text-neutral-300">
            {currentIndex + 1} / {images.length}
          </span>
          <h3 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {currentImage.title}
          </h3>
        </div>

        {/* Center: Viewer Tools (hidden on small mobile to save space) */}
        <div className="hidden sm:flex items-center gap-1 bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-1 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetTransform}
            className="text-[10px] font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 px-2 py-1 rounded-xl transition-colors"
          >
            Reset
          </button>
          <div className="w-[1px] h-4 bg-neutral-800 mx-0.5" />
          <button
            onClick={() => setIsSlideshow(!isSlideshow)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium transition-all ${
              isSlideshow
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {isSlideshow ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isSlideshow ? 'Pause' : 'Slideshow'}</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleFavorite(currentImage.id, Boolean(currentImage.isFavorite))}
            title={currentImage.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
            className={`p-2 rounded-xl border transition-all ${
              currentImage.isFavorite
                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-rose-400 hover:bg-neutral-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${currentImage.isFavorite ? 'fill-white' : ''}`} />
          </button>

          <button
            onClick={handleDownload}
            title="Download Original"
            className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            title="Photo Details"
            className={`p-2 rounded-xl border transition-colors ${
              showInfoDrawer
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Photo"
            className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSafeClose}
            title="Close (Esc)"
            className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Image Stage */}
      <div className={`relative flex-1 h-full flex items-center justify-center p-2 sm:p-6 transition-all ${
        showInfoDrawer ? 'lg:pr-[360px]' : ''
      }`}>
        
        {/* Navigation Chevron Buttons (Desktop & Tablet) */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              title="Previous Photo"
              className="hidden sm:flex absolute left-3 z-30 p-2.5 sm:p-3 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 text-neutral-300 hover:text-white backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={handleNext}
              title="Next Photo"
              className="hidden sm:flex absolute right-3 lg:right-auto lg:left-[calc(100%-380px)] z-30 p-2.5 sm:p-3 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 text-neutral-300 hover:text-white backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95"
              style={!showInfoDrawer ? { right: '1rem', left: 'auto' } : undefined}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Displayed Image with Progressive Blur-Up */}
        <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden">
          {!fullImgLoaded && (currentImage.microThumbnail || currentImage.thumbnailUrl) && (
            <img
              src={currentImage.microThumbnail || currentImage.thumbnailUrl}
              alt=""
              aria-hidden="true"
              className="absolute max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[88vw] object-contain rounded-xl filter blur-md scale-95 opacity-70 pointer-events-none transition-opacity duration-300"
            />
          )}

          <img
            src={resolveImageUrl(currentImage, 'full')}
            alt={currentImage.title}
            referrerPolicy="no-referrer"
            onLoad={() => setFullImgLoaded(true)}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease-in-out',
            }}
            className={`max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[88vw] object-contain rounded-xl shadow-2xl drop-shadow-2xl ${
              fullImgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

      </div>

      {/* Mobile Swipe Hint Banner */}
      <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-neutral-400 pointer-events-none border border-neutral-800/50">
        Swipe left / right to change photo
      </div>

      {/* Collapsible Info & Metadata Sidebar / Bottom Sheet */}
      {showInfoDrawer && (
        <aside className="fixed top-auto bottom-0 sm:top-0 right-0 sm:bottom-0 z-40 w-full sm:w-[360px] max-h-[85vh] sm:max-h-full bg-neutral-950/98 sm:bg-neutral-950/95 border-t sm:border-t-0 sm:border-l border-neutral-800 shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-y-auto p-4 sm:p-5 rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
          
          <div className="space-y-4 sm:space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white font-['Outfit']">
                  Photo Details
                </h4>
              </div>
              <button
                onClick={() => setShowInfoDrawer(false)}
                className="text-neutral-400 hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Content or Display Mode */}
            {isEditing ? (
              <div className="space-y-3 sm:space-y-4 bg-neutral-900/60 p-3 sm:p-4 rounded-2xl border border-neutral-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-400">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-400">Caption</label>
                  <textarea
                    rows={2}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full text-xs bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-400">Album</label>
                  <input
                    type="text"
                    value={editAlbum}
                    onChange={(e) => setEditAlbum(e.target.value)}
                    className="w-full text-xs bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-400">Tags</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full text-xs bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveDetails}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-['Outfit']">
                      {currentImage.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {currentImage.album && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          {currentImage.album}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500">
                        {new Date(currentImage.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-xl border border-neutral-800 transition-colors"
                    title="Edit Title & Caption"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentImage.caption && (
                  <p className="text-xs text-neutral-300 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80 leading-relaxed">
                    {currentImage.caption}
                  </p>
                )}

                {/* Tags List */}
                {currentImage.tags && currentImage.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                      <Tag className="w-3 h-3 text-indigo-400" />
                      <span>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentImage.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Storage & Metadata Technical Info */}
                <div className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-800/80 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>File Size:</span>
                    <span className="text-neutral-200 font-medium">
                      {formatFileSize(currentImage.fileSize)}
                    </span>
                  </div>

                  {currentImage.width && currentImage.height && (
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Dimensions:</span>
                      <span className="text-neutral-200 font-medium">
                        {currentImage.width} × {currentImage.height} px
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Storage Engine:</span>
                    <span className="text-sky-400 font-medium">Telegram Bot Cloud</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Database:</span>
                    <span className="text-amber-400 font-medium">Firebase Firestore</span>
                  </div>
                </div>

                {/* Direct Links Action */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Direct Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Permanent Image URL</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyFileId}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 text-xs transition-colors"
                  >
                    {copiedFileId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">File ID Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Telegram File ID</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Delete Danger Zone */}
          <div className="pt-4 mt-4 border-t border-neutral-800/80">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Photo</span>
            </button>
          </div>

        </aside>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        imagesToDelete={[currentImage]}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await onDeleteImage(currentImage.id, currentImage.telegramMessageId);
          onClose();
        }}
      />

    </div>
  );
};
