// Pruebas del resumen de la noche y de los recordatorios (server/rutinas.js).
// Ejecutar: npx firebase-tools emulators:exec --only firestore --project barberia-659a5 "npx vite-node tests/rutinas.mjs"
import { enviarResumenes, enviarRecordatorios, guardarRecordatorio } from '../server/rutinas.js';
import { avisarCita, firestoreAdmin } from '../server/avisos.js';
import { enZona, abreEse } from '../server/tiempo.js';

let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fallas++; };
const intenta = async (f) => { try { return await f(); } catch (e) { return e; } };
const iso = (ymd, hhmm) => enZona(ymd, hhmm, 'America/Mexico_City').toISOString();

// ---------- Base falsa ----------
function baseFalsa(docs) {
  const dentro = (ruta, padre, col) => { const p = `${padre ? `${padre}/` : ''}${col}/`; return ruta.startsWith(p) && !ruta.slice(p.length).includes('/'); };
  const cumple = (d, [campo, op, v]) => (op === '>=' ? d[campo] >= v : op === '<' ? d[campo] < v : d[campo] === v);
  return {
    docs,
    leer: async (r) => (docs[r] ? { id: r.split('/').pop(), ...structuredClone(docs[r]) } : null),
    listar: async (r) => Object.entries(docs).filter(([k]) => dentro(k, r.split('/').slice(0, -1).join('/'), r.split('/').pop())).map(([k, v]) => ({ id: k.split('/').pop(), ...structuredClone(v) })),
    consultar: async (padre, col, filtros) => Object.entries(docs).filter(([k, v]) => dentro(k, padre, col) && filtros.every((f) => cumple(v, f))).map(([k, v]) => ({ id: k.split('/').pop(), ...structuredClone(v) })),
    poner: async (r, d) => { docs[r] = structuredClone(d); },
    actualizar: async (r, d) => { docs[r] = { ...docs[r], ...d }; },
    marcar: async (r, c) => { docs[r] = { ...docs[r], [c]: true }; },
    borrar: async (r) => { delete docs[r]; },
  };
}
const llegan = [];
const enviar = async (s, d) => { llegan.push([s.endpoint, d]); };

// ---------- Abre ese día ----------
ok(abreEse({ dias: { 6: { turnos: [{ abre: '10:00', cierra: '20:00' }] }, 0: null } }, '2026-11-07') && !abreEse({ dias: { 0: null } }, '2026-11-08'), 'sabe qué días abre');
ok(!abreEse({ dias: { 6: { turnos: [{}] } }, cerrados: ['2026-11-07'] }, '2026-11-07') && !abreEse({ dias: { 6: { turnos: [{}] } }, bloqueos: [{ desde: '2026-11-06', hasta: '2026-11-08' }] }, '2026-11-07'), 'días cerrados y bloqueos de día completo');

// ---------- Resumen de la noche ----------
const HORARIO = { dias: { 0: null, 1: { turnos: [{ abre: '10:00', cierra: '20:00' }] }, 6: { turnos: [{ abre: '10:00', cierra: '20:00' }] } } };
const cita = (fecha, barbero, extra = {}) => ({ fecha_hora: fecha, barbero_id: barbero, estado: 'pendiente', cliente_nombre: 'X', ...extra });
const docs = {
  'negocios/a': { nombre: 'Barbería A', zona: 'America/Mexico_City', horario: HORARIO, slug: 'barberia-a' },
  'negocios/a/dispositivos/d1': { endpoint: 'https://push/a', keys: { p256dh: 'p', auth: 'q' } },
  'negocios/a/barberos/t': { nombre: 'Toño' }, 'negocios/a/barberos/m': { nombre: 'Memo' },
  'negocios/a/citas/c1': cita(iso('2026-11-07', '12:00'), 't'),
  'negocios/a/citas/c2': cita(iso('2026-11-07', '10:30'), 'm'),
  'negocios/a/citas/c3': cita(iso('2026-11-07', '16:00'), 't'),
  'negocios/a/citas/c4': cita(iso('2026-11-07', '11:00'), 't', { estado: 'cancelada' }),
  'negocios/a/citas/c5': cita(iso('2026-11-08', '11:00'), 't'), // pasado mañana: no cuenta
  'negocios/b': { nombre: 'B', zona: 'America/Mexico_City', horario: HORARIO, resumen_hora: 21 },
  'negocios/b/dispositivos/d1': { endpoint: 'https://push/b', keys: { p256dh: 'p', auth: 'q' } },
  'negocios/c': { nombre: 'C', zona: 'America/Mexico_City', horario: HORARIO, resumen_activo: false },
  'negocios/c/dispositivos/d1': { endpoint: 'https://push/c', keys: { p256dh: 'p', auth: 'q' } },
  'negocios/d': { nombre: 'Sin celular', zona: 'America/Mexico_City', horario: HORARIO },
  'negocios/e': { nombre: 'Cierra mañana', zona: 'America/Mexico_City', horario: { dias: { 6: null } } },
  'negocios/e/dispositivos/d1': { endpoint: 'https://push/e', keys: { p256dh: 'p', auth: 'q' } },
  'negocios/f': { nombre: 'Abre sin citas', zona: 'America/Tijuana', horario: HORARIO },
  'negocios/f/dispositivos/d1': { endpoint: 'https://push/f', keys: { p256dh: 'p', auth: 'q' } },
};
const db = baseFalsa(docs);
const a20 = Date.parse(iso('2026-11-06', '20:05')); // viernes 20:05 en CDMX = 19:05 en Tijuana
let r = await enviarResumenes({ db, enviar, ahora: a20 });
const deA = llegan.find(([e]) => e === 'https://push/a')?.[1];
ok(deA?.title === 'Mañana: 3 citas' && deA.body === 'La primera a las 10:30 am · Toño 2, Memo 1' && deA.url === '/app?dia=2026-11-07', `resumen de A: "${deA?.title} · ${deA?.body}"`);
ok(!llegan.some(([e]) => ['https://push/b', 'https://push/c', 'https://push/e', 'https://push/f'].includes(e)), 'B (a las 21), C (apagado), E (mañana cierra) y F (otra zona, aún no son las 20) no reciben');
ok(docs['negocios/a'].resumen_enviado === '2026-11-06' && docs['negocios/e'].resumen_enviado === '2026-11-06', 'se marca el día del resumen');
llegan.length = 0;
r = await enviarResumenes({ db, enviar, ahora: a20 + 10 * 60000 });
ok(llegan.length === 0, 'no se repite el mismo día');
await enviarResumenes({ db, enviar, ahora: a20 + 60 * 60000 }); // 21:05 CDMX
ok(llegan.some(([e]) => e === 'https://push/b') && !llegan.some(([e]) => e === 'https://push/f'), 'B recibe a sus 21:00');
await enviarResumenes({ db, enviar, ahora: a20 + 2 * 60 * 60000 }); // 22:05 CDMX = 20:05 Tijuana
ok(llegan.find(([e]) => e === 'https://push/f')?.[1].title === 'Mañana aún no tienes citas', 'F (Tijuana) a sus 20:00, sin citas: invita a compartir el link');

// ---------- Recordatorios ----------
llegan.length = 0;
const dr = baseFalsa({
  'negocios/a': { nombre: 'Barbería A', zona: 'America/Mexico_City', slug: 'barberia-a' },
  'negocios/a/barberos/t': { nombre: 'Toño' }, 'negocios/a/servicios/s1': { nombre: 'Fade' },
  'negocios/a/citas/manana': { fecha_hora: iso('2026-11-07', '12:00'), estado: 'pendiente', barbero_id: 't', servicio_id: 's1', origen: 'web', cliente_telefono: '5550001111', created_at: new Date(a20 - 60000).toISOString() },
  'negocios/a/citas/pronto': { fecha_hora: iso('2026-11-06', '20:30'), estado: 'pendiente' },
  'negocios/a/citas/cancelada': { fecha_hora: iso('2026-11-07', '13:00'), estado: 'cancelada' },
  'negocios/a/citas/lejos': { fecha_hora: iso('2026-11-10', '13:00'), estado: 'confirmada' },
});
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/cliente', keys: { p256dh: 'BKEY', auth: 'AUTH' } };
ok((await guardarRecordatorio({ negocio: 'a', cita: 'manana', suscripcion: sub }, { db: dr, ahora: a20 - 3 * 3600000 })).ok && dr.docs['recordatorios/a_manana']?.zona === 'America/Mexico_City', 'el cliente pide su recordatorio');
ok((await intenta(() => guardarRecordatorio({ negocio: 'a', cita: 'pronto', suscripcion: sub }, { db: dr, ahora: a20 }))).status === 400, 'cita en menos de 1 hora: no se guarda');
ok((await intenta(() => guardarRecordatorio({ negocio: 'a', cita: 'cancelada', suscripcion: sub }, { db: dr, ahora: a20 }))).status === 400, 'cita cancelada: no se guarda');
ok((await intenta(() => guardarRecordatorio({ negocio: 'a', cita: 'manana', suscripcion: { endpoint: 'http://malo', keys: {} } }, { db: dr, ahora: a20 }))).status === 400, 'suscripción rara: no se guarda');
await guardarRecordatorio({ negocio: 'a', cita: 'lejos', suscripcion: sub }, { db: dr, ahora: a20 });
const a23 = Date.parse(iso('2026-11-06', '23:05'));
r = await enviarRecordatorios({ db: dr, enviar, ahora: a23 });
ok(r.pendientes === 1 && llegan.length === 0 && dr.docs['recordatorios/a_manana'], 'de noche no se manda (se queda para la mañana)');
const a8 = Date.parse(iso('2026-11-07', '08:05'));
r = await enviarRecordatorios({ db: dr, enviar, ahora: a8 });
const rec = llegan[0]?.[1];
ok(r.enviados === 1 && rec?.title === 'Hoy tienes cita en Barbería A' && /Fade con Toño a las 12:00 pm/.test(rec.body) && rec.url === '/r/barberia-a/cita/manana', `a las 8 llega: "${rec?.title} · ${rec?.body}"`);
ok(!dr.docs['recordatorios/a_manana'] && dr.docs['recordatorios/a_lejos'], 'se borra el enviado; el de dentro de días espera');
const a20b = Date.parse(iso('2026-11-06', '15:00'));
await guardarRecordatorio({ negocio: 'a', cita: 'manana', suscripcion: sub }, { db: dr, ahora: a20b - 3600000 });
dr.docs['negocios/a/citas/manana'].estado = 'cancelada';
llegan.length = 0;
r = await enviarRecordatorios({ db: dr, enviar, ahora: a20b });
ok(llegan.length === 0 && !dr.docs['recordatorios/a_manana'], 'si la canceló, no se le recuerda y se borra');
// Mañana: aviso con "Mañana"
dr.docs['negocios/a/citas/manana'].estado = 'pendiente';
await guardarRecordatorio({ negocio: 'a', cita: 'manana', suscripcion: sub }, { db: dr, ahora: a20b - 3600000 });
await enviarRecordatorios({ db: dr, enviar, ahora: a20b });
ok(llegan[0]?.[1].title === 'Mañana tienes cita en Barbería A', 'un día antes dice "Mañana"');

// Cambio de hora: el recordatorio pasa a la cita nueva
const dc = baseFalsa({
  'negocios/a': { nombre: 'A', zona: 'America/Mexico_City', slug: 'a' },
  'negocios/a/citas/vieja': { fecha_hora: iso('2026-11-07', '12:00'), estado: 'cancelada', cancelada_por: 'cliente', cambio: true, cliente_telefono: '5550001111' },
  'negocios/a/citas/nueva': { fecha_hora: iso('2026-11-08', '17:00'), estado: 'pendiente', origen: 'web', cliente_telefono: '5550001111', created_at: new Date(a20).toISOString() },
  'recordatorios/a_vieja': { negocio: 'a', cita: 'vieja', fecha_hora: iso('2026-11-07', '12:00'), zona: 'America/Mexico_City', endpoint: sub.endpoint, keys: sub.keys },
});
await avisarCita({ negocio: 'a', cita: 'nueva', anterior: 'vieja' }, { db: dc, enviar: async () => {}, ahora: a20 + 60000 });
ok(!dc.docs['recordatorios/a_vieja'] && dc.docs['recordatorios/a_nueva']?.fecha_hora === iso('2026-11-08', '17:00') && dc.docs['recordatorios/a_nueva'].cita === 'nueva', 'al cambiar de hora, el recordatorio se pasa a la cita nueva');

// ---------- Contra el emulador ----------
if (process.env.FIRESTORE_EMULATOR_HOST) {
  const real = firestoreAdmin();
  await real.poner('negocios/emu', { nombre: 'Emu', zona: 'America/Mexico_City', slug: 'emu', horario: HORARIO });
  await real.poner('negocios/emu/dispositivos/d1', { endpoint: 'https://push/emu', keys: { p256dh: 'p', auth: 'q' } });
  await real.poner('negocios/emu/barberos/t', { nombre: 'Luis' });
  await real.poner('negocios/emu/servicios/s1', { nombre: 'Barba' });
  await real.poner('negocios/emu/citas/k1', { fecha_hora: iso('2026-11-07', '11:00'), estado: 'pendiente', barbero_id: 't', servicio_id: 's1', duracion: 30 });
  await real.poner('negocios/emu/citas/k2', { fecha_hora: iso('2026-11-07', '09:30'), estado: 'confirmada', barbero_id: 't' });
  await real.poner('negocios/emu/citas/k3', { fecha_hora: iso('2026-11-07', '13:00'), estado: 'cancelada', barbero_id: 't' });
  const q = await real.consultar('negocios/emu', 'citas', [['fecha_hora', '>=', iso('2026-11-07', '00:00')], ['fecha_hora', '<', iso('2026-11-08', '00:00')]]);
  ok(q.length === 3 && q.every((c) => c.fecha_hora.startsWith('2026-11-07')), 'emulador: consulta de citas por rango (runQuery)');
  const salida = [];
  await enviarResumenes({ db: real, enviar: async (s, d) => salida.push([s.endpoint, d]), ahora: a20 });
  const emu = salida.find(([e]) => e === 'https://push/emu')?.[1];
  ok(emu?.title === 'Mañana: 2 citas' && /9:30 am/.test(emu.body), `emulador: resumen "${emu?.title} · ${emu?.body}"`);
  ok((await real.leer('negocios/emu')).resumen_enviado === '2026-11-06' && (await real.leer('negocios/emu')).nombre === 'Emu', 'emulador: marca el resumen sin tocar lo demás');
  await guardarRecordatorio({ negocio: 'emu', cita: 'k1', suscripcion: sub }, { db: real, ahora: a20 - 3 * 3600000 });
  const guardado = await real.leer('recordatorios/emu_k1');
  ok(guardado?.keys?.auth === 'AUTH' && guardado.fecha_hora === iso('2026-11-07', '11:00'), 'emulador: guarda el recordatorio en la raíz');
  const salida2 = [];
  const rr = await enviarRecordatorios({ db: real, enviar: async (s, d) => salida2.push([s, d]), ahora: Date.parse(iso('2026-11-07', '09:05')) });
  ok(rr.enviados >= 1 && salida2.some(([s, d]) => s.keys.auth === 'AUTH' && /Barba con Luis a las 11:00 am/.test(d.body)) && !(await real.leer('recordatorios/emu_k1')), 'emulador: manda el recordatorio y lo borra');
}

console.log(fallas ? `\n${fallas} FALLAS` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
