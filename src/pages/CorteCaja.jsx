import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const CorteCaja = () => {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({
    servicios: 0,
    productos: 0,
    gastos: 0,
    totalCaja: 0
  });

  useEffect(() => {
    calcularCorte();
  }, []);

  async function calcularCorte() {
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Sumar Servicios de Hoy
    const { data: citas } = await supabase.from('citas')
      .select('servicios(precio)')
      .eq('estado', 'finalizada')
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`);
    
    const totalServicios = citas?.reduce((acc, c) => acc + (c.servicios?.precio || 0), 0) || 0;

    // 2. Sumar Ventas de Productos de Hoy
    const { data: ventas } = await supabase.from('ventas_productos')
      .select('total')
      .gte('fecha', `${hoy}T00:00:00`)
      .lte('fecha', `${hoy}T23:59:59`);
    
    const totalProductos = ventas?.reduce((acc, v) => acc + (v.total || 0), 0) || 0;

    // 3. Sumar Gastos de Hoy
    const { data: gastos } = await supabase.from('gastos')
      .select('monto')
      .gte('fecha', `${hoy}T00:00:00`)
      .lte('fecha', `${hoy}T23:59:59`);
    
    const totalGastos = gastos?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0;

    setResumen({
        servicios: totalServicios,
        productos: totalProductos,
        gastos: totalGastos,
        totalCaja: (totalServicios + totalProductos) - totalGastos
    });
    setLoading(false);
  }

  const guardarCorte = async () => {
    if(!window.confirm("¿Cerrar caja del día? Esto guardará el histórico.")) return;

    const { error } = await supabase.from('cortes_caja').insert([{
        total_servicios: resumen.servicios,
        total_ventas: resumen.productos,
        total_gastos: resumen.gastos,
        dinero_en_caja: resumen.totalCaja
    }]);

    if(error) toast.error("Error al guardar corte");
    else toast.success("✅ ¡Caja cerrada correctamente!");
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">📠 Corte de Caja</h1>
      <p className="text-gray-500 mb-8">{new Date().toLocaleDateString()} - Resumen del día</p>

      {loading ? <p>Calculando dinero...</p> : (
        <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* INGRESOS */}
                <div className="bg-white p-6 rounded-2xl shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 font-bold uppercase text-xs">Entradas (Ventas)</h3>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                            <span>Servicios:</span>
                            <span className="font-bold text-slate-800">${resumen.servicios}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Productos:</span>
                            <span className="font-bold text-slate-800">${resumen.productos}</span>
                        </div>
                        <div className="border-t pt-1 mt-1 flex justify-between text-green-600 font-bold text-lg">
                            <span>Total:</span>
                            <span>${resumen.servicios + resumen.productos}</span>
                        </div>
                    </div>
                </div>

                {/* SALIDAS */}
                <div className="bg-white p-6 rounded-2xl shadow border-l-4 border-red-500">
                    <h3 className="text-gray-500 font-bold uppercase text-xs">Salidas (Gastos)</h3>
                    <h2 className="text-3xl font-bold text-red-500 mt-2">-${resumen.gastos}</h2>
                    <p className="text-xs text-gray-400 mt-1">Luz, comida, insumos...</p>
                </div>

                {/* TOTAL FINAL */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-slate-400 font-bold uppercase text-xs">Dinero en Efectivo</h3>
                        <p className="text-xs text-slate-500">Lo que debe haber en el cajón</p>
                    </div>
                    <h2 className="text-4xl font-bold text-emerald-400 mt-2">${resumen.totalCaja}</h2>
                </div>
            </div>

            <button 
                onClick={guardarCorte}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2">
                <span>🔒</span> Realizar Cierre de Día
            </button>
        </div>
      )}
    </div>
  );
};

export default CorteCaja;