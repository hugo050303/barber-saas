// La semana dibujada: una barra por día con sus turnos (sólido), descansos (rayado) y días cerrados.
// Al tocar un día se abre su editor justo debajo.
import { Plus, X, Copy, Check } from 'lucide-react';
import { NOMBRES_DIA, DIAS_CORTOS, ORDEN_SEMANA, MAX_TURNOS, horaCorta, rangoCorto } from '../lib/horario';
import { aMinutos, aHhmm } from '../lib/formato';
import { Interruptor } from './EditorHorario';

const RAYADO = { backgroundImage: 'repeating-linear-gradient(-45deg, rgba(180,50,42,0.55) 0 4px, rgba(180,50,42,0.15) 4px 8px)' };

// Rango de horas que cubre la gráfica (con margen de 1 h)
function rango(listaDias) {
  let ini = 24 * 60; let fin = 0;
  for (const dias of listaDias) for (const d of ORDEN_SEMANA) for (const t of dias?.[d]?.turnos || []) {
    ini = Math.min(ini, aMinutos(t.abre)); fin = Math.max(fin, aMinutos(t.cierra));
  }
  if (fin <= ini) return [8 * 60, 22 * 60];
  return [Math.max(0, Math.floor(ini / 60) * 60 - 60), Math.min(24 * 60, Math.ceil(fin / 60) * 60 + 60)];
}

// Atajos para llenar un día con un toque
const ATAJOS = [
  ['Corrido 10–20', [{ abre: '10:00', cierra: '20:00' }]],
  ['Mañana y tarde', [{ abre: '09:00', cierra: '14:00' }, { abre: '16:00', cierra: '21:00' }]],
  ['Solo mañana', [{ abre: '09:00', cierra: '14:00' }]],
  ['Solo tarde', [{ abre: '14:00', cierra: '21:00' }]],
];

function EditorDia({ d, dia, onChange, onCopiar }) {
  const set = (turnos) => onChange(turnos.length ? { turnos } : null);
  return (
    <div className="space-y-3 border-t border-dashed border-line bg-paper/60 px-4 py-4">
      <label className="flex items-center gap-3 text-sm font-semibold">
        <Interruptor activo={!!dia} label={`Abrir ${NOMBRES_DIA[d]}`} onChange={(v) => onChange(v ? { turnos: [{ abre: '10:00', cierra: '20:00' }] } : null)} />
        {dia ? `${NOMBRES_DIA[d]}: abierto` : `${NOMBRES_DIA[d]}: cerrado`}
      </label>
      {dia && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {ATAJOS.map(([nombre, turnos]) => (
              <button type="button" key={nombre} onClick={() => set(structuredClone(turnos))} className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold hover:border-ink">{nombre}</button>
            ))}
          </div>
          {dia.turnos.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-full text-xs font-semibold uppercase tracking-wide text-ink-3 sm:w-16">Turno {i + 1}</span>
              <input type="time" className="input w-[112px] px-2 py-1.5 text-sm" value={t.abre} aria-label={`${NOMBRES_DIA[d]} turno ${i + 1} abre`}
                onChange={(e) => set(dia.turnos.map((x, k) => (k === i ? { ...x, abre: e.target.value } : x)))} />
              <span className="text-ink-3">a</span>
              <input type="time" className="input w-[112px] px-2 py-1.5 text-sm" value={t.cierra} aria-label={`${NOMBRES_DIA[d]} turno ${i + 1} cierra`}
                onChange={(e) => set(dia.turnos.map((x, k) => (k === i ? { ...x, cierra: e.target.value } : x)))} />
              {dia.turnos.length > 1 && <button type="button" onClick={() => set(dia.turnos.filter((_, k) => k !== i))} className="p-1 text-ink-3 hover:text-rojo" aria-label="Quitar turno"><X size={16} /></button>}
            </div>
          ))}
          {dia.turnos.length < MAX_TURNOS && (
            <button type="button" className="btn-link text-sm text-ink-2" onClick={() => {
              const ultimo = aMinutos(dia.turnos[dia.turnos.length - 1].cierra);
              const ini = Math.min(ultimo + 60, 22 * 60);
              set([...dia.turnos, { abre: aHhmm(ini), cierra: aHhmm(Math.min(ini + 180, 23 * 60 + 30)) }]);
            }}><Plus size={14} /> Agregar otro turno (descanso en medio)</button>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="flex items-center gap-1 text-xs font-semibold text-ink-2"><Copy size={13} /> Copiar a:</span>
        {ORDEN_SEMANA.filter((x) => x !== d).map((x) => (
          <button type="button" key={x} onClick={() => onCopiar([x])} className="w-10 rounded border border-line bg-card py-1 text-xs font-semibold hover:border-ink">{DIAS_CORTOS[x]}</button>
        ))}
        <button type="button" onClick={() => onCopiar(ORDEN_SEMANA.filter((x) => x !== d && x !== 0))} className="rounded border border-line bg-card px-2 py-1 text-xs font-semibold hover:border-ink">Lun a Sáb</button>
      </div>
    </div>
  );
}

// dias: horario a dibujar · descansos: horas sin citas que se repiten · editable: si se puede tocar
// fantasma: horario de referencia en gris (ej. el de la barbería, detrás del de un barbero)
export default function SemanaVisual({ dias, descansos = [], libres = [], editable = false, diaAbierto, onAbrir, onCambiarDia, onCopiar, fantasma }) {
  const [ini, fin] = rango([dias, fantasma]);
  const total = fin - ini;
  const pct = (m) => `${((Math.min(Math.max(m, ini), fin) - ini) / total) * 100}%`;
  const ancho = (a, b) => `${((Math.min(b, fin) - Math.max(a, ini)) / total) * 100}%`;
  const marcas = []; for (let m = Math.ceil(ini / 120) * 120; m <= fin; m += 120) marcas.push(m);

  return (
    <div className="card overflow-hidden">
      {/* Regla de horas */}
      <div className="flex border-b border-line bg-paper/60 px-3 py-1.5">
        <div className="w-14 shrink-0 sm:w-24" />
        <div className="relative h-4 flex-1">
          {marcas.map((m) => <span key={m} className="absolute -translate-x-1/2 text-[10px] font-semibold text-ink-3" style={{ left: pct(m) }}>{horaCorta(m)}</span>)}
        </div>
      </div>
      {ORDEN_SEMANA.map((d) => {
        const dia = dias[d];
        const descansa = libres.includes(d);
        const susDescansos = descansos.filter((x) => !x.dias?.length || x.dias.includes(d));
        const abierto = diaAbierto === d;
        const Fila = editable ? 'button' : 'div';
        return (
          <div key={d} className="border-b border-line last:border-b-0">
            <Fila type={editable ? 'button' : undefined} onClick={editable ? () => onAbrir(abierto ? null : d) : undefined}
              aria-expanded={editable ? abierto : undefined} aria-label={editable ? `Editar ${NOMBRES_DIA[d]}` : undefined}
              className={`flex w-full items-center px-3 py-2.5 text-left ${editable ? 'hover:bg-paper/70' : ''} ${abierto ? 'bg-paper/70' : ''}`}>
              <div className="w-14 shrink-0 sm:w-24">
                <p className="text-sm font-bold"><span className="sm:hidden">{DIAS_CORTOS[d]}</span><span className="hidden sm:inline">{NOMBRES_DIA[d]}</span></p>
                <p className="truncate text-[11px] text-ink-3">{descansa ? 'Descansa' : dia ? dia.turnos.map(rangoCorto).join(' · ') : 'Cerrado'}</p>
              </div>
              <div className="relative h-7 flex-1 rounded-sm bg-paper">
                {marcas.map((m) => <span key={m} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(m) }} />)}
                {fantasma?.[d]?.turnos.map((t, i) => (
                  <span key={`f${i}`} className="absolute inset-y-1 rounded-sm border border-dashed border-ink-3/50" style={{ left: pct(aMinutos(t.abre)), width: ancho(aMinutos(t.abre), aMinutos(t.cierra)) }} />
                ))}
                {!descansa && dia?.turnos.map((t, i) => (
                  <span key={i} className="absolute inset-y-0.5 rounded-sm bg-ink" style={{ left: pct(aMinutos(t.abre)), width: ancho(aMinutos(t.abre), aMinutos(t.cierra)) }} />
                ))}
                {!descansa && dia && susDescansos.map((x, i) => (
                  <span key={`d${i}`} title={x.nombre} className="absolute inset-y-0.5 rounded-sm" style={{ ...RAYADO, left: pct(aMinutos(x.inicio)), width: ancho(aMinutos(x.inicio), aMinutos(x.fin)) }} />
                ))}
                {(descansa || !dia) && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">{descansa ? 'Día de descanso' : 'Cerrado'}</span>}
              </div>
              {editable && <span className={`ml-2 hidden w-14 text-right text-xs font-semibold sm:block ${abierto ? 'text-ink' : 'text-ink-3'}`}>{abierto ? <Check size={14} className="ml-auto" /> : 'Editar'}</span>}
            </Fila>
            {editable && abierto && <EditorDia d={d} dia={dia} onChange={(v) => onCambiarDia(d, v)} onCopiar={(destinos) => onCopiar(d, destinos)} />}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-paper/60 px-3 py-2 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-ink" /> Abierto</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={RAYADO} /> Descanso (comida, café…)</span>
        {fantasma && <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-dashed border-ink-3/60" /> Horario de la barbería</span>}
        {editable && <span className="text-ink-3">Toca un día para editarlo</span>}
      </div>
    </div>
  );
}
