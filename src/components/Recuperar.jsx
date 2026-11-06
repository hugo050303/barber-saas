// Clientes por recuperar: los que no vienen hace N días y no tienen cita próxima.
// Un toque manda un WhatsApp con el link de reservas; se marca a quién ya le escribiste y
// se cuenta cuántos regresaron después del mensaje.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Pencil, HeartHandshake, Check } from 'lucide-react';
import { db } from '../db';
import { guardarCliente, actualizarNegocio } from '../lib/negocio';
import { dinero, linkWhatsApp } from '../lib/formato';
import { Cargando, Vacio, Badge } from './ui';

const MENSAJE_RECUPERAR = '¡Hola {nombre}! 👋 Hace rato no te vemos por {barberia}. ¿Te apartamos tu lugar? Elige tu hora aquí: {link}';
const RANGOS = [30, 45, 60, 90];
const DIA = 86400000;
const RECIENTE = 14; // días en los que "ya le escribiste" cuenta como reciente
const textoEscrito = (d) => (d <= 0 ? 'Le escribiste hoy' : `Le escribiste hace ${d} ${d === 1 ? 'día' : 'días'}`);

const armarMensaje = (plantilla, { nombre, barberia, link }) => (plantilla || MENSAJE_RECUPERAR)
  .replaceAll('{nombre}', String(nombre || '').trim().split(/\s+/)[0] || '')
  .replaceAll('{barberia}', barberia).replaceAll('{link}', link);

export default function Recuperar({ negocio, onEditar }) {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null); // { clientes, conCita: Set, regresaron }
  const [editando, setEditando] = useState(false);
  const [plantilla, setPlantilla] = useState(negocio.mensaje_recuperar || MENSAJE_RECUPERAR);
  const [ahora] = useState(() => Date.now());
  const link = `${window.location.origin}/r/${negocio.slug}`;

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    const hace = (n) => new Date(ahora - n * DIA).toISOString();
    Promise.all([
      db.from('clientes').select('*').lte('ultima', hace(dias)).order('ultima', { ascending: false }).limit(200),
      db.from('citas').select('*').gte('fecha_hora', new Date(ahora).toISOString()),
      db.from('clientes').select('*').gte('recuperar_enviado', hace(60)).limit(200),
    ]).then(([c, citas, escritos]) => {
      if (!vigente) return;
      if (c.error) toast.error('No se pudieron cargar los clientes.');
      const conCita = new Set((citas.data || []).filter((x) => x.estado !== 'cancelada').map((x) => x.cliente_telefono));
      // Regresaron: les escribiste y después vinieron o ya tienen cita
      const regresaron = (escritos.data || []).filter((x) => (x.ultima && x.ultima > x.recuperar_enviado) || conCita.has(x.telefono)).length;
      setDatos({ clientes: (c.data || []).filter((x) => !conCita.has(x.telefono)), regresaron });
    });
    return () => { vigente = false; };
  }, [dias, ahora]);

  const diasDesde = (iso) => Math.floor((ahora - new Date(iso)) / DIA);
  const escritoReciente = (c) => c.recuperar_enviado && diasDesde(c.recuperar_enviado) < RECIENTE;
  // Primero a quienes no les has escrito
  const lista = datos ? [...datos.clientes].sort((a, b) => Number(!!escritoReciente(a)) - Number(!!escritoReciente(b))) : [];
  const ticket = (c) => (c.visitas ? (Number(c.gastado) || 0) / c.visitas : 0);
  const valor = lista.reduce((a, c) => a + ticket(c), 0);
  const pendientes = lista.filter((c) => !escritoReciente(c)).length;

  async function marcar(c) {
    const cuando = new Date().toISOString();
    setDatos((d) => ({ ...d, clientes: d.clientes.map((x) => (x.id === c.id ? { ...x, recuperar_enviado: cuando } : x)) }));
    try { await guardarCliente(c.id, { recuperar_enviado: cuando }, { fusionar: true }); } catch { /* solo es una marca */ }
  }
  async function guardarPlantilla() {
    if (!plantilla.includes('{link}')) return toast.error('Deja {link} en el mensaje para que puedan apartar.');
    try { await actualizarNegocio(negocio.id, { mensaje_recuperar: plantilla.trim() }); toast.success('Mensaje guardado'); setEditando(false); }
    catch { toast.error('No se pudo guardar el mensaje.'); }
  }

  return (
    <div>
      {/* Resumen */}
      <div className="card mb-4 overflow-hidden">
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <div className="bg-ink px-4 py-4 text-paper">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-paper/60">Por recuperar</p>
            <p className="display text-4xl leading-tight">{datos ? lista.length : '—'}</p>
            <p className="text-xs text-paper/70">{pendientes} sin mensaje reciente</p>
          </div>
          <div className="bg-card px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Si regresan</p>
            <p className="display text-4xl leading-tight">{datos ? dinero(valor) : '—'}</p>
            <p className="text-xs text-ink-2">en una visita de cada uno</p>
          </div>
          <div className="bg-card px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Regresaron</p>
            <p className="display text-4xl leading-tight text-verde">{datos ? datos.regresaron : '—'}</p>
            <p className="text-xs text-ink-2">después de tu mensaje (60 días)</p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-ink-2">No vienen hace más de</span>
          {RANGOS.map((n) => (
            <button key={n} onClick={() => setDias(n)} aria-pressed={dias === n}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${dias === n ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>{n} días</button>
          ))}
        </div>
        <button onClick={() => setEditando(!editando)} className="btn-link text-sm"><Pencil size={14} /> {editando ? 'Cerrar mensaje' : 'Editar mensaje'}</button>
      </div>

      {editando && (
        <div className="card mb-4 p-4">
          <p className="text-sm font-semibold">Mensaje de WhatsApp</p>
          <p className="mt-0.5 text-xs text-ink-3">Usa <b>{'{nombre}'}</b>, <b>{'{barberia}'}</b> y <b>{'{link}'}</b>: se cambian solos por cada cliente.</p>
          <textarea className="input mt-2 h-24 resize-none text-sm" maxLength={400} value={plantilla} onChange={(e) => setPlantilla(e.target.value)} />
          <p className="mt-2 rounded bg-paper px-3 py-2 text-sm text-ink-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Así se ve: </span>{armarMensaje(plantilla, { nombre: lista[0]?.nombre || 'Juan Pérez', barberia: negocio.nombre, link })}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={guardarPlantilla} className="btn-primary">Guardar mensaje</button>
            <button onClick={() => setPlantilla(MENSAJE_RECUPERAR)} className="btn-ghost">Usar el de siempre</button>
          </div>
        </div>
      )}

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={HeartHandshake} titulo={`Nadie lleva más de ${dias} días sin venir`}>Tus clientes están regresando. Cuando alguien se tarde, aparecerá aquí para que le escribas.</Vacio>
      ) : (
        <div className="card divide-y divide-line">
          {lista.map((c) => {
            const hace = diasDesde(c.ultima);
            const escrito = escritoReciente(c);
            const mensaje = armarMensaje(negocio.mensaje_recuperar || MENSAJE_RECUPERAR, { nombre: c.nombre, barberia: negocio.nombre, link });
            return (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3.5 ${escrito ? 'bg-paper/50' : ''}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${escrito ? 'bg-line text-ink-3' : 'bg-ambar-soft text-ambar'}`}>{c.nombre?.[0]}</span>
                <button onClick={() => onEditar(c)} className="min-w-0 flex-1 text-left">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{c.nombre}{escrito && <Badge tono="verde"><Check size={10} /> {textoEscrito(diasDesde(c.recuperar_enviado))}</Badge>}</p>
                  <p className="text-sm text-ink-3">Hace <b className="text-ink-2">{hace} días</b> · {c.visitas || 0} {c.visitas === 1 ? 'visita' : 'visitas'}{ticket(c) > 0 && ` · ${dinero(ticket(c))} por visita`}</p>
                </button>
                <a href={linkWhatsApp(c.telefono, mensaje)} target="_blank" rel="noreferrer" onClick={() => marcar(c)}
                  className={`${escrito ? 'btn-ghost' : 'btn-primary'} shrink-0 px-3 py-2 text-sm`} aria-label={`Escribirle a ${c.nombre}`}>
                  <MessageCircle size={16} /><span className="hidden sm:inline">{escrito ? 'Otra vez' : 'Escribirle'}</span>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
