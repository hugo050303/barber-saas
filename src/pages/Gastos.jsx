import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero, fechaCorta, hoyYmd, enZona, mesActual, sumarMeses, rangoMes, nombreMes } from '../lib/formato';
import { PageHeader, Field, Badge, SoloPro } from '../components/ui';
import { Catalogo } from '../components/Catalogo';

const CATEGORIAS = ['Renta', 'Luz y agua', 'Insumos', 'Sueldos', 'Mantenimiento', 'Publicidad', 'Otros'];

function Formulario({ inicial, onGuardar }) {
  const [f, setF] = useState({
    descripcion: inicial.descripcion || '', monto: inicial.monto ?? '', categoria: inicial.categoria || 'Insumos',
    fecha: inicial.fecha ? hoyYmd(new Date(inicial.fecha)) : hoyYmd(),
  });
  const [enviando, setEnviando] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setEnviando(true);
      await onGuardar({ ...f, descripcion: f.descripcion.trim(), fecha: enZona(f.fecha, '12:00').toISOString() });
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
  const [mes, setMes] = useState(() => mesActual());
  const [filas, setFilas] = useState(null);

  // Solo se leen los gastos del mes que estás viendo
  const recargar = useCallback(async () => {
    const [ini, fin] = rangoMes(mes);
    const { data, error } = await db.from('gastos').select('*').gte('fecha', ini).lte('fecha', fin).order('fecha', { ascending: false });
    if (error) toast.error('No se pudieron cargar los gastos.');
    setFilas(data || []);
  }, [mes]);
  useEffect(() => { if (pro) recargar(); }, [pro, recargar]);

  if (!pro) return <><PageHeader titulo="Gastos" /><SoloPro titulo="Sabe cuánto te queda de verdad">Anota renta, luz, insumos y sueldos. Se descuentan en el corte del día y en tus reportes del mes.</SoloPro></>;
  const total = (filas || []).reduce((a, g) => a + (Number(g.monto) || 0), 0);
  return (
    <>
      <PageHeader titulo="Gastos" sub={<><span className="capitalize">{nombreMes(mes)}</span>: <b className="text-ink">{dinero(total)}</b></>}>
        <div className="flex rounded border border-line bg-card">
          <button onClick={() => { setFilas(null); setMes(sumarMeses(mes, -1)); }} className="p-2.5 hover:bg-paper" aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <button onClick={() => { setFilas(null); setMes(sumarMeses(mes, 1)); }} disabled={mes === mesActual()} className="p-2.5 hover:bg-paper disabled:opacity-30" aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
      </PageHeader>
      <Catalogo tabla="gastos" titulo="gasto" textoAgregar="Registrar gasto" filas={filas} recargar={recargar} Formulario={Formulario}
        vacio={{ titulo: 'Sin gastos este mes', texto: 'Anota cada salida de dinero para que tu corte cuadre.' }}
        columnas={[
          { label: 'Fecha', render: (g) => <span className="whitespace-nowrap text-ink-2">{fechaCorta(g.fecha)}</span> },
          { label: 'Concepto', render: (g) => <span className="font-semibold">{g.descripcion}</span> },
          { label: 'Categoría', render: (g) => <Badge>{g.categoria || 'Otros'}</Badge> },
          { label: 'Monto', className: 'text-right', render: (g) => <span className="font-semibold">{dinero(g.monto)}</span> },
        ]} />
    </>
  );
}
