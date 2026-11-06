// Horario de la barbería y cálculo de horas libres para reservar.
//
// Modelo (lo decide el dueño en Configuración, Equipo y Agenda):
//   dias:       por día de la semana (0 = domingo): null = cerrado, o { turnos: [{ abre, cierra }] } (hasta 3 turnos)
//   descansos:  horas sin citas que se repiten cada semana: [{ nombre, inicio, fin, dias: [0..6] }] (dias vacío = todos)
//   bloqueos:   fechas u horas sueltas sin citas: [{ desde, hasta, inicio?, fin?, barbero? }]
//               sin inicio/fin = el día completo; sin barbero = toda la barbería
//   cerrados:   días especiales cerrados ["2026-12-25"]
//   intervalo, anticipacion (min), diasMaximo
// Cada barbero puede tener además horarioPropio: { dias } y diasLibres: [0..6].
import { aMinutos, aHhmm, enZona, diaSemana, hoyYmd, sumarDias } from './formato';

export const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
export const MAX_TURNOS = 3;
export const MAX_DESCANSOS = 5;
export const MAX_BLOQUEOS = 60;
export const INTERVALOS = [10, 15, 20, 30, 45, 60];

const t = (abre, cierra) => ({ turnos: [{ abre, cierra }] });

export const HORARIO_BASE = {
  dias: { 0: null, 1: t('10:00', '20:00'), 2: t('10:00', '20:00'), 3: t('10:00', '20:00'), 4: t('10:00', '20:00'), 5: t('10:00', '20:00'), 6: t('10:00', '18:00') },
  descansos: [],
  bloqueos: [],
  intervalo: 30,      // cada cuántos minutos se ofrece una hora
  anticipacion: 60,   // minutos mínimos antes de la cita para reservar en línea
  diasMaximo: 14,     // hasta cuántos días adelante se puede reservar
  cerrados: [],
};

// Plantillas de un toque (el dueño luego ajusta lo que quiera)
export const PLANTILLAS = [
  { id: 'corrido', nombre: 'Corrido', detalle: 'Lun a Sáb 10:00 a 20:00', dias: { 0: null, 1: t('10:00', '20:00'), 2: t('10:00', '20:00'), 3: t('10:00', '20:00'), 4: t('10:00', '20:00'), 5: t('10:00', '20:00'), 6: t('10:00', '20:00') }, descansos: [] },
  { id: 'comida', nombre: 'Con comida', detalle: 'Lun a Sáb 10:00 a 20:00, comida 15:00 a 16:00', dias: { 0: null, 1: t('10:00', '20:00'), 2: t('10:00', '20:00'), 3: t('10:00', '20:00'), 4: t('10:00', '20:00'), 5: t('10:00', '20:00'), 6: t('10:00', '20:00') }, descansos: [{ nombre: 'Comida', inicio: '15:00', fin: '16:00', dias: [] }] },
  { id: 'turnos', nombre: 'Dos turnos', detalle: 'Lun a Sáb 9:00 a 13:00 y 16:00 a 21:00', dias: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, d === 0 ? null : { turnos: [{ abre: '09:00', cierra: '13:00' }, { abre: '16:00', cierra: '21:00' }] }])), descansos: [] },
  { id: 'finde', nombre: 'Fin de semana fuerte', detalle: 'Mar a Vie 11:00 a 20:00, Sáb 9:00 a 21:00, Dom 10:00 a 15:00', dias: { 0: t('10:00', '15:00'), 1: null, 2: t('11:00', '20:00'), 3: t('11:00', '20:00'), 4: t('11:00', '20:00'), 5: t('11:00', '20:00'), 6: t('09:00', '21:00') }, descansos: [] },
];

// Convierte cualquier forma vieja de un día a { turnos: [...] }
function normalizarDia(x) {
  if (!x) return null;
  if (Array.isArray(x.turnos)) return x.turnos.length ? { turnos: x.turnos.map(({ abre, cierra }) => ({ abre, cierra })) } : null;
  if (x.abre && x.cierra) return { turnos: [{ abre: x.abre, cierra: x.cierra }] };
  return null;
}
export function normalizarDias(dias) {
  const out = {};
  for (let d = 0; d < 7; d++) out[d] = normalizarDia(dias?.[d] ?? dias?.[String(d)]);
  return out;
}

// Acepta todos los formatos anteriores (v1: {abre, cierra, dias:[...]}; v2: un solo "descanso")
export function normalizarHorario(h) {
  if (!h) return structuredClone(HORARIO_BASE);
  let dias;
  if (Array.isArray(h.dias)) {
    dias = {};
    for (let d = 0; d < 7; d++) dias[d] = h.dias.includes(d) ? t(h.abre || '10:00', h.cierra || '20:00') : null;
  } else {
    dias = normalizarDias({ ...HORARIO_BASE.dias, ...(h.dias || {}) });
  }
  let descansos = Array.isArray(h.descansos) ? h.descansos : [];
  if (!Array.isArray(h.descansos) && h.descanso?.inicio && h.descanso?.fin) descansos = [{ nombre: 'Comida', inicio: h.descanso.inicio, fin: h.descanso.fin, dias: [] }];
  return {
    ...HORARIO_BASE,
    intervalo: h.intervalo ?? HORARIO_BASE.intervalo,
    anticipacion: h.anticipacion ?? HORARIO_BASE.anticipacion,
    diasMaximo: h.diasMaximo ?? HORARIO_BASE.diasMaximo,
    cerrados: h.cerrados || [],
    bloqueos: h.bloqueos || [],
    descansos: descansos.map((x) => ({ nombre: x.nombre || '', inicio: x.inicio, fin: x.fin, dias: x.dias || [] })),
    dias,
  };
}

const aplicaA = (bloqueo, barbero) => !bloqueo.barbero || (barbero && bloqueo.barbero === barbero.id);
const enRango = (bloqueo, ymd) => ymd >= bloqueo.desde && ymd <= (bloqueo.hasta || bloqueo.desde);

// Turnos de un día concreto para la barbería (o para un barbero), o [] si no se trabaja
export function turnosDelDia(horario, ymd, barbero) {
  const h = normalizarHorario(horario);
  if (h.cerrados.includes(ymd)) return [];
  const wd = diaSemana(ymd);
  if (barbero?.diasLibres?.includes(wd)) return [];
  if (h.bloqueos.some((b) => !b.inicio && enRango(b, ymd) && aplicaA(b, barbero))) return [];
  const dias = barbero?.horarioPropio?.dias ? normalizarDias(barbero.horarioPropio.dias) : h.dias;
  const dia = dias[wd];
  return dia ? [...dia.turnos].sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre)) : [];
}

// Compatibilidad: { turnos } o null si ese día no se trabaja
export function horarioDelDia(horario, ymd, barbero) {
  const turnos = turnosDelDia(horario, ymd, barbero);
  return turnos.length ? { turnos } : null;
}

export const textoTurnos = (turnos) => (turnos || []).map((x) => `${x.abre} a ${x.cierra}`).join(' y ');

// Rangos (en minutos) sin citas para ese día: descansos que se repiten y bloqueos de horas
export function horasSinCitas(horario, ymd, barbero) {
  const h = normalizarHorario(horario);
  const wd = diaSemana(ymd);
  const descansos = h.descansos.filter((x) => !x.dias?.length || x.dias.includes(wd)).map((x) => [aMinutos(x.inicio), aMinutos(x.fin), x.nombre || 'Descanso']);
  const bloqueos = h.bloqueos.filter((b) => b.inicio && enRango(b, ymd) && aplicaA(b, barbero)).map((b) => [aMinutos(b.inicio), aMinutos(b.fin), 'Bloqueado']);
  return [...descansos, ...bloqueos];
}

// Bloqueos que tocan un día (para pintarlos en la agenda)
export const bloqueosDelDia = (horario, ymd) => normalizarHorario(horario).bloqueos.filter((b) => enRango(b, ymd));

// Días que se muestran en la página de reservas
export function diasReservables(horario, desde = hoyYmd()) {
  const h = normalizarHorario(horario);
  const out = [];
  for (let i = 0; i <= h.diasMaximo; i++) {
    const ymd = sumarDias(desde, i);
    if (turnosDelDia(h, ymd).length) out.push(ymd);
  }
  return out;
}

const traslapa = (a1, b1, a2, b2) => a1 < b2 && b1 > a2;

// Horas libres (ISO) de un barbero para un día y una duración
export function horariosLibres({ ymd, horario, duracion, ocupados, barbero, ahora = Date.now(), paraPanel = false }) {
  const h = normalizarHorario(horario);
  const turnos = turnosDelDia(h, ymd, barbero);
  if (!turnos.length) return [];
  const dur = Number(duracion) || 30;
  const paso = Number(h.intervalo) || 30;
  const limite = ahora + (paraPanel ? 0 : (Number(h.anticipacion) || 0) * 60000);
  const sinCitas = horasSinCitas(h, ymd, barbero);
  const propios = ocupados
    .filter((o) => o.barbero_id === barbero.id)
    .map((o) => { const x = new Date(o.inicio).getTime(); return [x, x + (Number(o.duracion) || 30) * 60000]; });

  const libres = [];
  for (const turno of turnos) {
    for (let m = aMinutos(turno.abre); m + dur <= aMinutos(turno.cierra); m += paso) {
      if (sinCitas.some(([a, b]) => traslapa(m, m + dur, a, b))) continue;
      const a = enZona(ymd, aHhmm(m)).getTime();
      const b = a + dur * 60000;
      if (a < limite) continue;
      if (propios.some(([x, y]) => traslapa(a, b, x, y))) continue;
      libres.push(new Date(a).toISOString());
    }
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

// Sugerencia de "citas cada X minutos" según la duración de los servicios
export function sugerirIntervalo(servicios) {
  const duraciones = (servicios || []).map((s) => Number(s.duracion_min) || 30).filter(Boolean);
  if (!duraciones.length) return 30;
  const corta = Math.min(...duraciones);
  return [...INTERVALOS].reverse().find((i) => i <= corta && duraciones.every((d) => d % i === 0)) || INTERVALOS.find((i) => i >= Math.min(corta, 30)) || 30;
}

// Revisa que los turnos de un día sean válidos; regresa un mensaje de error o null
export function validarTurnos(turnos, etiqueta) {
  const orden = [...turnos].sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
  for (const x of orden) if (aMinutos(x.cierra) <= aMinutos(x.abre)) return `${etiqueta}: cada turno debe cerrar después de abrir.`;
  for (let i = 1; i < orden.length; i++) if (aMinutos(orden[i].abre) < aMinutos(orden[i - 1].cierra)) return `${etiqueta}: los turnos se empalman.`;
  return null;
}

// Quita bloqueos que ya pasaron
export const bloqueosVigentes = (bloqueos, hoy = hoyYmd()) => (bloqueos || []).filter((b) => (b.hasta || b.desde) >= hoy);

// "Lun a Vie 10:00 a 20:00 · Sáb 10:00 a 14:00 y 16:00 a 18:00" (agrupa días seguidos con el mismo horario)
export function resumenHorario(horario) {
  const h = normalizarHorario(horario);
  const grupos = [];
  for (const d of ORDEN_SEMANA) {
    const clave = h.dias[d] ? textoTurnos(h.dias[d].turnos) : null;
    const ultimo = grupos[grupos.length - 1];
    if (clave && ultimo && ultimo.clave === clave && ORDEN_SEMANA.indexOf(ultimo.hasta) === ORDEN_SEMANA.indexOf(d) - 1) ultimo.hasta = d;
    else if (clave) grupos.push({ clave, desde: d, hasta: d });
  }
  const rango = (g) => {
    if (g.hasta === g.desde) return DIAS_CORTOS[g.desde];
    const union = ORDEN_SEMANA.indexOf(g.hasta) - ORDEN_SEMANA.indexOf(g.desde) === 1 ? ' y ' : ' a ';
    return `${DIAS_CORTOS[g.desde]}${union}${DIAS_CORTOS[g.hasta]}`;
  };
  const txt = grupos.map((g) => `${rango(g)} ${g.clave}`).join(' · ');
  const comidas = h.descansos.filter((x) => !x.dias?.length).map((x) => `${(x.nombre || 'descanso').toLowerCase()} de ${x.inicio} a ${x.fin}`);
  return txt + (comidas.length ? ` (${comidas.join(', ')})` : '');
}
