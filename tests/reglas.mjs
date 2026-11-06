// Pruebas de las reglas de seguridad y de la lógica de negocio contra el emulador de Firebase.
// Ejecutar: npx firebase-tools emulators:exec --only firestore,auth,storage --project barberia-659a5 "npx vite-node tests/reglas.mjs"
import {
  connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  GoogleAuthProvider, signInWithCredential,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, doc, getDoc, getDocs, collection, updateDoc, setDoc, Timestamp, addDoc, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage, ref, uploadBytes } from 'firebase/storage';
import { auth, firestore, app } from '../src/firebase.js';

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(firestore, '127.0.0.1', 8085);
const storage = getStorage(app);
connectStorageEmulator(storage, '127.0.0.1', 9199);
const imagen = (kb = 50, tipo = 'image/webp') => [new Uint8Array(kb * 1024), { contentType: tipo }];
const sube = (ruta, kb, tipo) => uploadBytes(ref(storage, ruta), ...imagen(kb, tipo));
console.error = () => {}; // silenciar los errores esperados de permisos
const { db, usarNegocio } = await import('../src/db.js');
const N = await import('../src/lib/negocio.js');
const { horariosLibres } = await import('../src/lib/horario.js');
const { hoyYmd, sumarDias, diaSemana } = await import('../src/lib/formato.js');

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const intenta = async (fn) => { try { await fn(); return true; } catch { return false; } };
const salir = () => signOut(auth);
const registrar = async (email, nombre) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, 'secreto123');
  await N.crearNegocio(user, { nombre, dueno: 'Dueño', whatsapp: '5512345678' });
  usarNegocio(user.uid);
  return user;
};
// Un día hábil (lunes a sábado) de la próxima semana
let dia = sumarDias(hoyYmd(), 7); while (diaSemana(dia) === 0) dia = sumarDias(dia, 1);

// ---- Admin configura el sistema: máximo 3 barberías ----
const admin = (await createUserWithEmailAndPassword(auth, 'hugo050303@gmail.com', 'secreto123')).user;
ok(await intenta(() => setDoc(doc(firestore, 'sistema', 'config'), { registroAbierto: true, maxNegocios: 3 })), 'admin fija tope de 3 barberías');
await salir();

// ---- Dueño A ----
const ua = await registrar('a@test.com', 'Barbería Don Pepe');
const negA = (await getDoc(doc(firestore, 'negocios', ua.uid))).data();
ok(negA.slug === 'barberia-don-pepe' && negA.plan === 'gratis', 'A se registra: plan gratis, id = uid');
ok((await getDoc(doc(firestore, 'sistema', 'registro'))).data().total === 1, 'contador de registros = 1');
ok(!(await intenta(() => N.crearNegocio(ua, { nombre: 'Otro', dueno: 'P', whatsapp: '1' }))), 'A no puede crear un segundo negocio');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { plan: 'pro', proHasta: Timestamp.fromDate(new Date(2099, 1, 1)) }))), 'A NO puede darse Pro');
ok(!(await intenta(() => setDoc(doc(firestore, 'sistema', 'config'), { maxNegocios: 9999 }))), 'A NO puede subir el tope');
ok(!(await intenta(() => setDoc(doc(firestore, 'sistema', 'registro'), { total: 0, ultimo: ua.uid }))), 'A NO puede reiniciar el contador');
ok(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { direccion: 'Calle 1' })), 'A edita su dirección');

// Plan gratis: solo el barbero "principal"
ok(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/barberos/principal`), { nombre: 'Luis' })), 'gratis: crea barbero principal');
ok(!(await intenta(() => addDoc(collection(firestore, `negocios/${ua.uid}/barberos`), { nombre: 'Extra' }))), 'gratis: NO puede crear un 2º barbero');
await db.from('servicios').insert([{ nombre: 'Corte', precio: '150', duracion_min: '45' }]);
const luis = { id: 'principal', nombre: 'Luis' };
const [corte] = (await db.from('servicios').select('*')).data;
ok((await db.from('inventario').insert([{ nombre: 'Cera', precio_venta: 80, stock: 3 }])).error, 'gratis: NO usa inventario');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/logo`))), 'gratis: NO sube fotos');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { fundador: true }))), 'A NO se pone precio fundador');

const inicio1 = horariosLibres({ ymd: dia, horario: negA.horario, duracion: 45, ocupados: [], barbero: luis })[2];
await N.crearCita({ cliente: 'Juan', telefono: '5550001111', inicio: inicio1, barbero: luis, servicio: corte, origen: 'panel' });
let x = await db.from('citas').select('*, servicios ( nombre, precio )');
ok(x.data?.length === 1 && x.data[0].precio === 150, 'A agenda cita (guarda precio)');
await salir();

// ---- Dueño B no ve nada de A ----
const ub = await registrar('b@test.com', 'Barbería Don Pepe');
ok((await getDoc(doc(firestore, 'negocios', ub.uid))).data().slug === 'barberia-don-pepe-2', 'slug repetido -> -2');
usarNegocio(ua.uid);
ok((await db.from('citas').select('*')).error, 'B NO ve citas de A');
ok((await db.from('clientes').select('*')).error, 'B NO ve clientes de A');
ok((await db.from('barberos').insert([{ nombre: 'Intruso' }])).error, 'B NO agrega barberos a A');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { nombre: 'Hackeado' }))), 'B NO edita negocio de A');
ok(!(await intenta(() => getDoc(doc(firestore, 'usuarios', ua.uid)))), 'B NO ve el correo de A');
ok(!(await intenta(() => getDocs(collection(firestore, 'negocios')))), 'B NO lista barberías');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/logo`))), 'B NO sube fotos a la carpeta de A');
await salir();

// ---- Google: C entra con Google (3ª barbería, llega al tope) ----
const cred = GoogleAuthProvider.credential(JSON.stringify({ sub: 'google-c', email: 'c@gmail.com', email_verified: true, name: 'C' }));
const uc = (await signInWithCredential(auth, cred)).user;
ok(uc.email === 'c@gmail.com', 'C entra con Google');
ok(await intenta(() => N.crearNegocio(uc, { nombre: 'Barbería C', dueno: 'C', whatsapp: '5511111111' })), 'C crea su barbería con cuenta de Google');
await salir();

// ---- D ya no cabe (tope 3) ----
const ud = (await createUserWithEmailAndPassword(auth, 'd@test.com', 'secreto123')).user;
ok(!(await intenta(() => N.crearNegocio(ud, { nombre: 'Barbería D', dueno: 'D', whatsapp: '5522222222' }))), 'tope alcanzado: D NO puede registrar barbería');
ok((await N.configSistema()).hayLugar === false, 'la app sabe que no hay lugar');
await salir();

// ---- Público reserva en A ----
const pub = await N.negocioPorSlug('barberia-don-pepe');
ok(pub?.id === ua.uid, 'público encuentra negocio por slug');
usarNegocio(ua.uid);
const ocu = await N.ocupadosDelDia(dia);
ok(ocu.length === 1 && !('cliente_nombre' in ocu[0]), 'público ve ocupados sin datos personales');
const libres = horariosLibres({ ymd: dia, horario: pub.horario, duracion: 45, ocupados: ocu, barbero: luis });
ok(libres.length > 0 && !libres.includes(inicio1), `horarios libres excluyen la cita (${libres.length} libres)`);
ok(await intenta(() => N.crearCita({ cliente: 'Web', telefono: '5552223333', inicio: libres[0], barbero: luis, servicio: corte, origen: 'web' })), 'público reserva');
ok(await intenta(() => N.crearCita({ cliente: 'Juan otra vez', telefono: '5550001111', inicio: libres[4], barbero: luis, servicio: corte, origen: 'web' })), 'cliente existente reserva otra vez');
ok(!(await intenta(() => N.crearCita({ cliente: 'Barato', telefono: '5553334444', inicio: libres[6], barbero: luis, servicio: { ...corte, precio: 1 }, origen: 'web' }))), 'público NO cambia el precio');
ok(!(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/clientes/5559998888`), { nombre: 'X', telefono: '5559998888', visitas: 99, gastado: 0, ultima: null }))), 'público NO infla visitas');
ok((await db.from('citas').select('*')).error, 'público NO lee citas');
ok((await db.from('clientes').select('*')).error, 'público NO lee clientes');
ok(!(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/ocupados/falso`), { barbero_id: 'principal', inicio: libres[1], duracion: 30 }))), 'público NO crea ocupados sueltos');
ok(!(await intenta(async () => { const b = writeBatch(firestore); const c = doc(collection(firestore, `negocios/${ua.uid}/citas`)); b.set(c, { cliente_nombre: 'X', cliente_telefono: '5550000000', fecha_hora: libres[5], barbero_id: 'principal', servicio_id: corte.id, precio: 150, estado: 'pendiente', origen: 'web' }); b.set(doc(firestore, `negocios/${ua.uid}/ocupados/${c.id}`), { barbero_id: 'principal', inicio: libres[5], duracion: 100000 }); await b.commit(); })), 'público NO bloquea días enteros');
ok(!(await intenta(() => addDoc(collection(firestore, `negocios/${ua.uid}/citas`), { cliente_nombre: 'X', cliente_telefono: '5550000000', fecha_hora: libres[6], barbero_id: 'principal', servicio_id: corte.id, precio: 150, estado: 'finalizada', origen: 'web' }))), 'público NO crea citas terminadas');

// Servicios por barbero: solo se reserva con quien hace ese servicio
const conServicios = async (servicios) => { await signInWithEmailAndPassword(auth, 'a@test.com', 'secreto123'); await updateDoc(doc(firestore, `negocios/${ua.uid}/barberos/principal`), { servicios }); await salir(); usarNegocio(ua.uid); };
await conServicios(['otro']);
ok(!(await intenta(() => N.crearCita({ cliente: 'Sin servicio', telefono: '5554445555', inicio: libres[libres.length - 1], barbero: luis, servicio: corte, origen: 'web' }))), 'público NO reserva un servicio que el barbero no hace');
await conServicios([corte.id]);
ok(await intenta(() => N.crearCita({ cliente: 'Con servicio', telefono: '5554445555', inicio: libres[libres.length - 1], barbero: luis, servicio: corte, origen: 'web' })), 'público reserva un servicio que el barbero sí hace');
await conServicios(null);

// ---- Admin activa Pro y cierra el registro ----
await signInWithEmailAndPassword(auth, 'hugo050303@gmail.com', 'secreto123');
ok((await getDocs(collection(firestore, 'negocios'))).size === 3, 'admin lista barberías');
ok((await getDoc(doc(firestore, 'usuarios', ua.uid))).data().email === 'a@test.com', 'admin ve correo del dueño');
const unMes = new Date(); unMes.setMonth(unMes.getMonth() + 1);
ok(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { plan: 'pro', proHasta: Timestamp.fromDate(unMes) })), 'admin activa Pro a A');
ok(await intenta(() => setDoc(doc(firestore, 'sistema', 'config'), { registroAbierto: false, maxNegocios: 100 })), 'admin cierra el registro');
usarNegocio(ua.uid);
ok((await db.from('citas').select('*')).error, 'admin NO lee citas privadas');
await salir();
await signInWithEmailAndPassword(auth, 'd@test.com', 'secreto123');
ok(!(await intenta(() => N.crearNegocio(ud, { nombre: 'Barbería D', dueno: 'D', whatsapp: '5522222222' }))), 'registro cerrado: D sigue sin poder');
await salir();

// ---- A con Pro ----
await signInWithEmailAndPassword(auth, 'a@test.com', 'secreto123');
usarNegocio(ua.uid);
ok(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/barberos/b2`), { nombre: 'Memo' })), 'Pro: agrega 2º barbero');
ok(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/barberos/b3`), { nombre: 'Toño' })), 'Pro: agrega 3er barbero');
ok(!(await intenta(() => setDoc(doc(firestore, `negocios/${ua.uid}/barberos/b4`), { nombre: 'Extra' }))), 'Pro: NO pasa de 3 barberos');
ok(!(await intenta(() => addDoc(collection(firestore, `negocios/${ua.uid}/barberos`), { nombre: 'Extra' }))), 'Pro: NO crea barberos con id libre');
// Fotos con plan de pago
ok(await intenta(() => sube(`negocios/${ua.uid}/logo`)), 'Pro: sube logo');
ok(await intenta(() => sube(`negocios/${ua.uid}/galeria/11`, 80, 'image/jpeg')), 'Pro: sube foto de galería (lugar 11)');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/galeria/12`))), 'Pro: NO pasa de 12 fotos');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/otra-cosa`))), 'Pro: NO sube archivos con otro nombre');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/portada`, 2100))), 'Pro: NO sube fotos de más de 2 MB');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/portada`, 10, 'application/pdf'))), 'Pro: solo imágenes');
ok(await intenta(() => sube(`negocios/${ua.uid}/barberos/b2`)), 'Pro: sube foto de barbero existente');
ok(!(await intenta(() => sube(`negocios/${ua.uid}/barberos/fantasma`))), 'Pro: NO sube foto de barbero inexistente');
ok(!(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { galeria: Array.from({ length: 13 }, (_, i) => ({ slot: i, url: 'x' })) }))), 'Pro: galería máx. 12 en la ficha');
ok(!(await db.from('inventario').insert([{ nombre: 'Cera', precio_venta: 80, stock: 3 }])).error, 'Pro: usa inventario');
x = await db.from('ventas_productos').insert([{ total: 80, detalle_items: [] }]).select().single();
ok(!x.error && x.data.id, 'Pro: registra venta');
for (let i = 0; i < 5; i++) await db.from('gastos').insert([{ descripcion: 'g' + i, monto: 10, fecha: new Date(2026, 0, i + 1).toISOString() }]);
x = await db.from('gastos').select('*').order('fecha', { ascending: false }).limit(2);
ok(x.data.length === 2 && x.data[0].descripcion === 'g4', 'paginación: limit trae solo lo más reciente');

x = await db.from('citas').select('*').order('fecha_hora');
const citaJuan = x.data.find((c) => c.cliente_nombre === 'Juan');
const citaWeb = x.data.find((c) => c.cliente_nombre === 'Web');
ok(x.data.length === 4, 'A ve las 4 citas');
await N.cambiarEstadoCita(citaJuan, 'finalizada');
let juan = (await getDoc(doc(firestore, `negocios/${ua.uid}/clientes/5550001111`))).data();
ok(juan.visitas === 1 && juan.gastado === 150 && juan.ultima === citaJuan.fecha_hora && juan.nombre === 'Juan', 'terminar cita suma visita y gasto al cliente');
await N.cambiarEstadoCita({ ...citaJuan, estado: 'finalizada' }, 'pendiente');
juan = (await getDoc(doc(firestore, `negocios/${ua.uid}/clientes/5550001111`))).data();
ok(juan.visitas === 0 && juan.gastado === 0, 'deshacer "terminada" resta la visita');
await N.cambiarEstadoCita(citaWeb, 'cancelada');
ok((await N.ocupadosDelDia(dia)).length === 3, 'cancelar libera el horario');
await N.eliminarCita(citaWeb);
ok((await db.from('citas').select('*')).data.length === 3, 'eliminar cita');
await deleteDoc(doc(firestore, `negocios/${ua.uid}/barberos/principal`));
await salir();

// ---- Admin sube a A a Plus y le da precio fundador ----
await signInWithEmailAndPassword(auth, 'hugo050303@gmail.com', 'secreto123');
ok(await intenta(() => updateDoc(doc(firestore, 'negocios', ua.uid), { plan: 'plus', fundador: true })), 'admin cambia a Plus y marca fundador');
await salir();
await signInWithEmailAndPassword(auth, 'a@test.com', 'secreto123');
ok(await intenta(() => addDoc(collection(firestore, `negocios/${ua.uid}/barberos`), { nombre: 'Extra' })), 'Plus: barberos ilimitados');
await salir();

console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
process.exit(fails ? 1 : 0);
