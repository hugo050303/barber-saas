import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, MessageCircle, Clock, Check, CalendarClock, Copy, ChevronRight } from 'lucide-react';
import { db, usarNegocio } from '../db';
import { negocioPorSlug, ocupadosDelDia, crearCita, esPro, barberosDelPlan, haceServicio, citaPorId, cancelarPorCliente, linkCita, misCitas, recordarMiCita } from '../lib/negocio';
import { avisarBarberia } from '../lib/avisos';
import { horariosLibres, diasReservables, horarioDelDia, DIAS_CORTOS, textoTurnos } from '../lib/horario';
import { dinero, hora, fechaLarga, diaLargo, soloDigitos, linkWhatsApp, usarZona, hoyYmd, diaSemana, diaDelMes, partesZona } from '../lib/formato';
import { Cargando, Field } from '../components/ui';
import BotonInstalar from '../components/BotonInstalar';
import { MARCA } from '../config';
import { VolverDemo } from '../components/FranjaDemo';

function Paso({ n, titulo, activo, hecho, resumen, onEditar, children }) {
  return (
    <section className={`border-t border-line py-5 first:border-t-0 ${!activo && !hecho ? 'opacity-40' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-3 text-lg font-bold">
          <span className={`display w-5 text-2xl ${hecho ? 'text-verde' : 'text-rojo'}`}>{hecho ? <Check size={20} className="inline" /> : n}</span>
          {titulo}
        </h2>
        {hecho && !activo && <button onClick={onEditar} className="text-sm font-semibold underline underline-offset-4">Cambiar</button>}
      </div>
      {hecho && !activo && <p className="mt-1 pl-8 text-ink-2">{resumen}</p>}
      {activo && <div className="mt-4">{children}</div>}
    </section>
  );
}

// Agrupa las horas en mañana / tarde / noche
function GruposDeHoras({ horas, elegida, onElegir }) {
  const grupos = [['Mañana', (h) => h < 12], ['Tarde', (h) => h >= 12 && h < 18], ['Noche', (h) => h >= 18]];
  return (
    <div className="mt-5 space-y-4">
      {grupos.map(([nombre, filtro]) => {
        const suyas = horas.filter((iso) => filtro(partesZona(iso).h));
        if (!suyas.length) return null;
        return (
          <div key={nombre}>
            <p className="eyebrow mb-2">{nombre}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {suyas.map((h) => (
                <button key={h} onClick={() => onElegir(h)}
                  className={`rounded border py-2.5 text-sm font-semibold transition ${elegida === h ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>
                  {hora(h)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reserva() {
  const { slug } = useParams();
  const [negocio, setNegocio] = useState(undefined);
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [paso, setPaso] = useState(1);
  const [sel, setSel] = useState({ servicio: null, barbero: null, dia: null, hora: null });
  const [ocupados, setOcupados] = useState(null);
  const [datos, setDatos] = useState({ nombre: '', telefono: '' });
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [citaId, setCitaId] = useState(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [cambiando, setCambiando] = useState(null); // la cita que el cliente está cambiando de hora
  const [proximas, setProximas] = useState([]);

  useEffect(() => {
    (async () => {
      const n = await negocioPorSlug(slug).catch(() => null);
      if (n) {
        usarNegocio(n.id); usarZona(n.zona); document.title = `Reserva en ${n.nombre}`;
        try { localStorage.setItem('ultimaReserva', slug); } catch { /* sin almacenamiento */ }
      }
      setNegocio(n);
      if (!n) return;
      const [b, s] = await Promise.all([db.from('barberos').select('*').order('nombre'), db.from('servicios').select('*').order('nombre')]);
      // Solo los barberos activos que entran en el plan de la barbería
      const bs = barberosDelPlan(n, (b.data || []).filter((x) => x.activo !== false));
      setBarberos(bs);
      setServicios(s.data || []);
      setProximas(misCitas(slug));
      // ?cambiar={id}: el cliente cambia su cita (mismo servicio y barbero, otra hora)
      const idCambio = params.get('cambiar');
      if (idCambio) {
        const vieja = await citaPorId(idCambio).catch(() => null);
        const servicio = (s.data || []).find((x) => x.id === vieja?.servicio_id);
        const barbero = bs.find((x) => x.id === vieja?.barbero_id);
        if (vieja && ['pendiente', 'confirmada'].includes(vieja.estado) && new Date(vieja.fecha_hora) > new Date() && servicio && barbero) {
          setCambiando(vieja);
          setSel({ servicio, barbero, dia: null, hora: null });
          setDatos({ nombre: vieja.cliente_nombre || '', telefono: vieja.cliente_telefono || '' });
          setPaso(3);
        } else if (vieja && !vieja.cambio) toast.error('Esa cita ya no se puede cambiar. Aparta una nueva.');
      }
    })();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sel.dia) return;
    setOcupados(null);
    ocupadosDelDia(sel.dia).then(setOcupados).catch(() => setOcupados([]));
  }, [sel.dia]);
  // Al cambiar de hora, la cita vieja no estorba (se libera al confirmar la nueva)
  const sinLaVieja = (lista) => (cambiando ? lista.filter((o) => o.id !== cambiando.id) : lista);

  const horario = negocio?.horario;
  const dias = negocio ? diasReservables(horario).filter((d) => !sel.barbero || horarioDelDia(horario, d, sel.barbero)) : [];
  const libres = sel.dia && ocupados && sel.barbero && sel.servicio
    ? horariosLibres({ ymd: sel.dia, horario, duracion: sel.servicio.duracion_min, ocupados: sinLaVieja(ocupados), barbero: sel.barbero })
    : [];

  async function confirmar(e) {
    e.preventDefault();
    if (soloDigitos(datos.telefono).length !== 10) return toast.error('Tu WhatsApp debe tener 10 dígitos.');
    setEnviando(true);
    try {
      // Revisar otra vez que la hora siga libre (alguien pudo ganarla)
      const frescos = await ocupadosDelDia(sel.dia);
      const sigue = horariosLibres({ ymd: sel.dia, horario, duracion: sel.servicio.duracion_min, ocupados: sinLaVieja(frescos), barbero: sel.barbero }).includes(sel.hora);
      if (!sigue) {
        setOcupados(frescos); setSel({ ...sel, hora: null }); setPaso(3);
        toast.error('Alguien acaba de apartar esa hora. Elige otra, por favor.');
        setEnviando(false);
        return;
      }
      const id = await crearCita({ cliente: datos.nombre, telefono: datos.telefono, inicio: sel.hora, barbero: sel.barbero, servicio: sel.servicio, origen: 'web' });
      if (cambiando) await cancelarPorCliente(cambiando, { cambio: true }).catch(() => {});
      recordarMiCita(slug, id, sel.hora, cambiando?.id);
      avisarBarberia(negocio.id, id, cambiando?.id);
      setCitaId(id);
      setListo(true);
      if (cambiando) navigate(`/r/${slug}`, { replace: true }); // al regresar no se intenta cambiar otra vez
    } catch {
      toast.error('No pudimos guardar tu cita. Inténtalo de nuevo.');
    }
    setEnviando(false);
  }

  if (negocio === undefined) return <div className="flex min-h-screen items-center justify-center"><Cargando texto="Cargando…" /></div>;
  if (negocio === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="display text-5xl">No encontramos esta barbería</p>
        <p className="mt-3 text-ink-2">Revisa que el link esté bien escrito o pídeselo de nuevo a tu barbero.</p>
      </div>
    );
  }

  const hoy = horarioDelDia(horario, hoyYmd());
  const conFotos = esPro(negocio);
  const portada = conFotos && negocio.portada;
  const encabezado = (
    <header className="relative overflow-hidden bg-ink text-paper">
      {portada && <img src={portada} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
      {portada && <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />}
      <div className="poste relative h-1.5" />
      <div className={`relative mx-auto max-w-xl px-5 ${portada ? 'pb-7 pt-24' : 'py-7'}`}>
        {conFotos && negocio.logo && <img src={negocio.logo} alt={`Logo de ${negocio.nombre}`} className="mb-4 h-16 w-16 rounded-full border-2 border-paper/80 object-cover" />}
        <p className="eyebrow text-paper/60">Reserva tu cita</p>
        <h1 className="display mt-2 text-5xl">{negocio.nombre}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-paper/70">
          {negocio.direccion && <a href={`https://maps.google.com/?q=${encodeURIComponent(negocio.direccion)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-paper"><MapPin size={14} />{negocio.direccion}</a>}
          <span className="flex items-center gap-1.5"><Clock size={14} />{hoy ? `Hoy de ${textoTurnos(hoy.turnos)}` : 'Hoy cerrado'}</span>
          {negocio.whatsapp && <a href={linkWhatsApp(negocio.whatsapp, 'Hola, tengo una pregunta')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-paper"><MessageCircle size={14} />WhatsApp</a>}
        </div>
      </div>
    </header>
  );

  const pie = !esPro(negocio) && (
    <footer className="py-10 text-center text-xs text-ink-3">
      Reservas con <Link to="/" className="font-semibold text-ink">{MARCA}</Link> · software para barberías
    </footer>
  );

  if (listo) {
    const miLink = citaId ? linkCita(slug, citaId) : null;
    const msg = `Hola, soy ${datos.nombre}. ${cambiando ? 'Cambié mi cita: ahora es' : 'Acabo de apartar'} ${sel.servicio.nombre} con ${sel.barbero.nombre} el ${fechaLarga(sel.hora)} a las ${hora(sel.hora)}.${miLink ? ` Mi cita: ${miLink}` : ''}`;
    const copiar = () => navigator.clipboard.writeText(miLink).then(() => toast.success('Link copiado'), () => toast.error('No se pudo copiar'));
    return (
      <div className="min-h-screen">
        <VolverDemo />
        {encabezado}
        <main className="mx-auto max-w-xl px-5 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-verde text-white"><Check size={26} /></div>
          <h2 className="display mt-5 text-5xl">{cambiando ? 'Cita cambiada' : 'Te esperamos'}</h2>
          <div className="card mt-6 divide-y divide-line">
            {[['Servicio', `${sel.servicio.nombre} · ${dinero(sel.servicio.precio)}`], ['Con', sel.barbero.nombre], ['Día', fechaLarga(sel.hora)], ['Hora', hora(sel.hora)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3"><span className="text-ink-3">{k}</span><span className="text-right font-semibold first-letter:uppercase">{v}</span></div>
            ))}
          </div>
          {miLink && (
            <div className="mt-5 rounded border border-dashed border-ink/30 bg-card p-4">
              <p className="font-semibold">¿Te surgió algo?</p>
              <p className="mt-0.5 text-sm text-ink-2">Con este link cambias la hora o cancelas tu cita tú mismo. Guárdalo (también va en tu mensaje de WhatsApp).</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/r/${slug}/cita/${citaId}`} className="btn-ghost"><CalendarClock size={16} /> Ver mi cita</Link>
                <button onClick={copiar} className="btn-ghost"><Copy size={16} /> Copiar link</button>
              </div>
            </div>
          )}
          {negocio.whatsapp && (
            <a href={linkWhatsApp(negocio.whatsapp, msg)} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full py-3"><MessageCircle size={18} /> Avisar por WhatsApp</a>
          )}
          <BotonInstalar className="btn-ghost mt-3 w-full py-3" texto={`Guardar ${negocio.nombre} en tu celular`} nombre={negocio.nombre} />
        </main>
        {pie}
      </div>
    );
  }

  const sinCatalogo = barberos.length === 0 || servicios.length === 0;

  return (
    <div className="min-h-screen">
      <VolverDemo />
      {encabezado}
      <main className="mx-auto max-w-xl px-5 pb-6 pt-2">
        {conFotos && negocio.galeria?.length > 0 && !sinCatalogo && paso === 1 && (
          <div className="-mx-5 mb-2 mt-4">
            <p className="eyebrow mb-2 px-5">Nuestros trabajos</p>
            <div className="flex snap-x gap-2 overflow-x-auto px-5 pb-2">
              {negocio.galeria.map((f) => (
                <img key={f.slot} src={f.url} alt="Trabajo de la barbería" loading="lazy" className="h-32 w-32 shrink-0 snap-start rounded object-cover" />
              ))}
            </div>
          </div>
        )}
        {cambiando && (
          <div className="mt-4 rounded border border-ambar/40 bg-ambar-soft px-4 py-3 text-sm">
            <p className="font-semibold text-ink">Estás cambiando tu cita del <span className="first-letter:uppercase">{fechaLarga(cambiando.fecha_hora)}</span> a las {hora(cambiando.fecha_hora)}</p>
            <p className="text-ink-2">Elige el nuevo día y hora. Tu cita actual se libera solo cuando confirmes la nueva. <Link to={`/r/${slug}/cita/${cambiando.id}`} className="font-semibold underline">No cambiar</Link></p>
          </div>
        )}
        {!cambiando && proximas.map((c) => (
          <Link key={c.id} to={`/r/${slug}/cita/${c.id}`} className="card mt-4 flex items-center gap-3 px-4 py-3 hover:border-ink">
            <CalendarClock size={20} className="shrink-0 text-rojo" />
            <span className="min-w-0 flex-1 text-sm"><span className="block font-semibold">Ya tienes cita: <span className="first-letter:uppercase">{fechaLarga(c.inicio)}</span> · {hora(c.inicio)}</span><span className="text-ink-2">Ver, cambiar o cancelar</span></span>
            <ChevronRight size={18} className="text-ink-3" />
          </Link>
        ))}
        {sinCatalogo ? (
          <p className="py-12 text-center text-ink-2">Esta barbería todavía está preparando su agenda en línea. Mientras tanto, escríbeles por WhatsApp.</p>
        ) : (
          <>
            <Paso n="1" titulo="¿Qué te vas a hacer?" activo={paso === 1} hecho={!!sel.servicio} onEditar={() => setPaso(1)}
              resumen={sel.servicio && `${sel.servicio.nombre} · ${dinero(sel.servicio.precio)}`}>
              <div className="divide-y divide-line rounded border border-line bg-card">
                {servicios.filter((s) => barberos.some((b) => haceServicio(b, s))).map((s) => (
                  <button key={s.id} onClick={() => {
                    // Solo los barberos que hacen este servicio; si el elegido no lo hace, se vuelve a elegir
                    const pueden = barberos.filter((b) => haceServicio(b, s));
                    const barbero = sel.barbero && haceServicio(sel.barbero, s) ? sel.barbero : pueden.length === 1 ? pueden[0] : null;
                    setSel({ ...sel, servicio: s, barbero, ...(barbero?.id !== sel.barbero?.id ? { dia: null } : {}), hora: null });
                    setPaso(barbero ? 3 : 2);
                  }}
                    className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-paper ${sel.servicio?.id === s.id ? 'bg-paper' : ''}`}>
                    <span><span className="block font-semibold">{s.nombre}</span><span className="text-sm text-ink-3">{s.duracion_min || 30} min</span></span>
                    <span className="font-bold">{dinero(s.precio)}</span>
                  </button>
                ))}
              </div>
            </Paso>

            <Paso n="2" titulo="¿Con quién?" activo={paso === 2} hecho={!!sel.barbero} onEditar={() => setPaso(2)} resumen={sel.barbero?.nombre}>
              <div className="grid grid-cols-2 gap-2">
                {barberos.filter((b) => !sel.servicio || haceServicio(b, sel.servicio)).map((b) => (
                  <button key={b.id} onClick={() => { setSel({ ...sel, barbero: b, dia: null, hora: null }); setPaso(3); }}
                    className={`flex items-center gap-3 rounded border px-3 py-3 text-left transition ${sel.barbero?.id === b.id ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>
                    {conFotos && b.foto && <img src={b.foto} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{b.nombre}</span>
                      {b.especialidad && <span className={`block truncate text-sm ${sel.barbero?.id === b.id ? 'text-paper/70' : 'text-ink-3'}`}>{b.especialidad}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </Paso>

            <Paso n="3" titulo="¿Cuándo?" activo={paso === 3} hecho={!!sel.hora} onEditar={() => setPaso(3)}
              resumen={sel.hora && <span className="first-letter:uppercase">{fechaLarga(sel.hora)} · {hora(sel.hora)}</span>}>
              {dias.length === 0 ? <p className="text-sm text-ink-2">No hay días disponibles por ahora. Escríbele a la barbería por WhatsApp.</p> : (
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
                  {dias.map((d) => {
                    const activo = sel.dia === d;
                    return (
                      <button key={d} onClick={() => setSel({ ...sel, dia: d, hora: null })} aria-label={diaLargo(d)}
                        className={`flex w-16 shrink-0 flex-col items-center rounded border py-2.5 ${activo ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>
                        <span className={`text-[11px] uppercase ${activo ? 'text-paper/70' : 'text-ink-3'}`}>{d === hoyYmd() ? 'Hoy' : DIAS_CORTOS[diaSemana(d)]}</span>
                        <span className="text-xl font-bold">{diaDelMes(d)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {sel.dia && (
                ocupados === null ? <Cargando texto="Buscando horarios…" /> :
                libres.length === 0
                  ? <p className="mt-4 text-sm text-ink-2">Ya no quedan horas libres con {sel.barbero.nombre} este día. Prueba otro día.</p>
                  : <GruposDeHoras horas={libres} elegida={sel.hora} onElegir={(h) => { setSel({ ...sel, hora: h }); setPaso(4); }} />
              )}
            </Paso>

            <Paso n="4" titulo="Tus datos" activo={paso === 4} hecho={false}>
              <form onSubmit={confirmar} className="space-y-4">
                <Field label="Tu nombre"><input className="input" required maxLength={60} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} autoComplete="name" /></Field>
                <Field label="Tu WhatsApp" hint="Solo para avisarte de tu cita.">
                  <input className="input" required inputMode="numeric" placeholder="10 dígitos" value={datos.telefono}
                    onChange={(e) => setDatos({ ...datos, telefono: soloDigitos(e.target.value).slice(0, 10) })} autoComplete="tel-national" />
                </Field>
                <button className="btn-rojo w-full py-3.5 text-base" disabled={enviando}>{enviando ? 'Apartando…' : 'Apartar mi lugar'}</button>
                <p className="text-xs text-ink-3">{negocio.nombre} usará tus datos solo para tu cita. <Link to="/privacidad#clientes" target="_blank" className="underline">Aviso de privacidad</Link></p>
              </form>
            </Paso>
          </>
        )}
      </main>
      {pie}
    </div>
  );
}
