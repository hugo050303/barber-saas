// Vista previa: qué horas verían los clientes un día de la semana
import { useState } from 'react';
import { NOMBRES_DIA, ORDEN_SEMANA, horariosLibres, textoTurnos, turnosDelDia } from '../lib/horario';
import { hoyYmd, sumarDias, diaSemana, hora } from '../lib/formato';

export default function VistaPrevia({ horario, servicios, barbero }) {
  const [dia, setDia] = useState(6);
  const duracion = servicios.length ? Math.min(...servicios.map((x) => Number(x.duracion_min) || 30)) : 30;
  let ymd = sumarDias(hoyYmd(), 1);
  while (diaSemana(ymd) !== dia) ymd = sumarDias(ymd, 1);
  const sinFechas = { ...horario, cerrados: [], bloqueos: [] };
  const quien = barbero || { id: '-' };
  const turnos = turnosDelDia(sinFechas, ymd, barbero);
  const horas = horariosLibres({ ymd, horario: sinFechas, duracion, ocupados: [], barbero: quien, paraPanel: true });
  return (
    <div className="rounded border border-dashed border-line p-4">
      <p className="text-sm font-semibold">Vista previa: así verán tus clientes las horas{barbero ? ` de ${barbero.nombre}` : ''}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {ORDEN_SEMANA.map((d) => (
          <button type="button" key={d} onClick={() => setDia(d)} className={`w-12 rounded border py-1 text-xs font-semibold ${dia === d ? 'border-ink bg-ink text-paper' : 'border-line text-ink-3'}`}>{NOMBRES_DIA[d].slice(0, 3)}</button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">
        {turnos.length ? <>{NOMBRES_DIA[dia]}: {textoTurnos(turnos)} · <b className="text-ink">{horas.length} horas</b> para un servicio de {duracion} min</> : `${NOMBRES_DIA[dia]}: no hay citas`}
      </p>
      {horas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {horas.map((x) => <span key={x} className="rounded-sm bg-paper px-1.5 py-0.5 text-xs">{hora(x)}</span>)}
        </div>
      )}
    </div>
  );
}
