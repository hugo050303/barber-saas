// Avisos al celular del barbero (notificaciones push): activar en este celular, probar y avisar.
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { firestore, auth } from '../firebase';
import { esDemo, mem, negocioDemo } from './demo';
import { textoAviso } from '../../server/textoAviso.js';

export const soportaAvisos = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
// En iPhone los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4+)
export const iphoneSinInstalar = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
  && !window.matchMedia?.('(display-mode: standalone)').matches && !navigator.standalone;
export const permisoAvisos = () => (typeof Notification === 'undefined' ? 'default' : Notification.permission);

async function registro() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!reg) return null; // sin service worker (por ejemplo, en desarrollo)
  return reg.active ? reg : Promise.race([navigator.serviceWorker.ready, new Promise((r) => { setTimeout(() => r(null), 4000); })]);
}
const bytes = (b64) => { const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
async function idDe(endpoint) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function nombreDispositivo() {
  const ua = navigator.userAgent;
  const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computadora';
  const nav = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return nav ? `${so} · ${nav}` : so;
}

// En la demo el aviso sale en este mismo navegador, sin servidor
const CLAVE_DEMO = 'avisosDemo';
const demoActivo = () => { try { return sessionStorage.getItem(CLAVE_DEMO) === '1'; } catch { return false; } };
async function mostrarLocal(datos) {
  const opciones = { body: datos.body, icon: '/icono-192.png', badge: '/icono-192.png', tag: datos.tag, data: { url: datos.url } };
  const reg = soportaAvisos() ? await registro() : null;
  if (reg) return reg.showNotification(datos.title, opciones);
  const n = new Notification(datos.title, opciones);
  n.onclick = () => { window.focus(); if (datos.url) window.location.href = datos.url; };
  return n;
}

// ¿Este celular ya recibe avisos?
export async function avisosActivos() {
  if (esDemo()) return demoActivo() && permisoAvisos() === 'granted';
  if (!soportaAvisos() || permisoAvisos() !== 'granted') return false;
  const reg = await registro();
  return !!(reg && await reg.pushManager.getSubscription());
}

// La suscripción de este celular (la crea si no existe)
async function suscripcionPush() {
  const reg = await registro();
  if (!reg) throw new Error('sin-sw');
  const publica = await fetch('/api/avisos').then((r) => (r.ok ? r.json() : null)).then((j) => j?.publica).catch(() => null);
  if (!publica) throw new Error('sin-servidor');
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(publica) });
  return sub.toJSON();
}

export async function activarAvisos(negocioId) {
  if (!('Notification' in window)) throw new Error('sin-soporte');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('sin-permiso');
  if (esDemo()) {
    try { sessionStorage.setItem(CLAVE_DEMO, '1'); } catch { /* sin almacenamiento */ }
    await mostrarLocal({ title: '¡Listo! Así te llegarán los avisos', body: 'Prueba apartar una cita en tu página de reservas de la demo.', url: '/app', tag: 'prueba' });
    return;
  }
  const { endpoint, keys } = await suscripcionPush();
  await setDoc(doc(firestore, `negocios/${negocioId}/dispositivos/${await idDe(endpoint)}`), { endpoint, keys, nombre: nombreDispositivo(), creado: new Date().toISOString() });
}

export async function desactivarAvisos(negocioId) {
  if (esDemo()) { try { sessionStorage.removeItem(CLAVE_DEMO); } catch { /* sin almacenamiento */ } return; }
  const reg = await registro();
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) return;
  await deleteDoc(doc(firestore, `negocios/${negocioId}/dispositivos/${await idDe(sub.endpoint)}`)).catch(() => {});
  await sub.unsubscribe();
}

export async function listarDispositivos(negocioId) {
  if (esDemo()) return demoActivo() ? [{ id: 'demo', nombre: 'Este navegador (demo)', creado: new Date().toISOString() }] : [];
  const snap = await getDocs(collection(firestore, `negocios/${negocioId}/dispositivos`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export const quitarDispositivo = (negocioId, id) => deleteDoc(doc(firestore, `negocios/${negocioId}/dispositivos/${id}`));

export async function probarAvisos() {
  if (esDemo()) return mostrarLocal({ title: '¡Listo! Así te llegarán los avisos', body: 'Este es un aviso de prueba.', url: '/app', tag: 'prueba' });
  const idToken = await auth.currentUser.getIdToken();
  const r = await fetch('/api/avisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'probar', idToken }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No se pudo mandar el aviso de prueba.');
  return j;
}

// La página de reservas avisa a la barbería (nueva cita, cancelación o cambio). Nunca falla en voz alta.
export function avisarBarberia(negocioId, citaId, anteriorId) {
  if (esDemo()) {
    if (!demoActivo() || permisoAvisos() !== 'granted') return;
    const cita = mem.obtener('citas', citaId); if (!cita) return;
    const anterior = anteriorId ? mem.obtener('citas', anteriorId) : null;
    const tipo = anterior ? 'cambio' : cita.estado === 'cancelada' ? 'cancelada' : 'nueva';
    const datos = textoAviso({ tipo, cita, anterior, barbero: mem.obtener('barberos', cita.barbero_id)?.nombre, servicio: mem.obtener('servicios', cita.servicio_id)?.nombre, zona: negocioDemo()?.zona });
    mostrarLocal(datos).catch(() => {});
    return;
  }
  try {
    fetch('/api/avisos', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cita', negocio: negocioId, cita: citaId, ...(anteriorId ? { anterior: anteriorId } : {}) }) }).catch(() => {});
  } catch { /* sin conexión: el barbero lo verá en su agenda */ }
}

// ---------- Recordatorio para el cliente (un día antes de su cita) ----------
const CLAVE_RECORDATORIOS = 'recordatoriosPedidos';
export function tieneRecordatorio(citaId) {
  try { return JSON.parse(localStorage.getItem(CLAVE_RECORDATORIOS) || '[]').includes(citaId); } catch { return false; }
}
function recordarPedido(citaId) {
  try { const l = JSON.parse(localStorage.getItem(CLAVE_RECORDATORIOS) || '[]'); localStorage.setItem(CLAVE_RECORDATORIOS, JSON.stringify([...l.filter((x) => x !== citaId), citaId].slice(-20))); } catch { /* sin almacenamiento */ }
}
export const puedeRecordar = () => esDemo() ? 'Notification' in window : soportaAvisos();

export async function pedirRecordatorio(negocioId, citaId) {
  if (!('Notification' in window)) throw new Error('sin-soporte');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('sin-permiso');
  if (esDemo()) {
    await mostrarLocal({ title: 'Así te llegará tu recordatorio', body: 'Un día antes de tu cita, con el link para cambiarla o cancelarla.', url: window.location.pathname, tag: 'prueba-recordatorio' });
  } else {
    const suscripcion = await suscripcionPush();
    const r = await fetch('/api/avisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'recordatorio', negocio: negocioId, cita: citaId, suscripcion }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo guardar tu recordatorio.');
  }
  recordarPedido(citaId);
}
