import { GalleryImage, TelegramStatus } from '../types';

export const TELEGRAM_CONFIG = {
  botToken: "8915652438:AAHADxj51DwuXrCDynOA5vNQMkZKpznV-2s",
  chatId: "-1003912308693",
  channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
};

// Returns a valid image URL for browser rendering across all environments
export function resolveImageUrl(
  image: GalleryImage,
  variant: 'thumb' | 'full' = 'thumb'
): string {
  if (variant === 'thumb') {
    if (image.thumbnailUrl) return image.thumbnailUrl;
    if (image.thumbnailFilePath) {
      return `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${image.thumbnailFilePath}`;
    }
  }

  if (image.directUrl && (image.directUrl.startsWith('http://') || image.directUrl.startsWith('https://') || image.directUrl.startsWith('data:'))) {
    return image.directUrl;
  }
  if (image.filePath) {
    return `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${image.filePath}`;
  }
  return image.directUrl || '';
}

// Check Telegram Status (supports both backend proxy and direct client-side fallback)
export async function getTelegramStatus(): Promise<TelegramStatus> {
  try {
    const res = await fetch('/api/telegram/status');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Backend not available (e.g., static hosting on GitHub Pages), fallback to direct API
  }

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getMe`);
    const meData = await meRes.json();
    return {
      ok: meData.ok,
      bot: meData.result || null,
      channelUrl: TELEGRAM_CONFIG.channelUrl,
      configuredChatId: TELEGRAM_CONFIG.chatId,
      error: meData.description || null
    };
  } catch (err: any) {
    return {
      ok: false,
      channelUrl: TELEGRAM_CONFIG.channelUrl,
      configuredChatId: TELEGRAM_CONFIG.chatId,
      error: err.message || 'Could not connect to Telegram'
    };
  }
}

// Helper to resolve Telegram file_path
export async function resolveTelegramFilePathClient(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return data.result.file_path;
    }
  } catch (e) {
    console.error('Failed to get Telegram file path:', e);
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
  }
): Promise<GalleryImage> {
  // 1. Try Backend Proxy endpoint if available
  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', meta.title);
    formData.append('caption', meta.caption || '');
    formData.append('album', meta.album);
    formData.append('tags', JSON.stringify(meta.tags));

    const res = await fetch('/api/upload-single', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.image) {
        return data.image;
      }
    }
  } catch {
    console.warn('Backend proxy upload unavailable, using direct client-side Telegram upload fallback');
  }

  // 2. Client-side direct upload fallback (for GitHub Pages static hosting)
  const tgCaptionParts = [
    `📸 ${meta.title}`,
    meta.caption ? `\n💬 ${meta.caption}` : '',
    meta.album ? `\n📁 Album: #${meta.album.replace(/\s+/g, '_')}` : '',
    meta.tags.length > 0 ? `\n🏷️ ${meta.tags.map(t => `#${t.replace(/\s+/g, '_')}`).join(' ')}` : '',
    `\n⏰ ${new Date().toLocaleString()}`
  ].filter(Boolean).join('');

  let tgData: any = null;

  // Try sendPhoto first
  try {
    const photoFormData = new FormData();
    photoFormData.append('chat_id', TELEGRAM_CONFIG.chatId);
    photoFormData.append('photo', file, file.name);
    photoFormData.append('caption', tgCaptionParts.slice(0, 1024));

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendPhoto`, {
      method: 'POST',
      body: photoFormData,
    });
    tgData = await res.json();
  } catch (err) {
    console.warn('sendPhoto direct request failed, trying document:', err);
  }

  // If sendPhoto failed or was skipped, send as document
  if (!tgData || !tgData.ok) {
    const docFormData = new FormData();
    docFormData.append('chat_id', TELEGRAM_CONFIG.chatId);
    docFormData.append('document', file, file.name);
    docFormData.append('caption', tgCaptionParts.slice(0, 1024));

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendDocument`, {
      method: 'POST',
      body: docFormData,
    });
    tgData = await res.json();
  }

  if (!tgData?.ok || !tgData.result) {
    throw new Error(tgData?.description || 'Failed to upload photo to Telegram');
  }

  let fileId = '';
  let fileUniqueId = '';
  let thumbnailFileId = '';
  let width = 0;
  let height = 0;
  const messageId = tgData.result.message_id;

  if (tgData.result.photo && Array.isArray(tgData.result.photo) && tgData.result.photo.length > 0) {
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

  const [filePath, thumbnailFilePath] = await Promise.all([
    resolveTelegramFilePathClient(fileId),
    thumbnailFileId ? resolveTelegramFilePathClient(thumbnailFileId) : Promise.resolve(null),
  ]);

  const directUrl = filePath 
    ? `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${filePath}`
    : `/api/telegram/image/${fileId}`;

  const thumbnailUrl = thumbnailFilePath
    ? `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${thumbnailFilePath}`
    : undefined;

  const imageDoc: GalleryImage = {
    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: meta.title,
    caption: meta.caption || '',
    album: meta.album || 'Personal',
    tags: meta.tags,
    fileId,
    fileUniqueId,
    filePath: filePath || '',
    directUrl,
    thumbnailUrl,
    thumbnailFilePath: thumbnailFilePath || undefined,
    thumbnailFileId: thumbnailFileId || undefined,
    telegramMessageId: messageId,
    channelUrl: TELEGRAM_CONFIG.channelUrl,
    width,
    height,
    fileSize: file.size,
    mimeType: file.type || 'image/jpeg',
    isFavorite: false,
    createdAt: Date.now(),
    uploadedAt: new Date().toISOString()
  };

  return imageDoc;
}

// Safely delete message from Telegram channel (supports direct client-side fallback)
export async function deleteTelegramMessage(messageId: number): Promise<boolean> {
  try {
    // Try backend proxy if available
    const serverRes = await fetch(`/api/telegram/message/${messageId}`, { method: 'DELETE' });
    if (serverRes.ok) return true;
  } catch {
    // Fall back to direct Telegram API
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/deleteMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CONFIG.chatId,
          message_id: messageId,
        }),
      }
    );
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.warn('Could not delete Telegram message from channel:', err);
    return false;
  }
}
