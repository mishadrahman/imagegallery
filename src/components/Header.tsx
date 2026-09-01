import React, { useState } from 'react';
import { 
  Images, 
  UploadCloud, 
  Layers, 
  Cpu, 
  Search, 
  X, 
  Plus
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'gallery' | 'upload' | 'albums' | 'sync';
  setActiveTab: (tab: 'gallery' | 'upload' | 'albums' | 'sync') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalImages: number;
  totalAlbums: number;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  totalImages,
  totalAlbums,
  isSyncing,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setActiveTab('gallery')}
                className="flex items-center gap-2 group text-left focus:outline-none"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                  <Images className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-['Outfit']">
                      CloudPic
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      Cloud
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Tabs (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center p-1 bg-neutral-900/90 rounded-xl border border-neutral-800/80 shadow-inner">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'gallery'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <Images className="w-3.5 h-3.5" />
                <span>Gallery</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-neutral-700/60 rounded-full text-neutral-300">
                  {totalImages}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Bulk Upload</span>
              </button>

              <button
                onClick={() => setActiveTab('albums')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'albums'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Albums</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-neutral-700/60 rounded-full text-neutral-300">
                  {totalAlbums}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sync')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'sync'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Sync Hub</span>
                {isSyncing && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </nav>

            {/* Actions & Search */}
            <div className="flex items-center gap-2">
              {/* Desktop Search Input */}
              <div className="relative hidden sm:block w-44 lg:w-60">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search photos, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-900/90 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Mobile Search Toggle Button */}
              <button
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="sm:hidden p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                aria-label="Toggle search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Quick Upload Action Button on Top Bar */}
              <button
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>

          </div>

          {/* Mobile Collapsible Search Bar */}
          {mobileSearchOpen && (
            <div className="sm:hidden pb-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search your photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar (thumb friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800/90 px-3 py-2">
        <div className="grid grid-cols-4 gap-1">
          
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'gallery'
                ? 'text-indigo-400 bg-neutral-900/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Images className="w-5 h-5" />
              {totalImages > 0 && (
                <span className="absolute -top-1 -right-2 text-[8px] bg-indigo-500 text-white px-1 rounded-full font-bold">
                  {totalImages}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">Gallery</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'upload'
                ? 'text-sky-400 bg-neutral-900/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UploadCloud className="w-5 h-5" />
            <span className="text-[10px] mt-1">Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('albums')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'albums'
                ? 'text-indigo-400 bg-neutral-900/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-1">Albums</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'sync'
                ? 'text-emerald-400 bg-neutral-900/80 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Cpu className="w-5 h-5" />
              {isSyncing && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] mt-1">Status</span>
          </button>

        </div>
      </nav>
    </>
  );
};
