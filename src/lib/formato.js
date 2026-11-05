// Utilidades de fechas y dinero.
//
// Todas las fechas se calculan en la ZONA HORARIA DE LA BARBERÍA (no la del celular de quien
// abre la página). Así un cliente con el teléfono en otra zona ve las horas correctas.
// Los días se manejan como texto "AAAA-MM-DD" y los momentos como ISO (UTC).

export const ZONAS = [
  ['America/Mexico_City', 'Centro (CDMX, Guadalajara, Monterrey)'],
  ['America/Cancun', 'Sureste (Quintana Roo)'],
  ['America/Mazatlan', 'Pacífico (Sinaloa, Nayarit, BCS)'],
  ['America/Hermosillo', 'Sonora'],
  ['America/Tijuana', 'Noroeste (Baja California)'],
];
export const ZONA_DEFAULT = 'America/Mexico_City';

let ZONA = ZONA_DEFAULT;
export function usarZona(z) { ZONA = z || ZONA_DEFAULT; }

const pad = (n) => String(n).padStart(2, '0');
const cacheFmt = {};
function partes(fecha) {
  const f = (cacheFmt[ZONA] ||= new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }));
  const p = Object.fromEntries(f.formatToParts(new Date(fecha)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

// Desfase de la zona en minutos para un instante dado
function desfase(t) {
  const p = partes(t);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(t / 60000) * 60000) / 60000;
}

// "2026-11-05" + "10:30" (hora de la barbería) -> Date
export function enZona(ymd, hhmm = '00:00') {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const supuesto = Date.UTC(y, m - 1, d, h, mi);
  let t = supuesto - desfase(supuesto) * 60000;
  const t2 = supuesto - desfase(t) * 60000; // ajuste por cambio de horario
  if (t2 !== t) t = t2;
  return new Date(t);
}

// Día de hoy (o de una fecha) en la zona de la barbería: "2026-11-05"
export const hoyYmd = (fecha = new Date()) => { const p = partes(fecha); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const horaYmd = (fecha) => { const p = partes(fecha); return `${pad(p.h)}:${pad(p.min)}`; };
export const partesZona = partes;

// Aritmética de días sobre "AAAA-MM-DD" (sin zonas de por medio)
export const sumarDias = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export const diaSemana = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const diaDelMes = (ymd) => Number(ymd.slice(8, 10));

export const inicioDia = (ymd) => enZona(ymd, '00:00').toISOString();
export const finDia = (ymd) => new Date(enZona(sumarDias(ymd, 1), '00:00').getTime() - 1).toISOString();

const conZona = (o) => ({ timeZone: ZONA, ...o });
export const hora = (iso) => new Date(iso).toLocaleTimeString('es-MX', conZona({ hour: 'numeric', minute: '2-digit' }));
export const fechaLarga = (iso) => new Date(iso).toLocaleDateString('es-MX', conZona({ weekday: 'long', day: 'numeric', month: 'long' }));
export const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-MX', conZona({ day: 'numeric', month: 'short', year: 'numeric' }));
// Para días "AAAA-MM-DD": se toma el mediodía para que nunca cambie de día
export const diaLargo = (ymd) => fechaLarga(enZona(ymd, '12:00'));
export const diaCorto = (ymd) => fechaCorta(enZona(ymd, '12:00'));

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
export const dinero = (n) => fmt.format(Number(n) || 0);

export const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

export const linkWhatsApp = (tel, texto) =>
  `https://wa.me/52${soloDigitos(tel).slice(-10)}?text=${encodeURIComponent(texto)}`;

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'barberia';

// "10:30" -> minutos desde medianoche, y al revés
export const aMinutos = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
export const aHhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// Texto para buscar sin acentos ni mayúsculas
export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Meses como "AAAA-MM"
export const mesActual = () => hoyYmd().slice(0, 7);
export const sumarMeses = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
export const diasDelMes = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
export const rangoMes = (ym) => [inicioDia(`${ym}-01`), finDia(`${ym}-${String(diasDelMes(ym)).padStart(2, '0')}`)];
export const nombreMes = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
