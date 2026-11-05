import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, MessageCircle, Clock, Check } from 'lucide-react';
import { db, usarNegocio } from '../db';
import { negocioPorSlug, ocupadosDelDia, crearCita, esPro } from '../lib/negocio';
import { horariosLibres, diasReservables, horarioDelDia, DIAS_CORTOS } from '../lib/horario';
import { dinero, hora, fechaLarga, diaLargo, soloDigitos, linkWhatsApp, usarZona, hoyYmd, diaSemana, diaDelMes, partesZona } from '../lib/formato';
import { Cargando, Field } from '../components/ui';
import { MARCA, LIMITE_BARBEROS_GRATIS } from '../config';

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

  useEffect(() => {
    (async () => {
      const n = await negocioPorSlug(slug).catch(() => null);
      if (n) { usarNegocio(n.id); usarZona(n.zona); document.title = `Reserva en ${n.nombre}`; }
      setNegocio(n);
      if (!n) return;
      const [b, s] = await Promise.all([db.from('barberos').select('*').order('nombre'), db.from('servicios').select('*').order('nombre')]);
      let activos = (b.data || []).filter((x) => x.activo !== false);
      // En plan gratis solo se reserva con el barbero principal
      if (!esPro(n)) activos = (activos.some((x) => x.id === 'principal') ? activos.filter((x) => x.id === 'principal') : activos).slice(0, LIMITE_BARBEROS_GRATIS);
      setBarberos(activos);
      setServicios(s.data || []);
    })();
  }, [slug]);

  useEffect(() => {
    if (!sel.dia) return;
    setOcupados(null);
    ocupadosDelDia(sel.dia).then(setOcupados).catch(() => setOcupados([]));
  }, [sel.dia]);

  const horario = negocio?.horario;
  const dias = negocio ? diasReservables(horario).filter((d) => !sel.barbero || horarioDelDia(horario, d, sel.barbero)) : [];
  const libres = sel.dia && ocupados && sel.barbero && sel.servicio
    ? horariosLibres({ ymd: sel.dia, horario, duracion: sel.servicio.duracion_min, ocupados, barbero: sel.barbero })
    : [];

  async function confirmar(e) {
    e.preventDefault();
    if (soloDigitos(datos.telefono).length !== 10) return toast.error('Tu WhatsApp debe tener 10 dígitos.');
    setEnviando(true);
    try {
      // Revisar otra vez que la hora siga libre (alguien pudo ganarla)
      const frescos = await ocupadosDelDia(sel.dia);
      const sigue = horariosLibres({ ymd: sel.dia, horario, duracion: sel.servicio.duracion_min, ocupados: frescos, barbero: sel.barbero }).includes(sel.hora);
      if (!sigue) {
        setOcupados(frescos); setSel({ ...sel, hora: null }); setPaso(3);
        toast.error('Alguien acaba de apartar esa hora. Elige otra, por favor.');
        setEnviando(false);
        return;
      }
      await crearCita({ cliente: datos.nombre, telefono: datos.telefono, inicio: sel.hora, barbero: sel.barbero, servicio: sel.servicio, origen: 'web' });
      setListo(true);
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
  const encabezado = (
    <header className="bg-ink text-paper">
      <div className="poste h-1.5" />
      <div className="mx-auto max-w-xl px-5 py-7">
        <p className="eyebrow text-paper/50">Reserva tu cita</p>
        <h1 className="display mt-2 text-5xl">{negocio.nombre}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-paper/70">
          {negocio.direccion && <a href={`https://maps.google.com/?q=${encodeURIComponent(negocio.direccion)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-paper"><MapPin size={14} />{negocio.direccion}</a>}
          <span className="flex items-center gap-1.5"><Clock size={14} />{hoy ? `Hoy de ${hoy.abre} a ${hoy.cierra}` : 'Hoy cerrado'}</span>
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
    const msg = `Hola, soy ${datos.nombre}. Acabo de apartar ${sel.servicio.nombre} con ${sel.barbero.nombre} el ${fechaLarga(sel.hora)} a las ${hora(sel.hora)}.`;
    return (
      <div className="min-h-screen">
        {encabezado}
        <main className="mx-auto max-w-xl px-5 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-verde text-white"><Check size={26} /></div>
          <h2 className="display mt-5 text-5xl">Te esperamos</h2>
          <div className="card mt-6 divide-y divide-line">
            {[['Servicio', `${sel.servicio.nombre} · ${dinero(sel.servicio.precio)}`], ['Con', sel.barbero.nombre], ['Día', fechaLarga(sel.hora)], ['Hora', hora(sel.hora)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3"><span className="text-ink-3">{k}</span><span className="text-right font-semibold first-letter:uppercase">{v}</span></div>
            ))}
          </div>
          <p className="mt-5 text-sm text-ink-2">Si no puedes llegar, avísale a la barbería para que alguien más aproveche tu lugar.</p>
          {negocio.whatsapp && (
            <a href={linkWhatsApp(negocio.whatsapp, msg)} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full py-3"><MessageCircle size={18} /> Avisar por WhatsApp</a>
          )}
        </main>
        {pie}
      </div>
    );
  }

  const sinCatalogo = barberos.length === 0 || servicios.length === 0;

  return (
    <div className="min-h-screen">
      {encabezado}
      <main className="mx-auto max-w-xl px-5 pb-6 pt-2">
        {sinCatalogo ? (
          <p className="py-12 text-center text-ink-2">Esta barbería todavía está preparando su agenda en línea. Mientras tanto, escríbeles por WhatsApp.</p>
        ) : (
          <>
            <Paso n="1" titulo="¿Qué te vas a hacer?" activo={paso === 1} hecho={!!sel.servicio} onEditar={() => setPaso(1)}
              resumen={sel.servicio && `${sel.servicio.nombre} · ${dinero(sel.servicio.precio)}`}>
              <div className="divide-y divide-line rounded border border-line bg-card">
                {servicios.map((s) => (
                  <button key={s.id} onClick={() => {
                    const barbero = sel.barbero || (barberos.length === 1 ? barberos[0] : null);
                    setSel({ ...sel, servicio: s, barbero, hora: null });
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
                {barberos.map((b) => (
                  <button key={b.id} onClick={() => { setSel({ ...sel, barbero: b, dia: null, hora: null }); setPaso(3); }}
                    className={`rounded border px-4 py-3.5 text-left transition ${sel.barbero?.id === b.id ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>
                    <span className="block font-semibold">{b.nombre}</span>
                    {b.especialidad && <span className={`text-sm ${sel.barbero?.id === b.id ? 'text-paper/70' : 'text-ink-3'}`}>{b.especialidad}</span>}
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
              </form>
            </Paso>
          </>
        )}
      </main>
      {pie}
    </div>
  );
}
