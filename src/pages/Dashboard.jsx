import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [ingresosCitas, setIngresosCitas] = useState(0);
  const [ingresosProductos, setIngresosProductos] = useState(0);
  const [gastosTotales, setGastosTotales] = useState(0);
  const [dataGrafica, setDataGrafica] = useState([]);

  useEffect(() => {
    calcularTodo();
  }, []);

  async function calcularTodo() {
    setLoading(true);
    const fecha = new Date();
    const mesActual = fecha.getMonth();
    const anioActual = fecha.getFullYear();

    // 1. Cargar Datos
    const { data: citas } = await supabase.from('citas').select('fecha_hora, servicios(precio)').eq('estado', 'finalizada');
    const { data: ventas } = await supabase.from('ventas_productos').select('total, fecha');
    const { data: gastos } = await supabase.from('gastos').select('monto, fecha');

    // 2. Calcular Totales del Mes
    let sumaCitas = 0, sumaVentas = 0, sumaGastos = 0;
    
    // Arrays para la gráfica (Ingresos por día)
    const diasDelMes = {}; // Ej: { "1": 500, "2": 0, ... }

    citas?.forEach(c => {
        const d = new Date(c.fecha_hora);
        if(d.getMonth() === mesActual && d.getFullYear() === anioActual) {
            const m = Number(c.servicios?.precio || 0);
            sumaCitas += m;
            // Sumar al día para gráfica
            const dia = d.getDate();
            diasDelMes[dia] = (diasDelMes[dia] || 0) + m;
        }
    });

    ventas?.forEach(v => {
        const d = new Date(v.fecha);
        if(d.getMonth() === mesActual && d.getFullYear() === anioActual) {
            const m = Number(v.total);
            sumaVentas += m;
            const dia = d.getDate();
            diasDelMes[dia] = (diasDelMes[dia] || 0) + m;
        }
    });

    gastos?.forEach(g => {
        const d = new Date(g.fecha);
        if(d.getMonth() === mesActual && d.getFullYear() === anioActual) {
            sumaGastos += Number(g.monto);
        }
    });

    // 3. Preparar datos para Recharts
    const datosFormateados = Object.keys(diasDelMes).map(dia => ({
        name: `Día ${dia}`,
        ventas: diasDelMes[dia]
    }));

    setIngresosCitas(sumaCitas);
    setIngresosProductos(sumaVentas);
    setGastosTotales(sumaGastos);
    setDataGrafica(datosFormateados);
    setLoading(false);
  }

  const utilidad = (ingresosCitas + ingresosProductos) - gastosTotales;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">📊 Tablero de Comando</h1>

      {loading ? <p className="animate-pulse">Cargando métricas...</p> : (
        <div className="space-y-8">
            {/* TARJETAS SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ingresos Servicios</p>
                    <h2 className="text-3xl font-bold text-slate-800 mt-2">${ingresosCitas}</h2>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Venta Productos</p>
                    <h2 className="text-3xl font-bold text-blue-600 mt-2">${ingresosProductos}</h2>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Gastos</p>
                    <h2 className="text-3xl font-bold text-red-500 mt-2">-${gastosTotales}</h2>
                </div>
                <div className={`p-6 rounded-2xl shadow-lg text-white ${utilidad >= 0 ? 'bg-slate-900' : 'bg-red-600'}`}>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Utilidad Neta</p>
                    <h2 className="text-3xl font-bold mt-2">${utilidad}</h2>
                </div>
            </div>

            {/* GRÁFICA PRINCIPAL */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Rendimiento Diario (Mes Actual)</h3>
                {dataGrafica.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataGrafica}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" hide />
                            <YAxis />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
                                {dataGrafica.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No hay suficientes datos para graficar aún.
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;