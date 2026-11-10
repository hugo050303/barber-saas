import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Copy, Check, Globe, Trash2, Moon, AlertTriangle, Ban, CalendarClock, List, Star } from 'lucide-react';
import LineaTiempo from '../components/LineaTiempo';
import { InvitarAvisos } from '../components/AvisosCelular';
import BloquearHoras from '../components/BloquearHoras';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { crearCita, cambiarEstadoCita, eliminarCita, ocupadosDelDia, barberosDelPlan, haceServicio, linkCita } from '../lib/negocio';
import { horariosLibres, horarioDelDia, chocaCon, textoTurnos, horasSinCitas } from '../lib/horario';
import { inicioDia, finDia, hora, fechaLarga, diaLargo, hoyYmd, sumarDias, enZona, horaYmd, dinero, linkWhatsApp, soloDigitos, aHhmm, diaSemana, diaDelMes } from '../lib/formato';
import { PageHeader, Modal, Field, Badge, Cargando } from '../components/ui';

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
    { hecho: false, texto: 'Revisa tu horario y hora de comida', to: '/app/horarios' },
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

function NuevaCita({ abierto, onClose, onGuardada, barberos, servicios, diaInicial, horario, preset }) {
  const vacio = { cliente: '', telefono: '', barberoId: '', servicioId: '', fecha: diaInicial, hora: '' };
  const [f, setF] = useState(vacio);
  const [ocupados, setOcupados] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (abierto) setF({ ...vacio, barberoId: preset?.barberoId || (barberos.length === 1 ? barberos[0].id : ''), hora: preset?.hora || '' }); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <Field label="Servicio"><select className="input" required value={f.servicioId} onChange={(e) => {
            // Si el barbero elegido no hace ese servicio, se quita (o se pone el único que lo hace)
            const s = servicios.find((x) => x.id === e.target.value);
            const pueden = s ? barberos.filter((b) => haceServicio(b, s)) : barberos;
            const sigue = pueden.some((b) => b.id === f.barberoId);
            setF({ ...f, servicioId: e.target.value, barberoId: sigue ? f.barberoId : pueden.length === 1 ? pueden[0].id : '' });
          }}><option value="">Elegir…</option>{servicios.filter((s) => !barbero || haceServicio(barbero, s)).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
          <Field label="Barbero"><select className="input" required value={f.barberoId} onChange={(e) => {
            const b = barberos.find((x) => x.id === e.target.value);
            setF({ ...f, barberoId: e.target.value, servicioId: b && servicio && !haceServicio(b, servicio) ? '' : f.servicioId });
          }}><option value="">Elegir…</option>{barberos.filter((b) => !servicio || haceServicio(b, servicio)).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></Field>
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

// Mensaje para pedir la reseña de Google por WhatsApp
const mensajeResena = (negocio, cita) => `¡Gracias por venir a ${negocio.nombre}, ${String(cita.cliente_nombre || '').trim().split(/\s+/)[0]}! 🙌 ¿Nos ayudas con una reseña en Google? Toma un minuto y nos ayuda muchísimo: ${negocio.link_resenas}`;

function PedirResena({ cita, negocio, onPedida, destacada }) {
  if (cita.estado !== 'finalizada' || !cita.cliente_telefono) return null;
  if (!negocio.link_resenas) {
    return <p className="rounded bg-paper px-3 py-2.5 text-sm text-ink-2"><Star size={14} className="mb-0.5 mr-1 inline text-ambar" />¿Le pides una reseña en Google? <Link to="/app/configuracion#resenas" className="font-semibold text-ink underline">Pon tu link de reseñas</Link> y lo haces con un toque.</p>;
  }
  if (cita.resena_pedida) {
    return (
      <p className="flex items-center justify-between gap-2 rounded bg-verde-soft px-3 py-2.5 text-sm text-verde">
        <span className="flex items-center gap-1.5"><Check size={15} /> Ya le pediste su reseña</span>
        <a href={linkWhatsApp(cita.cliente_telefono, mensajeResena(negocio, cita))} target="_blank" rel="noreferrer" className="font-semibold underline">Otra vez</a>
      </p>
    );
  }
  return (
    <div className={`rounded border p-4 ${destacada ? 'border-ambar/50 bg-ambar-soft' : 'border-line bg-card'}`}>
      <p className="flex items-center gap-1 font-semibold">{destacada ? 'Cobrado. ¿Le pides una reseña?' : '¿Le pides una reseña?'} {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} className="fill-ambar text-ambar" />)}</p>
      <p className="mt-0.5 text-sm text-ink-2">Las reseñas te suben en Google Maps. Le llega por WhatsApp con tu link.</p>
      <a href={linkWhatsApp(cita.cliente_telefono, mensajeResena(negocio, cita))} target="_blank" rel="noreferrer" onClick={onPedida} className="btn-primary mt-3 w-full py-2.5"><MessageCircle size={16} /> Pedir reseña por WhatsApp</a>
    </div>
  );
}

function DetalleCita({ cita: original, onClose, onCambio, negocio, barberos }) {
  const [trabajando, setTrabajando] = useState(false);
  const [cambios, setCambios] = useState({});
  if (!original) return null;
  const cita = { ...original, ...cambios };
  // Al cobrar, si se puede pedir reseña, la ventana se queda abierta para ofrecerlo
  async function cobrar() {
    setTrabajando(true);
    try {
      await cambiarEstadoCita(cita, 'finalizada'); toast.success('Servicio terminado'); onCambio();
      if (cita.cliente_telefono && negocio.link_resenas && !cita.resena_pedida) setCambios({ ...cambios, estado: 'finalizada', recienCobrada: true });
      else onClose();
    } catch { toast.error('No se pudo actualizar la cita.'); }
    setTrabajando(false);
  }
  async function resenaPedida() {
    setCambios({ ...cambios, resena_pedida: true });
    await db.from('citas').update({ resena_pedida: true }).eq('id', cita.id);
    onCambio();
  }
  const accion = async (fn, msg) => {
    setTrabajando(true);
    try { await fn(); toast.success(msg); onCambio(); onClose(); } catch { toast.error('No se pudo actualizar la cita.'); }
    setTrabajando(false);
  };
  const recordatorio = `Hola ${cita.cliente_nombre}, te esperamos en ${negocio.nombre} el ${fechaLarga(cita.fecha_hora)} a las ${hora(cita.fecha_hora)} para tu ${cita.servicios?.nombre || 'cita'}. Si necesitas cambiarla o cancelarla, hazlo aquí: ${linkCita(negocio.slug, cita.id)}`;
  const e = ESTADOS[cita.estado] || ESTADOS.pendiente;
  const barbero = barberos.find((b) => b.id === cita.barbero_id);
  const pasos = ['pendiente', 'confirmada', 'finalizada'];
  const paso = pasos.indexOf(cita.estado);
  return (
    <Modal abierto onClose={onClose} titulo={cita.cliente_nombre}>
      <div className="mb-5">
        <div className="flex flex-wrap gap-1.5"><Badge tono={e.tono}>{e.label}</Badge>{cita.origen === 'web' && <Badge tono="rojo"><Globe size={10} /> Reservó por link</Badge>}{cita.cancelada_por === 'cliente' && <Badge tono="ambar">{cita.cambio ? 'El cliente la cambió de hora' : 'La canceló el cliente'}</Badge>}</div>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line text-sm">
          {[
            ['Cuándo', <span key="c" className="first-letter:uppercase">{fechaLarga(cita.fecha_hora)} · {hora(cita.fecha_hora)}{cita.fin ? ` – ${hora(cita.fin)}` : ''}</span>, true],
            ['Servicio', cita.servicios?.nombre || 'Servicio'],
            ['Precio', dinero(precioCita(cita))],
            ['Barbero', barbero?.nombre || '—'],
            ['WhatsApp', cita.cliente_telefono || '—'],
          ].map(([k, v, ancho]) => (
            <div key={k} className={`bg-card px-3 py-2.5 ${ancho ? 'col-span-2' : ''}`}><p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{k}</p><p className="truncate font-semibold">{v}</p></div>
          ))}
        </div>
        {cita.estado !== 'cancelada' && (
          <ol className="mt-4 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
            {pasos.map((x, i) => (
              <li key={x} className="flex flex-1 items-center gap-1">
                <span className={`h-1.5 flex-1 rounded-full ${i <= paso ? (x === 'finalizada' ? 'bg-verde' : x === 'confirmada' ? 'bg-ambar' : 'bg-ink') : 'bg-line'}`} />
                <span className={i <= paso ? 'text-ink' : 'text-ink-3'}>{ESTADOS[x].label}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="grid gap-2">
        {cita.recienCobrada && <PedirResena cita={cita} negocio={negocio} onPedida={resenaPedida} destacada />}
        {cita.estado !== 'finalizada' && cita.estado !== 'cancelada' && <button disabled={trabajando} onClick={cobrar} className="btn-primary py-3"><Check size={16} /> Terminado y cobrado</button>}
        <div className="grid grid-cols-2 gap-2">
          {cita.cliente_telefono && <a href={linkWhatsApp(cita.cliente_telefono, recordatorio)} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle size={16} /> Recordar</a>}
          {cita.estado === 'pendiente' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'confirmada'), 'Cita confirmada')} className="btn-ghost">Confirmar</button>}
          {cita.estado === 'finalizada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'confirmada'), 'Se deshizo')} className="btn-ghost">Deshacer</button>}
          {cita.estado !== 'cancelada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'cancelada'), 'Cita cancelada')} className="btn-ghost text-rojo">Cancelar</button>}
          {cita.estado === 'cancelada' && <button disabled={trabajando} onClick={() => accion(() => cambiarEstadoCita(cita, 'pendiente'), 'Cita reactivada')} className="btn-ghost">Reactivar</button>}
        </div>
        {!cita.recienCobrada && <div className="mt-1"><PedirResena cita={cita} negocio={negocio} onPedida={resenaPedida} /></div>}
        <button disabled={trabajando} onClick={() => window.confirm('¿Borrar esta cita para siempre?') && accion(() => eliminarCita(cita), 'Cita borrada')} className="btn-link mt-1 justify-start text-sm text-ink-3"><Trash2 size={14} /> Borrar del historial</button>
      </div>
    </Modal>
  );
}

// Lunes de la semana de un día
const lunesDe = (ymd) => sumarDias(ymd, -((diaSemana(ymd) + 6) % 7));
const DIAS_TIRA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function TiraSemana({ dia, setDia, citasSemana, horario }) {
  const lunes = lunesDe(dia);
  const hoy = hoyYmd();
  return (
    <div className="mb-5 flex items-stretch gap-1.5">
      <button onClick={() => setDia(sumarDias(dia, -7))} className="hidden rounded border border-line bg-card px-2 text-ink-2 hover:border-ink sm:block" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
      <div className="grid flex-1 grid-cols-7 gap-1 sm:gap-1.5">
        {DIAS_TIRA.map((nombre, i) => {
          const ymd = sumarDias(lunes, i);
          const n = citasSemana.filter((c) => c.estado !== 'cancelada' && hoyYmd(new Date(c.fecha_hora)) === ymd).length;
          const elegido = ymd === dia; const cerrado = !horarioDelDia(horario, ymd);
          return (
            <button key={ymd} onClick={() => setDia(ymd)} aria-pressed={elegido} aria-label={`${nombre} ${diaDelMes(ymd)}: ${n} citas`}
              className={`relative flex flex-col items-center rounded-lg border px-1 py-2 transition ${elegido ? 'border-ink bg-ink text-paper shadow-md' : 'border-line bg-card hover:-translate-y-0.5 hover:border-ink'} ${cerrado && !elegido ? 'opacity-50' : ''}`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] ${elegido ? 'text-paper/70' : 'text-ink-3'}`}>{nombre}</span>
              <span className="display text-2xl leading-tight sm:text-3xl">{diaDelMes(ymd)}</span>
              <span className={`mt-0.5 flex h-4 items-center gap-0.5 text-[10px] font-semibold ${elegido ? 'text-paper/80' : 'text-ink-2'}`}>
                {n > 0 ? <>{Array.from({ length: Math.min(n, 3) }).map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${elegido ? 'bg-paper' : 'bg-rojo'}`} />)}<span className="ml-0.5 hidden sm:inline">{n}</span></> : cerrado ? <Moon size={10} /> : null}
              </span>
              {ymd === hoy && <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${elegido ? 'bg-rojo' : 'bg-rojo'}`} aria-label="Hoy" />}
            </button>
          );
        })}
      </div>
      <button onClick={() => setDia(sumarDias(dia, 7))} className="hidden rounded border border-line bg-card px-2 text-ink-2 hover:border-ink sm:block" aria-label="Semana siguiente"><ChevronRight size={18} /></button>
    </div>
  );
}

function Tarjeta({ titulo, valor, detalle, children, acento, onClick }) {
  const Caja = onClick ? 'button' : 'div';
  return (
    <Caja onClick={onClick} className={`card relative overflow-hidden px-4 py-3.5 text-left ${acento ? 'border-ink bg-ink text-paper' : ''} ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-lg' : ''}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${acento ? 'text-paper/60' : 'text-ink-3'}`}>{titulo}</p>
      <p className="display mt-0.5 truncate text-3xl leading-tight">{valor}</p>
      {detalle && <p className={`truncate text-xs ${acento ? 'text-paper/70' : 'text-ink-2'}`}>{detalle}</p>}
      {children}
    </Caja>
  );
}

// "en 25 min", "en 1 h 10 min", "ahora"
function faltan(iso) {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (m <= 0) return 'ahora';
  if (m < 60) return `en ${m} min`;
  return `en ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

function Lista({ barberos, citas, dia, negocio, onCita }) {
  const abierto = horarioDelDia(negocio.horario, dia);
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      {barberos.map((b) => {
        const suyas = citas.filter((c) => c.barbero_id === b.id);
        const descansa = abierto && !horarioDelDia(negocio.horario, dia, b);
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
                  <button key={c.id} onClick={() => onCita(c)} className={`block w-full rounded-sm border border-l-[3px] border-line bg-card px-3 py-2.5 text-left transition hover:border-ink ${e.borde}`}>
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
  );
}

const leerVista = () => { try { return localStorage.getItem('agendaVista') || 'horario'; } catch { return 'horario'; } };

export default function Agenda() {
  const { negocio } = useSesion();
  const [params, setParams] = useSearchParams();
  // ?dia=AAAA-MM-DD (lo usan los avisos al celular para abrir el día de la cita)
  const [dia, setDia] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get('dia') || '') ? params.get('dia') : hoyYmd()));
  useEffect(() => { if (params.get('dia')) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [semana, setSemana] = useState({ lunes: null, citas: null }); // citas de toda la semana: cambiar de día es instantáneo
  const [nueva, setNueva] = useState(null); // null | { barberoId?, hora? }
  const [detalle, setDetalle] = useState(null);
  const [bloquear, setBloquear] = useState(false);
  const [vista, setVista] = useState(leerVista);
  const lunes = lunesDe(dia);

  const cargar = useCallback(async () => {
    const [b, s, c] = await Promise.all([
      db.from('barberos').select('*').order('nombre'),
      db.from('servicios').select('*').order('nombre'),
      db.from('citas').select('*, servicios ( nombre, precio, duracion_min )').gte('fecha_hora', inicioDia(lunes)).lte('fecha_hora', finDia(sumarDias(lunes, 6))).order('fecha_hora'),
    ]);
    // Barberos del plan, más cualquiera que tenga citas esa semana (para no esconder citas si bajó de plan)
    const activos = (b.data || []).filter((x) => x.activo !== false);
    const delPlan = new Set(barberosDelPlan(negocio, activos).map((x) => x.id));
    const conCitas = new Set((c.data || []).map((x) => x.barbero_id));
    setBarberos(activos.filter((x) => delPlan.has(x.id) || conCitas.has(x.id)));
    setServicios(s.data || []);
    setSemana({ lunes, citas: c.data || [] });
  }, [lunes, negocio]);
  useEffect(() => { cargar(); }, [cargar]);
  const cambiarVista = (v) => { setVista(v); try { localStorage.setItem('agendaVista', v); } catch { /* sin almacenamiento */ } };

  const listo = semana.lunes === lunes && semana.citas;
  const citas = listo ? semana.citas.filter((c) => hoyYmd(new Date(c.fecha_hora)) === dia) : null;
  const esHoy = dia === hoyYmd();
  const activas = (citas || []).filter((c) => c.estado !== 'cancelada');
  const terminadas = activas.filter((c) => c.estado === 'finalizada');
  const canceladas = (citas || []).length - activas.length;
  const cobrado = terminadas.reduce((a, c) => a + precioCita(c), 0);
  const porCobrar = activas.filter((c) => c.estado !== 'finalizada').reduce((a, c) => a + precioCita(c), 0);
  const ahoraIso = new Date().toISOString();
  const siguiente = activas.find((c) => c.estado !== 'finalizada' && (!esHoy || (c.fin || c.fecha_hora) > ahoraIso));
  const abierto = horarioDelDia(negocio.horario, dia);
  const avance = activas.length ? Math.round((terminadas.length / activas.length) * 100) : 0;

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
        <button onClick={() => setNueva({})} disabled={!barberos.length || !servicios.length} className="btn-rojo"><Plus size={16} /> Nueva cita</button>
      </PageHeader>

      {listo && barberos.length > 0 && servicios.length > 0 && <InvitarAvisos />}
      {listo && (barberos.length === 0 || servicios.length === 0) && <Primeros barberos={barberos.length} servicios={servicios.length} />}

      {!listo ? <Cargando /> : barberos.length === 0 ? null : (
        <>
          <TiraSemana dia={dia} setDia={setDia} citasSemana={semana.citas} horario={negocio.horario} />

          <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <Tarjeta titulo={esHoy ? 'Siguiente' : 'Primera cita'} acento={!!siguiente} onClick={siguiente ? () => setDetalle(siguiente) : undefined}
              valor={siguiente ? hora(siguiente.fecha_hora) : '—'}
              detalle={siguiente ? `${siguiente.cliente_nombre}${esHoy ? ` · ${faltan(siguiente.fecha_hora)}` : ''}` : 'Sin citas pendientes'} />
            <Tarjeta titulo="Citas" valor={activas.length} detalle={canceladas ? `${canceladas} cancelada${canceladas === 1 ? '' : 's'}` : `${activas.filter((c) => c.origen === 'web').length} por link`} />
            <Tarjeta titulo="Terminadas" valor={`${terminadas.length}/${activas.length}`}>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-verde transition-all" style={{ width: `${avance}%` }} /></div>
            </Tarjeta>
            <Tarjeta titulo="Cobrado" valor={dinero(cobrado)} detalle={porCobrar ? `${dinero(porCobrar)} por cobrar` : 'Todo cobrado'} />
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded border border-line bg-card p-0.5" role="radiogroup" aria-label="Vista de la agenda">
              {[['horario', 'Horario', CalendarClock], ['lista', 'Lista', List]].map(([v, nombre, Icono]) => (
                <button key={v} role="radio" aria-checked={vista === v} onClick={() => cambiarVista(v)}
                  className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold ${vista === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}><Icono size={14} /> {nombre}</button>
              ))}
            </div>
            {vista === 'horario' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2">
                {[['Pendiente', 'border-ink bg-card'], ['Confirmada', 'border-ambar bg-ambar-soft'], ['Terminada', 'border-verde bg-verde-soft']].map(([n, c]) => (
                  <span key={n} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm border border-l-[3px] ${c}`} /> {n}</span>
                ))}
                <span className="hidden text-ink-3 sm:inline">Toca un hueco para agendar</span>
              </div>
            )}
          </div>

          {vista === 'horario'
            ? <LineaTiempo dia={dia} horario={negocio.horario} barberos={barberos} citas={citas} onCita={setDetalle} onHueco={(barberoId, hh) => setNueva({ barberoId, hora: hh })} />
            : <Lista barberos={barberos} citas={citas} dia={dia} negocio={negocio} onCita={setDetalle} />}
          {vista === 'horario' && canceladas > 0 && <p className="mt-2 text-xs text-ink-3">Las citas canceladas no se dibujan aquí; míralas en la vista Lista.</p>}

          {servicios.length > 0 && <div className="mt-6"><LinkReservas slug={negocio.slug} /></div>}
        </>
      )}

      <NuevaCita abierto={!!nueva} preset={nueva} onClose={() => setNueva(null)} onGuardada={(d) => (d === dia ? cargar() : setDia(d))}
        barberos={barberos} servicios={servicios} diaInicial={dia} horario={negocio.horario} />
      <DetalleCita key={detalle?.id || 'nada'} cita={detalle} onClose={() => setDetalle(null)} onCambio={cargar} negocio={negocio} barberos={barberos} />
      {bloquear && <BloquearHoras abierto onClose={() => setBloquear(false)} negocio={negocio} barberos={barberos} diaInicial={dia < hoyYmd() ? hoyYmd() : dia} />}
    </>
  );
}
