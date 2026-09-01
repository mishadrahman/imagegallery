import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { GalleryImage } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyDjRqxml8UB0lNWynMIZxKdd1ejurpbRRA",
  authDomain: "tapping-game-79706.firebaseapp.com",
  databaseURL: "https://tapping-game-79706-default-rtdb.firebaseio.com",
  projectId: "tapping-game-79706",
  storageBucket: "tapping-game-79706.appspot.com",
  messagingSenderId: "505389999353",
  appId: "1:505389999353:web:78c32ac9c8f383e3756e28",
  measurementId: "G-NS9HQZHFQ3"
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION_NAME = 'gallery_images';
const LOCAL_STORAGE_KEY = 'cloudpic_cached_images';

export const INITIAL_STARTER_IMAGES: GalleryImage[] = [
  {
    id: "starter_1",
    title: "Golden Hour Mountain Ridge",
    caption: "Sunset over the alpine peaks with glowing cloud layers.",
    album: "Travel",
    tags: ["Nature", "Mountains", "Sunset", "Landscape"],
    fileId: "starter_tg_001",
    directUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 101,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 1845000,
    mimeType: "image/jpeg",
    isFavorite: true,
    createdAt: Date.now() - 3600 * 1000 * 24 * 3,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString()
  },
  {
    id: "starter_2",
    title: "Neon Cyberpunk Streets",
    caption: "Tokyo night street photography with vivid neon reflections.",
    album: "Portraits",
    tags: ["Urban", "City", "Night", "Lights"],
    fileId: "starter_tg_002",
    directUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 102,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 2150000,
    mimeType: "image/jpeg",
    isFavorite: false,
    createdAt: Date.now() - 3600 * 1000 * 24 * 2,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString()
  },
  {
    id: "starter_3",
    title: "Emerald Coast Wave Swell",
    caption: "Crystalline turquoise sea cresting along tropical reef shoreline.",
    album: "Travel",
    tags: ["Ocean", "Coast", "Beach", "Water"],
    fileId: "starter_tg_003",
    directUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 103,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 1980000,
    mimeType: "image/jpeg",
    isFavorite: true,
    createdAt: Date.now() - 3600 * 1000 * 24 * 1,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString()
  },
  {
    id: "starter_4",
    title: "Cozy Artisan Coffee Studio",
    caption: "Morning roast and latte art in an old brick studio cafe.",
    album: "Personal",
    tags: ["Coffee", "Morning", "Aesthetic", "Cafe"],
    fileId: "starter_tg_004",
    directUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 104,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 1420000,
    mimeType: "image/jpeg",
    isFavorite: false,
    createdAt: Date.now() - 3600 * 1000 * 12,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
  },
  {
    id: "starter_5",
    title: "Family Autumn Afternoon",
    caption: "Golden maple tree canopy in the autumn park.",
    album: "Family",
    tags: ["Family", "Autumn", "Park", "Joy"],
    fileId: "starter_tg_005",
    directUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 105,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 2310000,
    mimeType: "image/jpeg",
    isFavorite: true,
    createdAt: Date.now() - 3600 * 1000 * 6,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
  },
  {
    id: "starter_6",
    title: "Nordic Minimalist Architecture",
    caption: "Modern geometric facade with glass reflections and timber woodwork.",
    album: "Events",
    tags: ["Architecture", "Design", "Minimal", "Nordic"],
    fileId: "starter_tg_006",
    directUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    telegramMessageId: 106,
    channelUrl: "https://t.me/+V3OkDk0rM_82MmRl",
    width: 1600,
    height: 1067,
    fileSize: 1650000,
    mimeType: "image/jpeg",
    isFavorite: false,
    createdAt: Date.now() - 3600 * 1000 * 2,
    uploadedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
  }
];

// Helper to get local cache
export function getLocalCache(): GalleryImage[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return INITIAL_STARTER_IMAGES;
  } catch (err) {
    console.warn('Failed to read local cache', err);
    return INITIAL_STARTER_IMAGES;
  }
}

// Helper to set local cache
export function setLocalCache(images: GalleryImage[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(images));
  } catch (err) {
    console.warn('Failed to save to local cache', err);
  }
}

// Subscribe to real-time image updates from Firestore
export function subscribeToGalleryImages(
  onData: (images: GalleryImage[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: GalleryImage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || 'Untitled',
            caption: data.caption || '',
            album: data.album || 'Personal',
            tags: Array.isArray(data.tags) ? data.tags : [],
            fileId: data.fileId || '',
            fileUniqueId: data.fileUniqueId || '',
            filePath: data.filePath || '',
            directUrl: data.directUrl || (data.fileId ? `/api/telegram/image/${data.fileId}` : ''),
            telegramMessageId: data.telegramMessageId,
            channelUrl: data.channelUrl || 'https://t.me/+V3OkDk0rM_82MmRl',
            width: data.width,
            height: data.height,
            fileSize: data.fileSize,
            mimeType: data.mimeType || 'image/jpeg',
            isFavorite: Boolean(data.isFavorite),
            createdAt: data.createdAt || Date.now(),
            uploadedAt: data.uploadedAt || new Date().toISOString()
          });
        });

        // Update local cache
        setLocalCache(list);
        onData(list);
      },
      (err) => {
        console.error('Firestore onSnapshot error:', err);
        // Fallback to local cache if network/permissions fail
        const cached = getLocalCache();
        onData(cached);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Error establishing Firestore subscription:', err);
    const cached = getLocalCache();
    onData(cached);
    if (onError) onError(err);
    return () => {};
  }
}

// Save or Update a single image record
export async function saveGalleryImage(image: GalleryImage): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, image.id);
    await setDoc(docRef, {
      title: image.title,
      caption: image.caption || '',
      album: image.album || 'Personal',
      tags: image.tags || [],
      fileId: image.fileId,
      fileUniqueId: image.fileUniqueId || '',
      filePath: image.filePath || '',
      directUrl: image.directUrl,
      telegramMessageId: image.telegramMessageId || null,
      channelUrl: image.channelUrl || 'https://t.me/+V3OkDk0rM_82MmRl',
      width: image.width || null,
      height: image.height || null,
      fileSize: image.fileSize || null,
      mimeType: image.mimeType || 'image/jpeg',
      isFavorite: Boolean(image.isFavorite),
      createdAt: image.createdAt || Date.now(),
      uploadedAt: image.uploadedAt || new Date().toISOString()
    }, { merge: true });

    // Also update local cache
    const current = getLocalCache();
    const idx = current.findIndex(i => i.id === image.id);
    if (idx >= 0) {
      current[idx] = image;
    } else {
      current.unshift(image);
    }
    setLocalCache(current);
  } catch (err) {
    console.error('Error saving image to Firestore:', err);
    // Persist locally
    const current = getLocalCache();
    const idx = current.findIndex(i => i.id === image.id);
    if (idx >= 0) {
      current[idx] = image;
    } else {
      current.unshift(image);
    }
    setLocalCache(current);
    throw err;
  }
}

// Update fields for an image
export async function updateImageDetails(
  id: string, 
  updates: Partial<Pick<GalleryImage, 'title' | 'caption' | 'album' | 'tags' | 'isFavorite'>>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);

    const current = getLocalCache();
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    setLocalCache(updated);
  } catch (err) {
    console.error('Error updating image in Firestore:', err);
    const current = getLocalCache();
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    setLocalCache(updated);
    throw err;
  }
}

// Delete image from Firestore
export async function deleteGalleryImage(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    const current = getLocalCache().filter(item => item.id !== id);
    setLocalCache(current);
  } catch (err) {
    console.error('Error deleting image from Firestore:', err);
    const current = getLocalCache().filter(item => item.id !== id);
    setLocalCache(current);
    throw err;
  }
}

// Batch delete images
export async function batchDeleteGalleryImages(ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.delete(docRef);
    });
    await batch.commit();

    const current = getLocalCache().filter(item => !ids.includes(item.id));
    setLocalCache(current);
  } catch (err) {
    console.error('Error batch deleting images:', err);
    const current = getLocalCache().filter(item => !ids.includes(item.id));
    setLocalCache(current);
    throw err;
  }
}
