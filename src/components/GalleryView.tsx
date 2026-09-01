import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  Share2, 
  Trash2, 
  Maximize2, 
  Check, 
  LayoutGrid, 
  Columns3, 
  List, 
  Folder, 
  CheckSquare, 
  Square, 
  Sparkles,
  Info
} from 'lucide-react';
import { GalleryImage, ViewMode, SortOption } from '../types';
import { resolveImageUrl } from '../services/telegramService';

interface GalleryViewProps {
  images: GalleryImage[];
  selectedAlbum: string;
  setSelectedAlbum: (album: string) => void;
  onOpenLightbox: (image: GalleryImage, index: number) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onDeleteImage: (id: string, tgMessageId?: number) => void;
  onBatchDelete: (ids: string[]) => void;
  searchQuery: string;
  onSwitchToUpload: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  images,
  selectedAlbum,
  setSelectedAlbum,
  onOpenLightbox,
  onToggleFavorite,
  onDeleteImage,
  onBatchDelete,
  searchQuery,
  onSwitchToUpload,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Extract all unique albums
  const albumList = useMemo(() => {
    const set = new Set<string>();
    images.forEach(img => {
      if (img.album) set.add(img.album);
    });
    return Array.from(set);
  }, [images]);

  // Filter & Sort
  const filteredImages = useMemo(() => {
    let result = [...images];

    // Filter by album
    if (selectedAlbum === 'favorites') {
      result = result.filter(img => img.isFavorite);
    } else if (selectedAlbum !== 'all') {
      result = result.filter(img => img.album?.toLowerCase() === selectedAlbum.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(img => 
        img.title?.toLowerCase().includes(q) ||
        img.caption?.toLowerCase().includes(q) ||
        img.album?.toLowerCase().includes(q) ||
        img.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortOption === 'newest') {
      result.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortOption === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortOption === 'size') {
      result.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    }

    return result;
  }, [images, selectedAlbum, searchQuery, sortOption]);

  // Paginated batch slice for high performance & low MB consumption
  const visibleImages = useMemo(() => {
    return filteredImages.slice(0, visibleCount);
  }, [filteredImages, visibleCount]);

  const handleCopyLink = async (e: React.MouseEvent, img: GalleryImage) => {
    e.stopPropagation();
    const link = `${window.location.origin}${img.directUrl}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(img.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map(i => i.id)));
    }
  };

  const handleExecuteBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.size} selected photo(s)?`);
    if (confirmDelete) {
      onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-8">
      
      {/* Controls Bar: Albums, View Mode, Sort, Multi-Select */}
      <div className="flex flex-col gap-3 bg-neutral-900/60 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-neutral-800/80 backdrop-blur-md">
        
        {/* Album Pills with smooth horizontal scrolling */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          <button
            onClick={() => setSelectedAlbum('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              selectedAlbum === 'all'
                ? 'bg-neutral-100 text-neutral-950 shadow-md font-semibold'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            All Photos ({images.length})
          </button>

          <button
            onClick={() => setSelectedAlbum('favorites')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              selectedAlbum === 'favorites'
                ? 'bg-rose-500 text-white shadow-md font-semibold'
                : 'bg-neutral-800/80 text-rose-300 hover:text-rose-200 hover:bg-rose-950/40'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Favorites</span>
            <span className="text-[10px] opacity-80">
              ({images.filter(i => i.isFavorite).length})
            </span>
          </button>

          {albumList.map((alb) => {
            const count = images.filter(i => i.album?.toLowerCase() === alb.toLowerCase()).length;
            const isCurrent = selectedAlbum.toLowerCase() === alb.toLowerCase();
            return (
              <button
                key={alb}
                onClick={() => setSelectedAlbum(alb)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md font-semibold'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <Folder className="w-3 h-3 text-indigo-400" />
                <span>{alb}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Selection Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60">
          
          {/* Multi-Select Toggle */}
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isSelectMode
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                : 'bg-neutral-800/70 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectMode ? 'Cancel' : 'Select'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-neutral-800/70 px-2.5 py-1.5 rounded-xl text-xs text-neutral-300">
              <span className="text-[11px] text-neutral-400">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Sort photos by"
                className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-neutral-900 text-neutral-200">Newest</option>
                <option value="oldest" className="bg-neutral-900 text-neutral-200">Oldest</option>
                <option value="title" className="bg-neutral-900 text-neutral-200">Name</option>
                <option value="size" className="bg-neutral-900 text-neutral-200">Size</option>
              </select>
            </div>

            {/* Grid Layout Switcher */}
            <div className="flex items-center bg-neutral-800/70 p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode('masonry')}
                title="Masonry View"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'masonry' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Uniform Grid"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                title="Compact Cards"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'compact' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Batch Action Floating Header when in Selection Mode */}
      {isSelectMode && (
        <div className="sticky top-16 sm:top-20 z-20 flex items-center justify-between bg-indigo-950/95 border border-indigo-500/40 p-3 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-200 hover:text-white px-2 py-1 rounded-lg bg-indigo-900/60"
            >
              {selectedIds.size === filteredImages.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-indigo-400" />
              )}
              <span>
                {selectedIds.size === filteredImages.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            <span className="text-[11px] sm:text-xs text-indigo-300">
              {selectedIds.size} of {filteredImages.length}
            </span>
          </div>

          <button
            disabled={selectedIds.size === 0}
            onClick={handleExecuteBatchDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-rose-600/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedIds.size})</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredImages.length === 0 && (
        <div className="text-center py-16 px-4 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800/80 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
            <Folder className="w-7 h-7 text-neutral-500" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-neutral-200 mb-1">
            {searchQuery ? 'No matching photos found' : 'No photos in this album yet'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-5">
            {searchQuery
              ? `We couldn't find anything matching "${searchQuery}". Try different keywords.`
              : 'Upload your personal pictures directly to your Telegram storage and sync with Firestore!'}
          </p>
          <button
            onClick={onSwitchToUpload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/25 hover:scale-105 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upload Photos Now</span>
          </button>
        </div>
      )}

      {/* Gallery Grid Rendering (Mobile 2 columns, Desktop 3-4 columns) */}
      {viewMode === 'masonry' && (
        <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
          {visibleImages.map((img, idx) => (
            <div key={img.id} className="break-inside-avoid">
              <ImageCard
                image={img}
                index={idx}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(img.id)}
                isCopied={copiedId === img.id}
                onSelect={(e) => handleToggleSelect(img.id, e)}
                onClick={() => onOpenLightbox(img, idx)}
                onCopyLink={(e) => handleCopyLink(e, img)}
                onToggleFavorite={() => onToggleFavorite(img.id, Boolean(img.isFavorite))}
                onDelete={() => onDeleteImage(img.id, img.telegramMessageId)}
                formatFileSize={formatFileSize}
              />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visibleImages.map((img, idx) => (
            <div key={img.id} className="aspect-square">
              <ImageCard
                image={img}
                index={idx}
                isAspectSquare
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(img.id)}
                isCopied={copiedId === img.id}
                onSelect={(e) => handleToggleSelect(img.id, e)}
                onClick={() => onOpenLightbox(img, idx)}
                onCopyLink={(e) => handleCopyLink(e, img)}
                onToggleFavorite={() => onToggleFavorite(img.id, Boolean(img.isFavorite))}
                onDelete={() => onDeleteImage(img.id, img.telegramMessageId)}
                formatFileSize={formatFileSize}
              />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="space-y-2">
          {visibleImages.map((img, idx) => (
            <CompactImageRow
              key={img.id}
              image={img}
              index={idx}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(img.id)}
              isCopied={copiedId === img.id}
              onSelect={(e) => handleToggleSelect(img.id, e)}
              onClick={() => onOpenLightbox(img, idx)}
              onCopyLink={(e) => handleCopyLink(e, img)}
              onToggleFavorite={() => onToggleFavorite(img.id, Boolean(img.isFavorite))}
              onDelete={() => onDeleteImage(img.id, img.telegramMessageId)}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}

      {/* Pagination / Load More Bar to prevent high MB usage */}
      {filteredImages.length > visibleImages.length && (
        <div className="pt-8 pb-4 text-center flex flex-col items-center justify-center space-y-2">
          <div className="text-xs text-neutral-400">
            Showing {visibleImages.length} of {filteredImages.length} photos ({filteredImages.length - visibleImages.length} remaining)
          </div>
          <button
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition-all shadow-lg hover:border-indigo-500/50"
          >
            Load More Photos (আরো লোড করুন)
          </button>
        </div>
      )}

    </div>
  );
};

interface CardProps {
  image: GalleryImage;
  index: number;
  isAspectSquare?: boolean;
  isSelectMode: boolean;
  isSelected: boolean;
  isCopied: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onCopyLink: (e: React.MouseEvent) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  formatFileSize: (b?: number) => string;
}

const ImageCard: React.FC<CardProps> = ({
  image,
  isAspectSquare,
  isSelectMode,
  isSelected,
  isCopied,
  onSelect,
  onClick,
  onCopyLink,
  onToggleFavorite,
  onDelete,
  formatFileSize,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      onClick={isSelectMode ? onSelect : onClick}
      className={`group relative rounded-2xl overflow-hidden bg-neutral-900 border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
          : 'border-neutral-800/80 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50'
      } ${isAspectSquare ? 'h-full w-full' : ''}`}
    >
      {/* Loading Skeleton & Blur-up Placeholder */}
      {!imgLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-neutral-800/70 animate-pulse flex items-center justify-center min-h-[140px]"
          style={image.microThumbnail ? { backgroundImage: `url(${image.microThumbnail})`, backgroundSize: 'cover', filter: 'blur(8px)' } : undefined}
        >
          <span className="text-[11px] text-neutral-400 bg-neutral-900/60 px-2 py-0.5 rounded backdrop-blur-sm">Loading...</span>
        </div>
      )}

      {/* Main Image (Uses lightweight thumbnail for fast grid browsing) */}
      <img
        src={resolveImageUrl(image, 'thumb')}
        alt={image.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          setHasError(true);
          setImgLoaded(true);
        }}
        className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          isAspectSquare ? 'h-full' : 'h-auto max-h-[500px]'
        } ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Error Fallback */}
      {hasError && (
        <div className="p-6 text-center bg-neutral-900 flex flex-col items-center justify-center min-h-[140px]">
          <Info className="w-5 h-5 text-neutral-500 mb-1.5" />
          <p className="text-[11px] text-neutral-400">Preview pending</p>
        </div>
      )}

      {/* Selection Checkbox */}
      {isSelectMode && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border transition-all ${
              isSelected
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                : 'bg-neutral-900/90 border-neutral-600 text-transparent backdrop-blur-sm'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
      )}

      {/* Top Floating Favorite Button */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={image.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-xl backdrop-blur-md transition-all ${
            image.isFavorite
              ? 'bg-rose-600/90 text-white shadow-md shadow-rose-600/30'
              : 'bg-neutral-950/60 text-neutral-300 hover:text-rose-400 hover:bg-neutral-900/90'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${image.isFavorite ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Bottom Title Bar (Visible on mobile & desktop) */}
      <div className="p-2 sm:p-3 bg-neutral-900/90 border-t border-neutral-800/80">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-semibold text-white truncate">
            {image.title}
          </h4>
          {image.album && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 shrink-0">
              {image.album}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-neutral-800/50 text-[10px] text-neutral-400">
          <span>{formatFileSize(image.fileSize)}</span>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onCopyLink}
              title="Copy Permanent Link"
              className="p-1 rounded hover:text-indigo-300 transition-colors"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${image.title}"?`)) onDelete();
              }}
              title="Delete Photo"
              className="p-1 rounded hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompactImageRow: React.FC<CardProps> = ({
  image,
  isSelectMode,
  isSelected,
  isCopied,
  onSelect,
  onClick,
  onCopyLink,
  onToggleFavorite,
  onDelete,
  formatFileSize,
}) => {
  return (
    <div
      onClick={isSelectMode ? onSelect : onClick}
      className={`flex items-center justify-between p-2.5 rounded-2xl bg-neutral-900/70 border transition-all cursor-pointer ${
        isSelected
          ? 'border-indigo-500 bg-indigo-950/20'
          : 'border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {isSelectMode && (
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
              isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-neutral-700'
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </div>
        )}

        <img
          src={resolveImageUrl(image, 'thumb')}
          alt={image.title}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-neutral-800 shrink-0"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-neutral-200 truncate">
              {image.title}
            </h4>
            {image.album && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
                {image.album}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {image.caption || `Uploaded ${new Date(image.createdAt).toLocaleDateString()}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <span className="text-[11px] text-neutral-500 hidden sm:inline">
          {formatFileSize(image.fileSize)}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`p-1.5 rounded-lg ${image.isFavorite ? 'text-rose-500' : 'text-neutral-500 hover:text-rose-400'}`}
        >
          <Heart className={`w-4 h-4 ${image.isFavorite ? 'fill-rose-500' : ''}`} />
        </button>

        <button
          onClick={onCopyLink}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete photo?')) onDelete();
          }}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
