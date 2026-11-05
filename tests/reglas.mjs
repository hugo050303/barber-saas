// Pruebas de las reglas de seguridad contra el emulador de Firebase.
// Ejecutar: npx firebase-tools emulators:exec --only firestore,auth --project barberia-659a5 "npx vite-node tests/reglas.mjs"
import { connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, updateDoc, setDoc, Timestamp, addDoc } from 'firebase/firestore';
import { auth, firestore } from '../src/firebase.js';
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(firestore, '127.0.0.1', 8085);
const { db, usarNegocio } = await import('../src/db.js');
const N = await import('../src/lib/negocio.js');

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const intenta = async (fn) => { try { await fn(); return true; } catch (e) { return false; } };
const r = async (q) => (await q);

// ---- Dueño A se registra ----
const ua = (await createUserWithEmailAndPassword(auth, 'a@test.com', 'secreto123')).user;
const nA = await N.crearNegocio(ua, { nombre: 'Barbería Don Pepe', dueno: 'Pepe', whatsapp: '5512345678' });
ok(nA, 'A crea su negocio');
const negA = (await getDoc(doc(firestore, 'negocios', nA))).data();
ok(negA.slug === 'barberia-don-pepe' && negA.plan === 'gratis', 'slug y plan gratis');
ok(!(await intenta(() => N.crearNegocio(ua, { nombre: 'Otro', dueno: 'P', whatsapp: '1' }))), 'A no puede crear un segundo negocio');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', nA), { plan: 'pro', proHasta: Timestamp.fromDate(new Date(2099, 1, 1)) }))), 'A NO puede darse Pro');
ok(await intenta(() => updateDoc(doc(firestore, 'negocios', nA), { direccion: 'Calle 1' })), 'A puede editar su dirección');
usarNegocio(nA);
await db.from('barberos').insert([{ nombre: 'Luis' }]);
await db.from('servicios').insert([{ nombre: 'Corte', precio: '150', duracion_min: '45' }]);
const [luis] = (await db.from('barberos').select('*')).data;
const [corte] = (await db.from('servicios').select('*')).data;
let x = await db.from('inventario').insert([{ nombre: 'Cera', precio_venta: 80, stock: 3 }]);
ok(x.error, 'gratis: NO puede usar inventario');
x = await db.from('gastos').insert([{ descripcion: 'Luz', monto: 1 }]);
ok(x.error, 'gratis: NO puede registrar gastos');
const mañana = new Date(); mañana.setDate(mañana.getDate() + 1); mañana.setHours(11, 0, 0, 0);
await N.crearCita({ cliente: 'Juan', telefono: '5550001111', inicio: mañana.toISOString(), barbero: luis, servicio: corte, origen: 'panel' });
x = await db.from('citas').select('*, servicios ( nombre, precio )');
ok(x.data?.length === 1 && x.data[0].servicios.precio === 150, 'A crea y ve su cita con servicio');
x = await db.from('clientes').select('*');
ok(x.data?.length === 1 && x.data[0].id === '5550001111', 'cliente registrado por teléfono');
await signOut(auth);

// ---- Dueño B ----
const ub = (await createUserWithEmailAndPassword(auth, 'b@test.com', 'secreto123')).user;
const nB = await N.crearNegocio(ub, { nombre: 'Barbería Don Pepe', dueno: 'B', whatsapp: '5599999999' });
ok((await getDoc(doc(firestore, 'negocios', nB))).data().slug === 'barberia-don-pepe-2', 'slug repetido -> -2');
usarNegocio(nA);
x = await db.from('citas').select('*'); ok(x.error, 'B NO puede ver citas de A');
x = await db.from('clientes').select('*'); ok(x.error, 'B NO puede ver clientes de A');
x = await db.from('barberos').insert([{ nombre: 'Intruso' }]); ok(x.error, 'B NO puede agregar barberos a A');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', nA), { nombre: 'Hackeado' }))), 'B NO puede editar negocio de A');
ok(!(await intenta(() => getDoc(doc(firestore, 'usuarios', ua.uid)))), 'B NO puede ver correo de A');
ok(!(await intenta(() => getDocs(collection(firestore, 'negocios')))), 'B NO puede listar negocios');
await signOut(auth);

// ---- Público reserva en A ----
const pub = await N.negocioPorSlug('barberia-don-pepe');
ok(pub?.id === nA, 'público encuentra negocio por slug');
usarNegocio(nA);
x = await db.from('barberos').select('*'); ok(!x.error && x.data.length === 1, 'público ve barberos');
const ocu = await N.ocupadosDelDia(mañana);
ok(ocu.length === 1 && !('cliente_nombre' in ocu[0]), 'público ve horarios ocupados sin datos personales');
const libres = N.horariosLibres({ fecha: mañana, horario: pub.horario, duracion: 45, ocupados: ocu, barberoId: luis.id });
const ocupada = mañana.toISOString();
ok(libres.length > 0 && !libres.includes(ocupada), `horarios libres excluyen la cita existente (${libres.length} libres)`);
ok(await intenta(() => N.crearCita({ cliente: 'Web', telefono: '5552223333', inicio: libres[0], barbero: luis, servicio: corte, origen: 'web' })), 'público reserva cita');
ok(await intenta(() => N.crearCita({ cliente: 'Juan otra vez', telefono: '5550001111', inicio: libres[3], barbero: luis, servicio: corte, origen: 'web' })), 'cliente existente reserva de nuevo (sin error)');
x = await db.from('citas').select('*'); ok(x.error, 'público NO lee citas');
x = await db.from('clientes').select('*'); ok(x.error, 'público NO lee clientes');
ok(!(await intenta(() => setDoc(doc(firestore, `negocios/${nA}/ocupados/falso`), { barbero_id: luis.id, inicio: libres[1], duracion: 30 }))), 'público NO crea ocupados sueltos');
ok(!(await intenta(async () => { const { writeBatch } = await import('firebase/firestore'); const b = writeBatch(firestore); const c = doc(collection(firestore, `negocios/${nA}/citas`)); b.set(c, { cliente_nombre: 'X', fecha_hora: libres[5], barbero_id: luis.id, servicio_id: corte.id, estado: 'pendiente', origen: 'web' }); b.set(doc(firestore, `negocios/${nA}/ocupados/${c.id}`), { barbero_id: luis.id, inicio: libres[5], duracion: 100000 }); await b.commit(); })), 'público NO bloquea días enteros (duración máx)');
ok(!(await intenta(() => addDoc(collection(firestore, `negocios/${nA}/citas`), { cliente_nombre: 'X', fecha_hora: libres[6], barbero_id: luis.id, servicio_id: corte.id, estado: 'finalizada', origen: 'web' }))), 'público NO crea citas finalizadas');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', nA), { plan: 'pro' }))), 'público NO cambia plan');

// ---- Admin ----
await createUserWithEmailAndPassword(auth, 'hugo050303@gmail.com', 'secreto123');
ok((await getDocs(collection(firestore, 'negocios'))).size === 2, 'admin lista negocios');
ok((await getDoc(doc(firestore, 'usuarios', ua.uid))).data().email === 'a@test.com', 'admin ve correo del dueño');
const unMes = new Date(); unMes.setMonth(unMes.getMonth() + 1);
ok(await intenta(() => updateDoc(doc(firestore, 'negocios', nA), { plan: 'pro', proHasta: Timestamp.fromDate(unMes) })), 'admin activa Pro a A');
usarNegocio(nA);
x = await db.from('citas').select('*'); ok(x.error, 'admin NO lee citas privadas de A');
await signOut(auth);

// ---- A con Pro ----
await signInWithEmailAndPassword(auth, 'a@test.com', 'secreto123');
usarNegocio(nA);
x = await db.from('inventario').insert([{ nombre: 'Cera', precio_venta: 80, stock: 3 }]); ok(!x.error, 'Pro: puede usar inventario');
x = await db.from('ventas_productos').insert([{ total: 80, detalle_items: [] }]).select().single(); ok(!x.error && x.data.id, 'Pro: registra venta');
x = await db.from('citas').select('*').order('fecha_hora');
const citaWeb = x.data.find((c) => c.cliente_nombre === 'Web');
ok(x.data.length === 3, 'A ve las 3 citas (incluye las web)');
await N.cambiarEstadoCita(citaWeb, 'cancelada');
ok((await N.ocupadosDelDia(mañana)).length === 2, 'cancelar libera el horario');
await N.eliminarCita(citaWeb);
ok((await db.from('citas').select('*')).data.length === 2, 'eliminar cita');
x = await db.from('clientes').select('*');
ok(x.data.length === 2 && x.data.find((c) => c.id === '5550001111').nombre === 'Juan', 'clientes sin duplicar; el público no sobrescribe nombre');
await signOut(auth);
console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
process.exit(fails ? 1 : 0);
