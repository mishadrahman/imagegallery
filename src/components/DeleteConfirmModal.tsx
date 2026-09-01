import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Check, Loader2 } from 'lucide-react';
import { GalleryImage } from '../types';
import { resolveImageUrl } from '../services/telegramService';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  imagesToDelete: GalleryImage[];
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  imagesToDelete,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || imagesToDelete.length === 0) return null;

  const isBulk = imagesToDelete.length > 1;
  const totalSize = imagesToDelete.reduce((sum, img) => sum + (img.fileSize || 0), 0);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExecute = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {isBulk ? `Delete ${imagesToDelete.length} Photos?` : 'Delete Photo?'}
              </h3>
              <p className="text-xs text-neutral-400">
                {isBulk
                  ? `Permanently remove ${imagesToDelete.length} selected photos from database and gallery.`
                  : 'Permanently remove this photo from database and gallery.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail Preview Area */}
        <div className="bg-neutral-950/80 rounded-2xl p-3 border border-neutral-800/80 max-h-48 overflow-y-auto">
          {isBulk ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {imagesToDelete.slice(0, 10).map((img) => (
                <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group">
                  <img
                    src={resolveImageUrl(img, 'thumb')}
                    alt={img.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {imagesToDelete.length > 10 && (
                <div className="aspect-square rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-400">
                  +{imagesToDelete.length - 10}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={resolveImageUrl(imagesToDelete[0], 'thumb')}
                alt={imagesToDelete[0].title}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border border-neutral-800 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">
                  {imagesToDelete[0].title}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Album: <span className="text-indigo-400">{imagesToDelete[0].album || 'Personal'}</span>
                </div>
                {imagesToDelete[0].fileSize && (
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Size: {formatFileSize(imagesToDelete[0].fileSize)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {totalSize > 0 && isBulk && (
          <div className="text-xs text-neutral-400 flex items-center justify-between px-1">
            <span>Total Size:</span>
            <span className="font-semibold text-neutral-200">{formatFileSize(totalSize)}</span>
          </div>
        )}

        {/* Warning Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            This action cannot be undone. Selected photo records will be deleted immediately.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
