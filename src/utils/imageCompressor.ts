export type CompressionQuality = 'smart' | 'saver' | 'original';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  thumbnailBase64?: string;
  savedPercent: number;
}

/**
 * Compresses an image file client-side using HTML5 Canvas
 * Dramatically reduces file size & network usage while preserving visual sharpness.
 */
export async function compressImage(
  file: File,
  mode: CompressionQuality = 'smart'
): Promise<CompressionResult> {
  const originalSize = file.size;

  // If user selected original or file is not an image (e.g. gif or raw), return as is
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  const isLikelyImage = file.type.startsWith('image/') || file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i);

  if (mode === 'original' || !isLikelyImage || isGif) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      width: 0,
      height: 0,
      savedPercent: 0,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let maxDimension = 1920; // Smart default: 1080p-2K suitable for all screens
      let quality = 0.84;

      if (mode === 'saver') {
        maxDimension = 1280; // Fast mobile saver
        quality = 0.72;
      }

      let width = img.width;
      let height = img.height;

      // Scale down if exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          width: img.width,
          height: img.height,
          savedPercent: 0,
        });
        return;
      }

      // Smooth downsampling filter
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Create an ultra-small micro-thumbnail for instant blur-up loading
      let thumbnailBase64 = '';
      try {
        const thumbCanvas = document.createElement('canvas');
        const thumbRatio = Math.min(64 / width, 64 / height);
        thumbCanvas.width = Math.max(1, Math.round(width * thumbRatio));
        thumbCanvas.height = Math.max(1, Math.round(height * thumbRatio));
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
          thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.5);
        }
      } catch (e) {
        console.warn('Thumbnail generation failed:', e);
      }

      // Export as optimized JPEG/WebP
      const outputMime = 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= originalSize) {
            // If compressed is somehow larger than original, keep original
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              width: img.width,
              height: img.height,
              thumbnailBase64,
              savedPercent: 0,
            });
            return;
          }

          const compressedFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          const compressedFile = new File([blob], compressedFileName, {
            type: outputMime,
            lastModified: Date.now(),
          });

          const savedPercent = Math.max(
            0,
            Math.round(((originalSize - blob.size) / originalSize) * 100)
          );

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: blob.size,
            width,
            height,
            thumbnailBase64,
            savedPercent,
          });
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        width: 0,
        height: 0,
        savedPercent: 0,
      });
    };

    img.src = objectUrl;
  });
}
