// Pruebas de los avisos al celular (server/avisos.js).
// Ejecutar: npx firebase-tools emulators:exec --only firestore --project barberia-659a5 "npx vite-node tests/avisos.mjs"
// (sin emulador corren solo las pruebas que no tocan Firestore)
import webpush from 'web-push';
import { avisarCita, avisoDePrueba, enviarATodos, firestoreAdmin, llavePublica } from '../server/avisos.js';
import { textoAviso, horaCorta } from '../server/textoAviso.js';
import { generarLlavesVapid } from '../src/lib/vapid.js';

let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fallas++; };
const intenta = async (f) => { try { return await f(); } catch (e) { return e; } };

// ---------- Texto ----------
const cita = { id: 'c1', cliente_nombre: 'Juan Pérez', fecha_hora: '2026-11-07T16:30:00.000Z' };
let t = textoAviso({ tipo: 'nueva', cita, barbero: 'Iván', servicio: 'Fade', zona: 'America/Mexico_City' });
ok(/Nueva cita · sáb 7 nov 10:30 am/.test(t.title) && t.body === 'Juan Pérez · Fade con Iván', `texto nueva cita: "${t.title}" / "${t.body}"`);
ok(t.url === '/app?dia=2026-11-07' && t.tag === 'cita-c1', 'el aviso abre el día de la cita');
t = textoAviso({ tipo: 'cambio', cita, anterior: { fecha_hora: '2026-11-06T22:00:00.000Z' }, barbero: 'Iván', servicio: 'Fade', zona: 'America/Mexico_City' });
ok(/cambió su cita/.test(t.title) && /antes vie 6 nov 4:00 pm/.test(t.body), `texto cambio: "${t.body}"`);
t = textoAviso({ tipo: 'cancelada', cita, servicio: 'Fade', zona: 'America/Tijuana' });
ok(t.title === 'Canceló Juan Pérez' && /8:30 am/.test(t.body), `texto cancelación en otra zona: "${t.body}"`);
ok(horaCorta('2026-11-07T00:05:00.000Z', 'America/Mexico_City') === '6:05 pm', 'hora corta en la tarde');

// ---------- Cifrado real con la llave pública de la app ----------
const navegador = webpush.generateVAPIDKeys(); // simula las llaves del celular
const crypto = await import('node:crypto');
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/prueba', keys: { p256dh: navegador.publicKey, auth: crypto.randomBytes(16).toString('base64url') } };
const deAdmin = await generarLlavesVapid(); // las que genera el panel de administración
ok(Buffer.from(deAdmin.publica, 'base64url').length === 65 && Buffer.from(deAdmin.privada, 'base64url').length === 32, 'el panel genera llaves VAPID del tamaño correcto');
const privadaPrueba = { publicKey: deAdmin.publica, privateKey: deAdmin.privada };
const det = webpush.generateRequestDetails(sub, JSON.stringify({ title: 'x' }), { vapidDetails: { subject: 'https://reservas.somosdom.com', publicKey: privadaPrueba.publicKey, privateKey: privadaPrueba.privateKey }, TTL: 60 });
ok(det.method === 'POST' && det.headers.Authorization?.startsWith('vapid t=') && det.headers['Content-Encoding'] === 'aes128gcm', 'web-push cifra y firma el aviso');
ok(Buffer.from(navegador.publicKey, 'base64url').length === 65, 'formato de llave pública VAPID');

// ---------- Lógica con una base falsa ----------
function baseFalsa(docs) {
  const marcas = []; const borrados = [];
  return {
    marcas, borrados,
    leer: async (r) => (docs[r] ? { id: r.split('/').pop(), ...docs[r] } : null),
    listar: async (r) => Object.entries(docs).filter(([k]) => k.startsWith(`${r}/`)).map(([k, v]) => ({ id: k.split('/').pop(), ...v })),
    marcar: async (r, campo) => { marcas.push(`${r}.${campo}`); docs[r] = { ...docs[r], [campo]: true }; },
    borrar: async (r) => { borrados.push(r); delete docs[r]; },
  };
}
const ahora = Date.parse('2026-11-06T18:00:00.000Z');
const nueva = (extra = {}) => ({ cliente_nombre: 'Ana', cliente_telefono: '5550001111', fecha_hora: '2026-11-07T16:00:00.000Z', barbero_id: 'principal', servicio_id: 's1', estado: 'pendiente', origen: 'web', created_at: new Date(ahora - 60000).toISOString(), ...extra });
const docs = {
  'negocios/n1': { zona: 'America/Mexico_City' },
  'negocios/n1/barberos/principal': { nombre: 'Toño' },
  'negocios/n1/servicios/s1': { nombre: 'Corte clásico' },
  'negocios/n1/dispositivos/d1': { endpoint: 'https://x/1', keys: { p256dh: 'a', auth: 'b' } },
  'negocios/n1/dispositivos/d2': { endpoint: 'https://x/2', keys: { p256dh: 'a', auth: 'b' } },
  'negocios/n1/citas/a1': nueva(),
  'negocios/n1/citas/viejo': nueva({ created_at: new Date(ahora - 3600000).toISOString() }),
  'negocios/n1/citas/panel': nueva({ origen: 'panel' }),
  'negocios/n1/citas/cancel': nueva({ estado: 'cancelada', cancelada_por: 'cliente' }),
  'negocios/n1/citas/antes': nueva({ estado: 'cancelada', cancelada_por: 'cliente', cambio: true, fecha_hora: '2026-11-07T15:00:00.000Z' }),
  'negocios/n1/citas/despues': nueva({ fecha_hora: '2026-11-08T17:00:00.000Z' }),
};
const db = baseFalsa(docs);
const enviados = [];
const enviar = async (s, d) => { if (s.endpoint === 'https://x/2' && d.tag === 'cita-cancel') { const e = new Error('Gone'); e.statusCode = 410; throw e; } enviados.push([s.endpoint, d]); };

let r = await avisarCita({ negocio: 'n1', cita: 'a1' }, { db, enviar, ahora });
ok(r.tipo === 'nueva' && r.enviados === 2 && enviados[0][1].body === 'Ana · Corte clásico con Toño', 'cita nueva por link: aviso a los 2 celulares');
r = await avisarCita({ negocio: 'n1', cita: 'a1' }, { db, enviar, ahora });
ok(r.enviados === 0, 'la misma cita NO se avisa dos veces');
ok((await avisarCita({ negocio: 'n1', cita: 'viejo' }, { db, enviar, ahora })).enviados === 0, 'NO avisa de citas viejas');
ok((await avisarCita({ negocio: 'n1', cita: 'panel' }, { db, enviar, ahora })).enviados === 0, 'NO avisa de citas que agendó el dueño');
r = await avisarCita({ negocio: 'n1', cita: 'cancel' }, { db, enviar, ahora });
ok(r.tipo === 'cancelada' && r.enviados === 1 && db.borrados.includes('negocios/n1/dispositivos/d2'), 'cancelación: avisa y borra el celular que ya no existe');
enviados.length = 0;
r = await avisarCita({ negocio: 'n1', cita: 'despues', anterior: 'antes' }, { db, enviar, ahora });
ok(r.tipo === 'cambio' && enviados.length === 1 && /cambió su cita/.test(enviados[0][1].title) && /antes sáb 7 nov 9:00 am/.test(enviados[0][1].body), `cambio de hora: un solo aviso (${enviados[0]?.[1].body})`);
ok((await avisarCita({ negocio: 'n1', cita: 'antes' }, { db, enviar, ahora })).enviados === 0, 'la cita vieja de un cambio NO se avisa aparte');
ok((await intenta(() => avisarCita({ negocio: 'n1', cita: 'no-existe' }, { db, enviar, ahora }))).status === 404, 'cita inexistente: 404');
ok((await intenta(() => avisarCita({ negocio: '../x', cita: 'a1' }, { db, enviar, ahora }))).status === 400, 'ids raros: rechazados');
ok((await avisoDePrueba({ idToken: 't' }, { db, enviar, verificar: async () => 'n1' })).enviados === 1, 'aviso de prueba al dueño');
ok((await intenta(() => avisoDePrueba({ idToken: 't' }, { db, enviar, verificar: async () => 'sin-celulares' }))).status === 404, 'prueba sin celulares: lo explica');
delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_PUBLIC_KEY;
ok((await intenta(() => enviarATodos('n1', { title: 'x' }, { db }))).status === 503, 'sin llaves VAPID en el servidor: avisa que no está activado');
ok((await intenta(() => llavePublica())).status === 503, 'sin llaves: el navegador sabe que no está activado');
process.env.VAPID_PUBLIC_KEY = privadaPrueba.publicKey; process.env.VAPID_PRIVATE_KEY = privadaPrueba.privateKey;
ok(llavePublica() === privadaPrueba.publicKey, 'con llaves: entrega la pública');

// ---------- Contra el emulador de Firestore (REST con la cuenta de servicio) ----------
if (process.env.FIRESTORE_EMULATOR_HOST) {
  const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/barberia-659a5/databases/(default)/documents`;
  const poner = (ruta, fields) => fetch(`${base}/${ruta}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  const s = (v) => ({ stringValue: v });
  await poner('negocios/real', { zona: s('America/Mexico_City'), nombre: s('Real') });
  await poner('negocios/real/barberos/principal', { nombre: s('Luis') });
  await poner('negocios/real/servicios/s1', { nombre: s('Barba'), precio: { integerValue: '90' } });
  await poner('negocios/real/dispositivos/d1', { endpoint: s('https://x/1'), keys: { mapValue: { fields: { p256dh: s('a'), auth: s('b') } } } });
  await poner('negocios/real/citas/c9', { cliente_nombre: s('Beto'), cliente_telefono: s('5551112222'), fecha_hora: s('2026-11-07T18:00:00.000Z'), barbero_id: s('principal'), servicio_id: s('s1'), estado: s('pendiente'), origen: s('web'), created_at: s(new Date().toISOString()), duracion: { integerValue: '30' } });
  const real = firestoreAdmin();
  const llegaron = [];
  r = await avisarCita({ negocio: 'real', cita: 'c9' }, { db: real, enviar: async (sub2, d) => llegaron.push([sub2, d]) });
  ok(r.tipo === 'nueva' && llegaron.length === 1 && llegaron[0][0].keys.p256dh === 'a' && llegaron[0][1].body === 'Beto · Barba con Luis', 'emulador: lee cita, barbero, servicio y celulares');
  const marcada = await real.leer('negocios/real/citas/c9');
  ok(marcada.avisada === true && marcada.cliente_nombre === 'Beto' && marcada.duracion === 30, 'emulador: marca la cita como avisada sin tocar lo demás');
  ok((await avisarCita({ negocio: 'real', cita: 'c9' }, { db: real, enviar: async () => llegaron.push(1) })).enviados === 0 && llegaron.length === 1, 'emulador: no se repite');
}

console.log(fallas ? `\n${fallas} FALLAS` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
