// Fotos: se comprimen en el navegador y se suben a Cloud Storage.
// Una foto de celular (3-5 MB) queda en ~100-250 KB: carga rápido y casi no cuesta.
import { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app, usarEmulador } from '../firebase';

const storage = getStorage(app);
if (usarEmulador) connectStorageEmulator(storage, '127.0.0.1', 9199);

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

// Sube y regresa la URL pública (con versión para que no se quede la foto vieja en caché)
export async function subirImagen(ruta, blob) {
  const r = ref(storage, ruta);
  await uploadBytes(r, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
  const url = await getDownloadURL(r);
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

export async function borrarImagen(ruta) {
  try { await deleteObject(ref(storage, ruta)); } catch (e) { if (e.code !== 'storage/object-not-found') throw e; }
}

export function mensajeErrorFoto(e) {
  if (e?.code === 'storage/unauthorized') return 'Las fotos son parte de los planes Pro y Plus.';
  if (e?.code === 'storage/retry-limit-exceeded' || e?.code === 'storage/unknown') return 'No se pudo subir la foto. Revisa tu conexión.';
  return e?.message?.startsWith('El archivo') ? e.message : 'No se pudo subir la foto.';
}
