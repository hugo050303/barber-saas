import { useState } from 'react';
import { PageHeader, Field } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';
import { dinero } from '../lib/formato';

const DURACIONES = [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180];

function Formulario({ inicial, onGuardar }) {
  const [f, setF] = useState({ nombre: inicial.nombre || '', precio: inicial.precio ?? '', duracion_min: inicial.duracion_min || 30 });
  const [enviando, setEnviando] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setEnviando(true); await onGuardar({ ...f, nombre: f.nombre.trim() }); setEnviando(false); }} className="space-y-4">
      <Field label="Nombre"><input className="input" required maxLength={50} placeholder="Corte y barba" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio (MXN)"><input className="input" type="number" min="0" step="1" required value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Field>
        <Field label="Duración"><select className="input" value={f.duracion_min} onChange={(e) => setF({ ...f, duracion_min: Number(e.target.value) })}>{DURACIONES.map((d) => <option key={d} value={d}>{d} min</option>)}</select></Field>
      </div>
      <p className="text-xs text-ink-3">La duración define qué horarios se ofrecen en tu página de reservas.</p>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

export default function Servicios() {
  const [filas, recargar] = useColeccion('servicios');
  return (
    <>
      <PageHeader titulo="Servicios" sub="Lo que ofreces, cuánto cuesta y cuánto tarda. Es lo que ven tus clientes al reservar." />
      <Catalogo tabla="servicios" titulo="servicio" textoAgregar="Agregar servicio" filas={filas} recargar={recargar} Formulario={Formulario}
        vacio={{ titulo: 'Aún no tienes servicios', texto: 'Empieza con los básicos: corte, barba, corte y barba.' }}
        columnas={[
          { label: 'Servicio', render: (s) => <span className="font-semibold">{s.nombre}</span> },
          { label: 'Duración', render: (s) => `${s.duracion_min || 30} min` },
          { label: 'Precio', className: 'text-right', render: (s) => <span className="font-semibold">{dinero(s.precio)}</span> },
        ]} />
    </>
  );
}
