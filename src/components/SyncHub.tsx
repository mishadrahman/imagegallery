import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  HardDrive, 
  Server, 
  Sparkles,
  Cloud,
  Check
} from 'lucide-react';
import { TelegramStatus } from '../types';
import { getTelegramStatus } from '../services/telegramService';

interface SyncHubProps {
  totalImages: number;
  totalSize: number;
}

export const SyncHub: React.FC<SyncHubProps> = ({
  totalImages,
  totalSize,
}) => {
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await getTelegramStatus();
      setTgStatus(data);
    } catch (err: any) {
      setTgStatus({ ok: false, error: err.message });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-semibold uppercase tracking-wider">
              Architecture & Cloud Status
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
            Telegram Storage & Firestore Sync
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Real-time status of your Telegram Bot storage channel and Firestore database.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoadingStatus}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-all self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Cloud Pipelines Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Telegram Bot Card */}
        <div className="bg-neutral-900/60 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Telegram Cloud Storage</h3>
                <p className="text-[11px] text-neutral-400">Direct High-Res Binary Storage</p>
              </div>
            </div>

            {tgStatus?.bot ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Checking...</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-neutral-800 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Bot Name:</span>
              <span className="font-semibold text-sky-300">
                {tgStatus?.bot ? `@${tgStatus.bot.username}` : 'Private Gallery Bot'}
              </span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Target Chat ID:</span>
              <span className="font-mono text-neutral-300">-1003912308693</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Storage Lifetime:</span>
              <span className="text-emerald-400 font-medium">Permanent (Never Expires)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Direct Streaming:</span>
              <span className="text-emerald-400 font-medium">Active via Proxy</span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="https://t.me/+V3OkDk0rM_82MmRl"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold border border-sky-500/20 transition-colors"
            >
              <span>Open Telegram Channel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Firestore Database Card */}
        <div className="bg-neutral-900/60 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Firebase Firestore</h3>
                <p className="text-[11px] text-neutral-400">Real-Time Metadata & Collections</p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synced</span>
            </span>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-neutral-800 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Project ID:</span>
              <span className="font-mono text-neutral-200">tapping-game-79706</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Collection:</span>
              <span className="font-mono text-amber-300">gallery_images</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Total Indexed Photos:</span>
              <span className="font-bold text-white">{totalImages} photos</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Local Cache:</span>
              <span className="text-emerald-400 font-medium">Enabled (Offline fallback)</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
              <span>Sync Strategy:</span>
              <span className="text-neutral-200 font-medium">Snapshot Realtime Listener</span>
            </div>
          </div>
        </div>

      </div>

      {/* Storage Architecture Overview Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/40 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">How Your Image Gallery Works</h4>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              When you upload photos, they are securely transferred to Telegram's cloud storage. Telegram generates a permanent <code className="text-sky-300 bg-neutral-800 px-1 py-0.5 rounded">file_id</code> which is registered in your Firestore database. Whenever you view or share an image, the backend streams the original high-resolution file directly so links never expire.
            </p>
          </div>
          <div className="bg-neutral-950/90 border border-neutral-800 px-4 py-3 rounded-2xl text-center shrink-0 w-full sm:w-auto">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Total Bandwidth Saved</p>
            <p className="text-lg font-bold text-sky-400 mt-0.5">{formatBytes(totalSize)}</p>
          </div>
        </div>
      </div>

    </div>
  );
};
