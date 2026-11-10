// Fechas en la zona horaria de cada barbería, para el servidor (sin depender de src/).
export const ZONA_DEFAULT = 'America/Mexico_City';
const pad = (n) => String(n).padStart(2, '0');
const formatos = {};

export function partesEn(fecha, zona = ZONA_DEFAULT) {
  const f = (formatos[zona] ||= new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }));
  const p = Object.fromEntries(f.formatToParts(new Date(fecha)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
export const ymdEn = (fecha, zona) => { const p = partesEn(fecha, zona); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const sumarDias = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export const diaSemana = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

// "2026-11-05" a las "10:30" en la zona de la barbería -> Date
export function enZona(ymd, hhmm, zona = ZONA_DEFAULT) {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const supuesto = Date.UTC(y, m - 1, d, h, mi);
  const desfase = (t) => { const p = partesEn(t, zona); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(t / 60000) * 60000; };
  let t = supuesto - desfase(supuesto);
  const t2 = supuesto - desfase(t);
  if (t2 !== t) t = t2;
  return new Date(t);
}

// ¿La barbería abre ese día? (días de la semana, días cerrados y bloqueos de día completo)
export function abreEse(horario, ymd) {
  const wd = diaSemana(ymd);
  if (!horario) return wd !== 0;
  if ((horario.cerrados || []).includes(ymd)) return false;
  if ((horario.bloqueos || []).some((b) => !b.barbero && !b.inicio && ymd >= b.desde && ymd <= (b.hasta || b.desde))) return false;
  if (Array.isArray(horario.dias)) return horario.dias.includes(wd);
  const dia = horario.dias?.[wd] ?? horario.dias?.[String(wd)];
  return !!(dia && (dia.turnos?.length || dia.abre));
}
