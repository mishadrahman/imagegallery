import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  ArrowRight,
  Heart,
  Lock,
  Unlock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GalleryImage } from '../types';
import { resolveImageUrl } from '../services/telegramService';
import { saveAlbum } from '../services/firebase';
import { AlbumLockModal, AlbumLockModalMode } from './AlbumLockModal';

interface AlbumsViewProps {
  images: GalleryImage[];
  existingAlbums: string[];
  lockedAlbums: Record<string, string>;
  onSelectAlbum: (album: string) => void;
  onOpenLockedAlbum: (album: string) => void;
  onLockAlbum: (albumName: string, password: string) => Promise<void>;
  onUnlockAlbumPermanently: (albumName: string) => Promise<void>;
  onSwitchToUpload: (albumName?: string) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  images,
  existingAlbums,
  lockedAlbums,
  onSelectAlbum,
  onOpenLockedAlbum,
  onLockAlbum,
  onUnlockAlbumPermanently,
  onSwitchToUpload,
}) => {
  const [newAlbumName, setNewAlbumName] = useState('');
  const [lockNewAlbum, setLockNewAlbum] = useState(false);
  const [newAlbumPassword, setNewAlbumPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Lock Modal state
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<AlbumLockModalMode>('unlock');
  const [targetAlbum, setTargetAlbum] = useState<string>('');

  const albumNames = existingAlbums;

  // Public favorites exclude any photo belonging to a locked album
  const publicFavorites = images.filter((i) => {
    const albKey = (i.album || '').trim().toLowerCase();
    return i.isFavorite && !(albKey && lockedAlbums[albKey]);
  });

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    if (lockNewAlbum && newAlbumPassword.trim().length < 2) return;

    const name = newAlbumName.trim();
    const pwd = newAlbumPassword.trim();
    const shouldLock = lockNewAlbum && pwd.length >= 2;

    setShowAddModal(false);
    setNewAlbumName('');
    setNewAlbumPassword('');
    setLockNewAlbum(false);

    await saveAlbum(name);
    if (shouldLock) {
      await onLockAlbum(name, pwd);
    }
    onSwitchToUpload(name);
  };

  const openModalForAlbum = (album: string, mode: AlbumLockModalMode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetAlbum(album);
    setLockModalMode(mode);
    setLockModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <span>Photo Albums & Private Vault</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            যেকোনো অ্যালবামে পাসওয়ার্ড দিয়ে লক করলে তার ছবিগুলো মেইন গ্যালারিতে হাইড থাকবে।
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-center cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Album</span>
        </button>
      </div>

      {/* Favorites Special Album Card (Only public favorites) */}
      {publicFavorites.length > 0 && (
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
                  {publicFavorites.length} starred photo(s)
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
          const albKey = album.trim().toLowerCase();
          const isLocked = Boolean(lockedAlbums[albKey]);
          const albumImages = images.filter(
            (i) => i.album?.trim().toLowerCase() === albKey
          );
          const coverImages = albumImages.slice(0, 3);
          const count = albumImages.length;

          return (
            <div
              key={album}
              onClick={() => {
                if (isLocked) {
                  openModalForAlbum(album, 'unlock');
                } else {
                  onSelectAlbum(album);
                }
              }}
              className={`group relative rounded-2xl sm:rounded-3xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl flex flex-col justify-between ${
                isLocked
                  ? 'bg-neutral-900/90 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/10'
                  : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Cover Area */}
              <div className="h-40 sm:h-48 w-full bg-neutral-950/80 relative overflow-hidden flex items-center justify-center p-2">
                {isLocked ? (
                  /* LOCKED ALBUM PRIVACY SHIELD - Never renders image URLs */
                  <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950/20 border border-neutral-800/80 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-amber-300 tracking-wide">
                      পাসওয়ার্ড দ্বারা লক করা
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      গ্যালারিতে হাইড করা আছে • দেখতে ক্লিক করুন
                    </span>
                  </div>
                ) : coverImages.length > 0 ? (
                  <div className="w-full h-full relative">
                    <img
                      src={resolveImageUrl(coverImages[0], 'thumb')}
                      alt={album}
                      referrerPolicy="no-referrer"
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
                            referrerPolicy="no-referrer"
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

                {/* Top-Left Lock / Unlock Action Button */}
                {isLocked ? (
                  <button
                    type="button"
                    onClick={(e) => openModalForAlbum(album, 'unlock', e)}
                    title="Locked Album - Click to unlock"
                    className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => openModalForAlbum(album, 'set-lock', e)}
                    title="Lock this album with a password"
                    className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-950/80 hover:bg-indigo-600 backdrop-blur-md text-[11px] font-semibold text-neutral-300 hover:text-white border border-neutral-800 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>লক করুন</span>
                  </button>
                )}

                {/* Top-Right Photo Count Badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-neutral-950/80 backdrop-blur-md text-[11px] font-semibold text-neutral-200 border border-neutral-800">
                  {isLocked ? '🔒 Private' : `${count} ${count === 1 ? 'photo' : 'photos'}`}
                </div>
              </div>

              {/* Album Footer Info */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-t border-neutral-800/80 bg-neutral-900/90">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h3
                      className={`text-sm sm:text-base font-bold truncate transition-colors font-['Outfit'] ${
                        isLocked
                          ? 'text-amber-300 group-hover:text-amber-200'
                          : 'text-white group-hover:text-indigo-400'
                      }`}
                    >
                      {album}
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {isLocked
                      ? `পাসওয়ার্ড ছাড়া দেখা যাবে না (${count}টি ছবি)`
                      : count === 0
                      ? 'Empty album'
                      : `${count} uploaded`}
                  </p>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isLocked
                      ? 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-neutral-950'
                      : 'bg-neutral-800 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}
                >
                  {isLocked ? <KeyRound className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Album Modal (with optional instant Lock) */}
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
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-neutral-400 pl-1">
                  অ্যালবামের নাম (Album Name)
                </label>
                <input
                  type="text"
                  placeholder="Album Name (e.g. Personal, Summer 2026)"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Optional Password Lock Toggle */}
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${lockNewAlbum ? 'text-amber-400' : 'text-neutral-500'}`} />
                    <div>
                      <span className="text-xs font-semibold text-neutral-200 block">
                        পাসওয়ার্ড দিয়ে লক রাখুন
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        গ্যালারিতে ছবিগুলো সামনে আসবে না
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={lockNewAlbum}
                    onChange={(e) => setLockNewAlbum(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>

                {lockNewAlbum && (
                  <div className="relative pt-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="পাসওয়ার্ড বা পিন দিন (কমপক্ষে ২ অক্ষর)"
                      value={newAlbumPassword}
                      onChange={(e) => setNewAlbumPassword(e.target.value)}
                      className="w-full bg-neutral-900 border border-amber-500/40 rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!newAlbumName.trim() || (lockNewAlbum && newAlbumPassword.trim().length < 2)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
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

      {/* Password Unlock / Set Lock Modal */}
      <AlbumLockModal
        isOpen={lockModalOpen}
        mode={lockModalMode}
        albumName={targetAlbum}
        storedHash={lockedAlbums[targetAlbum.trim().toLowerCase()]}
        onClose={() => setLockModalOpen(false)}
        onUnlockSuccess={(alb) => {
          onOpenLockedAlbum(alb);
        }}
        onSetLock={async (alb, pwd) => {
          await onLockAlbum(alb, pwd);
        }}
        onRemoveLock={async (alb) => {
          await onUnlockAlbumPermanently(alb);
        }}
      />
    </div>
  );
};
