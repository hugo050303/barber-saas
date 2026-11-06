import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageHeader, Field, Badge } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';
import { useSesion } from '../lib/sesion';
import { DIAS_CORTOS, ORDEN_SEMANA } from '../lib/horario';
import { Interruptor } from '../components/EditorHorario';
import toast from 'react-hot-toast';
import { idParaNuevoBarbero } from '../lib/negocio';
import { db, negocioId } from '../db';
import { FotoUnica } from '../components/Fotos';
import { PLANES, SLOTS_BARBEROS, FOTOS_ACTIVAS } from '../config';

// "Todos" o los nombres de los servicios que hace
function textoServicios(b, servicios) {
  if (!Array.isArray(b.servicios)) return 'Todos';
  const nombres = (servicios || []).filter((s) => b.servicios.includes(s.id)).map((s) => s.nombre);
  return nombres.length > 2 ? `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más` : nombres.join(', ') || '—';
}
const barberosPermitidos = (plan) => (plan === 'pro' ? SLOTS_BARBEROS : SLOTS_BARBEROS.slice(0, 1));

function Formulario({ inicial, onGuardar, conFotos, servicios = [] }) {
  const [foto, setFoto] = useState(inicial.foto || null);
  const [f, setF] = useState({
    nombre: inicial.nombre || '', especialidad: inicial.especialidad || '',
    porcentaje_comision: inicial.porcentaje_comision ?? 50, activo: inicial.activo !== false,
    // null = hace todos los servicios; si no, la lista de los que sí hace
    servicios: Array.isArray(inicial.servicios) ? (servicios.length ? inicial.servicios.filter((id) => servicios.some((s) => s.id === id)) : inicial.servicios) : null,
  });
  const [enviando, setEnviando] = useState(false);
  const todos = f.servicios === null;
  const toggle = (id) => setF({ ...f, servicios: f.servicios.includes(id) ? f.servicios.filter((x) => x !== id) : [...f.servicios, id] });
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!todos && !f.servicios.length) return toast.error('Elige al menos un servicio que haga, o marca «Hace todos los servicios».');
      setEnviando(true);
      await onGuardar({ ...f, nombre: f.nombre.trim(), porcentaje_comision: Number(f.porcentaje_comision) || 0 });
      setEnviando(false);
    }} className="space-y-4">
      {conFotos && inicial.id && (
        <FotoUnica url={foto} ruta={`negocios/${negocioId()}/barberos/${inicial.id}`} etiqueta="Foto del barbero" forma="redonda"
          opciones={{ ladoMax: 400, cuadrada: true }}
          onCambio={async (url) => { await db.from('barberos').update({ foto: url }).eq('id', inicial.id); setFoto(url); }} />
      )}
      <Field label="Nombre"><input className="input" required maxLength={40} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
      <Field label="Especialidad" hint="Opcional. Se ve en tu página de reservas."><input className="input" maxLength={40} placeholder="Fades, barba clásica…" value={f.especialidad} onChange={(e) => setF({ ...f, especialidad: e.target.value })} /></Field>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Servicios que hace</p>
        <label className="flex items-center gap-3 text-sm">
          <Interruptor activo={todos} label="Hace todos los servicios" onChange={(v) => setF({ ...f, servicios: v ? null : servicios.map((s) => s.id) })} />
          Hace todos los servicios
        </label>
        {!todos && (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {servicios.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center gap-2.5 rounded border px-3 py-2 text-sm ${f.servicios.includes(s.id) ? 'border-ink bg-card' : 'border-line text-ink-3'}`}>
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={f.servicios.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="flex-1 truncate">{s.nombre}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-ink-3">{todos ? 'Tus clientes lo pueden elegir para cualquier servicio.' : 'En tu página de reservas solo aparece para estos servicios.'}</p>
      </div>
      <p className="rounded bg-paper px-3 py-2.5 text-xs text-ink-2">Sus días de descanso y su horario se ajustan en <Link to="/app/horarios" className="font-semibold text-ink underline">Horarios</Link>.</p>
      <Field label="Comisión por servicio (%)" hint="Se usa para calcular la nómina."><input className="input" type="number" min="0" max="100" value={f.porcentaje_comision} onChange={(e) => setF({ ...f, porcentaje_comision: e.target.value })} /></Field>
      <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Recibe citas (desmárcalo si está de vacaciones)</label>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

export default function Equipo() {
  const { pro, plan, negocio } = useSesion();
  const [filas, recargar] = useColeccion('barberos');
  const [servicios] = useColeccion('servicios', 'nombre');
  // Cada plan tiene lugares fijos para sus barberos (las reglas de seguridad solo permiten esos ids)
  const idNuevo = filas ? idParaNuevoBarbero(negocio, filas) : undefined;
  const limite = idNuevo === null;
  const max = PLANES[plan].barberos;
  return (
    <>
      <PageHeader titulo="Equipo" sub={`Cada barbero tiene su columna en la agenda y aparece en tu página de reservas. Tu plan ${PLANES[plan].nombre} incluye ${max === Infinity ? 'barberos ilimitados' : max === 1 ? '1 barbero' : `hasta ${max} barberos`}.`} />
      <Catalogo tabla="barberos" titulo="barbero" textoAgregar="Agregar barbero" filas={filas} recargar={recargar} Formulario={Formulario} anchoModal="max-w-xl" formProps={{ conFotos: pro && FOTOS_ACTIVAS, servicios: servicios || [] }}
        puedeAgregar={!limite} idNuevo={idNuevo || undefined}
        bloqueo={<Link to="/app/plan" className="btn-ghost"><Lock size={14} /> {plan === 'gratis' ? 'Más barberos con Pro' : 'Barberos ilimitados con Plus'}</Link>}
        vacio={{ titulo: 'Agrega a tu primer barbero', texto: 'Si trabajas solo, agrégate a ti mismo.' }}
        columnas={[
          { label: 'Nombre', render: (b) => (
            <span className="flex items-center gap-2.5 font-semibold">
              {b.foto ? <img src={b.foto} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-sm text-ink-2">{b.nombre?.[0]}</span>}
              {b.nombre} {b.activo === false && <Badge>Sin citas</Badge>}{b.horarioPropio && <Badge>Horario propio</Badge>}
              {!barberosPermitidos(plan).includes(b.id) && plan !== 'plus' && <Badge tono="ambar">Fuera de tu plan</Badge>}
            </span>) },
          { label: 'Servicios', render: (b) => <span className="text-ink-2">{textoServicios(b, servicios)}</span> },
          { label: 'Descansa', render: (b) => <span className="text-ink-2">{b.diasLibres?.length ? ORDEN_SEMANA.filter((d) => b.diasLibres.includes(d)).map((d) => DIAS_CORTOS[d]).join(', ') : '—'}</span> },
          { label: 'Comisión', className: 'text-right', render: (b) => `${b.porcentaje_comision ?? 50}%` },
        ]} />
    </>
  );
}
