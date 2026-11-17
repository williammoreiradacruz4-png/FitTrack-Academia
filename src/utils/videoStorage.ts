const DB_NAME = 'fittrack_videos_db';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Erro ao abrir banco de vídeos.'));
  });
}

export async function saveVideoBlob(videoId: string, file: Blob): Promise<void> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, videoId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Erro ao salvar vídeo.'));
    };
  });
}

export async function getVideoBlob(videoId: string): Promise<Blob | null> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(videoId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as Blob | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Erro ao carregar vídeo.'));
    };
  });
}

export async function deleteVideoBlob(videoId: string): Promise<void> {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(videoId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Erro ao remover vídeo.'));
    };
  });
}

export function readVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

export interface ParsedVideoSource {
  kind: 'iframe' | 'video' | 'external';
  src: string;
}

export function parseVideoUrl(rawUrl: string): ParsedVideoSource | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    // YouTube
    if (host.includes('youtube.com') || host === 'youtu.be') {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/')[2] ?? '';
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/')[2] ?? '';
      } else {
        videoId = url.searchParams.get('v') ?? '';
      }
      if (videoId) {
        return {
          kind: 'iframe',
          src: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
        };
      }
    }

    // Vimeo
    if (host.includes('vimeo.com')) {
      const match = url.pathname.match(/\/(\d+)/);
      if (match?.[1]) {
        return {
          kind: 'iframe',
          src: `https://player.vimeo.com/video/${match[1]}`,
        };
      }
    }

    // Google Drive
    if (host.includes('drive.google.com')) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) {
        return {
          kind: 'iframe',
          src: `https://drive.google.com/file/d/${match[1]}/preview`,
        };
      }
    }

    // Direct video files
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.pathname)) {
      return {
        kind: 'video',
        src: trimmed,
      };
    }

    return {
      kind: 'external',
      src: trimmed,
    };
  } catch {
    return null;
  }
}
