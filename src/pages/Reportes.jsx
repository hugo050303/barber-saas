import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero, mesActual, sumarMeses, rangoMes, diasDelMes, nombreMes as nombreDelMes, partesZona } from '../lib/formato';
import { PageHeader, SoloPro, Cargando, Stat } from '../components/ui';

export default function Reportes() {
  const { pro } = useSesion();
  const [mes, setMes] = useState(() => mesActual());
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    if (!pro) return;
    (async () => {
      setDatos(null);
      const [ini, fin] = rangoMes(mes);
      const [c, v, g] = await Promise.all([
        db.from('citas').select('fecha_hora, estado, origen, precio, servicio_id, servicios(nombre, precio)').gte('fecha_hora', ini).lte('fecha_hora', fin),
        db.from('ventas_productos').select('total, fecha').gte('fecha', ini).lte('fecha', fin),
        db.from('gastos').select('monto, fecha').gte('fecha', ini).lte('fecha', fin),
      ]);
      const citas = c.data || [];
      const terminadas = citas.filter((x) => x.estado === 'finalizada');
      const diasMes = diasDelMes(mes);
      const precio = (x) => Number(x.precio ?? x.servicios?.precio) || 0;
      const porDia = Array.from({ length: diasMes }, (_, i) => ({ dia: i + 1, servicios: 0, productos: 0 }));
      terminadas.forEach((x) => { porDia[partesZona(x.fecha_hora).d - 1].servicios += precio(x); });
      (v.data || []).forEach((x) => { porDia[partesZona(x.fecha).d - 1].productos += Number(x.total) || 0; });
      const top = {};
      terminadas.forEach((x) => { const n = x.servicios?.nombre || 'Otro'; top[n] = (top[n] || 0) + 1; });
      const suma = (arr, k) => (arr || []).reduce((a, x) => a + (Number(x[k]) || 0), 0);
      const ingServ = terminadas.reduce((a, x) => a + precio(x), 0);
      const ingProd = suma(v.data, 'total');
      const gastos = suma(g.data, 'monto');
      setDatos({
        ingServ, ingProd, gastos, utilidad: ingServ + ingProd - gastos, porDia,
        nTerminadas: terminadas.length,
        nWeb: citas.filter((x) => x.origen === 'web').length,
        nCanceladas: citas.filter((x) => x.estado === 'cancelada').length,
        nCitas: citas.length,
        top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5),
      });
    })();
  }, [pro, mes]);

  if (!pro) return <><PageHeader titulo="Reportes" /><SoloPro titulo="Tu mes en números">Ingresos por servicios y productos, gastos, utilidad, servicios más pedidos y cuántas citas llegan por tu link.</SoloPro></>;

  const mover = (n) => setMes(sumarMeses(mes, n));
  const nombreMes = nombreDelMes(mes);
  const esActual = mes === mesActual();

  return (
    <>
      <PageHeader titulo="Reportes" sub={<span className="first-letter:uppercase">{nombreMes}</span>}>
        <div className="flex rounded border border-line bg-card">
          <button onClick={() => mover(-1)} className="p-2.5 hover:bg-paper" aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <button onClick={() => mover(1)} disabled={esActual} className="p-2.5 hover:bg-paper disabled:opacity-30" aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
      </PageHeader>
      {!datos ? <Cargando /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Servicios" valor={dinero(datos.ingServ)} nota={`${datos.nTerminadas} terminados`} />
            <Stat label="Productos" valor={dinero(datos.ingProd)} />
            <Stat label="Gastos" valor={dinero(datos.gastos)} />
            <Stat label="Utilidad" valor={dinero(datos.utilidad)} tono={datos.utilidad >= 0 ? 'verde' : 'rojo'} />
          </div>
          <div className="card p-4">
            <p className="mb-3 font-bold">Ingresos por día</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datos.porDia} margin={{ left: -12, right: 4 }}>
                  <CartesianGrid vertical={false} stroke="#E2DBD0" />
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7C756C' }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7C756C' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip cursor={{ fill: '#F5F2EC' }} formatter={(v, n) => [dinero(v), n === 'servicios' ? 'Servicios' : 'Productos']} labelFormatter={(d) => `Día ${d}`}
                    contentStyle={{ borderRadius: 6, border: '1px solid #E2DBD0', fontSize: 13 }} />
                  <Bar dataKey="servicios" stackId="a" fill="#1A1714" />
                  <Bar dataKey="productos" stackId="a" fill="#B4322A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-ink-2">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-ink" />Servicios</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-rojo" />Productos</span>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <p className="border-b border-line px-4 py-3 font-bold">Servicios más pedidos</p>
              {datos.top.length === 0 ? <p className="px-4 py-6 text-sm text-ink-3">Sin servicios terminados este mes.</p> : (
                <div className="divide-y divide-line">
                  {datos.top.map(([n, k]) => (
                    <div key={n} className="flex justify-between px-4 py-2.5"><span>{n}</span><span className="font-semibold">{k}</span></div>
                  ))}
                </div>
              )}
            </div>
            <div className="card divide-y divide-line">
              <p className="px-4 py-3 font-bold">Citas del mes</p>
              <div className="flex justify-between px-4 py-2.5"><span>Agendadas</span><span className="font-semibold">{datos.nCitas}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span>Llegaron por tu link</span><span className="font-semibold">{datos.nWeb}{datos.nCitas > 0 && <span className="ml-1 font-normal text-ink-3">({Math.round((datos.nWeb / datos.nCitas) * 100)}%)</span>}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span>Canceladas</span><span className="font-semibold">{datos.nCanceladas}</span></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
