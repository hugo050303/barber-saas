// Tareas de cada hora (api/cron.js, la corre Vercel Cron):
//  - Resumen de la noche: a la hora que eligió cada barbería (20:00 si no eligió), le avisa cuántas citas tiene mañana.
//  - Recordatorios: a los clientes que lo pidieron, un aviso con su cita de hoy o mañana (24 h antes, nunca de noche).
// Y guardarRecordatorio: cuando el cliente toca "Avísame un día antes" (api/avisos.js).
import { firestoreAdmin, enviarPush, enviarATodos, ErrorAviso } from './avisos.js';
import { textoResumen, textoRecordatorio } from './textoAviso.js';
import { partesEn, ymdEn, sumarDias, enZona, abreEse, ZONA_DEFAULT } from './tiempo.js';

const HORA = 3600 * 1000;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const deNoche = (h) => h >= 22 || h < 8;

export async function enviarResumenes({ db = firestoreAdmin(), enviar = enviarPush, ahora = Date.now() } = {}) {
  const negocios = await db.listar('negocios');
  const hechos = [];
  await Promise.all(negocios.map(async (n) => {
    if (n.resumen_activo === false) return;
    const zona = n.zona || ZONA_DEFAULT;
    if (partesEn(ahora, zona).h !== (Number.isInteger(n.resumen_hora) ? n.resumen_hora : 20)) return;
    const hoy = ymdEn(ahora, zona);
    if (n.resumen_enviado === hoy) return;
    const dispositivos = await db.listar(`negocios/${n.id}/dispositivos`);
    if (!dispositivos.length) return;
    const manana = sumarDias(hoy, 1);
    const citas = (await db.consultar(`negocios/${n.id}`, 'citas', [
      ['fecha_hora', '>=', enZona(manana, '00:00', zona).toISOString()],
      ['fecha_hora', '<', enZona(sumarDias(manana, 1), '00:00', zona).toISOString()],
    ])).filter((c) => c.estado !== 'cancelada');
    await db.actualizar(`negocios/${n.id}`, { resumen_enviado: hoy }); // antes de mandar: nunca dos veces
    if (!citas.length && !abreEse(n.horario, manana)) return; // mañana cierra y no hay nada que avisar
    const barberos = citas.length ? await db.listar(`negocios/${n.id}/barberos`) : [];
    const r = await enviarATodos(n.id, textoResumen({ citas, barberos, zona, manana }), { db, enviar });
    hechos.push({ negocio: n.id, citas: citas.length, ...r });
  }));
  return hechos;
}

export async function enviarRecordatorios({ db = firestoreAdmin(), enviar = enviarPush, ahora = Date.now() } = {}) {
  const pendientes = await db.consultar('', 'recordatorios', [
    ['fecha_hora', '>=', new Date(ahora + HORA).toISOString()],
    ['fecha_hora', '<', new Date(ahora + 24 * HORA).toISOString()],
  ]);
  let enviados = 0;
  await Promise.all(pendientes.map(async (r) => {
    if (deNoche(partesEn(ahora, r.zona || ZONA_DEFAULT).h)) return; // se manda en la siguiente hora de día
    const ruta = `recordatorios/${r.id}`;
    const cita = await db.leer(`negocios/${r.negocio}/citas/${r.cita}`);
    if (!cita || !['pendiente', 'confirmada'].includes(cita.estado)) { await db.borrar(ruta); return; }
    const [negocio, barbero, servicio] = await Promise.all([
      db.leer(`negocios/${r.negocio}`),
      cita.barbero_id ? db.leer(`negocios/${r.negocio}/barberos/${cita.barbero_id}`) : null,
      cita.servicio_id ? db.leer(`negocios/${r.negocio}/servicios/${cita.servicio_id}`) : null,
    ]);
    await db.borrar(ruta); // un solo aviso por cita
    if (!negocio) return;
    try {
      await enviar({ endpoint: r.endpoint, keys: r.keys }, textoRecordatorio({ cita, negocio, barbero: barbero?.nombre, servicio: servicio?.nombre, ahora }));
      enviados++;
    } catch (e) { if (e instanceof ErrorAviso) throw e; /* el celular ya no existe o no aceptó: nada que hacer */ }
  }));
  return { pendientes: pendientes.length, enviados };
}

// El cliente pide que le recuerden su cita
export async function guardarRecordatorio({ negocio, cita, suscripcion }, { db = firestoreAdmin(), ahora = Date.now() } = {}) {
  if (!ID.test(negocio || '') || !ID.test(cita || '')) throw new ErrorAviso('Solicitud inválida');
  const { endpoint, keys } = suscripcion || {};
  if (typeof endpoint !== 'string' || !/^https:\/\/.{10,600}$/.test(endpoint) || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' || keys.p256dh.length > 200 || keys.auth.length > 100) {
    throw new ErrorAviso('Este celular no pudo activar los avisos.');
  }
  const c = await db.leer(`negocios/${negocio}/citas/${cita}`);
  if (!c) throw new ErrorAviso('No existe esa cita.', 404);
  if (!['pendiente', 'confirmada'].includes(c.estado)) throw new ErrorAviso('Esa cita ya no está apartada.');
  if (Date.parse(c.fecha_hora) - ahora < HORA) throw new ErrorAviso('Tu cita es en menos de una hora: ya no da tiempo de recordártela.');
  const n = await db.leer(`negocios/${negocio}`);
  await db.poner(`recordatorios/${negocio}_${cita}`, { negocio, cita, fecha_hora: c.fecha_hora, zona: n?.zona || ZONA_DEFAULT, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, creado: new Date(ahora).toISOString() });
  return { ok: true };
}
