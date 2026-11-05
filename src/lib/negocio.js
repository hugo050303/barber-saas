// Operaciones de negocio que tocan varias colecciones a la vez.
import {
  doc, getDoc, setDoc, writeBatch, collection, getDocs, query, where, serverTimestamp, increment,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { ruta } from '../db';
import { slugify, soloDigitos, inicioDia, finDia, normalizar, ZONA_DEFAULT } from './formato';
import { HORARIO_BASE } from './horario';
import { SLOTS_BARBEROS } from '../config';

// ---------- Registro de barberías ----------
// El id del negocio es el uid del dueño: así las reglas de seguridad saben quién es el dueño
// sin hacer una lectura extra en cada consulta (más rápido y más barato).

export async function configSistema() {
  try {
    const [c, r] = await Promise.all([getDoc(doc(firestore, 'sistema', 'config')), getDoc(doc(firestore, 'sistema', 'registro'))]);
    const cfg = { registroAbierto: true, maxNegocios: 100, ...(c.exists() ? c.data() : {}) };
    const total = r.exists() ? r.data().total || 0 : 0;
    return { ...cfg, total, hayLugar: cfg.registroAbierto && total < cfg.maxNegocios };
  } catch {
    return { registroAbierto: true, maxNegocios: 100, total: 0, hayLugar: true };
  }
}

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
  const negRef = doc(firestore, 'negocios', user.uid);
  const batch = writeBatch(firestore);
  batch.set(negRef, {
    nombre: nombre.trim(),
    slug,
    ownerUid: user.uid,
    whatsapp: soloDigitos(whatsapp),
    telefono: soloDigitos(whatsapp),
    direccion: '',
    mensaje_ticket: '¡Gracias por tu visita!',
    zona: ZONA_DEFAULT,
    horario: HORARIO_BASE,
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
    proveedor: user.providerData?.[0]?.providerId || 'password',
    creado: serverTimestamp(),
  });
  // Contador global de barberías (las reglas lo usan para respetar el tope de registros)
  batch.set(doc(firestore, 'sistema', 'registro'), { total: increment(1), ultimo: user.uid }, { merge: true });
  await batch.commit();
  return negRef.id;
}

export async function negocioPorSlug(slug) {
  const s = await getDoc(doc(firestore, 'slugs', slug));
  if (!s.exists()) return null;
  const n = await getDoc(doc(firestore, 'negocios', s.data().negocioId));
  return n.exists() ? { id: n.id, ...n.data() } : null;
}

// ¿Tiene un plan de pago (Pro o Plus) vigente?
export function esPro(negocio) {
  if (!negocio || !['pro', 'plus'].includes(negocio.plan) || !negocio.proHasta) return false;
  const hasta = negocio.proHasta.toDate ? negocio.proHasta.toDate() : new Date(negocio.proHasta);
  return hasta > new Date();
}

// Plan que aplica hoy: 'gratis' | 'pro' | 'plus' (si venció, regresa a gratis)
export const planVigente = (negocio) => (esPro(negocio) ? negocio.plan : 'gratis');

// Barberos que pueden recibir citas según el plan (los demás se conservan, pero no aparecen)
export function barberosDelPlan(negocio, barberos) {
  const plan = planVigente(negocio);
  if (plan === 'plus') return barberos;
  const permitidos = plan === 'pro' ? SLOTS_BARBEROS : SLOTS_BARBEROS.slice(0, 1);
  return barberos.filter((b) => permitidos.includes(b.id));
}

// Id para un barbero nuevo: en Gratis/Pro se usan lugares fijos (principal, b2, b3); en Plus, id automático.
// Regresa null si ya no hay lugar en el plan.
export function idParaNuevoBarbero(negocio, barberos) {
  const plan = planVigente(negocio);
  if (plan === 'plus') return undefined;
  const permitidos = plan === 'pro' ? SLOTS_BARBEROS : SLOTS_BARBEROS.slice(0, 1);
  return permitidos.find((id) => !barberos.some((b) => b.id === id)) || null;
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
    precio: Number(servicio.precio) || 0, // precio al momento de agendar (el historial no cambia si subes precios)
    barbero_id: barbero.id,
    servicio_id: servicio.id,
    estado: 'pendiente',
    origen, // 'web' | 'panel'
    created_at: new Date().toISOString(),
  });
  batch.set(doc(firestore, ruta('ocupados'), citaRef.id), { barbero_id: barbero.id, inicio, duracion });
  await batch.commit();

  // Registrar al cliente (su id es el teléfono, así no se duplica).
  const tel = soloDigitos(telefono);
  if (tel.length === 10) {
    const ref = doc(firestore, ruta('clientes'), tel);
    try {
      if (origen === 'web') {
        // El público solo puede crear (no modificar): si ya existe, Firestore lo rechaza y lo ignoramos.
        await setDoc(ref, nuevoCliente(cliente, tel, 'Llegó por reservas en línea'));
      } else {
        const ya = await getDoc(ref);
        await setDoc(ref, ya.exists() ? { nombre: cliente.trim(), nombre_busqueda: normalizar(cliente) } : nuevoCliente(cliente, tel, ''), { merge: true });
      }
    } catch { /* el cliente ya estaba registrado */ }
  }
  return citaRef.id;
}

export const nuevoCliente = (nombre, tel, notas) => ({
  nombre: nombre.trim(), nombre_busqueda: normalizar(nombre), telefono: tel, notas,
  visitas: 0, gastado: 0, ultima: null, created_at: new Date().toISOString(),
});

const precioDe = (cita) => Number(cita.precio ?? cita.servicios?.precio) || 0;

// Cambia el estado y mantiene al día el resumen del cliente (visitas y gasto),
// así la lista de clientes no tiene que leer todo el historial de citas.
export async function cambiarEstadoCita(cita, estado) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, ruta('citas'), cita.id), { estado });
  const ocRef = doc(firestore, ruta('ocupados'), cita.id);
  if (estado === 'cancelada') batch.delete(ocRef);
  else batch.set(ocRef, { barbero_id: cita.barbero_id, inicio: cita.fecha_hora, duracion: Math.round(Number(cita.duracion) || 30) });

  const tel = soloDigitos(cita.cliente_telefono);
  const antes = cita.estado === 'finalizada'; const despues = estado === 'finalizada';
  if (tel.length === 10 && antes !== despues) {
    const signo = despues ? 1 : -1;
    batch.set(doc(firestore, ruta('clientes'), tel), {
      nombre: cita.cliente_nombre, nombre_busqueda: normalizar(cita.cliente_nombre), telefono: tel,
      visitas: increment(signo), gastado: increment(signo * precioDe(cita)),
      ...(despues ? { ultima: cita.fecha_hora } : {}),
    }, { merge: true });
  }
  await batch.commit();
}

export async function eliminarCita(cita) {
  if (cita.estado === 'finalizada') await cambiarEstadoCita(cita, 'cancelada');
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, ruta('citas'), cita.id));
  batch.delete(doc(firestore, ruta('ocupados'), cita.id));
  await batch.commit();
}

export async function ocupadosDelDia(ymd) {
  const snap = await getDocs(query(
    collection(firestore, ruta('ocupados')),
    where('inicio', '>=', inicioDia(ymd)),
    where('inicio', '<=', finDia(ymd)),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
