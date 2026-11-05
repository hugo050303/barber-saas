import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, X, Printer, Package } from 'lucide-react';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero } from '../lib/formato';
import { generarTicketVenta } from '../utils/ticketGenerator';
import { PageHeader, SoloPro, Cargando, Vacio, Modal } from '../components/ui';

export default function Venta() {
  const { pro, negocio } = useSesion();
  const [productos, setProductos] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [q, setQ] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [ultima, setUltima] = useState(null);

  async function cargar() {
    const { data } = await db.from('inventario').select('*').gt('stock', 0).order('nombre');
    setProductos(data || []);
  }
  useEffect(() => { if (pro) cargar(); }, [pro]);

  const lista = useMemo(() => (productos || []).filter((p) => p.nombre.toLowerCase().includes(q.trim().toLowerCase())), [productos, q]);
  const total = carrito.reduce((a, i) => a + i.precio_venta * i.cantidad, 0);

  if (!pro) return <><PageHeader titulo="Caja" /><SoloPro titulo="Cobra productos e imprime ticket">Vende lo que tienes en mostrador, imprime ticket de 58 mm y lleva el registro para tu corte del día.</SoloPro></>;

  const agregar = (p) => {
    const ya = carrito.find((i) => i.id === p.id);
    if (ya && ya.cantidad >= p.stock) return toast.error(`Solo hay ${p.stock} de ${p.nombre}`);
    setCarrito(ya ? carrito.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)) : [...carrito, { ...p, cantidad: 1 }]);
  };

  async function cobrar() {
    setCobrando(true);
    const items = carrito.map(({ id, nombre, precio_venta, cantidad }) => ({ id, nombre, precio_venta, cantidad }));
    const { data, error } = await db.from('ventas_productos').insert([{ total, detalle_items: items }]).select().single();
    if (error) { toast.error('No se pudo registrar la venta.'); setCobrando(false); return; }
    await Promise.all(carrito.map((i) => db.from('inventario').update({ stock: Math.max(0, i.stock - i.cantidad) }).eq('id', i.id)));
    setUltima({ items, total, folio: data.id.slice(0, 8).toUpperCase() });
    setCarrito([]);
    setCobrando(false);
    cargar();
  }

  function imprimir() {
    const url = generarTicketVenta(ultima.items, ultima.total, negocio.nombre, ultima.folio, negocio.direccion, negocio.telefono, negocio.mensaje_ticket);
    const iframe = document.getElementById('iframe-ticket');
    iframe.src = url;
    setTimeout(() => { try { iframe.contentWindow.print(); } catch { window.open(url); } }, 500);
  }

  return (
    <>
      <iframe id="iframe-ticket" className="hidden" title="Ticket" />
      <PageHeader titulo="Caja" sub="Toca un producto para agregarlo a la cuenta." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="input pl-10" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {productos === null ? <Cargando /> : lista.length === 0 ? (
            <Vacio icono={Package} titulo={q ? 'No hay productos con ese nombre' : 'No hay productos con existencia'}>{!q && 'Agrégalos en Inventario.'}</Vacio>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {lista.map((p) => (
                <button key={p.id} onClick={() => agregar(p)} className="card p-3.5 text-left transition hover:border-ink active:translate-y-px">
                  <p className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight">{p.nombre}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-bold">{dinero(p.precio_venta)}</span>
                    <span className={`text-xs ${p.stock <= 3 ? 'font-semibold text-rojo' : 'text-ink-3'}`}>{p.stock} pzs</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="card sticky bottom-3 flex flex-col self-start lg:top-6">
          <p className="border-b border-line px-4 py-3 font-bold">Cuenta</p>
          <div className="max-h-72 flex-1 divide-y divide-line overflow-y-auto">
            {carrito.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-3">Vacía</p>}
            {carrito.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.nombre}</p><p className="text-xs text-ink-3">{i.cantidad} × {dinero(i.precio_venta)}</p></div>
                <span className="text-sm font-semibold">{dinero(i.cantidad * i.precio_venta)}</span>
                <button onClick={() => setCarrito(carrito.filter((x) => x.id !== i.id))} className="text-ink-3 hover:text-rojo" aria-label="Quitar"><X size={16} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <div className="mb-3 flex items-baseline justify-between"><span className="text-ink-2">Total</span><span className="display text-4xl">{dinero(total)}</span></div>
            <button onClick={cobrar} disabled={!carrito.length || cobrando} className="btn-rojo w-full py-3.5 text-base">{cobrando ? 'Cobrando…' : 'Cobrar'}</button>
          </div>
        </aside>
      </div>

      <Modal abierto={!!ultima} onClose={() => setUltima(null)} titulo="Venta registrada" ancho="max-w-sm">
        <p className="text-ink-2">Folio {ultima?.folio}</p>
        <p className="display my-4 text-6xl">{dinero(ultima?.total)}</p>
        <div className="grid gap-2">
          <button onClick={imprimir} className="btn-primary py-3"><Printer size={16} /> Imprimir ticket</button>
          <button onClick={() => setUltima(null)} className="btn-ghost py-3">Nueva venta</button>
        </div>
      </Modal>
    </>
  );
}
