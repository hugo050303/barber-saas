// Avisos al celular del barbero (notificaciones push), desde api/avisos.js.
//
// - El dueño activa los avisos en su celular: el navegador crea una "suscripción" y la app la guarda
//   en negocios/{uid}/dispositivos (solo el dueño la puede leer o escribir).
// - Cuando un cliente aparta, cancela o cambia su cita por link, su página llama a /api/avisos con
//   el id de la cita. El servidor lee la cita con la cuenta de servicio de Firebase (así nadie puede
//   inventar el texto del aviso), la marca como avisada (para no avisar dos veces) y manda el aviso.
//
// Variables en Vercel: FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de servicio), VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY (se generan en el panel de administración).
import { importPKCS8, SignJWT } from 'jose';
import webpush from 'web-push';
import { verificarTokenFirebase, PROYECTO } from './fotos.js';
import { textoAviso } from './textoAviso.js';

export class ErrorAviso extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const VENTANA_NUEVA = 15 * 60 * 1000; // solo se avisa de citas recién creadas

// ---------- Firestore con la cuenta de servicio ----------
let tokenGuardado = null;
export async function tokenAdmin() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return 'owner';
  if (tokenGuardado && tokenGuardado.vence > Date.now() + 60000) return tokenGuardado.token;
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!crudo) throw new ErrorAviso('Los avisos todavía no están activados en el servidor.', 503);
  let cuenta;
  try { cuenta = JSON.parse(crudo.trim().startsWith('{') ? crudo : Buffer.from(crudo, 'base64').toString('utf8')); }
  catch { throw new ErrorAviso('La llave de Firebase del servidor no es válida.', 500); }
  const ahora = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: cuenta.private_key_id })
    .setIssuer(cuenta.client_email).setSubject(cuenta.client_email)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt(ahora).setExpirationTime(ahora + 3600)
    .sign(await importPKCS8(cuenta.private_key, 'RS256'));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!r.ok) throw new ErrorAviso('Google no aceptó la llave del servidor.', 502);
  const j = await r.json();
  tokenGuardado = { token: j.access_token, vence: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenGuardado.token;
}

function deFirestore(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return campos(v.mapValue.fields);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(deFirestore);
  return null;
}
const campos = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, deFirestore(v)]));

export function firestoreAdmin() {
  const base = process.env.FIRESTORE_EMULATOR_HOST
    ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROYECTO}/databases/(default)/documents`
    : `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
  const pedir = async (ruta, opciones = {}) => fetch(`${base}/${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${await tokenAdmin()}`, 'Content-Type': 'application/json' } });
  return {
    async leer(ruta) {
      const r = await pedir(ruta);
      if (r.status === 404) return null;
      if (!r.ok) throw new ErrorAviso('No se pudo leer la cita.', 502);
      const d = await r.json();
      return { id: d.name.split('/').pop(), ...campos(d.fields) };
    },
    async listar(ruta) {
      const r = await pedir(`${ruta}?pageSize=50`);
      if (!r.ok) return [];
      return ((await r.json()).documents || []).map((d) => ({ id: d.name.split('/').pop(), ...campos(d.fields) }));
    },
    async marcar(ruta, campo) {
      const r = await pedir(`${ruta}?updateMask.fieldPaths=${campo}&currentDocument.exists=true`, { method: 'PATCH', body: JSON.stringify({ fields: { [campo]: { booleanValue: true } } }) });
      if (!r.ok) throw new ErrorAviso('No se pudo marcar la cita.', 502);
    },
    async borrar(ruta) { await pedir(ruta, { method: 'DELETE' }); },
  };
}

// ---------- Envío ----------
// Llave pública de los avisos (el navegador la necesita para suscribirse)
export function llavePublica() {
  const publica = process.env.VAPID_PUBLIC_KEY;
  if (!publica || !process.env.VAPID_PRIVATE_KEY) throw new ErrorAviso('Los avisos todavía no están activados en el servidor.', 503);
  return publica;
}

function enviarPush(suscripcion, datos) {
  webpush.setVapidDetails('https://reservas.somosdom.com', llavePublica(), process.env.VAPID_PRIVATE_KEY);
  return webpush.sendNotification(suscripcion, JSON.stringify(datos), { TTL: 6 * 3600, urgency: 'high' });
}

// Manda el aviso a todos los celulares del dueño; borra los que ya no existen
export async function enviarATodos(nid, datos, { db = firestoreAdmin(), enviar = enviarPush } = {}) {
  const dispositivos = await db.listar(`negocios/${nid}/dispositivos`);
  let enviados = 0;
  await Promise.all(dispositivos.map(async (d) => {
    try { await enviar({ endpoint: d.endpoint, keys: d.keys }, datos); enviados++; }
    catch (e) {
      if (e instanceof ErrorAviso) throw e;
      if (e.statusCode === 404 || e.statusCode === 410) await db.borrar(`negocios/${nid}/dispositivos/${d.id}`);
    }
  }));
  return { enviados, dispositivos: dispositivos.length };
}

// Una cita nueva por link, una cancelación o un cambio hecho por el cliente
export async function avisarCita({ negocio, cita, anterior }, { db = firestoreAdmin(), enviar = enviarPush, ahora = Date.now() } = {}) {
  if (!ID.test(negocio || '') || !ID.test(cita || '') || (anterior && !ID.test(anterior))) throw new ErrorAviso('Solicitud inválida');
  const rutaCita = `negocios/${negocio}/citas/${cita}`;
  const c = await db.leer(rutaCita);
  if (!c) throw new ErrorAviso('No existe esa cita.', 404);

  let tipo = null; let previa = null;
  if (c.estado === 'cancelada') {
    if (c.cancelada_por === 'cliente' && !c.cambio && !c.avisada_cancelacion) tipo = 'cancelada';
  } else if (c.origen === 'web' && !c.avisada && ahora - Date.parse(c.created_at || 0) < VENTANA_NUEVA) {
    tipo = 'nueva';
    if (anterior) {
      const a = await db.leer(`negocios/${negocio}/citas/${anterior}`);
      if (a && a.estado === 'cancelada' && a.cambio && !a.avisada_cancelacion && a.cliente_telefono === c.cliente_telefono) {
        tipo = 'cambio'; previa = a;
        await db.marcar(`negocios/${negocio}/citas/${anterior}`, 'avisada_cancelacion');
      }
    }
  }
  if (!tipo) return { enviados: 0, motivo: 'sin-aviso' };
  await db.marcar(rutaCita, tipo === 'cancelada' ? 'avisada_cancelacion' : 'avisada');

  const [n, b, s] = await Promise.all([
    db.leer(`negocios/${negocio}`),
    c.barbero_id ? db.leer(`negocios/${negocio}/barberos/${c.barbero_id}`) : null,
    c.servicio_id ? db.leer(`negocios/${negocio}/servicios/${c.servicio_id}`) : null,
  ]);
  const datos = textoAviso({ tipo, cita: c, anterior: previa, barbero: b?.nombre, servicio: s?.nombre, zona: n?.zona });
  return { tipo, ...(await enviarATodos(negocio, datos, { db, enviar })) };
}

// El dueño prueba que le lleguen los avisos
export async function avisoDePrueba({ idToken }, { db = firestoreAdmin(), enviar = enviarPush, verificar = verificarTokenFirebase } = {}) {
  const uid = await verificar(idToken);
  const r = await enviarATodos(uid, { title: '¡Listo! Así te llegarán los avisos', body: 'Te avisaremos cuando alguien aparte, cancele o cambie su cita por tu link.', url: '/app', tag: 'prueba' }, { db, enviar });
  if (!r.dispositivos) throw new ErrorAviso('Primero activa los avisos en este celular.', 404);
  return r;
}
