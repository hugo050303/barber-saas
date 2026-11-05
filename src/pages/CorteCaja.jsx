import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero, inicioDia, finDia, fechaLarga, fechaCorta, hora } from '../lib/formato';
import { PageHeader, SoloPro, Cargando, Field } from '../components/ui';

export default function CorteCaja() {
  const { pro } = useSesion();
  const [res, setRes] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [fondo, setFondo] = useState('');
  const [contado, setContado] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const hoy = new Date();
    const [c, v, g, h] = await Promise.all([
      db.from('citas').select('servicios(precio)').eq('estado', 'finalizada').gte('fecha_hora', inicioDia(hoy)).lte('fecha_hora', finDia(hoy)),
      db.from('ventas_productos').select('total').gte('fecha', inicioDia(hoy)).lte('fecha', finDia(hoy)),
      db.from('gastos').select('monto').gte('fecha', inicioDia(hoy)).lte('fecha', finDia(hoy)),
      db.from('cortes_caja').select('*').order('fecha', { ascending: false }),
    ]);
    const suma = (arr, f) => (arr || []).reduce((a, x) => a + (Number(f(x)) || 0), 0);
    setRes({
      servicios: suma(c.data, (x) => x.servicios?.precio), nServicios: (c.data || []).length,
      productos: suma(v.data, (x) => x.total), nVentas: (v.data || []).length,
      gastos: suma(g.data, (x) => x.monto),
    });
    setHistorial((h.data || []).slice(0, 10));
  }
  useEffect(() => { if (pro) cargar(); }, [pro]);

  if (!pro) return <><PageHeader titulo="Corte del día" /><SoloPro titulo="Cierra el día sin calculadora">Suma servicios terminados y ventas, resta gastos y te dice cuánto debe haber en el cajón. Si no cuadra, lo ves al momento.</SoloPro></>;
  if (!res) return <><PageHeader titulo="Corte del día" /><Cargando /></>;

  const esperado = (Number(fondo) || 0) + res.servicios + res.productos - res.gastos;
  const diferencia = contado === '' ? null : Number(contado) - esperado;

  async function cerrar() {
    if (!window.confirm('¿Cerrar la caja de hoy? Se guardará en el historial.')) return;
    setGuardando(true);
    const { error } = await db.from('cortes_caja').insert([{
      total_servicios: res.servicios, total_ventas: res.productos, total_gastos: res.gastos,
      fondo: Number(fondo) || 0, dinero_en_caja: esperado,
      contado: contado === '' ? null : Number(contado), diferencia,
    }]);
    setGuardando(false);
    if (error) return toast.error('No se pudo guardar el corte.');
    toast.success('Corte guardado');
    setContado(''); cargar();
  }

  const fila = (label, valor, nota, signo = '') => (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <span><span className="font-medium">{label}</span>{nota && <span className="ml-2 text-sm text-ink-3">{nota}</span>}</span>
      <span className="font-semibold">{signo}{dinero(valor)}</span>
    </div>
  );

  return (
    <>
      <PageHeader titulo="Corte del día" sub={<span className="first-letter:uppercase">{fechaLarga(new Date())}</span>} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card divide-y divide-line">
          {fila('Servicios terminados', res.servicios, `${res.nServicios}`)}
          {fila('Venta de productos', res.productos, `${res.nVentas} tickets`)}
          {fila('Gastos de hoy', res.gastos, null, '− ')}
          <div className="px-5 py-3.5">
            <Field label="Fondo con el que abriste"><input className="input" type="number" min="0" placeholder="0" value={fondo} onChange={(e) => setFondo(e.target.value)} /></Field>
          </div>
          <div className="flex items-baseline justify-between bg-ink px-5 py-5 text-paper">
            <span className="font-semibold">Debe haber en caja</span>
            <span className="display text-5xl">{dinero(esperado)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <Field label="¿Cuánto contaste?" hint="Cuenta el efectivo y lo de terminal/transferencias del día."><input className="input text-lg" type="number" min="0" value={contado} onChange={(e) => setContado(e.target.value)} /></Field>
            {diferencia !== null && (
              <p className={`mt-4 rounded px-3 py-2.5 font-semibold ${Math.abs(diferencia) < 1 ? 'bg-verde-soft text-verde' : diferencia > 0 ? 'bg-ambar-soft text-ambar' : 'bg-rojo-soft text-rojo-dark'}`}>
                {Math.abs(diferencia) < 1 ? 'Cuadra exacto.' : diferencia > 0 ? `Sobran ${dinero(diferencia)}` : `Faltan ${dinero(-diferencia)}`}
              </p>
            )}
            <button onClick={cerrar} disabled={guardando} className="btn-rojo mt-4 w-full py-3">{guardando ? 'Guardando…' : 'Cerrar caja'}</button>
          </div>

          {historial.length > 0 && (
            <div className="card">
              <p className="border-b border-line px-4 py-3 font-bold">Cortes anteriores</p>
              <div className="divide-y divide-line">
                {historial.map((c) => (
                  <div key={c.id} className="flex items-baseline justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink-2">{fechaCorta(c.fecha)} · {hora(c.fecha)}</span>
                    <span className="font-semibold">{dinero(c.dinero_en_caja)}{typeof c.diferencia === 'number' && Math.abs(c.diferencia) >= 1 && <span className={`ml-2 text-xs ${c.diferencia > 0 ? 'text-ambar' : 'text-rojo'}`}>{c.diferencia > 0 ? '+' : ''}{dinero(c.diferencia)}</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
