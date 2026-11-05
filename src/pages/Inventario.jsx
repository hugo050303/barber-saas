import { useState } from 'react';
import toast from 'react-hot-toast';
import { Minus, Plus } from 'lucide-react';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero } from '../lib/formato';
import { PageHeader, Field, Badge, SoloPro } from '../components/ui';
import { Catalogo, useColeccion } from '../components/Catalogo';

function Formulario({ inicial, onGuardar }) {
  const [f, setF] = useState({ nombre: inicial.nombre || '', precio_venta: inicial.precio_venta ?? '', stock: inicial.stock ?? '' });
  const [enviando, setEnviando] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setEnviando(true); await onGuardar({ ...f, nombre: f.nombre.trim() }); setEnviando(false); }} className="space-y-4">
      <Field label="Producto"><input className="input" required maxLength={60} placeholder="Cera mate 100 g" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio de venta"><input className="input" type="number" min="0" step="0.5" required value={f.precio_venta} onChange={(e) => setF({ ...f, precio_venta: e.target.value })} /></Field>
        <Field label="Piezas en existencia"><input className="input" type="number" min="0" step="1" required value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></Field>
      </div>
      <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
    </form>
  );
}

function Ajuste({ p, onCambio }) {
  const ajustar = async (n) => {
    const nuevo = Math.max(0, (Number(p.stock) || 0) + n);
    const { error } = await db.from('inventario').update({ stock: nuevo }).eq('id', p.id);
    if (error) toast.error('No se pudo ajustar.'); else onCambio();
  };
  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={() => ajustar(-1)} className="rounded border border-line p-1 hover:border-ink" aria-label="Quitar una"><Minus size={14} /></button>
      <span className={`w-10 text-center font-bold ${p.stock <= 3 ? 'text-rojo' : ''}`}>{p.stock}</span>
      <button onClick={() => ajustar(1)} className="rounded border border-line p-1 hover:border-ink" aria-label="Agregar una"><Plus size={14} /></button>
    </span>
  );
}

export default function Inventario() {
  const { pro } = useSesion();
  const [filas, recargar] = useColeccion('inventario');
  if (!pro) return <><PageHeader titulo="Inventario" /><SoloPro titulo="Controla lo que vendes en mostrador">Registra ceras, aceites y demás productos. Las existencias bajan solas con cada venta en Caja y te avisamos cuando queden pocas.</SoloPro></>;
  return (
    <>
      <PageHeader titulo="Inventario" sub="Productos que vendes en mostrador. Las existencias bajan solas al cobrar en Caja." />
      <Catalogo tabla="inventario" titulo="producto" textoAgregar="Agregar producto" filas={filas} recargar={recargar} Formulario={Formulario}
        vacio={{ titulo: 'Sin productos todavía', texto: 'Agrega lo que vendes: ceras, aceites, shampoo.' }}
        columnas={[
          { label: 'Producto', render: (p) => <span className="font-semibold">{p.nombre} {p.stock <= 3 && <Badge tono="rojo">{p.stock === 0 ? 'Agotado' : 'Quedan pocos'}</Badge>}</span> },
          { label: 'Precio', className: 'text-right', render: (p) => dinero(p.precio_venta) },
          { label: 'Existencia', className: 'text-center', render: (p) => <Ajuste p={p} onCambio={recargar} /> },
        ]} />
    </>
  );
}
