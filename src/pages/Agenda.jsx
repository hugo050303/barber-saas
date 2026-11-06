import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Copy, Check, Globe, Trash2, Moon, AlertTriangle, Ban } from 'lucide-react';
import BloquearHoras from '../components/BloquearHoras';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { crearCita, cambiarEstadoCita, eliminarCita, ocupadosDelDia, barberosDelPlan } from '../lib/negocio';
import { horariosLibres, horarioDelDia, chocaCon, textoTurnos, horasSinCitas } from '../lib/horario';
import { inicioDia, finDia, hora, fechaLarga, diaLargo, hoyYmd, sumarDias, enZona, horaYmd, dinero, linkWhatsApp, soloDigitos, aHhmm } from '../lib/formato';
import { PageHeader, Modal, Field, Badge, Cargando, Vacio } from '../components/ui';

const ESTADOS = {
  pendiente: { label: 'Pendiente', tono: 'neutro', borde: 'border-l-ink' },
  confirmada: { label: 'Confirmada', tono: 'ambar', borde: 'border-l-ambar' },
  finalizada: { label: 'Terminada', tono: 'verde', borde: 'border-l-verde' },
  cancelada: { label: 'Cancelada', tono: 'rojo', borde: 'border-l-rojo opacity-50' },
};
const precioCita = (c) => Number(c.precio ?? c.servicios?.precio) || 0;

function LinkReservas({ slug }) {
  const [copiado, setCopiado] = useState(false);
  const url = `${window.location.origin}/r/${slug}`;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { toast.error('No se pudo copiar. Mantén presionado el link para copiarlo.'); }
  };
  return (
    <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">Tu link de reservas</p>
        <a href={url} target="_blank" rel="noreferrer" className="mt-1 block truncate font-semibold underline-offset-4 hover:underline">{url.replace(/^https?:\/\//, '')}</a>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={copiar} className="btn-ghost">{copiado ? <Check size={16} /> : <Copy size={16} />}{copiado ? 'Copiado' : 'Copiar'}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`Ya puedes apartar tu cita en línea: ${url}`)}`} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle size={16} /> Compartir</a>
      </div>
    </div>
  );
}

function Primeros({ barberos, servicios }) {
  const pasos = [
    { hecho: servicios > 0, texto: 'Agrega tus servicios con precio y duración', to: '/app/servicios' },
    { hecho: barberos > 0, texto: 'Da de alta a tu equipo (o a ti mismo)', to: '/app/equipo' },
    { hecho: false, texto: 'Revisa tu horario, hora de comida y dirección', to: '/app/configuracion' },
  ];
  return (
    <div className="card mb-6 p-5">
      <p className="display text-3xl">Primeros pasos</p>
      <p className="mt-1 text-sm text-ink-2">Con esto tu página de reservas queda lista para recibir citas.</p>
      <ol className="mt-4 space-y-2">
        {pasos.map((p, i) => (
          <li key={p.to}>
            <Link to={p.to} className="flex items-center gap-3 rounded border border-line px-3 py-2.5 hover:border-ink">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.hecho ? 'bg-verde text-white' : 'bg-paper text-ink-2'}`}>{p.hecho ? <Check size={14} /> : i + 1}</span>
              <span className={p.hecho ? 'text-ink-3 line-through' : 'font-medium'}>{p.texto}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NuevaCita({ abierto, onClose, onGuardada, barberos, servicios, diaInicial, horario }) {
  const vacio = { cliente: '', telefono: '', barberoId: '', servicioId: '', fecha: diaInicial, hora: '' };
  const [f, setF] = useState(vacio);
  const [ocupados, setOcupados] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (abierto) setF({ ...vacio, barberoId: barberos.length === 1 ? barberos[0].id : '' }); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (abierto && f.fecha) ocupadosDelDia(f.fecha).then(setOcupados).catch(() => setOcupados([])); }, [abierto, f.fecha]);

  const servicio = servicios.find((s) => s.id === f.servicioId);
  const barbero = barberos.find((b) => b.id === f.barberoId);
  const sugeridas = servicio && barbero && f.fecha
    ? horariosLibres({ ymd: f.fecha, horario, duracion: servicio.duracion_min, ocupados, barbero, paraPanel: true }).slice(0, 16)
    : [];
  const inicio = f.fecha && f.hora ? enZona(f.fecha, f.hora).toISOString() : null;
  const choque = inicio && barbero && servicio && chocaCon(ocupados, barbero.id, inicio, servicio.duracion_min);
  const fueraDeHorario = barbero && f.fecha && !horarioDelDia(horario, f.fecha, barbero);

  async function guardar(e) {
    e.preventDefault();
    if (!servicio || !barbero) return toast.error('Elige barbero y servicio.');
    if (choque && !window.confirm(`${barbero.nombre} ya tiene una cita a esa hora. ¿Agendar de todos modos?`)) return;
    setGuardando(true);
    try {
      await crearCita({ cliente: f.cliente, telefono: f.telefono, inicio, barbero, servicio, origen: 'panel' });
      toast.success('Cita agendada');
      onGuardada(f.fecha);
      onClose();
    } catch { toast.error('No se pudo guardar la cita.'); }
    setGuardando(false);
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Nueva cita">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente" className="col-span-2 sm:col-span-1"><input className="input" required value={f.cliente} onChange={set('cliente')} /></Field>
          <Field label="WhatsApp" className="col-span-2 sm:col-span-1"><input className="input" inputMode="numeric" placeholder="10 dígitos" value={f.telefono} onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
          <Field label="Servicio"><select className="input" required value={f.servicioId} onChange={set('servicioId')}><option value="">Elegir…</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
          <Field label="Barbero"><select className="input" required value={f.barberoId} onChange={set('barberoId')}><option value="">Elegir…</option>{barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></Field>
          <Field label="Día"><input className="input" type="date" required value={f.fecha} onChange={set('fecha')} /></Field>
          <Field label="Hora"><input className="input" type="time" required value={f.hora} onChange={set('hora')} /></Field>
        </div>
        {fueraDeHorario && <p className="flex gap-2 rounded bg-ambar-soft px-3 py-2 text-sm text-ambar"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Ese día está cerrado o es descanso de {barbero.nombre}. Puedes agendar igual.</p>}
        {choque && <p className="flex gap-2 rounded bg-rojo-soft px-3 py-2 text-sm text-rojo-dark"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Se empalma con otra cita de {barbero.nombre}.</p>}
        {sugeridas.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Horas libres de {barbero.nombre}</p>
            <div className="flex flex-wrap gap-1.5">
              {sugeridas.map((h) => {
                const hh = horaYmd(h);
                return <button type="button" key={h} onClick={() => setF({ ...f, hora: hh })} className={`rounded border px-2.5 py-1 text-sm ${f.hora === hh ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}>{hora(h)}</button>;
              })}
            </div>
          </div>
        )}
        <button className="btn-primary w-full py-3" disabled={guardando}>{guardando ? 'Guardando…' : 'Agendar'}</button>
      </form>
    </Modal>
  );
}

function DetalleCita({ cita, onClose, onCambio, negocio }) {
  const [trabajando, setTrabajando] = useState(false);
  if (!cita) return null;
  const accion = async (fn, msg) => {
    setTrabajando(true);
    try { await fn(); toast.success(msg); onCambio(); onClose(); } catch { toast.error('No se pudo actualizar la cita.'); }
    setTrabajando(false);
  };
  const recordatorio = `Hola ${cita.cliente_nombre}, te esperamos en ${negocio.nombre} el ${fechaLarga(cita.fecha_hora)} a las ${hora(cita.fecha_hora)} para tu ${cita.servicios?.nombre || 'cita'}. Si no puedes venir, avísanos por aquí.`;
  const e = ESTADOS[cita.estado] || ESTADOS.pendiente;
  return (
    <Modal abierto onClose={onClose} titulo={cita.cliente_nombre}>
      <div className="mb-5 space-y-1 text-[15px]">
        <p className="flex gap-1.5"><Badge tono={e.tono}>{e.label}</Badge> {cita.origen === 'web' && <Badge><Globe size={10} /> Por link</Badge>}</p>
        <p className="pt-2 font-semibold first-letter:uppercase">{fechaLarga(cita.fecha_hora)} · {hora(cita.fecha_hora)}{cita.fin && ` a ${hora(cita.fin)}`}</p>
        <p className="text-ink-2">{cita.servicios?.nombre} · {dinero(precioCita(cita))}</p>
        {cita.cliente_telefono && <p className="text-ink-2">Tel. {cita.cliente_telefono}</p>}
      </div>
      <div className="grid gap-2">
        {cita.cliente_telefono && <a href={linkWhatsApp(cita.cliente_telefono, recordatorio)} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle size={16} /> Mandar recordatorio</a>}
        {cita.estado === 'pendiente' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'confirmada'), 'Cita confirmada')} className="btn-ghost">Marcar confirmada</button>}
        {cita.estado !== 'finalizada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'finalizada'), 'Servicio terminado')} className="btn-primary">Terminado y cobrado</button>}
        {cita.estado === 'finalizada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'confirmada'), 'Se deshizo')} className="btn-ghost">Deshacer "terminado"</button>}
        {cita.estado !== 'cancelada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'cancelada'), 'Cita cancelada')} className="btn-ghost text-rojo">Cancelar cita</button>}
        {cita.estado === 'cancelada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'pendiente'), 'Cita reactivada')} className="btn-ghost">Reactivar</button>}
        <button disabled={trabajando} onClick={() => window.confirm('¿Borrar esta cita para siempre?') && accion(() => eliminarCita(cita), 'Cita borrada')} className="btn-link mt-2 justify-start text-sm text-ink-3"><Trash2 size={14} /> Borrar del historial</button>
      </div>
    </Modal>
  );
}

export default function Agenda() {
  const { negocio } = useSesion();
  const [dia, setDia] = useState(() => hoyYmd());
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [citas, setCitas] = useState(null);
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [bloquear, setBloquear] = useState(false);

  const cargar = useCallback(async () => {
    setCitas(null);
    const [b, s, c] = await Promise.all([
      db.from('barberos').select('*').order('nombre'),
      db.from('servicios').select('*').order('nombre'),
      db.from('citas').select('*, servicios ( nombre, precio, duracion_min )').gte('fecha_hora', inicioDia(dia)).lte('fecha_hora', finDia(dia)).order('fecha_hora'),
    ]);
    // Barberos del plan, más cualquiera que tenga citas ese día (para no esconder citas si bajó de plan)
    const activos = (b.data || []).filter((x) => x.activo !== false);
    const delPlan = new Set(barberosDelPlan(negocio, activos).map((x) => x.id));
    const conCitas = new Set((c.data || []).map((x) => x.barbero_id));
    setBarberos(activos.filter((x) => delPlan.has(x.id) || conCitas.has(x.id)));
    setServicios(s.data || []);
    setCitas(c.data || []);
  }, [dia, negocio]);
  useEffect(() => { cargar(); }, [cargar]);

  const esHoy = dia === hoyYmd();
  const activas = (citas || []).filter((c) => c.estado !== 'cancelada');
  const terminadas = activas.filter((c) => c.estado === 'finalizada');
  const abierto = horarioDelDia(negocio.horario, dia);

  return (
    <>
      <PageHeader titulo="Agenda" sub={<span className="first-letter:uppercase">{esHoy ? 'Hoy, ' : ''}{diaLargo(dia)}{abierto ? ` · ${textoTurnos(abierto.turnos)}` : ' · cerrado'}</span>}>
        <div className="flex items-center rounded border border-line bg-card">
          <button onClick={() => setDia(sumarDias(dia, -1))} className="p-2.5 hover:bg-paper" aria-label="Día anterior"><ChevronLeft size={18} /></button>
          <input type="date" className="w-[132px] bg-transparent px-1 py-2 text-sm outline-none" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
          <button onClick={() => setDia(sumarDias(dia, 1))} className="p-2.5 hover:bg-paper" aria-label="Día siguiente"><ChevronRight size={18} /></button>
        </div>
        {!esHoy && <button onClick={() => setDia(hoyYmd())} className="btn-ghost">Hoy</button>}
        <button onClick={() => setBloquear(true)} disabled={!barberos.length} className="btn-ghost"><Ban size={16} /> Bloquear horas</button>
        <button onClick={() => setNueva(true)} disabled={!barberos.length || !servicios.length} className="btn-rojo"><Plus size={16} /> Nueva cita</button>
      </PageHeader>

      {citas !== null && (barberos.length === 0 || servicios.length === 0) && <Primeros barberos={barberos.length} servicios={servicios.length} />}
      {citas !== null && barberos.length > 0 && servicios.length > 0 && <LinkReservas slug={negocio.slug} />}

      {citas === null ? <Cargando /> : barberos.length === 0 ? null : (
        <>
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
            <span><b className="text-ink">{activas.length}</b> {activas.length === 1 ? 'cita' : 'citas'}</span>
            <span><b className="text-ink">{terminadas.length}</b> {terminadas.length === 1 ? 'terminada' : 'terminadas'}</span>
            <span><b className="text-ink">{dinero(terminadas.reduce((a, c) => a + precioCita(c), 0))}</b> en servicios</span>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
            {barberos.map((b) => {
              const suyas = citas.filter((c) => c.barbero_id === b.id);
              const descansa = abierto && !horarioDelDia(negocio.horario, dia, b);
              // Descansos y bloqueos del día, para verlos junto a las citas
              const tapados = descansa ? [] : horasSinCitas(negocio.horario, dia, b).map(([ini, fin, nombre]) => ({
                id: `t${ini}-${fin}-${nombre}`, tapado: true, nombre, fecha_hora: enZona(dia, aHhmm(ini)).toISOString(), fin: enZona(dia, aHhmm(fin)).toISOString(),
              }));
              const renglones = [...suyas, ...tapados].sort((x, y) => x.fecha_hora.localeCompare(y.fecha_hora));
              return (
                <section key={b.id} className="card flex min-h-[320px] w-[82vw] shrink-0 snap-start flex-col sm:w-72 md:flex-1">
                  <header className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="font-bold">{b.nombre}</h3>
                    {descansa ? <Badge><Moon size={10} /> Descansa</Badge> : <span className="text-sm text-ink-3">{suyas.filter((c) => c.estado !== 'cancelada').length}</span>}
                  </header>
                  <div className="flex-1 space-y-2 p-2.5">
                    {suyas.length === 0 && <p className="px-2 py-10 text-center text-sm text-ink-3">{descansa ? 'Día de descanso' : 'Sin citas este día'}</p>}
                    {renglones.map((c) => {
                      if (c.tapado) {
                        return (
                          <div key={c.id} className="flex items-center justify-between gap-2 rounded-sm border border-dashed border-line px-3 py-2 text-sm text-ink-3"
                            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0 6px, rgba(26,23,20,0.04) 6px 12px)' }}>
                            <span className="font-semibold">{c.nombre}</span>
                            <span>{hora(c.fecha_hora)} – {hora(c.fin)}</span>
                          </div>
                        );
                      }
                      const e = ESTADOS[c.estado] || ESTADOS.pendiente;
                      return (
                        <button key={c.id} onClick={() => setDetalle(c)} className={`block w-full rounded-sm border border-l-[3px] border-line bg-card px-3 py-2.5 text-left transition hover:border-ink ${e.borde}`}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-bold">{hora(c.fecha_hora)}</span>
                            <span className="flex gap-1">{c.origen === 'web' && <Badge tono="rojo">Link</Badge>}{c.estado !== 'pendiente' && <Badge tono={e.tono}>{e.label}</Badge>}</span>
                          </div>
                          <p className="truncate font-medium">{c.cliente_nombre}</p>
                          <p className="truncate text-sm text-ink-3">{c.servicios?.nombre || 'Servicio'}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          {activas.length === 0 && esHoy && abierto && <Vacio titulo="Día tranquilo por ahora">Las citas que aparten tus clientes por link aparecerán aquí solitas.</Vacio>}
        </>
      )}

      <NuevaCita abierto={nueva} onClose={() => setNueva(false)} onGuardada={(d) => (d === dia ? cargar() : setDia(d))}
        barberos={barberos} servicios={servicios} diaInicial={dia} horario={negocio.horario} />
      <DetalleCita cita={detalle} onClose={() => setDetalle(null)} onCambio={cargar} negocio={negocio} />
      {bloquear && <BloquearHoras abierto onClose={() => setBloquear(false)} negocio={negocio} barberos={barberos} diaInicial={dia < hoyYmd() ? hoyYmd() : dia} />}
    </>
  );
}
