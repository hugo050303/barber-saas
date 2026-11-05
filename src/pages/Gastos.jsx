import { useMemo, useState } from 'react';
import { useSesion } from '../lib/sesion';
import { dinero, fechaCorta, fechaInput, desdeInput } from '../lib/formato';
import { PageHeader, Field, Badge, SoloPro } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';

const CATEGORIAS = ['Renta', 'Luz y agua', 'Insumos', 'Sueldos', 'Mantenimiento', 'Publicidad', 'Otros'];

function Formulario({ inicial, onGuardar }) {
  const [f, setF] = useState({
    descripcion: inicial.descripcion || '', monto: inicial.monto ?? '', categoria: inicial.categoria || 'Insumos',
    fecha: inicial.fecha ? fechaInput(new Date(inicial.fecha)) : fechaInput(),
  });
  const [enviando, setEnviando] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setEnviando(true);
      await onGuardar({ ...f, descripcion: f.descripcion.trim(), fecha: desdeInput(f.fecha).toISOString() });
      setEnviando(false);
    }} className="space-y-4">
      <Field label="Concepto"><input className="input" required maxLength={80} placeholder="Navajas desechables" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto"><input className="input" type="number" min="0" step="0.5" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></Field>
        <Field label="Fecha"><input className="input" type="date" required value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
      </div>
      <Field label="Categoría"><select className="input" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

export default function Gastos() {
  const { pro } = useSesion();
  const [filas, recargar] = useColeccion('gastos', 'fecha', false);
  const delMes = useMemo(() => {
    const hoy = new Date();
    return (filas || []).filter((g) => { const d = new Date(g.fecha); return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear(); })
      .reduce((a, g) => a + (Number(g.monto) || 0), 0);
  }, [filas]);
  if (!pro) return <><PageHeader titulo="Gastos" /><SoloPro titulo="Sabe cuánto te queda de verdad">Anota renta, luz, insumos y sueldos. Se descuentan en el corte del día y en tus reportes del mes.</SoloPro></>;
  return (
    <>
      <PageHeader titulo="Gastos" sub={<>Este mes llevas <b className="text-ink">{dinero(delMes)}</b> en gastos.</>} />
      <Catalogo tabla="gastos" titulo="gasto" textoAgregar="Registrar gasto" filas={filas} recargar={recargar} Formulario={Formulario}
        vacio={{ titulo: 'Sin gastos registrados', texto: 'Anota cada salida de dinero para que tu corte cuadre.' }}
        columnas={[
          { label: 'Fecha', render: (g) => <span className="whitespace-nowrap text-ink-2">{fechaCorta(g.fecha)}</span> },
          { label: 'Concepto', render: (g) => <span className="font-semibold">{g.descripcion}</span> },
          { label: 'Categoría', render: (g) => <Badge>{g.categoria || 'Otros'}</Badge> },
          { label: 'Monto', className: 'text-right', render: (g) => <span className="font-semibold">{dinero(g.monto)}</span> },
        ]} />
    </>
  );
}
