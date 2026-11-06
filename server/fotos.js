// Reglas de seguridad para las fotos en Vercel Blob (se usan desde api/fotos.js).
// Antes de dejar subir o borrar una foto se revisa:
//   1. que la sesión de Firebase sea válida (token firmado por Google para este proyecto),
//   2. que la foto vaya en la carpeta de SU barbería y con un nombre permitido,
//   3. que la barbería tenga plan Pro o Plus vigente (para subir),
//   4. que, si es foto de barbero, ese barbero exista.
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const PROYECTO = process.env.FIREBASE_PROJECT_ID || 'barberia-659a5';

export const OPCIONES_SUBIDA = {
  allowedContentTypes: ['image/webp', 'image/jpeg', 'image/png'],
  maximumSizeInBytes: 2 * 1024 * 1024,   // 2 MB (las fotos llegan comprimidas, ~100-250 KB)
  addRandomSuffix: true,                 // cada versión tiene su propia URL: nunca se queda la foto vieja en caché
  cacheControlMaxAge: 60 * 60 * 24 * 365,
};

export class ErrorFoto extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

// ---------- Sesión de Firebase ----------
const llavesGoogle = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export async function verificarTokenFirebase(token) {
  if (!token) throw new ErrorFoto('Inicia sesión para subir fotos.', 401);
  try {
    const { payload } = await jwtVerify(token, llavesGoogle, {
      issuer: `https://securetoken.google.com/${PROYECTO}`,
      audience: PROYECTO,
    });
    if (!payload.sub) throw new Error('sin uid');
    return payload.sub;
  } catch {
    throw new ErrorFoto('Tu sesión expiró. Vuelve a entrar.', 401);
  }
}

// ---------- Firestore (lectura con la sesión del usuario) ----------
export async function leerDocumento(ruta, idToken) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new ErrorFoto('No se pudo revisar tu plan. Inténtalo de nuevo.', 502);
  return (await r.json()).fields || {};
}

export function planDePagoVigente(campos, ahora = Date.now()) {
  const plan = campos?.plan?.stringValue;
  const hasta = campos?.proHasta?.timestampValue;
  return ['pro', 'plus'].includes(plan) && !!hasta && new Date(hasta).getTime() > ahora;
}

// ---------- Nombres permitidos ----------
// negocios/{uid}/logo · negocios/{uid}/portada · negocios/{uid}/galeria/0..11 · negocios/{uid}/barberos/{id}
export function analizarRuta(pathname, uid) {
  const m = /^negocios\/([^/]+)\/(logo|portada|galeria\/([0-9]|1[01])|barberos\/([A-Za-z0-9_-]{1,40}))$/.exec(pathname || '');
  if (!m || m[1] !== uid) throw new ErrorFoto('Solo puedes subir fotos a tu propia barbería.', 403);
  return { barberoId: m[4] || null };
}

// ---------- Autorizaciones ----------
export async function autorizarSubida({ pathname, idToken, verificar = verificarTokenFirebase, leer = leerDocumento, ahora = Date.now() }) {
  const uid = await verificar(idToken);
  const { barberoId } = analizarRuta(pathname, uid);
  const negocio = await leer(`negocios/${uid}`, idToken);
  if (!negocio) throw new ErrorFoto('No encontramos tu barbería.', 404);
  if (!planDePagoVigente(negocio, ahora)) throw new ErrorFoto('Las fotos son parte de los planes Pro y Plus.', 403);
  if (barberoId && !(await leer(`negocios/${uid}/barberos/${barberoId}`, idToken))) throw new ErrorFoto('Ese barbero no existe.', 404);
  return { uid };
}

// Solo se pueden borrar fotos de Vercel Blob que estén en la carpeta de tu barbería
export async function autorizarBorrado({ url, idToken, verificar = verificarTokenFirebase }) {
  const uid = await verificar(idToken);
  let u;
  try { u = new URL(url); } catch { throw new ErrorFoto('Dirección de foto inválida.'); }
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.blob.vercel-storage.com')) throw new ErrorFoto('Esa foto no es de esta app.', 403);
  if (!decodeURIComponent(u.pathname).startsWith(`/negocios/${uid}/`)) throw new ErrorFoto('Solo puedes borrar fotos de tu propia barbería.', 403);
  return { uid };
}
