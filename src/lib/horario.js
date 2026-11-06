// Horario de la barbería y cálculo de horas libres para reservar.
import { aMinutos, aHhmm, enZona, diaSemana, hoyYmd, sumarDias } from './formato';

export const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const HORARIO_BASE = {
  // Por día de la semana (0 = domingo). null = cerrado.
  dias: {
    0: null,
    1: { abre: '10:00', cierra: '20:00' }, 2: { abre: '10:00', cierra: '20:00' }, 3: { abre: '10:00', cierra: '20:00' },
    4: { abre: '10:00', cierra: '20:00' }, 5: { abre: '10:00', cierra: '20:00' }, 6: { abre: '10:00', cierra: '18:00' },
  },
  descanso: null,          // { inicio: '14:00', fin: '15:00' } hora de comida (no se ofrecen citas)
  intervalo: 30,           // cada cuántos minutos se ofrece una hora
  anticipacion: 60,        // minutos mínimos antes de la cita para reservar en línea
  diasMaximo: 14,          // hasta cuántos días adelante se puede reservar
  cerrados: [],            // días especiales cerrados: ["2026-12-25"]
};

// Acepta el formato viejo ({abre, cierra, dias:[1..6]}) y lo convierte al nuevo
export function normalizarHorario(h) {
  if (!h) return structuredClone(HORARIO_BASE);
  if (Array.isArray(h.dias)) {
    const dias = {};
    for (let d = 0; d < 7; d++) dias[d] = h.dias.includes(d) ? { abre: h.abre || '10:00', cierra: h.cierra || '20:00' } : null;
    return { ...HORARIO_BASE, intervalo: h.intervalo || 30, dias };
  }
  return { ...HORARIO_BASE, ...h, dias: { ...HORARIO_BASE.dias, ...(h.dias || {}) }, cerrados: h.cerrados || [] };
}

// Horario de un día concreto, o null si está cerrado
export function horarioDelDia(horario, ymd, barbero) {
  const h = normalizarHorario(horario);
  if (h.cerrados.includes(ymd)) return null;
  const wd = diaSemana(ymd);
  if (barbero?.diasLibres?.includes(wd)) return null;
  return h.dias[wd] || null;
}

// Días que se muestran en la página de reservas
export function diasReservables(horario, desde = hoyYmd()) {
  const h = normalizarHorario(horario);
  const out = [];
  for (let i = 0; i <= h.diasMaximo; i++) {
    const ymd = sumarDias(desde, i);
    if (horarioDelDia(h, ymd)) out.push(ymd);
  }
  return out;
}

const traslapa = (a1, b1, a2, b2) => a1 < b2 && b1 > a2;

// Horas libres (ISO) de un barbero para un día y una duración
export function horariosLibres({ ymd, horario, duracion, ocupados, barbero, ahora = Date.now(), paraPanel = false }) {
  const h = normalizarHorario(horario);
  const dia = horarioDelDia(h, ymd, barbero);
  if (!dia) return [];
  const dur = Number(duracion) || 30;
  const paso = Number(h.intervalo) || 30;
  const limite = ahora + (paraPanel ? 0 : (Number(h.anticipacion) || 0) * 60000);
  const propios = ocupados
    .filter((o) => o.barbero_id === barbero.id)
    .map((o) => { const x = new Date(o.inicio).getTime(); return [x, x + (Number(o.duracion) || 30) * 60000]; });
  const desc = h.descanso?.inicio && h.descanso?.fin ? [aMinutos(h.descanso.inicio), aMinutos(h.descanso.fin)] : null;

  const libres = [];
  for (let m = aMinutos(dia.abre); m + dur <= aMinutos(dia.cierra); m += paso) {
    if (desc && traslapa(m, m + dur, desc[0], desc[1])) continue;
    const a = enZona(ymd, aHhmm(m)).getTime();
    const b = a + dur * 60000;
    if (a < limite) continue;
    if (propios.some(([x, y]) => traslapa(a, b, x, y))) continue;
    libres.push(new Date(a).toISOString());
  }
  return libres;
}

// ¿Esta hora choca con otra cita del barbero?
export function chocaCon(ocupados, barberoId, inicioIso, duracion) {
  const a = new Date(inicioIso).getTime(); const b = a + (Number(duracion) || 30) * 60000;
  return ocupados.some((o) => {
    if (o.barbero_id !== barberoId) return false;
    const x = new Date(o.inicio).getTime();
    return traslapa(a, b, x, x + (Number(o.duracion) || 30) * 60000);
  });
}

// "Lun a Vie 10:00 a 20:00 · Sáb 10:00 a 18:00" (agrupa días seguidos con el mismo horario)
export function resumenHorario(horario) {
  const h = normalizarHorario(horario);
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const grupos = [];
  for (const d of orden) {
    const x = h.dias[d];
    const clave = x ? `${x.abre} a ${x.cierra}` : null;
    const ultimo = grupos[grupos.length - 1];
    if (clave && ultimo && ultimo.clave === clave && orden.indexOf(ultimo.hasta) === orden.indexOf(d) - 1) ultimo.hasta = d;
    else if (clave) grupos.push({ clave, desde: d, hasta: d });
  }
  const rango = (g) => {
    if (g.hasta === g.desde) return DIAS_CORTOS[g.desde];
    const union = orden.indexOf(g.hasta) - orden.indexOf(g.desde) === 1 ? ' y ' : ' a ';
    return `${DIAS_CORTOS[g.desde]}${union}${DIAS_CORTOS[g.hasta]}`;
  };
  const txt = grupos.map((g) => `${rango(g)} ${g.clave}`).join(' · ');
  return txt + (h.descanso ? ` (comida de ${h.descanso.inicio} a ${h.descanso.fin})` : '');
}
