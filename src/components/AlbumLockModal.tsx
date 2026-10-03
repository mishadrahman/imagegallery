import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  X,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { verifyAlbumPin } from '../services/firebase';

export type AlbumLockModalMode = 'unlock' | 'set-lock' | 'manage-lock';

interface AlbumLockModalProps {
  isOpen: boolean;
  mode: AlbumLockModalMode;
  albumName: string;
  storedHash?: string;
  alreadyVerified?: boolean;
  onClose: () => void;
  onUnlockSuccess: (albumName: string) => void;
  onSetLock: (albumName: string, password: string) => Promise<void>;
  onRemoveLock: (albumName: string) => Promise<void>;
}

export const AlbumLockModal: React.FC<AlbumLockModalProps> = ({
  isOpen,
  mode,
  albumName,
  storedHash = '',
  alreadyVerified = false,
  onClose,
  onUnlockSuccess,
  onSetLock,
  onRemoveLock,
}) => {
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setNewPassword('');
      setShowPassword(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, mode, albumName]);

  if (!isOpen) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('পাসওয়ার্ড বা পিন লিখুন (Please enter password/PIN)');
      return;
    }

    if (verifyAlbumPin(password, storedHash)) {
      onUnlockSuccess(albumName);
      onClose();
    } else {
      setError('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন (Incorrect password)');
    }
  };

  const handleSetLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = password.trim();
    if (!clean) {
      setError('অনুগ্রহ করে একটি পাসওয়ার্ড বা পিন দিন (Enter a password/PIN)');
      return;
    }
    if (clean.length < 2) {
      setError('কমপক্ষে ২ অক্ষরের পাসওয়ার্ড বা পিন দিন');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSetLock(albumName, clean);
      onClose();
    } catch (err) {
      setError('লক সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!alreadyVerified && !verifyAlbumPin(password, storedHash)) {
      setError('বর্তমান পাসওয়ার্ডটি সঠিক নয় (Incorrect current password)');
      return;
    }

    const cleanNew = newPassword.trim();
    if (!cleanNew || cleanNew.length < 2) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ২ অক্ষরের হতে হবে');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSetLock(albumName, cleanNew);
      onClose();
    } catch (err) {
      setError('পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentRemoveLock = async () => {
    setError('');
    if (!alreadyVerified && mode !== 'manage-lock') {
      if (!password.trim()) {
        setError('লক স্থায়ীভাবে তুলতে আগে বর্তমান পাসওয়ার্ডটি লিখুন');
        return;
      }
      if (!verifyAlbumPin(password, storedHash)) {
        setError('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড ছাড়া লক তোলা যাবে না');
        return;
      }
    } else if (!alreadyVerified && !verifyAlbumPin(password, storedHash)) {
      setError('বর্তমান পাসওয়ার্ডটি সঠিক নয়');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRemoveLock(albumName);
      onClose();
    } catch (err) {
      setError('লক সরাতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 p-5 sm:p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* MODE 1: UNLOCK ALBUM */}
        {mode === 'unlock' && (
          <>
            <div className="flex flex-col items-center text-center space-y-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Private Album
                </span>
                <h3 className="text-lg font-bold text-white mt-2 font-['Outfit']">
                  "{albumName}" লক করা আছে
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  এই প্রাইভেট অ্যালবামের ছবিগুলো দেখতে আপনার পাসওয়ার্ড বা পিন দিন।
                </p>
              </div>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-3.5 pt-1">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="পাসওয়ার্ড বা পিন লিখুন..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4 stroke-[2.5]" />
                <span>আনলক করে প্রবেশ করুন (Open Album)</span>
              </button>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePermanentRemoveLock}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800/70 hover:bg-rose-950/50 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-500/30 text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>পাসওয়ার্ড দিয়ে স্থায়ীভাবে লক তুলে ফেলুন</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* MODE 2: SET NEW LOCK */}
        {mode === 'set-lock' && (
          <>
            <div className="flex flex-col items-center text-center space-y-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Privacy Protection
                </span>
                <h3 className="text-lg font-bold text-white mt-2 font-['Outfit']">
                  "{albumName}" লক করুন
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  লক করলে এই অ্যালবামের কোনো ছবি মেইন গ্যালারিতে সামনে আসবে না। শুধুমাত্র পাসওয়ার্ড দিয়েই দেখা যাবে।
                </p>
              </div>
            </div>

            <form onSubmit={handleSetLockSubmit} className="space-y-3.5 pt-1">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-neutral-300 pl-1">
                  নতুন পাসওয়ার্ড বা পিন সেট করুন (Set Password / PIN)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="যেমন: 1234 বা গোপন পাসওয়ার্ড..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'লক হচ্ছে...' : 'অ্যালবাম লক করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </>
        )}

        {/* MODE 3: MANAGE EXISTING LOCK */}
        {mode === 'manage-lock' && (
          <>
            <div className="flex flex-col items-center text-center space-y-2 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  "{albumName}" লক সেটিংস
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  পাসওয়ার্ড পরিবর্তন করুন অথবা স্থায়ীভাবে লক তুলে ফেলুন।
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!alreadyVerified && (
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400 pl-1">
                    বর্তমান পাসওয়ার্ড (Current Password)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="বর্তমান পাসওয়ার্ড লিখুন..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400 pl-1">
                  নতুন পাসওয়ার্ড দিন (New Password / PIN)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="নতুন পাসওয়ার্ড লিখুন..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    autoFocus={alreadyVerified}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                নতুন পাসওয়ার্ড সেভ করুন (Update Password)
              </button>
            </form>

            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <button
                type="button"
                onClick={handlePermanentRemoveLock}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>স্থায়ীভাবে লক তুলে ফেলুন (Remove Lock Permanently)</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
