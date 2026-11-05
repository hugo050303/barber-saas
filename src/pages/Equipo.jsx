import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageHeader, Field, Badge } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';
import { useSesion } from '../lib/sesion';
import { LIMITE_BARBEROS_GRATIS } from '../config';

function Formulario({ inicial, onGuardar }) {
  const [f, setF] = useState({ nombre: inicial.nombre || '', especialidad: inicial.especialidad || '', porcentaje_comision: inicial.porcentaje_comision ?? 50, activo: inicial.activo !== false });
  const [enviando, setEnviando] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setEnviando(true); await onGuardar({ ...f, nombre: f.nombre.trim() }); setEnviando(false); }} className="space-y-4">
      <Field label="Nombre"><input className="input" required maxLength={40} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
      <Field label="Especialidad" hint="Opcional. Se ve en tu página de reservas."><input className="input" maxLength={40} placeholder="Fades, barba clásica…" value={f.especialidad} onChange={(e) => setF({ ...f, especialidad: e.target.value })} /></Field>
      <Field label="Comisión por servicio (%)" hint="Se usa para calcular la nómina."><input className="input" type="number" min="0" max="100" value={f.porcentaje_comision} onChange={(e) => setF({ ...f, porcentaje_comision: e.target.value })} /></Field>
      <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-ink" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Recibe citas (desmárcalo si está de vacaciones)</label>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

export default function Equipo() {
  const { pro } = useSesion();
  const [filas, recargar] = useColeccion('barberos');
  const limite = !pro && filas && filas.length >= LIMITE_BARBEROS_GRATIS;
  return (
    <>
      <PageHeader titulo="Equipo" sub="Cada barbero tiene su columna en la agenda y aparece en tu página de reservas." />
      <Catalogo tabla="barberos" titulo="barbero" textoAgregar="Agregar barbero" filas={filas} recargar={recargar} Formulario={Formulario}
        puedeAgregar={!limite}
        bloqueo={<Link to="/app/plan" className="btn-ghost"><Lock size={14} /> Más barberos con Pro</Link>}
        vacio={{ titulo: 'Agrega a tu primer barbero', texto: 'Si trabajas solo, agrégate a ti mismo.' }}
        columnas={[
          { label: 'Nombre', render: (b) => <span className="font-semibold">{b.nombre} {b.activo === false && <Badge>Sin citas</Badge>}</span> },
          { label: 'Especialidad', render: (b) => <span className="text-ink-2">{b.especialidad || '—'}</span> },
          { label: 'Comisión', className: 'text-right', render: (b) => `${b.porcentaje_comision ?? 50}%` },
        ]} />
    </>
  );
}
