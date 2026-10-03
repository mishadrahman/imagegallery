import JSZip from "jszip";
import { GalleryImage, TelegramStatus } from "../types";

export const TELEGRAM_CONFIG = {
  botToken: "8915652438:AAHADxj51DwuXrCDynOA5vNQMkZKpznV-2s",
  chatId: "-1003912308693",
  channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
};

// Memory cache for dynamic fileId -> fresh filePath
const resolvedPathCache = new Map<string, string>();

// Generates direct CDN download URL from Telegram
export function getTelegramCdnUrl(filePath: string): string {
  if (!filePath) return "";
  const cleanPath = filePath.replace(/^\/+/, "");
  return `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${cleanPath}`;
}

// Returns a valid image URL for browser rendering across ALL environments (AI Studio, mobile, deployed site)
export function resolveImageUrl(
  image: GalleryImage,
  variant: "thumb" | "full" = "thumb"
): string {
  if (!image) return "";

  // 0. Check client-side resolved cache first
  if (image.fileId && resolvedPathCache.has(image.fileId)) {
    return getTelegramCdnUrl(resolvedPathCache.get(image.fileId)!);
  }

  // 1. Direct Telegram CDN path (Highest speed, universally accessible on all devices, mobile browsers & static sites)
  let knownPath = image.filePath || "";
  if (!knownPath && image.directUrl && image.directUrl.includes("/photos/")) {
    const match = image.directUrl.match(/photos\/[^?&#]+/);
    if (match) knownPath = match[0];
  }
  if (knownPath) {
    return getTelegramCdnUrl(knownPath);
  }

  // 2. Direct HTTPS URL stored on document if valid
  if (image.directUrl && image.directUrl.startsWith("http")) {
    return image.directUrl;
  }

  // 3. Fallback to thumbnail URL if non-telegram
  if (variant === "thumb" && image.thumbnailUrl && !image.thumbnailUrl.includes("api.telegram.org")) {
    return image.thumbnailUrl;
  }

  // 4. Proxy fallback if fileId is present
  if (image.fileId) {
    return `/api/telegram/image/${image.fileId}`;
  }

  return "";
}

// Helper to build a clean unique filename for an image
export function getImageFilename(image: GalleryImage, indexSuffix?: number): string {
  const safeTitle =
    (image.title || "photo")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_") || "photo";

  const ext =
    image.mimeType === "image/png"
      ? "png"
      : image.mimeType === "image/webp"
      ? "webp"
      : image.mimeType === "image/gif"
      ? "gif"
      : "jpg";

  const suffix = indexSuffix !== undefined ? `_${indexSuffix + 1}` : `_${image.id.slice(-4)}`;
  return `${safeTitle}${suffix}.${ext}`;
}

// Triggers a silent, in-page file download from a memory Blob (NEVER opens a new tab or popup)
export function triggerSilentBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}

// Fetches the raw binary Blob of a GalleryImage across any environment (Backend or Static Hosting) without CORS failure
export async function fetchImageBlob(image: GalleryImage): Promise<Blob | null> {
  if (!image) return null;

  const isValidImageBlob = (res: Response, blob: Blob): boolean => {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html") || ct.includes("application/json")) return false;
    return blob.size > 150;
  };

  // Tier 1: Try local/backend same-origin proxy endpoint first
  if (image.fileId) {
    try {
      const proxyUrl = `/api/telegram/image/${image.fileId}${
        image.filePath ? `?path=${encodeURIComponent(image.filePath)}` : ""
      }`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.startsWith("image/") || ct === "application/octet-stream") {
          const blob = await res.blob();
          if (isValidImageBlob(res, blob)) {
            return blob;
          }
        }
      }
    } catch {
      // Backend proxy not running (static deployment), continue to CDN proxies
    }
  }

  // Tier 2: Resolve fresh Telegram CDN URL via CORS-enabled Bot API (getFile)
  let cdnUrl = "";
  if (image.fileId) {
    const fresh = await fetchFreshTelegramUrl(image.fileId);
    if (fresh) cdnUrl = fresh;
  }
  if (!cdnUrl) {
    const resolved = resolveImageUrl(image, "full");
    if (resolved && resolved.startsWith("http")) {
      cdnUrl = resolved;
    }
  }

  if (cdnUrl && cdnUrl.startsWith("http")) {
    // Tier 2a: Cloudflare global image proxy (wsrv.nl) - supports CORS binary fetch & preserves full resolution
    const proxyCandidates = [
      `https://wsrv.nl/?url=${encodeURIComponent(cdnUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cdnUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(cdnUrl)}`,
      cdnUrl,
    ];

    for (const candidateUrl of proxyCandidates) {
      try {
        const res = await fetch(candidateUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (isValidImageBlob(res, blob)) {
            return blob;
          }
        }
      } catch {
        // Try next candidate
      }
    }

    // Tier 2b: Offscreen Canvas extraction via CORS-enabled image load
    try {
      const canvasBlob = await new Promise<Blob | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 800;
            canvas.height = img.naturalHeight || img.height || 600;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
              (b) => resolve(b),
              image.mimeType || "image/jpeg",
              0.95
            );
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = `https://wsrv.nl/?url=${encodeURIComponent(cdnUrl)}`;
      });
      if (canvasBlob && canvasBlob.size > 150) {
        return canvasBlob;
      }
    } catch {
      // Ignore
    }
  }

  // Tier 3: Fallback to microThumbnail base64 if everything else is offline
  if (image.microThumbnail && image.microThumbnail.startsWith("data:image")) {
    try {
      const res = await fetch(image.microThumbnail);
      return await res.blob();
    } catch {
      return null;
    }
  }

  return null;
}

// Single image silent downloader (NEVER opens a new tab or popup window)
export async function downloadGalleryImage(image: GalleryImage): Promise<boolean> {
  if (!image) return false;
  const blob = await fetchImageBlob(image);
  if (!blob) return false;
  const filename = getImageFilename(image);
  triggerSilentBlobDownload(blob, filename);
  return true;
}

// Bulk downloader that packs all selected images into a single ZIP file (1 single download, zero popups, zero browser multi-file blocks)
export async function downloadBulkImagesAsZip(
  images: GalleryImage[],
  onProgress?: (completed: number, total: number, stage: "fetching" | "zipping") => void
): Promise<boolean> {
  if (!images || images.length === 0) return false;

  // If only 1 photo is selected, download it directly as an image file
  if (images.length === 1) {
    if (onProgress) onProgress(1, 1, "fetching");
    return await downloadGalleryImage(images[0]);
  }

  const zip = new JSZip();
  const total = images.length;
  let completed = 0;
  const usedNames = new Set<string>();

  // Fetch up to 3 images concurrently for high speed
  const CONCURRENCY = 3;
  let idx = 0;

  const worker = async () => {
    while (idx < images.length) {
      const currentIdx = idx++;
      const img = images[currentIdx];
      try {
        const blob = await fetchImageBlob(img);
        if (blob) {
          let filename = getImageFilename(img, currentIdx);
          while (usedNames.has(filename.toLowerCase())) {
            filename = `${currentIdx + 1}_${filename}`;
          }
          usedNames.add(filename.toLowerCase());
          zip.file(filename, blob);
        }
      } catch (err) {
        console.warn("Failed to include image in ZIP:", img.title, err);
      } finally {
        completed++;
        if (onProgress) onProgress(completed, total, "fetching");
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, images.length) }, () => worker())
  );

  if (onProgress) onProgress(total, total, "zipping");

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "STORE", // JPEGs/PNGs are already compressed; STORE is 10x faster in browser!
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerSilentBlobDownload(zipBlob, `CloudPic_${images.length}_Photos_${dateStr}.zip`);
  return true;
}

// Dynamic client-side self-healer using Telegram's public CORS-enabled Bot API
export async function fetchFreshTelegramUrl(
  fileId: string,
  onResolved?: (freshPath: string, freshUrl: string) => void
): Promise<string | null> {
  if (!fileId) return null;

  if (resolvedPathCache.has(fileId)) {
    const p = resolvedPathCache.get(fileId)!;
    const u = getTelegramCdnUrl(p);
    if (onResolved) onResolved(p, u);
    return u;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      const freshPath = data.result.file_path;
      resolvedPathCache.set(fileId, freshPath);
      const freshUrl = getTelegramCdnUrl(freshPath);
      if (onResolved) onResolved(freshPath, freshUrl);
      return freshUrl;
    }
  } catch (err) {
    console.warn("Direct Telegram getFile error:", err);
  }

  return null;
}

// Check Telegram Status (supports both backend proxy and direct client-side fallback)
export async function getTelegramStatus(): Promise<TelegramStatus> {
  try {
    const res = await fetch("/api/telegram/status");
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Backend not available (e.g., static hosting on GitHub Pages), fallback to direct API
  }

  try {
    const meRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getMe`,
    );
    const meData = await meRes.json();
    return {
      ok: meData.ok,
      bot: meData.result || null,
      channelUrl: TELEGRAM_CONFIG.channelUrl,
      configuredChatId: TELEGRAM_CONFIG.chatId,
      error: meData.description || null,
    };
  } catch (err: any) {
    return {
      ok: false,
      channelUrl: TELEGRAM_CONFIG.channelUrl,
      configuredChatId: TELEGRAM_CONFIG.chatId,
      error: err.message || "Could not connect to Telegram",
    };
  }
}

// Helper to resolve Telegram file_path
export async function resolveTelegramFilePathClient(
  fileId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return data.result.file_path;
    }
  } catch (e) {
    console.error("Failed to get Telegram file path:", e);
  }
  return null;
}

// Upload Image to Telegram (tries Backend proxy first, falls back to direct Telegram API)
export async function uploadImageToTelegram(
  file: File,
  meta: {
    title: string;
    caption?: string;
    album: string;
    tags: string[];
  },
): Promise<GalleryImage> {
  // 1. Try Backend Proxy endpoint if available
  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("title", meta.title);
    formData.append("caption", meta.caption || "");
    formData.append("album", meta.album);
    formData.append("tags", JSON.stringify(meta.tags));

    const res = await fetch("/api/upload-single", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.image) {
        return data.image;
      }
    }
  } catch {
    console.warn(
      "Backend proxy upload unavailable, using direct client-side Telegram upload fallback",
    );
  }

  // 2. Client-side direct upload fallback (for GitHub Pages static hosting)
  const tgCaptionParts = [
    `📸 ${meta.title}`,
    meta.caption ? `\n💬 ${meta.caption}` : "",
    meta.album ? `\n📁 Album: #${meta.album.replace(/\s+/g, "_")}` : "",
    meta.tags.length > 0
      ? `\n🏷️ ${meta.tags.map((t) => `#${t.replace(/\s+/g, "_")}`).join(" ")}`
      : "",
    `\n⏰ ${new Date().toLocaleString()}`,
  ]
    .filter(Boolean)
    .join("");

  let tgData: any = null;

  // Try sendPhoto first
  try {
    const photoFormData = new FormData();
    photoFormData.append("chat_id", TELEGRAM_CONFIG.chatId);
    photoFormData.append("photo", file, file.name);
    photoFormData.append("caption", tgCaptionParts.slice(0, 1024));

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendPhoto`,
      {
        method: "POST",
        body: photoFormData,
      },
    );
    tgData = await res.json();
  } catch (err) {
    console.warn("sendPhoto direct request failed, trying document:", err);
  }

  // If sendPhoto failed or was skipped, send as document
  if (!tgData || !tgData.ok) {
    const docFormData = new FormData();
    docFormData.append("chat_id", TELEGRAM_CONFIG.chatId);
    docFormData.append("document", file, file.name);
    docFormData.append("caption", tgCaptionParts.slice(0, 1024));

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendDocument`,
      {
        method: "POST",
        body: docFormData,
      },
    );
    tgData = await res.json();
  }

  if (!tgData?.ok || !tgData.result) {
    throw new Error(
      tgData?.description || "Failed to upload photo to Telegram",
    );
  }

  let fileId = "";
  let fileUniqueId = "";
  let thumbnailFileId = "";
  let width = 0;
  let height = 0;
  const messageId = tgData.result.message_id;

  if (
    tgData.result.photo &&
    Array.isArray(tgData.result.photo) &&
    tgData.result.photo.length > 0
  ) {
    const photos = tgData.result.photo;
    const best = photos[photos.length - 1];
    fileId = best.file_id;
    fileUniqueId = best.file_unique_id;
    width = best.width || 0;
    height = best.height || 0;

    // Pick medium or small thumbnail from Telegram's generated variants
    if (photos.length > 1) {
      const thumb = photos.length >= 3 ? photos[1] : photos[0];
      thumbnailFileId = thumb.file_id;
    }
  } else if (tgData.result.document) {
    fileId = tgData.result.document.file_id;
    fileUniqueId = tgData.result.document.file_unique_id;
    if (tgData.result.document.thumbnail) {
      thumbnailFileId = tgData.result.document.thumbnail.file_id;
      width = tgData.result.document.thumbnail.width || 0;
      height = tgData.result.document.thumbnail.height || 0;
    }
  }

  const directUrl = `/api/telegram/image/${fileId}`;

  const thumbnailUrl = thumbnailFileId
    ? `/api/telegram/image/${thumbnailFileId}`
    : undefined;

  const imageDoc: GalleryImage = {
    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: meta.title,
    caption: meta.caption || "",
    album: meta.album || "",
    tags: meta.tags,
    fileId,
    fileUniqueId,
    filePath: "",
    directUrl,
    thumbnailUrl,
    thumbnailFilePath: undefined,
    thumbnailFileId: thumbnailFileId || undefined,
    telegramMessageId: messageId,
    channelUrl: TELEGRAM_CONFIG.channelUrl,
    width,
    height,
    fileSize: file.size,
    mimeType: file.type || "image/jpeg",
    isFavorite: false,
    createdAt: Date.now(),
    uploadedAt: new Date().toISOString(),
  };

  return imageDoc;
}

// Safely delete message from Telegram channel (supports direct client-side fallback)
export async function deleteTelegramMessage(
  messageId: number,
): Promise<boolean> {
  try {
    // Try backend proxy if available
    const serverRes = await fetch(`/api/telegram/message/${messageId}`, {
      method: "DELETE",
    });
    if (serverRes.ok) return true;
  } catch {
    // Fall back to direct Telegram API
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/deleteMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CONFIG.chatId,
          message_id: messageId,
        }),
      },
    );
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.warn("Could not delete Telegram message from channel:", err);
    return false;
  }
}
