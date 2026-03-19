/**
 * IndexedDB-based file storage ported from the original Forgeon app.
 * Handles binary file persistence for game assets (images, audio, etc.).
 */

const DB_NAME = 'ForgeonDB';
const DB_VERSION = 1;
let db = null;

/**
 * Initializes (or re-opens) the IndexedDB database
 * @returns {Promise<IDBDatabase>} The opened database instance
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('files')) {
        const objectStore = database.createObjectStore('files', { keyPath: 'id' });
        objectStore.createIndex('assetId', 'assetId', { unique: false });
      }
    };
  });
}

/**
 * Stores a file blob in IndexedDB keyed by asset ID
 * @param {string} assetId - The asset identifier
 * @param {File} file - The File/Blob to store
 * @returns {Promise<Object>} The stored file metadata
 */
export async function saveFile(assetId, file) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readwrite');
    const objectStore = transaction.objectStore('files');

    const fileData = {
      id: assetId,
      assetId: assetId,
      file: file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
    };

    const request = objectStore.put(fileData);
    request.onsuccess = () => resolve(fileData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves a file record from IndexedDB by asset ID
 * @param {string} assetId - The asset identifier
 * @returns {Promise<Object|undefined>} The file record or undefined
 */
export async function getFile(assetId) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readonly');
    const objectStore = transaction.objectStore('files');
    const request = objectStore.get(assetId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Removes a file from IndexedDB by asset ID
 * @param {string} assetId - The asset identifier
 * @returns {Promise<void>}
 */
export async function deleteFile(assetId) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['files'], 'readwrite');
    const objectStore = transaction.objectStore('files');
    const request = objectStore.delete(assetId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates a 200×200 JPEG thumbnail for image files
 * @param {File} file - The image file
 * @returns {Promise<string|null>} Base64 data URL of the thumbnail, or null for non-images
 */
export async function createThumbnail(file) {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formats a byte count into a human-readable file size string
 * @param {number} bytes - The file size in bytes
 * @returns {string} Formatted size (e.g. "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
