// Fotos: se comprimen en el navegador y se suben a Vercel Blob (incluido en Vercel Pro).
// Una foto de celular (3-5 MB) queda en ~100-250 KB: carga rápido y casi no cuesta.
// La subida pasa por /api/fotos, que revisa sesión, plan vigente y nombre de archivo (server/fotos.js).
// Alternativa: FOTOS_PROVEEDOR = 'firebase' usa Cloud Storage (requiere plan Blaze).
import { auth, app, usarEmulador } from '../firebase';
import { esDemo } from './demo';
import { FOTOS_PROVEEDOR } from '../config';

// Redimensiona y convierte a WebP (o JPEG si el navegador no sabe hacer WebP)
export async function comprimir(archivo, { ladoMax = 1600, calidad = 0.8, cuadrada = false } = {}) {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const bitmap = await createImageBitmap(archivo);
  let { width: w, height: h } = bitmap;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (cuadrada) { const l = Math.min(w, h); sx = (w - l) / 2; sy = (h - l) / 2; sw = sh = l; w = h = l; }
  const escala = Math.min(1, ladoMax / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * escala); canvas.height = Math.round(h * escala);
  canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const aBlob = (tipo) => new Promise((r) => canvas.toBlob(r, tipo, calidad));
  let blob = await aBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await aBlob('image/jpeg');
  return blob;
}

const tokenSesion = async () => {
  if (!auth.currentUser) throw new Error('Inicia sesión para subir fotos.');
  return auth.currentUser.getIdToken();
};

// ---------- Firebase Storage (solo si FOTOS_PROVEEDOR = 'firebase') ----------
let storageFirebase = null;
async function firebaseStorage() {
  const m = await import('firebase/storage');
  if (!storageFirebase) {
    storageFirebase = m.getStorage(app);
    if (usarEmulador) m.connectStorageEmulator(storageFirebase, '127.0.0.1', 9199);
  }
  return { m, storage: storageFirebase };
}

// Sube y regresa la URL pública
export async function subirImagen(ruta, blob) {
  if (esDemo()) return URL.createObjectURL(blob); // en la demo la foto solo vive en este aparato
  if (FOTOS_PROVEEDOR === 'vercel') {
    const { upload } = await import('@vercel/blob/client');
    const r = await upload(ruta, blob, { access: 'public', handleUploadUrl: '/api/fotos', clientPayload: await tokenSesion(), contentType: blob.type });
    return r.url;
  }
  const { m, storage } = await firebaseStorage();
  const r = m.ref(storage, ruta);
  await m.uploadBytes(r, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
  const url = await m.getDownloadURL(r);
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

// Borra una foto (url = la que se guardó en la ficha). Si ya no existe, no pasa nada.
export async function borrarImagen(ruta, url) {
  if (esDemo() || !url) return;
  if (FOTOS_PROVEEDOR === 'vercel') {
    if (!url.includes('.blob.vercel-storage.com')) return;
    const r = await fetch('/api/fotos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'borrar', url, idToken: await tokenSesion() }),
    });
    if (!r.ok && r.status !== 404) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo borrar la foto.');
    return;
  }
  const { m, storage } = await firebaseStorage();
  try { await m.deleteObject(m.ref(storage, ruta)); } catch (e) { if (e.code !== 'storage/object-not-found') throw e; }
}

export function mensajeErrorFoto(e) {
  const msg = String(e?.message || '');
  if (e?.code === 'storage/unauthorized' || /Pro y Plus/.test(msg)) return 'Las fotos son parte de los planes Pro y Plus.';
  if (/sesión/i.test(msg)) return msg;
  if (/no están activadas/.test(msg)) return 'Las fotos todavía no están activadas. Avísale al administrador.';
  if (/too large|demasiado|size/i.test(msg)) return 'La foto es muy pesada.';
  if (e?.code === 'storage/retry-limit-exceeded' || /network|fetch/i.test(msg)) return 'No se pudo subir la foto. Revisa tu conexión.';
  return msg.startsWith('El archivo') ? msg : 'No se pudo subir la foto.';
}
