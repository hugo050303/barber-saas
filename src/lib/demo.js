// Modo demo: el panel completo funcionando SIN cuenta y SIN Firebase.
// Los datos viven en la memoria del navegador; al recargar o salir, todo vuelve a empezar.
// Desde la franja de la demo se puede cambiar entre los planes Gratis, Pro y Plus.
import { enZona, hoyYmd, sumarDias, aHhmm, aMinutos, normalizar, ZONA_DEFAULT } from './formato';
import { turnosDelDia } from './horario';

let activo = false;
export const esDemo = () => activo;

export const SLUG_DEMO = 'barberia-demo';
const colecciones = new Map(); // nombre -> Map(id -> datos)
let negocio = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
let siguienteId = 1;
const nuevoId = () => `d${Date.now().toString(36)}${(siguienteId++).toString(36)}`;

// ---------- Almacén en memoria (lo usan db.js y negocio.js cuando la demo está activa) ----------
const col = (nombre) => { if (!colecciones.has(nombre)) colecciones.set(nombre, new Map()); return colecciones.get(nombre); };
const copia = (x) => structuredClone(x);
export const mem = {
  lista: (nombre) => [...col(nombre).entries()].map(([id, d]) => ({ id, ...copia(d) })),
  obtener: (nombre, id) => { const d = col(nombre).get(String(id)); return d ? { id: String(id), ...copia(d) } : null; },
  agregar: (nombre, datos) => { const id = nuevoId(); col(nombre).set(id, copia(datos)); return id; },
  poner: (nombre, id, datos, { fusionar = false } = {}) => {
    const actual = col(nombre).get(String(id));
    col(nombre).set(String(id), fusionar && actual ? { ...actual, ...copia(datos) } : copia(datos));
  },
  borrar: (nombre, id) => { col(nombre).delete(String(id)); },
};

// ---------- Negocio de la demo (la sesión lo escucha) ----------
export const suscribirDemo = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const negocioDemo = () => negocio;
export function actualizarNegocioDemo(campos) { negocio = { ...negocio, ...copia(campos) }; avisar(); }
const marcaDeTiempo = (d) => ({ toDate: () => d });
export function cambiarPlanDemo(plan) {
  const enUnAno = new Date(); enUnAno.setFullYear(enUnAno.getFullYear() + 1);
  negocio = { ...negocio, plan, proHasta: plan === 'gratis' ? null : marcaDeTiempo(enUnAno) };
  avisar();
}
export const usuarioDemo = { uid: 'demo', email: 'demo@filo', displayName: 'Barbería Demo', emailVerified: true, providerData: [], demo: true };

// ---------- Datos de ejemplo ----------
// Generador pseudoaleatorio con semilla: los mismos datos "al azar" cada vez
function azar(semilla) {
  let a = semilla;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const tu = (...pares) => ({ turnos: pares.map(([abre, cierra]) => ({ abre, cierra })) });
const HORARIO = {
  dias: {
    0: tu(['10:00', '14:00']), 1: tu(['10:00', '20:00']), 2: tu(['10:00', '20:00']), 3: tu(['10:00', '20:00']),
    4: tu(['10:00', '20:00']), 5: tu(['10:00', '21:00']), 6: tu(['09:00', '14:00'], ['16:00', '21:00']),
  },
  descansos: [{ nombre: 'Comida', inicio: '15:00', fin: '16:00', dias: [1, 2, 3, 4, 5] }, { nombre: 'Café', inicio: '12:00', fin: '12:15', dias: [] }],
  bloqueos: [], intervalo: 15, anticipacion: 30, diasMaximo: 14, cerrados: [],
};
// Fotos de la demo: logo y portada en public/demo; trabajos y barberos en src/assets/demo (se cargan solas)
const FOTOS_TRABAJOS = Object.entries(import.meta.glob('../assets/demo/trabajos/*.{webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b)).slice(0, 12).map(([, url], slot) => ({ slot, url }));
const FOTOS_BARBEROS = Object.fromEntries(Object.entries(import.meta.glob('../assets/demo/barberos/*.{webp,jpg,jpeg,png}', { eager: true, query: '?url', import: 'default' }))
  .map(([ruta, url]) => [ruta.split('/').pop().replace(/\.\w+$/, ''), url]));

const BARBEROS = [
  ['principal', { nombre: 'Toño', especialidad: 'Fades y degradados', porcentaje_comision: 50, activo: true, diasLibres: [1] }],
  ['b2', { nombre: 'Memo', especialidad: 'Barba y diseño', porcentaje_comision: 45, activo: true, diasLibres: [2], servicios: ['s1', 's3', 's4', 's6'],
    horarioPropio: { dias: { 0: null, 1: tu(['14:00', '21:00']), 2: null, 3: tu(['14:00', '21:00']), 4: tu(['14:00', '21:00']), 5: tu(['14:00', '21:00']), 6: tu(['10:00', '21:00']) } } }],
  ['b3', { nombre: 'Iván', especialidad: 'Cortes clásicos', porcentaje_comision: 40, activo: true, diasLibres: [0], servicios: ['s1', 's2', 's5'] }],
];
const SERVICIOS = [
  ['s1', 'Corte clásico', 120, 30], ['s2', 'Fade / degradado', 150, 45], ['s3', 'Corte y barba', 200, 60],
  ['s4', 'Arreglo de barba', 90, 30], ['s5', 'Corte niño', 100, 30], ['s6', 'Cejas', 40, 15],
];
const CLIENTES = [
  'Ricardo Martínez', 'Daniel Ramírez', 'Jorge López', 'Alan Sánchez', 'Luis Cruz', 'Iván Pérez', 'Óscar Hernández',
  'Kevin Gómez', 'Marco Antonio Ruiz', 'Eduardo Torres', 'Jesús Flores', 'Fernando Díaz', 'Emiliano Vargas', 'Sebastián Morales',
  'Diego Castillo', 'Ángel Reyes',
];
const PRODUCTOS = [
  ['Cera mate 100 g', 180, 9], ['Pomada brillo 100 g', 170, 6], ['Aceite para barba 30 ml', 220, 4],
  ['Shampoo para barba', 150, 7], ['Gel extra fuerte', 90, 12], ['Polvo texturizador', 160, 2],
];

function sembrar() {
  colecciones.clear();
  const r = azar(20261106);
  const elige = (arr) => arr[Math.floor(r() * arr.length)];
  const hoy = hoyYmd();
  const ahora = Date.now();

  for (const [id, b] of BARBEROS) mem.poner('barberos', id, FOTOS_BARBEROS[id] ? { ...b, foto: FOTOS_BARBEROS[id] } : b);
  for (const [id, nombre, precio, duracion_min] of SERVICIOS) mem.poner('servicios', id, { nombre, precio, duracion_min });
  for (const [nombre, precio_venta, stock] of PRODUCTOS) mem.agregar('inventario', { nombre, precio_venta, stock, created_at: new Date().toISOString() });

  const clientes = CLIENTES.map((nombre, i) => ({ nombre, telefono: `5532${String(100000 + i * 7919).slice(-6)}` }));
  for (const c of clientes) {
    mem.poner('clientes', c.telefono, {
      nombre: c.nombre, nombre_busqueda: normalizar(c.nombre), telefono: c.telefono, notas: '',
      visitas: 0, gastado: 0, ultima: null, created_at: new Date(ahora - 90 * 86400000).toISOString(),
    });
  }
  mem.poner('clientes', clientes[0].telefono, { ...mem.obtener('clientes', clientes[0].telefono), notas: 'Fade bajo, del 1 a los lados. Le gusta platicar de futbol.' });

  // Citas: 40 días hacia atrás (terminadas) y 3 días hacia adelante (pendientes)
  const servicioAzar = () => { const x = r(); return x < 0.32 ? SERVICIOS[1] : x < 0.55 ? SERVICIOS[0] : x < 0.75 ? SERVICIOS[2] : x < 0.87 ? SERVICIOS[3] : x < 0.95 ? SERVICIOS[4] : SERVICIOS[5]; };
  for (let k = -40; k <= 3; k++) {
    const ymd = sumarDias(hoy, k);
    for (const [barberoId, barbero] of BARBEROS) {
      const turnos = turnosDelDia(HORARIO, ymd, barbero);
      if (!turnos.length) continue;
      const ocupado = [];
      const cuantas = k < 0 ? 3 + Math.floor(r() * 4) : k === 0 ? 4 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3);
      for (let n = 0; n < cuantas; n++) {
        const [servicioId, , precio, duracion] = servicioAzar();
        if (barbero.servicios && !barbero.servicios.includes(servicioId)) continue; // no hace ese servicio
        const dia = turnos[Math.floor(r() * turnos.length)];
        const ini = aMinutos(dia.abre) + Math.floor(r() * ((aMinutos(dia.cierra) - aMinutos(dia.abre) - duracion) / 30)) * 30;
        const fin = ini + duracion;
        if (fin > aMinutos(dia.cierra)) continue;
        if (ini < 960 && fin > 900) continue;                         // hora de comida
        if (ocupado.some(([a, b]) => ini < b && fin > a)) continue;  // empalme
        ocupado.push([ini, fin]);
        const inicio = enZona(ymd, aHhmm(ini));
        const cliente = elige(clientes);
        const yaPaso = inicio.getTime() + duracion * 60000 < ahora;
        let estado = yaPaso ? 'finalizada' : (r() < 0.35 ? 'confirmada' : 'pendiente');
        if (yaPaso && r() < 0.06) estado = 'cancelada';
        mem.agregar('citas', {
          cliente_nombre: cliente.nombre, cliente_telefono: cliente.telefono, fecha_hora: inicio.toISOString(),
          fin: new Date(inicio.getTime() + duracion * 60000).toISOString(), duracion, precio,
          barbero_id: barberoId, servicio_id: servicioId, estado, origen: r() < 0.4 ? 'web' : 'panel',
          created_at: new Date(inicio.getTime() - 2 * 86400000).toISOString(),
        });
        if (estado === 'finalizada') {
          const c = mem.obtener('clientes', cliente.telefono);
          mem.poner('clientes', cliente.telefono, {
            ...c, visitas: c.visitas + 1, gastado: c.gastado + precio,
            ultima: !c.ultima || inicio.toISOString() > c.ultima ? inicio.toISOString() : c.ultima,
          }, { fusionar: true });
        }
      }
    }
  }
  // Un cliente que ya no ha vuelto (para la pestaña "Te extrañan")
  const ausente = clientes[clientes.length - 1];
  mem.poner('clientes', ausente.telefono, { visitas: 3, gastado: 450, ultima: new Date(ahora - 52 * 86400000).toISOString() }, { fusionar: true });
  // Más clientes que se dejaron de ver (para "Por recuperar"); a uno ya se le escribió y otro regresó
  const perdidos = [['Rodrigo Aguilar', 34, 5, 750], ['Pablo Mendoza', 41, 8, 1360], ['Hugo Navarro', 48, 2, 240], ['Martín Salazar', 63, 4, 520], ['Raúl Ortega', 95, 6, 870]];
  perdidos.forEach(([nombre, dias, visitas, gastado], i) => {
    const telefono = `5541${String(200000 + i * 6173).slice(-6)}`;
    mem.poner('clientes', telefono, { nombre, nombre_busqueda: normalizar(nombre), telefono, notas: '', created_at: new Date(ahora - 200 * 86400000).toISOString(), visitas, gastado, ultima: new Date(ahora - dias * 86400000).toISOString(),
      ...(i === 3 ? { recuperar_enviado: new Date(ahora - 3 * 86400000).toISOString() } : {}) });
  });
  const volvio = clientes[2];
  mem.poner('clientes', volvio.telefono, { recuperar_enviado: new Date(ahora - 45 * 86400000).toISOString() }, { fusionar: true });

  // Ventas de mostrador, gastos y cortes de caja
  for (let k = -30; k <= 0; k++) {
    if (r() < 0.45) continue;
    const ymd = sumarDias(hoy, k);
    const [nombre, precio_venta] = elige(PRODUCTOS);
    const cantidad = r() < 0.8 ? 1 : 2;
    const fecha = enZona(ymd, aHhmm(660 + Math.floor(r() * 480))).toISOString();
    if (new Date(fecha).getTime() > ahora) continue;
    mem.agregar('ventas_productos', { total: precio_venta * cantidad, detalle_items: [{ nombre, precio_venta, cantidad }], fecha });
  }
  const gasto = (dias, descripcion, monto, categoria) => mem.agregar('gastos', { descripcion, monto, categoria, fecha: enZona(sumarDias(hoy, -dias), '12:00').toISOString() });
  gasto(2, 'Navajas desechables (caja de 100)', 260, 'Insumos');
  gasto(6, 'Luz (CFE)', 640, 'Luz y agua');
  gasto(9, 'Toallas y capas', 380, 'Insumos');
  gasto(14, 'Publicidad en Facebook', 300, 'Publicidad');
  gasto(20, 'Renta del local', 3500, 'Renta');
  gasto(27, 'Mantenimiento de máquinas', 450, 'Mantenimiento');
  for (let k = 1; k <= 6; k++) {
    const servicios = 1600 + Math.round(r() * 1400);
    const ventas = Math.round(r() * 400);
    mem.agregar('cortes_caja', {
      total_servicios: servicios, total_ventas: ventas, total_gastos: 0, fondo: 500, dinero_en_caja: 500 + servicios + ventas,
      contado: 500 + servicios + ventas - (k === 3 ? 50 : 0), diferencia: k === 3 ? -50 : 0, fecha: enZona(sumarDias(hoy, -k), '21:10').toISOString(),
    });
  }
}

export function iniciarDemo() {
  if (activo) return;
  activo = true;
  try { sessionStorage.setItem('modoDemo', '1'); } catch { /* sin almacenamiento */ }
  sembrar();
  negocio = {
    id: 'demo', nombre: 'Barbería Demo', slug: SLUG_DEMO, ownerUid: 'demo', whatsapp: '9212494549', telefono: '9212494549', link_resenas: 'https://g.page/r/barberia-demo/review',
    direccion: 'Centro, Ixhuatlán del Sureste, Ver.', mensaje_ticket: '¡Gracias por tu visita!', zona: ZONA_DEFAULT,
    horario: { ...HORARIO, bloqueos: [{ desde: sumarDias(hoyYmd(), 2), inicio: '12:00', fin: '15:00', barbero: 'principal' }] },
    plan: 'plus', proHasta: null,
    logo: '/demo/logo.webp', portada: '/demo/portada.webp', galeria: FOTOS_TRABAJOS,
  };
  cambiarPlanDemo('plus');
}

// Salir de la demo: se recarga la app y la memoria queda limpia
export function salirDeLaDemo(destino = '/') {
  try { sessionStorage.removeItem('modoDemo'); } catch { /* sin almacenamiento */ }
  window.location.assign(destino);
}

// Se llama al cargar la app: entra a la demo si se abrió /demo o si ya se estaba en ella (al recargar empieza de nuevo)
export function arrancarDemoSiToca() {
  let seguia = false;
  try { seguia = sessionStorage.getItem('modoDemo') === '1'; } catch { /* sin almacenamiento */ }
  const ruta = window.location.pathname;
  if (ruta === '/demo' || (seguia && (ruta.startsWith('/app') || ruta === `/r/${SLUG_DEMO}`))) iniciarDemo();
  else if (seguia) { try { sessionStorage.removeItem('modoDemo'); } catch { /* sin almacenamiento */ } }
}
