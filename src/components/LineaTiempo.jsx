// Agenda del día como línea de tiempo: una columna por barbero, las citas como bloques del tamaño
// de su duración, descansos rayados, horas fuera de turno en gris y una línea roja con la hora actual.
// Tocar un hueco abre "Nueva cita" con ese barbero y esa hora.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Moon, Plus, Ban } from 'lucide-react';
import { turnosDelDia, horasSinCitas, normalizarHorario } from '../lib/horario';
import { horaYmd, aMinutos, aHhmm, hoyYmd, diaSemana } from '../lib/formato';

const PX = 1.5; // píxeles por minuto (90 px por hora)
const RAYAS = 'repeating-linear-gradient(-45deg, rgba(26,23,20,0.07) 0 5px, transparent 5px 10px)';
const RAYAS_ROJO = 'repeating-linear-gradient(-45deg, rgba(180,50,42,0.16) 0 5px, rgba(180,50,42,0.05) 5px 10px)';

const ESTILO_CITA = {
  pendiente: 'border-ink bg-card',
  confirmada: 'border-ambar bg-ambar-soft',
  finalizada: 'border-verde bg-verde-soft',
  cancelada: 'border-line bg-paper opacity-60',
};

const etiquetaHora = (m) => { const h = Math.floor(m / 60) % 24; const s = h < 12 ? 'am' : 'pm'; const h12 = h % 12 || 12; return `${h12} ${s}`; };
const textoHora = (m) => { const h = Math.floor(m / 60); const mm = m % 60; const h12 = h % 12 || 12; return `${h12}:${String(mm).padStart(2, '0')}`; };
const minutoDe = (iso) => aMinutos(horaYmd(iso));
const duracionDe = (c) => Number(c.duracion) || Number(c.servicios?.duracion_min) || 30;

// Reparte en carriles las citas que se empalman, para dibujarlas lado a lado
function carriles(citas) {
  const orden = [...citas].sort((a, b) => a.ini - b.ini);
  const grupos = []; let grupo = []; let finGrupo = -1;
  for (const c of orden) {
    if (c.ini >= finGrupo && grupo.length) { grupos.push(grupo); grupo = []; }
    grupo.push(c); finGrupo = Math.max(finGrupo, c.fin);
  }
  if (grupo.length) grupos.push(grupo);
  for (const g of grupos) {
    const finCarril = [];
    for (const c of g) {
      let k = finCarril.findIndex((f) => f <= c.ini);
      if (k === -1) { k = finCarril.length; finCarril.push(0); }
      finCarril[k] = c.fin; c.carril = k;
    }
    for (const c of g) c.carriles = finCarril.length;
  }
  return orden;
}

function Avatar({ barbero }) {
  return barbero.foto
    ? <img src={barbero.foto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-card" />
    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">{barbero.nombre?.[0]}</span>;
}

export default function LineaTiempo({ dia, horario, barberos, citas, onCita, onHueco }) {
  const h = useMemo(() => normalizarHorario(horario), [horario]);
  const intervalo = h.intervalo || 15;
  const esHoy = dia === hoyYmd();
  const [ahora, setAhora] = useState(() => minutoDe(new Date().toISOString()));
  const [fantasma, setFantasma] = useState(null); // { barbero, min }
  const caja = useRef(null);

  useEffect(() => {
    if (!esHoy) return undefined;
    const t = setInterval(() => setAhora(minutoDe(new Date().toISOString())), 30000);
    return () => clearInterval(t);
  }, [esHoy]);

  const columnas = barberos.map((b) => {
    const turnos = turnosDelDia(h, dia, b).map((t) => [aMinutos(t.abre), aMinutos(t.cierra)]).sort((a, z) => a[0] - z[0]);
    const suyas = citas.filter((c) => c.barbero_id === b.id && c.estado !== 'cancelada')
      .map((c) => ({ c, ini: minutoDe(c.fecha_hora), fin: minutoDe(c.fecha_hora) + duracionDe(c) }));
    const motivo = turnos.length ? null : !turnosDelDia(h, dia).length ? 'Cerrado' : (b.diasLibres || []).includes(diaSemana(dia)) ? 'Descansa' : 'No disponible';
    return { b, turnos, citas: carriles(suyas), tapados: turnos.length ? horasSinCitas(h, dia, b) : [], motivo };
  });

  // Rango del día: lo que cubren los turnos y las citas, redondeado a horas
  let ini = 24 * 60; let fin = 0;
  for (const col of columnas) {
    for (const [a, z] of col.turnos) { ini = Math.min(ini, a); fin = Math.max(fin, z); }
    for (const x of col.citas) { ini = Math.min(ini, x.ini); fin = Math.max(fin, x.fin); }
  }
  if (fin <= ini) { ini = 9 * 60; fin = 20 * 60; }
  ini = Math.floor(ini / 60) * 60; fin = Math.min(24 * 60, Math.ceil(fin / 60) * 60);
  const alto = (fin - ini) * PX;
  const y = (m) => (m - ini) * PX;
  const horas = []; for (let m = ini; m <= fin; m += 60) horas.push(m);
  const verAhora = esHoy && ahora >= ini && ahora <= fin;

  // Al cambiar de día, llevar la vista a la hora actual (hoy) o a la primera cita
  useEffect(() => {
    if (!caja.current) return;
    const primeras = columnas.flatMap((col) => col.citas.map((x) => x.ini));
    const objetivo = esHoy ? ahora - 60 : primeras.length ? Math.min(...primeras) - 30 : ini;
    caja.current.scrollTop = Math.max(0, y(objetivo));
  }, [dia]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutoEn = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const m = ini + (e.clientY - r.top) / PX;
    return Math.max(ini, Math.min(fin - intervalo, Math.floor(m / intervalo) * intervalo));
  };
  const enTurno = (col, m) => col.turnos.some(([a, z]) => m >= a && m < z);

  return (
    <div ref={caja} className="card max-h-[70vh] min-h-[420px] overflow-auto overscroll-contain shadow-sm">
      <div className="flex min-w-max">
        {/* Columna de horas */}
        <div className="sticky left-0 z-20 w-12 shrink-0 border-r border-line bg-card sm:w-16">
          <div className="sticky top-0 z-10 h-14 border-b border-line bg-card" />
          <div className="relative" style={{ height: alto }}>
            {horas.map((m) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] font-semibold uppercase text-ink-3 sm:text-[11px]" style={{ top: Math.max(y(m), 8) }}>{m < fin ? etiquetaHora(m) : ''}</span>
            ))}
            {verAhora && <span className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-rojo px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ top: y(ahora) }}>{textoHora(ahora)}</span>}
          </div>
        </div>

        {columnas.map((col) => (
          <div key={col.b.id} className="min-w-[156px] flex-1 border-r border-line last:border-r-0">
            {/* Encabezado fijo */}
            <div className="sticky top-0 z-10 flex h-14 items-center gap-2.5 border-b border-line bg-card/95 px-3 backdrop-blur">
              <Avatar barbero={col.b} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{col.b.nombre}</p>
                <p className="text-[11px] text-ink-3">{col.motivo ? col.motivo : `${col.citas.length} ${col.citas.length === 1 ? 'cita' : 'citas'}`}</p>
              </div>
            </div>

            <div className={`relative ${col.motivo ? '' : 'cursor-copy'}`} style={{ height: alto, backgroundImage: `repeating-linear-gradient(to bottom, #E2DBD0 0 1px, transparent 1px ${60 * PX}px)` }}
              onMouseMove={(e) => { if (col.motivo) return; const m = minutoEn(e); setFantasma(enTurno(col, m) ? { barbero: col.b.id, min: m } : null); }}
              onMouseLeave={() => setFantasma(null)}
              onClick={(e) => { if (col.motivo || e.target !== e.currentTarget) return; const m = minutoEn(e); if (enTurno(col, m)) onHueco(col.b.id, aHhmm(m)); }}>
              {/* Medias horas */}
              {horas.slice(0, -1).map((m) => <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/60" style={{ top: y(m + 30) }} />)}

              {/* Fuera de turno */}
              {col.motivo ? (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10" style={{ backgroundImage: RAYAS }}>
                  <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-semibold text-ink-3 shadow-sm">{col.motivo === 'Descansa' ? <Moon size={12} /> : <Ban size={12} />} {col.motivo}</span>
                </div>
              ) : (
                [[ini, ...col.turnos.flat(), fin]].map((p) => {
                  const huecos = []; for (let i = 0; i < p.length; i += 2) if (p[i + 1] > p[i]) huecos.push([p[i], p[i + 1]]);
                  return huecos.map(([a, z]) => <span key={`o${a}`} className="pointer-events-none absolute inset-x-0 bg-paper/80" style={{ top: y(a), height: (z - a) * PX, backgroundImage: RAYAS }} />);
                })
              )}

              {/* Descansos y bloqueos */}
              {col.tapados.map(([a, z, nombre]) => (
                <span key={`t${a}${nombre}`} className="pointer-events-none absolute inset-x-1 flex items-start overflow-hidden rounded-sm px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-rojo-dark" style={{ top: y(a), height: (z - a) * PX, backgroundImage: RAYAS_ROJO }}>{nombre}</span>
              ))}

              {/* Hueco que se va a agendar */}
              {fantasma?.barbero === col.b.id && (
                <span className="pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-sm border border-dashed border-ink/40 bg-ink/5 px-2 text-xs font-semibold text-ink-2" style={{ top: y(fantasma.min), height: intervalo * PX }}>
                  <Plus size={12} /> {textoHora(fantasma.min)}
                </span>
              )}

              {verAhora && <span className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-rojo" style={{ top: y(ahora) }} />}

              {/* Citas */}
              {col.citas.map(({ c, ini: a, fin: z, carril, carriles: n }) => {
                const altoCita = Math.max(26, (z - a) * PX - 2);
                const compacta = altoCita < 48;
                return (
                  <button key={c.id} onClick={() => onCita(c)}
                    className={`group absolute overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left shadow-sm transition hover:z-10 hover:-translate-y-px hover:shadow-md ${ESTILO_CITA[c.estado] || ESTILO_CITA.pendiente}`}
                    style={{ top: y(a) + 1, height: altoCita, left: `calc(${(carril / n) * 100}% + 4px)`, width: `calc(${100 / n}% - 8px)` }}>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-2">
                      {textoHora(a)}–{textoHora(z)}
                      {c.origen === 'web' && <Globe size={11} className="text-rojo" aria-label="Reservó por link" />}
                      {compacta && <span className="truncate font-bold text-ink">· {c.cliente_nombre}</span>}
                    </span>
                    {!compacta && <span className="block truncate text-sm font-bold leading-tight">{c.cliente_nombre}</span>}
                    {!compacta && <span className="block truncate text-xs text-ink-3">{c.servicios?.nombre || 'Servicio'}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
