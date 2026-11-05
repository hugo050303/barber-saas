import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero, fechaInput, desdeInput, inicioDia, finDia } from '../lib/formato';
import { PageHeader, SoloPro, Cargando, Vacio, Field } from '../components/ui';

function rango(tipo) {
  const hoy = new Date();
  if (tipo === 'semana') {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return [fechaInput(lunes), fechaInput(hoy)];
  }
  return [fechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fechaInput(hoy)];
}

export default function Nomina() {
  const { pro } = useSesion();
  const [desde, setDesde] = useState(() => rango('semana')[0]);
  const [hasta, setHasta] = useState(() => rango('semana')[1]);
  const [filas, setFilas] = useState(null);

  async function calcular() {
    setFilas(null);
    const [b, c] = await Promise.all([
      db.from('barberos').select('*').order('nombre'),
      db.from('citas').select('barbero_id, servicios(precio)').eq('estado', 'finalizada').gte('fecha_hora', inicioDia(desdeInput(desde))).lte('fecha_hora', finDia(desdeInput(hasta))),
    ]);
    setFilas((b.data || []).map((barbero) => {
      const suyas = (c.data || []).filter((x) => x.barbero_id === barbero.id);
      const vendido = suyas.reduce((a, x) => a + (Number(x.servicios?.precio) || 0), 0);
      const pct = Number(barbero.porcentaje_comision ?? 50);
      return { ...barbero, pct, servicios: suyas.length, vendido, pago: (vendido * pct) / 100 };
    }));
  }
  useEffect(() => { if (pro) calcular(); }, [pro, desde, hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pro) return <><PageHeader titulo="Nómina" /><SoloPro titulo="Paga comisiones sin pelearte con la calculadora">Pon el porcentaje de cada barbero y te decimos cuánto le toca por los servicios terminados de la semana o del mes.</SoloPro></>;

  async function cambiarPct(b, valor) {
    const pct = Math.min(100, Math.max(0, Number(valor) || 0));
    const { error } = await db.from('barberos').update({ porcentaje_comision: pct }).eq('id', b.id);
    if (error) return toast.error('No se pudo guardar el porcentaje.');
    calcular();
  }

  const totales = (filas || []).reduce((a, f) => ({ vendido: a.vendido + f.vendido, pago: a.pago + f.pago }), { vendido: 0, pago: 0 });

  return (
    <>
      <PageHeader titulo="Nómina" sub="Comisiones por servicios terminados. El porcentaje se guarda al salir de la casilla.">
        <button onClick={() => { const [a, b] = rango('semana'); setDesde(a); setHasta(b); }} className="btn-ghost">Esta semana</button>
        <button onClick={() => { const [a, b] = rango('mes'); setDesde(a); setHasta(b); }} className="btn-ghost">Este mes</button>
      </PageHeader>
      <div className="mb-6 grid max-w-md grid-cols-2 gap-3">
        <Field label="Desde"><input className="input" type="date" value={desde} onChange={(e) => e.target.value && setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input className="input" type="date" value={hasta} onChange={(e) => e.target.value && setHasta(e.target.value)} /></Field>
      </div>
      {filas === null ? <Cargando texto="Calculando…" /> : filas.length === 0 ? <Vacio titulo="No hay barberos registrados" /> : (
        <div className="card overflow-x-auto">
          <table className="tabla w-full min-w-[560px]">
            <thead><tr><th>Barbero</th><th className="text-right">Servicios</th><th className="text-right">Vendido</th><th className="text-right">Comisión</th><th className="text-right">A pagar</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="font-semibold">{f.nombre}</td>
                  <td className="text-right">{f.servicios}</td>
                  <td className="text-right">{dinero(f.vendido)}</td>
                  <td className="text-right">
                    <input type="number" min="0" max="100" defaultValue={f.pct} key={`${f.id}-${f.pct}`} onBlur={(e) => Number(e.target.value) !== f.pct && cambiarPct(f, e.target.value)}
                      className="w-16 rounded border border-line bg-card px-2 py-1 text-right outline-none focus:border-ink" /> %
                  </td>
                  <td className="text-right text-lg font-bold">{dinero(f.pago)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-paper font-semibold">
                <td className="border-t border-line px-4 py-3">Total</td><td className="border-t border-line" />
                <td className="border-t border-line px-4 py-3 text-right">{dinero(totales.vendido)}</td><td className="border-t border-line" />
                <td className="border-t border-line px-4 py-3 text-right text-lg">{dinero(totales.pago)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-line px-4 py-3 text-sm text-ink-2">Le queda al negocio: <b className="text-ink">{dinero(totales.vendido - totales.pago)}</b></p>
        </div>
      )}
    </>
  );
}
