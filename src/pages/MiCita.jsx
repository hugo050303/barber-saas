// La cita del cliente (/r/{slug}/cita/{id}): la ve, la guarda en su calendario, la cambia o la cancela.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarPlus, MapPin, MessageCircle, CalendarClock, X, Check, Ban } from 'lucide-react';
import { db, usarNegocio } from '../db';
import { negocioPorSlug, citaPorId, cancelarPorCliente, recordarMiCita, esPro } from '../lib/negocio';
import { avisarBarberia } from '../lib/avisos';
import { dinero, hora, fechaLarga, linkWhatsApp, usarZona } from '../lib/formato';
import { Cargando } from '../components/ui';

const fechaCalendario = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export default function MiCita() {
  const { slug, id } = useParams();
  const [estado, setEstado] = useState({ cargando: true });
  const [cancelando, setCancelando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const negocio = await negocioPorSlug(slug);
        if (!negocio) return setEstado({ error: 'No encontramos esta barbería.' });
        usarNegocio(negocio.id); usarZona(negocio.zona); document.title = `Tu cita en ${negocio.nombre}`;
        const cita = await citaPorId(id);
        if (!cita) return setEstado({ error: 'No encontramos esta cita. Revisa que el link esté completo.', negocio });
        const [b, s] = await Promise.all([db.from('barberos').select('*').eq('id', cita.barbero_id).maybeSingle(), db.from('servicios').select('*').eq('id', cita.servicio_id).maybeSingle()]);
        setEstado({ negocio, cita, barbero: b.data, servicio: s.data });
      } catch { setEstado({ error: 'No pudimos cargar tu cita. Revisa tu conexión.' }); }
    })();
  }, [slug, id]);

  if (estado.cargando) return <div className="flex min-h-screen items-center justify-center"><Cargando texto="Cargando tu cita…" /></div>;
  const { negocio, cita, barbero, servicio, error } = estado;
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="display text-5xl">Ups</p>
        <p className="mt-3 max-w-sm text-ink-2">{error}</p>
        {negocio && <Link to={`/r/${slug}`} className="btn-primary mt-6">Apartar una cita</Link>}
      </div>
    );
  }

  const yaPaso = new Date(cita.fin || cita.fecha_hora) < new Date();
  const cancelada = cita.estado === 'cancelada';
  const terminada = cita.estado === 'finalizada';
  const sePuedeCambiar = !cancelada && !terminada && !yaPaso;
  const nombreServicio = servicio?.nombre || 'tu servicio';
  const urlCalendario = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${nombreServicio} en ${negocio.nombre}`)}&dates=${fechaCalendario(cita.fecha_hora)}/${fechaCalendario(cita.fin || cita.fecha_hora)}&details=${encodeURIComponent(`Con ${barbero?.nombre || 'tu barbero'}. Para cambiar o cancelar: ${window.location.href}`)}${negocio.direccion ? `&location=${encodeURIComponent(negocio.direccion)}` : ''}`;

  async function cancelar() {
    setCancelando(true);
    try {
      await cancelarPorCliente(cita);
      avisarBarberia(negocio.id, cita.id);
      recordarMiCita(slug, null, null, cita.id);
      setEstado({ ...estado, cita: { ...cita, estado: 'cancelada', cancelada_por: 'cliente' } });
      setConfirmar(false);
      toast.success('Listo, tu cita quedó cancelada');
    } catch { toast.error('No se pudo cancelar. Escríbele a la barbería.'); }
    setCancelando(false);
  }

  const chip = cancelada ? ['Cancelada', 'bg-rojo-soft text-rojo-dark'] : terminada ? ['Terminada', 'bg-verde-soft text-verde'] : yaPaso ? ['Ya pasó', 'bg-paper text-ink-2'] : cita.estado === 'confirmada' ? ['Confirmada', 'bg-verde-soft text-verde'] : ['Apartada', 'bg-ink text-paper'];

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-paper">
        <div className="poste h-1.5" />
        <div className="mx-auto flex max-w-xl items-center gap-4 px-5 py-6">
          {esPro(negocio) && negocio.logo && <img src={negocio.logo} alt="" className="h-12 w-12 rounded-full border-2 border-paper/80 object-cover" />}
          <Link to={`/r/${slug}`} className="hover:opacity-90">
            <p className="eyebrow text-paper/60">Tu cita en</p>
            <h1 className="display text-4xl leading-none">{negocio.nombre}</h1>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-8">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${chip[1]}`}>{chip[0]}</span>
        <p className={`display mt-3 text-5xl leading-none first-letter:uppercase ${cancelada ? 'text-ink-3 line-through' : ''}`}>{fechaLarga(cita.fecha_hora)}</p>
        <p className={`mt-1 text-2xl font-bold ${cancelada ? 'text-ink-3' : ''}`}>{hora(cita.fecha_hora)}{cita.fin && <span className="font-normal text-ink-3"> a {hora(cita.fin)}</span>}</p>

        <div className="card mt-6 divide-y divide-line">
          {[['Servicio', `${nombreServicio}${cita.precio != null ? ` · ${dinero(cita.precio)}` : ''}`], ['Con', barbero?.nombre || '—'], ['A nombre de', cita.cliente_nombre]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3"><span className="text-ink-3">{k}</span><span className="text-right font-semibold">{v}</span></div>
          ))}
        </div>

        {sePuedeCambiar && (
          <div className="mt-6 grid gap-2">
            <a href={urlCalendario} target="_blank" rel="noreferrer" className="btn-primary py-3"><CalendarPlus size={18} /> Guardar en mi calendario</a>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/r/${slug}?cambiar=${cita.id}`} className="btn-ghost py-3"><CalendarClock size={17} /> Cambiar hora</Link>
              <button onClick={() => setConfirmar(true)} className="btn-ghost py-3 text-rojo"><X size={17} /> Cancelar</button>
            </div>
            {negocio.direccion && <a href={`https://maps.google.com/?q=${encodeURIComponent(negocio.direccion)}`} target="_blank" rel="noreferrer" className="btn-link mt-1 justify-center text-sm"><MapPin size={15} /> Cómo llegar</a>}
          </div>
        )}

        {confirmar && (
          <div className="card mt-4 border-rojo p-4">
            <p className="font-semibold">¿Seguro que quieres cancelar?</p>
            <p className="mt-1 text-sm text-ink-2">Tu hora queda libre para alguien más. Si solo quieres otro horario, mejor cámbiala.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmar(false)} className="btn-ghost">No, la conservo</button>
              <button onClick={cancelar} disabled={cancelando} className="btn-rojo"><Ban size={16} /> {cancelando ? 'Cancelando…' : 'Sí, cancelar'}</button>
            </div>
          </div>
        )}

        {!sePuedeCambiar && (
          <div className="mt-6">
            <p className="text-ink-2">{cancelada ? 'Esta cita ya no está apartada.' : terminada ? '¡Gracias por venir!' : 'Esta cita ya pasó.'}</p>
            <Link to={`/r/${slug}`} className="btn-primary mt-4 w-full py-3"><Check size={18} /> Apartar otra cita</Link>
          </div>
        )}

        {negocio.whatsapp && (
          <a href={linkWhatsApp(negocio.whatsapp, `Hola, tengo una pregunta sobre mi cita del ${fechaLarga(cita.fecha_hora)} a las ${hora(cita.fecha_hora)}.`)} target="_blank" rel="noreferrer" className="btn-link mt-6 justify-center text-sm text-ink-2"><MessageCircle size={15} /> Escribirle a la barbería</a>
        )}
      </main>
    </div>
  );
}
