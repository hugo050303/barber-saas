// Texto de los avisos al celular del barbero. Lo usan el servidor (api/avisos) y la demo.
const ZONA_DEFAULT = 'America/Mexico_City';

const partes = (iso, zona, opciones) => new Intl.DateTimeFormat('es-MX', { timeZone: zona || ZONA_DEFAULT, ...opciones }).format(new Date(iso));
export const diaCorto = (iso, zona) => partes(iso, zona, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(/,/g, '').replace(' de ', ' ');
export const horaCorta = (iso, zona) => partes(iso, zona, { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?\s?m\.?/i, ' $1m');
export const ymdEnZona = (iso, zona) => new Intl.DateTimeFormat('en-CA', { timeZone: zona || ZONA_DEFAULT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

// tipo: 'nueva' | 'cancelada' | 'cambio'
export function textoAviso({ tipo, cita, anterior, barbero, servicio, zona }) {
  const cliente = String(cita.cliente_nombre || 'Un cliente').slice(0, 60);
  const cuando = `${diaCorto(cita.fecha_hora, zona)} ${horaCorta(cita.fecha_hora, zona)}`;
  const que = `${servicio || 'Servicio'}${barbero ? ` con ${barbero}` : ''}`;
  const base = { url: `/app?dia=${ymdEnZona(cita.fecha_hora, zona)}`, tag: `cita-${cita.id}` };
  if (tipo === 'cancelada') return { ...base, title: `Canceló ${cliente}`, body: `${cuando} · ${que}. La hora quedó libre.` };
  if (tipo === 'cambio') {
    const antes = anterior ? `${diaCorto(anterior.fecha_hora, zona)} ${horaCorta(anterior.fecha_hora, zona)}` : '';
    return { ...base, title: `${cliente} cambió su cita`, body: `Ahora ${cuando}${antes ? ` (antes ${antes})` : ''} · ${que}` };
  }
  return { ...base, title: `Nueva cita · ${cuando}`, body: `${cliente} · ${que}` };
}

// Resumen de la noche para el barbero: las citas de mañana
export function textoResumen({ citas, barberos = [], zona, manana }) {
  const base = { url: `/app?dia=${manana}`, tag: `resumen-${manana}` };
  if (!citas.length) return { ...base, title: 'Mañana aún no tienes citas', body: 'Comparte tu link de reservas en tu estado de WhatsApp para llenar la agenda.' };
  const orden = [...citas].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  const nombre = (id) => barberos.find((b) => b.id === id)?.nombre || 'Otro';
  const porBarbero = Object.entries(orden.reduce((acc, c) => ({ ...acc, [nombre(c.barbero_id)]: (acc[nombre(c.barbero_id)] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const detalle = porBarbero.length > 1 ? ` · ${porBarbero.map(([n, k]) => `${n} ${k}`).join(', ')}` : '';
  return { ...base, title: `Mañana: ${citas.length} ${citas.length === 1 ? 'cita' : 'citas'}`, body: `La primera a las ${horaCorta(orden[0].fecha_hora, zona)}${detalle}` };
}

// Recordatorio para el cliente: hoy o mañana tiene cita
export function textoRecordatorio({ cita, negocio, barbero, servicio, ahora = Date.now() }) {
  const zona = negocio.zona;
  const dia = ymdEnZona(cita.fecha_hora, zona) === ymdEnZona(new Date(ahora).toISOString(), zona) ? 'Hoy' : 'Mañana';
  return {
    title: `${dia} tienes cita en ${String(negocio.nombre || 'la barbería').slice(0, 60)}`,
    body: `${servicio || 'Tu servicio'}${barbero ? ` con ${barbero}` : ''} a las ${horaCorta(cita.fecha_hora, zona)}. ¿No puedes? Toca aquí para cambiarla o cancelarla.`,
    url: `/r/${negocio.slug}/cita/${cita.id}`,
    tag: `recordatorio-${cita.id}`,
  };
}
