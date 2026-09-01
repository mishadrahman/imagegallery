export interface GalleryImage {
  id: string;
  title: string;
  caption?: string;
  album: string;
  tags: string[];
  fileId: string;
  fileUniqueId?: string;
  filePath?: string;
  directUrl: string;
  thumbnailUrl?: string;
  thumbnailFilePath?: string;
  thumbnailFileId?: string;
  microThumbnail?: string;
  telegramMessageId?: number;
  channelUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  originalFileSize?: number;
  savedPercent?: number;
  mimeType?: string;
  isFavorite?: boolean;
  createdAt: number;
  uploadedAt: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  caption: string;
  album: string;
  tags: string[];
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedImage?: GalleryImage;
  resultImage?: GalleryImage;
  originalSize?: number;
  optimizedSize?: number;
  savedPercent?: number;
}

export interface TelegramStatus {
  ok: boolean;
  bot?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  chat?: {
    id: number;
    title?: string;
    type: string;
  };
  channelUrl?: string;
  configuredChatId?: string;
  error?: string;
}

export type ViewMode = 'masonry' | 'grid' | 'compact';
export type SortOption = 'newest' | 'oldest' | 'title' | 'size';
