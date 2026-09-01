import React, { useState } from 'react';
import { 
  Folder, 
  FolderPlus, 
  ArrowRight, 
  Heart,
  Plus
} from 'lucide-react';
import { GalleryImage } from '../types';
import { resolveImageUrl } from '../services/telegramService';

interface AlbumsViewProps {
  images: GalleryImage[];
  onSelectAlbum: (album: string) => void;
  onSwitchToUpload: (albumName?: string) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  images,
  onSelectAlbum,
  onSwitchToUpload,
}) => {
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Group images by album
  const defaultCategories = ['Personal', 'Family', 'Friends', 'Travel', 'Portraits', 'Events'];
  
  // Collect all unique album names
  const albumNames = Array.from(
    new Set([...defaultCategories, ...images.map((img) => img.album).filter(Boolean)])
  );

  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    const name = newAlbumName.trim();
    setShowAddModal(false);
    setNewAlbumName('');
    onSwitchToUpload(name);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
            Photo Albums & Collections
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Organize and browse your personal pictures by categories and memorable moments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-center"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Album</span>
        </button>
      </div>

      {/* Favorites Special Album Card */}
      {images.some((i) => i.isFavorite) && (
        <div
          onClick={() => onSelectAlbum('favorites')}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 border border-rose-500/30 p-4 sm:p-6 cursor-pointer hover:border-rose-500/60 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform shrink-0">
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                  Favorite Memories
                </h3>
                <p className="text-xs text-neutral-400">
                  {images.filter((i) => i.isFavorite).length} starred photo(s)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
              <span>View</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* Album Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {albumNames.map((album) => {
          const albumImages = images.filter(
            (i) => i.album?.toLowerCase() === album.toLowerCase()
          );
          const coverImages = albumImages.slice(0, 3);
          const count = albumImages.length;

          return (
            <div
              key={album}
              onClick={() => onSelectAlbum(album)}
              className="group relative rounded-2xl sm:rounded-3xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl flex flex-col justify-between"
            >
              {/* Cover stack */}
              <div className="h-40 sm:h-48 w-full bg-neutral-950/80 relative overflow-hidden flex items-center justify-center p-2">
                {coverImages.length > 0 ? (
                  <div className="w-full h-full relative">
                    <img
                      src={resolveImageUrl(coverImages[0], 'thumb')}
                      alt={album}
                      className="w-full h-full object-cover rounded-xl sm:rounded-2xl group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {coverImages.length > 1 && (
                      <div className="absolute bottom-2 right-2 flex -space-x-2">
                        {coverImages.slice(1).map((sub) => (
                          <img
                            key={sub.id}
                            src={resolveImageUrl(sub, 'thumb')}
                            alt=""
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-neutral-900 shadow-md"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-600 group-hover:text-neutral-400 transition-colors">
                    <Folder className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5] mb-2" />
                    <span className="text-xs">No photos yet</span>
                  </div>
                )}

                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-xl bg-neutral-950/80 backdrop-blur-md text-[11px] font-semibold text-neutral-200 border border-neutral-800">
                  {count} {count === 1 ? 'photo' : 'photos'}
                </div>
              </div>

              {/* Album info */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-t border-neutral-800/80 bg-neutral-900/90">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-400 transition-colors font-['Outfit']">
                    {album}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {count === 0 ? 'Empty album' : `${count} uploaded`}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Album Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 p-5 sm:p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Album</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <input
                type="text"
                placeholder="Album Name (e.g. Summer 2026)"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!newAlbumName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  Create & Add Photos
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs hover:bg-neutral-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
