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
