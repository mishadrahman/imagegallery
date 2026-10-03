import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
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
export const auth = getAuth(app);
export const db = getFirestore(app);

const COLLECTION_NAME = 'gallery_images';
const ALBUMS_COLLECTION = 'user_albums';
const LOCAL_STORAGE_KEY = 'cloudpic_cached_images';
const ALBUMS_STORAGE_KEY = 'cloudpic_cached_albums';
const LOCKED_ALBUMS_STORAGE_KEY = 'cloudpic_locked_albums';

export const INITIAL_STARTER_IMAGES: GalleryImage[] = [];

// Deterministic hash for album PIN/password
export function hashAlbumPin(pin: string): string {
  const clean = pin.trim();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0, ch; i < clean.length; i++) {
    ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'cp_lock_' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export function verifyAlbumPin(inputPin: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const cleanInput = inputPin.trim();
  if (!cleanInput) return false;
  if (storedHash.startsWith('cp_lock_')) {
    return hashAlbumPin(cleanInput) === storedHash;
  }
  return cleanInput === storedHash;
}

export function getLockedAlbumsCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCKED_ALBUMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read locked albums cache', err);
  }
  return {};
}

export function setLockedAlbumsCache(lockedMap: Record<string, string>): void {
  try {
    localStorage.setItem(LOCKED_ALBUMS_STORAGE_KEY, JSON.stringify(lockedMap));
  } catch (err) {
    console.warn('Failed to save locked albums cache', err);
  }
}

// Helper to get local cache

export function getLocalCache(): GalleryImage[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any leftover starter images from previous test sessions
        const clean = parsed.filter(
          (img: any) =>
            img &&
            typeof img.id === 'string' &&
            !img.id.startsWith('starter_') &&
            !(typeof img.directUrl === 'string' && img.directUrl.includes('unsplash.com'))
        );
        return clean;
      }
    }
    return [];
  } catch (err) {
    console.warn('Failed to read local cache', err);
    return [];
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
            album: data.album || '',
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
      album: image.album || '',
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
  updates: Partial<GalleryImage>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates as any);

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

// Subscribe to real-time album updates (including locked status & password hashes)
export function subscribeToAlbums(
  onData: (albums: string[], lockedMap: Record<string, string>) => void
): () => void {
  try {
    const q = query(collection(db, ALBUMS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: string[] = [];
        const lockedMap: Record<string, string> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name) {
            list.push(data.name);
            if (data.isLocked && data.passwordHash) {
              lockedMap[data.name.trim().toLowerCase()] = data.passwordHash;
            }
          }
        });
        localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(list));
        setLockedAlbumsCache(lockedMap);
        onData(list, lockedMap);
      },
      (err) => {
        console.error('Firestore albums onSnapshot error:', err);
        const cached = localStorage.getItem(ALBUMS_STORAGE_KEY);
        const lockedCached = getLockedAlbumsCache();
        onData(cached ? JSON.parse(cached) : [], lockedCached);
      }
    );
  } catch (err) {
    console.error('Error establishing Albums subscription:', err);
    const cached = localStorage.getItem(ALBUMS_STORAGE_KEY);
    const lockedCached = getLockedAlbumsCache();
    onData(cached ? JSON.parse(cached) : [], lockedCached);
    return () => {};
  }
}

// Save an album name persistently
export async function saveAlbum(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  
  try {
    // Generate a safe document ID from the album name to prevent duplicates
    const safeId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, ALBUMS_COLLECTION, safeId);
    await setDoc(docRef, { name: trimmed, createdAt: Date.now() }, { merge: true });
    
    // Update local cache
    const cached = localStorage.getItem(ALBUMS_STORAGE_KEY);
    let list: string[] = cached ? JSON.parse(cached) : [];
    if (!list.includes(trimmed)) {
      list.unshift(trimmed);
      localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Error saving album to Firestore:', err);
    const cached = localStorage.getItem(ALBUMS_STORAGE_KEY);
    let list: string[] = cached ? JSON.parse(cached) : [];
    if (!list.includes(trimmed)) {
      list.unshift(trimmed);
      localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(list));
    }
  }
}

// Lock an album with a password/PIN
export async function setAlbumLock(albumName: string, password: string): Promise<string> {
  const trimmed = albumName.trim();
  const cleanPin = password.trim();
  if (!trimmed || !cleanPin) throw new Error('Album name and password are required');

  const passwordHash = hashAlbumPin(cleanPin);
  const key = trimmed.toLowerCase();

  // Optimistically update local cache immediately
  const currentLocked = getLockedAlbumsCache();
  currentLocked[key] = passwordHash;
  setLockedAlbumsCache(currentLocked);

  try {
    const safeId = key.replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, ALBUMS_COLLECTION, safeId);
    await setDoc(
      docRef,
      {
        name: trimmed,
        isLocked: true,
        passwordHash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error setting album lock in Firestore:', err);
  }

  return passwordHash;
}

// Remove password lock from an album permanently
export async function removeAlbumLock(albumName: string): Promise<void> {
  const trimmed = albumName.trim();
  if (!trimmed) return;

  const key = trimmed.toLowerCase();

  // Optimistically update local cache immediately
  const currentLocked = getLockedAlbumsCache();
  delete currentLocked[key];
  setLockedAlbumsCache(currentLocked);

  try {
    const safeId = key.replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, ALBUMS_COLLECTION, safeId);
    await setDoc(
      docRef,
      {
        name: trimmed,
        isLocked: false,
        passwordHash: '',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error removing album lock in Firestore:', err);
  }
}

// Strict Owner Email Access Control (Saved & Verified in Firestore)
export const OWNER_ALLOWED_EMAIL = 'mdmishadrahman500@gmail.com';
const ACCESS_CONFIG_COLLECTION = 'app_security_config';
const ACCESS_CONFIG_DOC_ID = 'allowed_access';

// Persist the allowed Gmail in Firestore so the rule is backed by Firestore
export async function ensureAllowedEmailInFirestore(): Promise<string[]> {
  const defaultAllowed = [OWNER_ALLOWED_EMAIL];
  try {
    const docRef = doc(db, ACCESS_CONFIG_COLLECTION, ACCESS_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(
        docRef,
        {
          ownerEmail: OWNER_ALLOWED_EMAIL,
          allowedEmails: defaultAllowed,
          strictAccessOnly: true,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      return defaultAllowed;
    }

    const data = snap.data();
    const existingList: string[] = Array.isArray(data?.allowedEmails)
      ? data.allowedEmails.map((e: string) => String(e).trim().toLowerCase())
      : [];

    if (!existingList.includes(OWNER_ALLOWED_EMAIL) || data?.ownerEmail !== OWNER_ALLOWED_EMAIL) {
      const updatedList = [OWNER_ALLOWED_EMAIL];
      await setDoc(
        docRef,
        {
          ownerEmail: OWNER_ALLOWED_EMAIL,
          allowedEmails: updatedList,
          strictAccessOnly: true,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      return updatedList;
    }

    return [OWNER_ALLOWED_EMAIL];
  } catch (err) {
    console.warn('Could not sync allowed email config with Firestore, using strict fallback:', err);
    return defaultAllowed;
  }
}

// Verify whether an email is authorized to log in
export async function verifyEmailAuthorized(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail !== OWNER_ALLOWED_EMAIL) {
    return false;
  }
  const allowedList = await ensureAllowedEmailInFirestore();
  return allowedList.includes(cleanEmail);
}

