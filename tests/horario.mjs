// Pruebas de la lógica de horarios (no necesitan Firebase). Ejecutar: npx vite-node tests/horario.mjs
import { horariosLibres, turnosDelDia, diasReservables, normalizarHorario, resumenHorario, sugerirIntervalo, validarTurnos, bloqueosVigentes } from '../src/lib/horario.js';
import { hora, enZona } from '../src/lib/formato.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const libres = (horario, ymd, barbero = { id: 'b' }, duracion = 30, ocupados = []) =>
  horariosLibres({ ymd, horario, duracion, ocupados, barbero, ahora: 0 }).map((x) => hora(x).replace(/\s/g, ' '));
const SAB = '2026-11-07'; const LUN = '2026-11-09'; const MAR = '2026-11-10';

// Formatos viejos
ok(libres({ abre: '10:00', cierra: '12:00', dias: [6] }, SAB).length === 4, 'formato v1 sigue funcionando');
ok(!libres({ dias: { 6: { abre: '10:00', cierra: '12:00' } }, descanso: { inicio: '11:00', fin: '11:30' } }, SAB).some((x) => x.startsWith('11:00')), 'formato v2 (un descanso) sigue funcionando');

// Turnos
const dosTurnos = { dias: { 6: { turnos: [{ abre: '09:00', cierra: '11:00' }, { abre: '16:00', cierra: '17:00' }] } } };
const l = libres(dosTurnos, SAB);
ok(l.length === 6 && l[0].startsWith('9:00') && l[4].startsWith('4:00'), 'dos turnos: ' + l.join(', '));
ok(libres(dosTurnos, SAB, { id: 'b' }, 60).length === 4, 'un servicio de 1 h no se sale del turno (9:00, 9:30, 10:00 y 16:00)');

// Descansos que se repiten, solo ciertos días
const conDescansos = { dias: { 1: { turnos: [{ abre: '10:00', cierra: '13:00' }] }, 2: { turnos: [{ abre: '10:00', cierra: '13:00' }] } }, descansos: [{ nombre: 'Café', inicio: '11:00', fin: '11:30', dias: [] }, { nombre: 'Junta', inicio: '12:00', fin: '13:00', dias: [1] }] };
ok(!libres(conDescansos, LUN).some((x) => /^(11:00|12:00|12:30)/.test(x)) && libres(conDescansos, LUN).length === 3, 'lunes: café y junta sin citas');
ok(libres(conDescansos, MAR).some((x) => x.startsWith('12:00')), 'martes: la junta del lunes no aplica');

// Bloqueos
const base = { dias: { 6: { turnos: [{ abre: '10:00', cierra: '20:00' }] } } };
const horas = { ...base, bloqueos: [{ desde: SAB, inicio: '12:00', fin: '16:00' }] };
ok(!libres(horas, SAB).some((x) => /^(12|1|2|3):/.test(x)) && libres(horas, SAB).some((x) => x.startsWith('4:00')), 'bloqueo de 4 horas en un día');
const soloMemo = { ...base, bloqueos: [{ desde: SAB, inicio: '10:00', fin: '20:00', barbero: 'memo' }] };
ok(libres(soloMemo, SAB, { id: 'memo' }).length === 0 && libres(soloMemo, SAB, { id: 'tono' }).length === 20, 'bloqueo solo para un barbero');
const vacaciones = { dias: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { turnos: [{ abre: '10:00', cierra: '12:00' }] }])), bloqueos: [{ desde: '2026-11-08', hasta: '2026-11-10' }], diasMaximo: 6 };
ok(diasReservables(vacaciones, SAB).join() === '2026-11-07,2026-11-11,2026-11-12,2026-11-13', 'días completos bloqueados (vacaciones del 8 al 10)');
ok(turnosDelDia({ ...vacaciones, bloqueos: [{ desde: LUN, barbero: 'memo' }] }, LUN, { id: 'tono' }).length === 1, 'día completo de un barbero no cierra a los demás');

// Horario propio del barbero
const memo = { id: 'memo', horarioPropio: { dias: { 6: { turnos: [{ abre: '16:00', cierra: '18:00' }] } } } };
ok(libres(base, SAB, memo)[0].startsWith('4:00') && libres(base, SAB, memo).length === 4, 'Memo con horario propio (solo tardes)');

// Intervalo de 10 minutos
ok(libres({ ...base, intervalo: 10 }, SAB, { id: 'b' }, 30).length === 58, 'citas cada 10 minutos');

// Citas existentes
const ocupado = [{ barbero_id: 'b', inicio: enZona(SAB, '10:00').toISOString(), duracion: 45 }];
ok(!libres(base, SAB, { id: 'b' }, 30, ocupado).some((x) => /^10:(00|30)/.test(x)), 'no se empalma con una cita existente');

// Ayudas
ok(sugerirIntervalo([{ duracion_min: 30 }, { duracion_min: 45 }, { duracion_min: 60 }]) === 15, 'sugerencia: cada 15 min con servicios de 30/45/60');
ok(sugerirIntervalo([{ duracion_min: 30 }, { duracion_min: 60 }]) === 30, 'sugerencia: cada 30 min con servicios de 30/60');
ok(validarTurnos([{ abre: '09:00', cierra: '13:00' }, { abre: '12:00', cierra: '18:00' }], 'Lunes') !== null, 'detecta turnos empalmados');
ok(validarTurnos([{ abre: '09:00', cierra: '13:00' }, { abre: '16:00', cierra: '21:00' }], 'Lunes') === null, 'acepta dos turnos correctos');
ok(bloqueosVigentes([{ desde: '2020-01-01' }, { desde: '2020-01-01', hasta: '2099-01-01' }], '2026-11-06').length === 1, 'limpia bloqueos que ya pasaron');
ok(resumenHorario({ ...dosTurnos, descansos: [{ nombre: 'Comida', inicio: '14:00', fin: '15:00', dias: [] }] }).includes('Sáb 09:00 a 11:00 y 16:00 a 17:00'), 'resumen con turnos: ' + resumenHorario(dosTurnos));
ok(normalizarHorario(null).dias[1].turnos[0].abre === '10:00', 'horario por defecto');

console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
process.exit(fails ? 1 : 0);
