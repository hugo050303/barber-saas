import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageHeader, Field, Badge } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';
import { useSesion } from '../lib/sesion';
import { DIAS_CORTOS, NOMBRES_DIA, ORDEN_SEMANA, normalizarHorario, normalizarDias, validarTurnos } from '../lib/horario';
import { EditorTurnos, Interruptor } from '../components/EditorHorario';
import toast from 'react-hot-toast';
import { idParaNuevoBarbero } from '../lib/negocio';
import { db, negocioId } from '../db';
import { FotoUnica } from '../components/Fotos';
import { PLANES, SLOTS_BARBEROS, FOTOS_ACTIVAS } from '../config';

const ORDEN_DIAS = ORDEN_SEMANA;
const barberosPermitidos = (plan) => (plan === 'pro' ? SLOTS_BARBEROS : SLOTS_BARBEROS.slice(0, 1));

function Formulario({ inicial, onGuardar, conFotos, horarioBarberia }) {
  const [foto, setFoto] = useState(inicial.foto || null);
  // Horario propio: si está apagado, el barbero usa el horario de la barbería
  const [propio, setPropio] = useState(inicial.horarioPropio?.dias ? normalizarDias(inicial.horarioPropio.dias) : null);
  const [f, setF] = useState({
    nombre: inicial.nombre || '', especialidad: inicial.especialidad || '',
    porcentaje_comision: inicial.porcentaje_comision ?? 50, activo: inicial.activo !== false, diasLibres: inicial.diasLibres || [],
  });
  const [enviando, setEnviando] = useState(false);
  const toggle = (d) => setF({ ...f, diasLibres: f.diasLibres.includes(d) ? f.diasLibres.filter((x) => x !== d) : [...f.diasLibres, d] });
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (propio) {
        for (const d of ORDEN_SEMANA) { const error = propio[d] && validarTurnos(propio[d].turnos, NOMBRES_DIA[d]); if (error) return toast.error(error); }
        if (!ORDEN_SEMANA.some((d) => propio[d])) return toast.error('Su horario propio debe tener al menos un día abierto.');
      }
      setEnviando(true);
      await onGuardar({ ...f, nombre: f.nombre.trim(), porcentaje_comision: Number(f.porcentaje_comision) || 0, horarioPropio: propio ? { dias: propio } : null });
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
        <p className="mb-1.5 text-sm font-semibold">Días de descanso</p>
        <div className="flex flex-wrap gap-1.5">
          {ORDEN_DIAS.map((d) => (
            <button type="button" key={d} onClick={() => toggle(d)}
              className={`w-12 rounded border py-2 text-sm font-semibold ${f.diasLibres.includes(d) ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-3'}`}>{DIAS_CORTOS[d]}</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-3">Esos días no se le ofrecen citas en línea. Para vacaciones o un día suelto usa «Bloquear horas» en la Agenda.</p>
      </div>
      <div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <Interruptor activo={!!propio} label="Horario propio" onChange={(v) => setPropio(v ? normalizarHorario(horarioBarberia).dias : null)} />
          Tiene su propio horario
        </label>
        <p className="mt-1 text-xs text-ink-3">{propio ? 'Solo se le ofrecen citas en estos turnos.' : 'Usa el horario de la barbería.'}</p>
        {propio && <div className="mt-3"><EditorTurnos dias={propio} onChange={setPropio} etiqueta=" (barbero)" /></div>}
      </div>
      <Field label="Comisión por servicio (%)" hint="Se usa para calcular la nómina."><input className="input" type="number" min="0" max="100" value={f.porcentaje_comision} onChange={(e) => setF({ ...f, porcentaje_comision: e.target.value })} /></Field>
      <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Recibe citas (desmárcalo si está de vacaciones)</label>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

export default function Equipo() {
  const { pro, plan, negocio } = useSesion();
  const [filas, recargar] = useColeccion('barberos');
  // Cada plan tiene lugares fijos para sus barberos (las reglas de seguridad solo permiten esos ids)
  const idNuevo = filas ? idParaNuevoBarbero(negocio, filas) : undefined;
  const limite = idNuevo === null;
  const max = PLANES[plan].barberos;
  return (
    <>
      <PageHeader titulo="Equipo" sub={`Cada barbero tiene su columna en la agenda y aparece en tu página de reservas. Tu plan ${PLANES[plan].nombre} incluye ${max === Infinity ? 'barberos ilimitados' : max === 1 ? '1 barbero' : `hasta ${max} barberos`}.`} />
      <Catalogo tabla="barberos" titulo="barbero" textoAgregar="Agregar barbero" filas={filas} recargar={recargar} Formulario={Formulario} anchoModal="max-w-xl" formProps={{ conFotos: pro && FOTOS_ACTIVAS, horarioBarberia: negocio.horario }}
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
          { label: 'Descansa', render: (b) => <span className="text-ink-2">{b.diasLibres?.length ? ORDEN_DIAS.filter((d) => b.diasLibres.includes(d)).map((d) => DIAS_CORTOS[d]).join(', ') : '—'}</span> },
          { label: 'Comisión', className: 'text-right', render: (b) => `${b.porcentaje_comision ?? 50}%` },
        ]} />
    </>
  );
}
