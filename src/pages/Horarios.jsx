// Horarios: todo lo de cuándo se puede reservar, en un solo lugar y de forma visual.
//  - Pestaña "Barbería": semana del local, descansos que se repiten, reglas de reserva y días cerrados.
//  - Una pestaña por barbero: si usa el horario del local o uno propio, sus días de descanso y bloqueos.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Ban, Scissors } from 'lucide-react';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { actualizarNegocio, barberosDelPlan } from '../lib/negocio';
import {
  normalizarHorario, normalizarDias, NOMBRES_DIA, DIAS_CORTOS, ORDEN_SEMANA, PLANTILLAS, INTERVALOS,
  validarTurnos, sugerirIntervalo, bloqueosVigentes, rangoCorto,
} from '../lib/horario';
import { aMinutos, diaCorto, hoyYmd } from '../lib/formato';
import { PageHeader, Field, Cargando, Badge } from '../components/ui';
import SemanaVisual from '../components/SemanaVisual';
import { EditorDescansos } from '../components/EditorHorario';
import VistaPrevia from '../components/VistaPrevia';
import BloquearHoras from '../components/BloquearHoras';

function Bloque({ titulo, texto, children, accion }) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-lg font-bold">{titulo}</h2>{texto && <p className="text-sm text-ink-2">{texto}</p>}</div>
        {accion}
      </div>
      {children}
    </section>
  );
}

// Tabla "Quién trabaja cuándo"
function QuienTrabaja({ dias, barberos, onElegir }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">Barbero</th>
            {ORDEN_SEMANA.map((d) => <th key={d} className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">{DIAS_CORTOS[d]}</th>)}
          </tr>
        </thead>
        <tbody>
          {barberos.map((b) => {
            const suyos = b.horarioPropio?.dias ? normalizarDias(b.horarioPropio.dias) : dias;
            return (
              <tr key={b.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2">
                  <button onClick={() => onElegir(b.id)} className="text-left font-semibold underline-offset-4 hover:underline">{b.nombre}</button>
                  {b.horarioPropio && <p className="text-[10px] font-semibold uppercase tracking-wide text-rojo">Horario propio</p>}
                </td>
                {ORDEN_SEMANA.map((d) => {
                  const libre = b.diasLibres?.includes(d);
                  const t = suyos[d];
                  return (
                    <td key={d} className="px-1 py-1.5 text-center">
                      <span className={`block rounded-sm px-1 py-1.5 text-[11px] font-semibold leading-tight ${libre || !t ? 'bg-paper text-ink-3' : b.horarioPropio ? 'bg-rojo-soft text-rojo-dark' : 'bg-ink text-paper'}`}>
                        {libre ? 'Descansa' : t ? t.turnos.map(rangoCorto).join(' ') : 'Cerrado'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const sinCambios = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Los bloqueos se guardan aparte (Bloquear horas), así que no cuentan como cambio del horario
const sinBloqueos = (x) => ({ ...x, bloqueos: null });

export default function Horarios() {
  const { negocio } = useSesion();
  const [tab, setTab] = useState('barberia');
  const [barberos, setBarberos] = useState(null);
  const [servicios, setServicios] = useState([]);
  const guardado = useMemo(() => normalizarHorario(negocio.horario), [negocio.horario]);
  const [h, setH] = useState(guardado);
  const [borradorBarbero, setBorradorBarbero] = useState(null); // { propio: dias|null, diasLibres: [] }
  const [diaAbierto, setDiaAbierto] = useState(null);
  const [nuevoCerrado, setNuevoCerrado] = useState('');
  const [bloquear, setBloquear] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const [b, s] = await Promise.all([db.from('barberos').select('*').order('nombre'), db.from('servicios').select('*')]);
    setBarberos(barberosDelPlan(negocio, (b.data || []).filter((x) => x.activo !== false)));
    setServicios(s.data || []);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const barbero = barberos?.find((b) => b.id === tab);
  const borradorDe = (b) => ({ propio: b.horarioPropio?.dias ? normalizarDias(b.horarioPropio.dias) : null, diasLibres: b.diasLibres || [] });
  const hayCambios = tab === 'barberia' ? !sinCambios(sinBloqueos(h), sinBloqueos(guardado)) : barbero && borradorBarbero && !sinCambios(borradorBarbero, borradorDe(barbero));

  function cambiarTab(nuevo) {
    if (nuevo === tab) return;
    if (hayCambios && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    setTab(nuevo); setDiaAbierto(null); setH(guardado);
    const b = barberos?.find((x) => x.id === nuevo);
    setBorradorBarbero(b ? borradorDe(b) : null);
  }

  // ---------- Guardar ----------
  async function guardarBarberia() {
    for (const d of ORDEN_SEMANA) { const e = h.dias[d] && validarTurnos(h.dias[d].turnos, NOMBRES_DIA[d]); if (e) return toast.error(e); }
    if (!ORDEN_SEMANA.some((d) => h.dias[d])) return toast.error('Abre al menos un día a la semana.');
    const malo = h.descansos.find((x) => aMinutos(x.fin) <= aMinutos(x.inicio));
    if (malo) return toast.error(`${malo.nombre || 'Un descanso'}: debe terminar después de empezar.`);
    setGuardando(true);
    try {
      // Los bloqueos se manejan aparte: se toman los más recientes para no pisarlos
      const nuevo = { ...h, cerrados: h.cerrados.filter((x) => x >= hoyYmd()).sort(), bloqueos: bloqueosVigentes(guardado.bloqueos) };
      await actualizarNegocio(negocio.id, { horario: nuevo });
      setH(normalizarHorario(nuevo));
      toast.success('Horario guardado');
    } catch { toast.error('No se pudo guardar.'); }
    setGuardando(false);
  }
  async function guardarBarbero() {
    const { propio, diasLibres } = borradorBarbero;
    if (propio) {
      for (const d of ORDEN_SEMANA) { const e = propio[d] && validarTurnos(propio[d].turnos, NOMBRES_DIA[d]); if (e) return toast.error(e); }
      if (!ORDEN_SEMANA.some((d) => propio[d])) return toast.error('Su horario propio debe tener al menos un día.');
    }
    setGuardando(true);
    const { error } = await db.from('barberos').update({ horarioPropio: propio ? { dias: propio } : null, diasLibres }).eq('id', barbero.id);
    setGuardando(false);
    if (error) return toast.error('No se pudo guardar.');
    toast.success(`Horario de ${barbero.nombre} guardado`);
    await cargar();
  }

  if (!barberos) return <><PageHeader titulo="Horarios" /><Cargando /></>;
  const sugerido = sugerirIntervalo(servicios);
  const copiar = (dias, setDias) => (desde, destinos) => {
    const nuevo = { ...dias };
    for (const x of destinos) nuevo[x] = dias[desde] ? structuredClone(dias[desde]) : null;
    setDias(nuevo); toast.success(`Copiado a ${destinos.map((x) => DIAS_CORTOS[x]).join(', ')}`);
  };
  const bloqueosDe = (id) => bloqueosVigentes(guardado.bloqueos).filter((b) => (id ? b.barbero === id : !b.barbero)).sort((a, b) => a.desde.localeCompare(b.desde));

  return (
    <>
      <PageHeader titulo="Horarios" sub="Cuándo se puede reservar en tu página. Toca un día para editarlo.">
        <button onClick={() => setBloquear(true)} className="btn-ghost"><Ban size={16} /> Bloquear horas o días</button>
      </PageHeader>

      {/* Pestañas */}
      <div className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
        {[['barberia', 'Barbería'], ...barberos.map((b) => [b.id, b.nombre])].map(([id, nombre]) => (
          <button key={id} onClick={() => cambiarTab(id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === id ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink'}`}>{nombre}</button>
        ))}
      </div>

      {tab === 'barberia' && (
        <div className="space-y-8 pb-24">
          <Bloque titulo="Quién trabaja cuándo" texto="Toca un barbero para ver o cambiar su horario.">
            <QuienTrabaja dias={guardado.dias} barberos={barberos} onElegir={cambiarTab} />
          </Bloque>

          <Bloque titulo="Horario de la barbería" texto="Barras negras: abierto. Rayado: descansos. Toca un día para cambiarlo.">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold text-ink-2">Plantillas:</span>
              {PLANTILLAS.map((pl) => (
                <button type="button" key={pl.id} title={pl.detalle} onClick={() => { setH({ ...h, dias: structuredClone(pl.dias), descansos: structuredClone(pl.descansos) }); setDiaAbierto(null); toast.success(`Plantilla "${pl.nombre}" aplicada. Revisa y guarda.`); }}
                  className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold hover:border-ink">{pl.nombre}</button>
              ))}
            </div>
            <SemanaVisual editable dias={h.dias} descansos={h.descansos} diaAbierto={diaAbierto} onAbrir={setDiaAbierto}
              onCambiarDia={(d, v) => setH({ ...h, dias: { ...h.dias, [d]: v } })} onCopiar={copiar(h.dias, (dias) => setH({ ...h, dias }))} />
          </Bloque>

          <Bloque titulo="Descansos que se repiten" texto="Comida, café o cualquier hora que quieras apagar siempre. Se ven rayados en la semana.">
            <EditorDescansos descansos={h.descansos} onChange={(descansos) => setH({ ...h, descansos })} />
          </Bloque>

          <Bloque titulo="Reservas en línea">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Citas cada" hint={sugerido !== h.intervalo ? <>Con tus servicios te conviene <button type="button" className="font-semibold text-ink underline" onClick={() => setH({ ...h, intervalo: sugerido })}>cada {sugerido} min</button></> : 'Va bien con tus servicios.'}>
                <select className="input" value={h.intervalo} onChange={(e) => setH({ ...h, intervalo: Number(e.target.value) })}>{INTERVALOS.map((m) => <option key={m} value={m}>{m} min</option>)}</select>
              </Field>
              <Field label="Reservar con al menos"><select className="input" value={h.anticipacion} onChange={(e) => setH({ ...h, anticipacion: Number(e.target.value) })}>{[[0, 'Sin mínimo'], [15, '15 min'], [30, '30 min'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [1440, '1 día']].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></Field>
              <Field label="Reservar hasta"><select className="input" value={h.diasMaximo} onChange={(e) => setH({ ...h, diasMaximo: Number(e.target.value) })}>{[7, 14, 21, 30, 60].map((v) => <option key={v} value={v}>{v} días antes</option>)}</select></Field>
            </div>
            <div className="mt-4"><VistaPrevia horario={h} servicios={servicios} /></div>
          </Bloque>

          <Bloque titulo="Días cerrados" texto="Festivos o vacaciones de toda la barbería.">
            <div className="flex gap-2">
              <input type="date" className="input w-auto" min={hoyYmd()} value={nuevoCerrado} onChange={(e) => setNuevoCerrado(e.target.value)} />
              <button type="button" className="btn-ghost" disabled={!nuevoCerrado} onClick={() => { if (!h.cerrados.includes(nuevoCerrado)) setH({ ...h, cerrados: [...h.cerrados, nuevoCerrado].sort() }); setNuevoCerrado(''); }}>Agregar</button>
            </div>
            {h.cerrados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {h.cerrados.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 rounded border border-line bg-card py-1 pl-2.5 pr-1 text-sm">
                    {diaCorto(d)}
                    <button type="button" onClick={() => setH({ ...h, cerrados: h.cerrados.filter((x) => x !== d) })} className="p-0.5 text-ink-3 hover:text-rojo" aria-label="Quitar"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
            {bloqueosDe(null).length > 0 && <p className="mt-3 text-sm text-ink-2">También hay {bloqueosDe(null).length} bloqueo(s) de horas para toda la barbería. Míralos en «Bloquear horas o días».</p>}
          </Bloque>
        </div>
      )}

      {barbero && borradorBarbero && (
        <div className="space-y-8 pb-24">
          <Bloque titulo={`Horario de ${barbero.nombre}`}>
            <div className="mb-4 inline-flex rounded border border-line bg-card p-0.5" role="radiogroup" aria-label="Tipo de horario">
              {[[false, 'Igual que la barbería'], [true, 'Su propio horario']].map(([propio, nombre]) => (
                <button key={nombre} role="radio" aria-checked={!!borradorBarbero.propio === propio}
                  onClick={() => setBorradorBarbero({ ...borradorBarbero, propio: propio ? (borradorBarbero.propio || structuredClone(guardado.dias)) : null })}
                  className={`rounded-sm px-3 py-1.5 text-sm font-semibold ${!!borradorBarbero.propio === propio ? 'bg-ink text-paper' : 'text-ink-2'}`}>{nombre}</button>
              ))}
            </div>
            <SemanaVisual editable={!!borradorBarbero.propio} dias={borradorBarbero.propio || guardado.dias} descansos={guardado.descansos}
              libres={borradorBarbero.diasLibres} fantasma={borradorBarbero.propio ? guardado.dias : undefined}
              diaAbierto={diaAbierto} onAbrir={setDiaAbierto}
              onCambiarDia={(d, v) => setBorradorBarbero({ ...borradorBarbero, propio: { ...borradorBarbero.propio, [d]: v } })}
              onCopiar={copiar(borradorBarbero.propio || {}, (dias) => setBorradorBarbero({ ...borradorBarbero, propio: dias }))} />
            {!borradorBarbero.propio && <p className="mt-2 text-sm text-ink-2">Usa el horario de la barbería. Elige «Su propio horario» si entra o sale a otra hora.</p>}
          </Bloque>

          <Bloque titulo="Días de descanso" texto="Esos días no se le ofrecen citas.">
            <div className="flex flex-wrap gap-1.5">
              {ORDEN_SEMANA.map((d) => {
                const on = borradorBarbero.diasLibres.includes(d);
                return (
                  <button type="button" key={d} aria-pressed={on} onClick={() => setBorradorBarbero({ ...borradorBarbero, diasLibres: on ? borradorBarbero.diasLibres.filter((x) => x !== d) : [...borradorBarbero.diasLibres, d] })}
                    className={`w-14 rounded border py-2 text-sm font-semibold ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-3'}`}>{DIAS_CORTOS[d]}</button>
                );
              })}
            </div>
          </Bloque>

          <Bloque titulo="Servicios que hace" accion={<Link to="/app/equipo" className="btn-link text-sm"><Scissors size={14} /> Cambiar en Equipo</Link>}>
            <div className="flex flex-wrap gap-1.5">
              {!barbero.servicios ? <Badge tono="verde">Todos los servicios</Badge> : servicios.filter((s) => barbero.servicios.includes(s.id)).map((s) => <Badge key={s.id}>{s.nombre}</Badge>)}
            </div>
          </Bloque>

          <Bloque titulo="Vacaciones y horas bloqueadas" accion={<button onClick={() => setBloquear(true)} className="btn-ghost"><Ban size={16} /> Bloquear</button>}>
            {bloqueosDe(barbero.id).length === 0 ? <p className="text-sm text-ink-3">Sin bloqueos próximos.</p> : (
              <div className="card divide-y divide-line">
                {bloqueosDe(barbero.id).map((b, i) => (
                  <p key={i} className="px-4 py-2.5 text-sm"><b>{diaCorto(b.desde)}{b.hasta && b.hasta !== b.desde ? ` al ${diaCorto(b.hasta)}` : ''}</b> · {b.inicio ? `${b.inicio} a ${b.fin}` : 'todo el día'}</p>
                ))}
              </div>
            )}
          </Bloque>

          <VistaPrevia horario={{ ...guardado }} servicios={servicios} barbero={{ ...barbero, horarioPropio: borradorBarbero.propio ? { dias: borradorBarbero.propio } : null, diasLibres: borradorBarbero.diasLibres }} />
        </div>
      )}

      {/* Barra para guardar */}
      {hayCambios && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <p className="text-sm font-semibold">Tienes cambios sin guardar</p>
            <div className="flex gap-2">
              <button onClick={() => (tab === 'barberia' ? setH(guardado) : setBorradorBarbero(borradorDe(barbero)))} className="btn-ghost">Descartar</button>
              <button onClick={tab === 'barberia' ? guardarBarberia : guardarBarbero} disabled={guardando} className="btn-primary">{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {bloquear && <BloquearHoras abierto onClose={() => setBloquear(false)} negocio={negocio} barberos={barberos} diaInicial={hoyYmd()} barberoInicial={barbero?.id || ''} />}
    </>
  );
}
