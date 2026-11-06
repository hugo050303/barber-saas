// Piezas para editar horarios: turnos por día y horas sin citas que se repiten.
import { Plus, X, Copy } from 'lucide-react';
import { NOMBRES_DIA, DIAS_CORTOS, ORDEN_SEMANA, MAX_TURNOS, MAX_DESCANSOS } from '../lib/horario';
import { aMinutos, aHhmm } from '../lib/formato';

export function Interruptor({ activo, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={label} onClick={() => onChange(!activo)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? 'bg-ink' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${activo ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

const Hora = ({ valor, onChange, label }) => (
  <input type="time" className="input w-[112px] px-2 py-1.5 text-sm" value={valor} onChange={(e) => onChange(e.target.value)} aria-label={label} required />
);

// Siguiente turno sugerido: empieza 1 hora después de que cierra el último
function turnoSiguiente(turnos) {
  const ultimo = turnos[turnos.length - 1];
  const ini = Math.min(aMinutos(ultimo.cierra) + 60, 22 * 60);
  return { abre: aHhmm(ini), cierra: aHhmm(Math.min(ini + 4 * 60, 23 * 60 + 30)) };
}

// Turnos de cada día de la semana. dias: { 0..6: null | { turnos: [{ abre, cierra }] } }
export function EditorTurnos({ dias, onChange, etiqueta = '' }) {
  const setDia = (d, valor) => onChange({ ...dias, [d]: valor });
  const copiarATodos = (d) => {
    const fuente = dias[d];
    const nuevo = { ...dias };
    for (const x of ORDEN_SEMANA) if (x !== d && dias[x]) nuevo[x] = structuredClone(fuente);
    onChange(nuevo);
  };
  return (
    <div className="card divide-y divide-line">
      {ORDEN_SEMANA.map((d) => {
        const dia = dias[d];
        return (
          <div key={d} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
            <div className="flex w-36 items-center gap-3 pt-1">
              <Interruptor activo={!!dia} label={`Abrir ${NOMBRES_DIA[d]}${etiqueta}`} onChange={(v) => setDia(d, v ? { turnos: [{ abre: '10:00', cierra: '20:00' }] } : null)} />
              <span className={`font-medium ${dia ? '' : 'text-ink-3'}`}>{NOMBRES_DIA[d]}</span>
            </div>
            {dia ? (
              <div className="flex flex-1 flex-col gap-2">
                {dia.turnos.map((tu, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Hora valor={tu.abre} label={`${NOMBRES_DIA[d]} turno ${i + 1} abre`} onChange={(v) => setDia(d, { turnos: dia.turnos.map((x, k) => (k === i ? { ...x, abre: v } : x)) })} />
                    <span className="text-ink-3">a</span>
                    <Hora valor={tu.cierra} label={`${NOMBRES_DIA[d]} turno ${i + 1} cierra`} onChange={(v) => setDia(d, { turnos: dia.turnos.map((x, k) => (k === i ? { ...x, cierra: v } : x)) })} />
                    {dia.turnos.length > 1 && (
                      <button type="button" onClick={() => setDia(d, { turnos: dia.turnos.filter((_, k) => k !== i) })} className="p-1 text-ink-3 hover:text-rojo" aria-label="Quitar turno"><X size={16} /></button>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {dia.turnos.length < MAX_TURNOS && (
                    <button type="button" onClick={() => setDia(d, { turnos: [...dia.turnos, turnoSiguiente(dia.turnos)] })} className="btn-link text-ink-2"><Plus size={14} /> Otro turno</button>
                  )}
                  <button type="button" onClick={() => copiarATodos(d)} className="btn-link text-ink-2"><Copy size={14} /> Copiar a los demás días abiertos</button>
                </div>
              </div>
            ) : <span className="pt-1 text-sm text-ink-3">Cerrado</span>}
          </div>
        );
      })}
    </div>
  );
}

// Horas sin citas que se repiten cada semana (comida, café, horas apagadas…)
export function EditorDescansos({ descansos, onChange }) {
  const set = (i, campos) => onChange(descansos.map((x, k) => (k === i ? { ...x, ...campos } : x)));
  const sugerencias = [['Comida', '15:00', '16:00'], ['Café', '12:00', '12:15'], ['Hora apagada', '10:00', '11:00']];
  return (
    <div className="space-y-2">
      {descansos.map((x, i) => (
        <div key={i} className="card space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input className="input w-36 py-1.5 text-sm" maxLength={20} placeholder="Nombre" value={x.nombre} onChange={(e) => set(i, { nombre: e.target.value })} aria-label="Nombre del descanso" />
            <Hora valor={x.inicio} label="Descanso inicia" onChange={(v) => set(i, { inicio: v })} />
            <span className="text-ink-3">a</span>
            <Hora valor={x.fin} label="Descanso termina" onChange={(v) => set(i, { fin: v })} />
            <button type="button" onClick={() => onChange(descansos.filter((_, k) => k !== i))} className="ml-auto p-1 text-ink-3 hover:text-rojo" aria-label="Quitar descanso"><X size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => set(i, { dias: [] })}
              className={`rounded border px-2 py-1 text-xs font-semibold ${!x.dias?.length ? 'border-ink bg-ink text-paper' : 'border-line text-ink-3'}`}>Todos los días</button>
            {ORDEN_SEMANA.map((d) => {
              const on = x.dias?.includes(d);
              return (
                <button type="button" key={d} onClick={() => set(i, { dias: on ? x.dias.filter((y) => y !== d) : [...(x.dias || []), d] })}
                  className={`w-10 rounded border py-1 text-xs font-semibold ${on ? 'border-ink bg-ink text-paper' : 'border-line text-ink-3'}`}>{DIAS_CORTOS[d]}</button>
              );
            })}
          </div>
        </div>
      ))}
      {descansos.length < MAX_DESCANSOS && (
        <div className="flex flex-wrap gap-2">
          {sugerencias.filter(([n]) => !descansos.some((x) => x.nombre === n)).map(([nombre, inicio, fin]) => (
            <button key={nombre} type="button" onClick={() => onChange([...descansos, { nombre, inicio, fin, dias: [] }])} className="btn-ghost px-3 py-1.5 text-sm"><Plus size={14} /> {nombre}</button>
          ))}
          <button type="button" onClick={() => onChange([...descansos, { nombre: '', inicio: '13:00', fin: '13:30', dias: [] }])} className="btn-ghost px-3 py-1.5 text-sm"><Plus size={14} /> Otro</button>
        </div>
      )}
    </div>
  );
}
