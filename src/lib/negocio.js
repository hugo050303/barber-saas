// Operaciones de negocio que tocan varias colecciones a la vez.
import {
  doc, getDoc, setDoc, writeBatch, collection, getDocs, query, where, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { ruta } from '../db';
import { slugify, soloDigitos, aMinutos, inicioDia, finDia } from './formato';
import { HORARIO_DEFAULT } from '../config';

// ---------- Alta de negocio ----------

async function slugLibre(nombre) {
  const base = slugify(nombre);
  for (let i = 0; i < 20; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    const snap = await getDoc(doc(firestore, 'slugs', s));
    if (!snap.exists()) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function crearNegocio(user, { nombre, dueno, whatsapp }) {
  const slug = await slugLibre(nombre);
  const negRef = doc(collection(firestore, 'negocios'));
  const batch = writeBatch(firestore);
  batch.set(negRef, {
    nombre: nombre.trim(),
    slug,
    ownerUid: user.uid,
    whatsapp: soloDigitos(whatsapp),
    telefono: soloDigitos(whatsapp),
    direccion: '',
    mensaje_ticket: '¡Gracias por tu visita!',
    horario: HORARIO_DEFAULT,
    plan: 'gratis',
    proHasta: null,
    creado: serverTimestamp(),
  });
  batch.set(doc(firestore, 'slugs', slug), { negocioId: negRef.id });
  batch.set(doc(firestore, 'usuarios', user.uid), {
    negocioId: negRef.id,
    nombre: dueno.trim(),
    email: user.email,
    whatsapp: soloDigitos(whatsapp),
    creado: serverTimestamp(),
  });
  await batch.commit();
  return negRef.id;
}

export async function negocioPorSlug(slug) {
  const s = await getDoc(doc(firestore, 'slugs', slug));
  if (!s.exists()) return null;
  const n = await getDoc(doc(firestore, 'negocios', s.data().negocioId));
  return n.exists() ? { id: n.id, ...n.data() } : null;
}

export function esPro(negocio) {
  if (!negocio || negocio.plan !== 'pro' || !negocio.proHasta) return false;
  const hasta = negocio.proHasta.toDate ? negocio.proHasta.toDate() : new Date(negocio.proHasta);
  return hasta > new Date();
}

// ---------- Citas ----------
// Cada cita tiene un "ocupado" con el mismo id: un registro público sin datos personales
// que la página de reservas usa para mostrar solo los horarios libres.

export async function crearCita({ cliente, telefono, inicio, barbero, servicio, origen }) {
  const duracion = Math.min(240, Math.max(5, Math.round(Number(servicio.duracion_min) || 30)));
  const fin = new Date(new Date(inicio).getTime() + duracion * 60000).toISOString();
  const citaRef = doc(collection(firestore, ruta('citas')));
  const batch = writeBatch(firestore);
  batch.set(citaRef, {
    cliente_nombre: cliente.trim(),
    cliente_telefono: soloDigitos(telefono),
    fecha_hora: inicio,
    fin,
    duracion,
    barbero_id: barbero.id,
    servicio_id: servicio.id,
    estado: 'pendiente',
    origen, // 'web' | 'panel'
    created_at: new Date().toISOString(),
  });
  batch.set(doc(firestore, ruta('ocupados'), citaRef.id), { barbero_id: barbero.id, inicio, duracion: Math.round(duracion) });
  await batch.commit();

  // Registrar al cliente (su id es el teléfono, así no se duplica). Si ya existe, no pasa nada.
  const tel = soloDigitos(telefono);
  if (tel.length === 10) {
    try {
      const ref = doc(firestore, ruta('clientes'), tel);
      if (origen === 'web') {
        // El público solo puede crear (no modificar): si ya existe, Firestore lo rechaza y lo ignoramos.
        await setDoc(ref, { nombre: cliente.trim(), telefono: tel, notas: 'Llegó por reservas en línea', created_at: new Date().toISOString() });
      } else {
        await setDoc(ref, { nombre: cliente.trim(), telefono: tel }, { merge: true });
      }
    } catch { /* el cliente ya estaba registrado */ }
  }
  return citaRef.id;
}

export async function cambiarEstadoCita(cita, estado) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, ruta('citas'), cita.id), { estado });
  const ocRef = doc(firestore, ruta('ocupados'), cita.id);
  if (estado === 'cancelada') batch.delete(ocRef);
  else batch.set(ocRef, { barbero_id: cita.barbero_id, inicio: cita.fecha_hora, duracion: Math.round(Number(cita.duracion) || 30) });
  await batch.commit();
}

export async function eliminarCita(cita) {
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, ruta('citas'), cita.id));
  batch.delete(doc(firestore, ruta('ocupados'), cita.id));
  await batch.commit();
}

export async function ocupadosDelDia(fecha) {
  const snap = await getDocs(query(
    collection(firestore, ruta('ocupados')),
    where('inicio', '>=', inicioDia(fecha)),
    where('inicio', '<=', finDia(fecha)),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Horarios libres de un barbero para una fecha y duración
export function horariosLibres({ fecha, horario, duracion, ocupados, barberoId }) {
  const h = { ...HORARIO_DEFAULT, ...(horario || {}) };
  const d = new Date(fecha);
  if (!h.dias.includes(d.getDay())) return [];
  const paso = Number(h.intervalo) || 30;
  const dur = Number(duracion) || 30;
  const propios = ocupados.filter((o) => o.barbero_id === barberoId)
    .map((o) => { const x = new Date(o.inicio).getTime(); return [x, x + (Number(o.duracion) || 30) * 60000]; });
  const ahora = Date.now() + 15 * 60000; // al menos 15 min de anticipación
  const libres = [];
  for (let m = aMinutos(h.abre); m + dur <= aMinutos(h.cierra); m += paso) {
    const ini = new Date(d); ini.setHours(Math.floor(m / 60), m % 60, 0, 0);
    const a = ini.getTime(); const b = a + dur * 60000;
    if (a < ahora) continue;
    if (propios.some(([x, y]) => a < y && b > x)) continue;
    libres.push(ini.toISOString());
  }
  return libres;
}

export { deleteDoc };
