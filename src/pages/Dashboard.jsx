import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Totales Financieros
  const [ingresosCitas, setIngresosCitas] = useState(0);
  const [ingresosProductos, setIngresosProductos] = useState(0);
  const [gastosTotales, setGastosTotales] = useState(0);
  const [utilidadNeta, setUtilidadNeta] = useState(0);
  
  // Contadores
  const [totalCitas, setTotalCitas] = useState(0);
  const [mejorBarbero, setMejorBarbero] = useState('-');

  useEffect(() => {
    calcularTodo();
  }, []);

  async function calcularTodo() {
    setLoading(true);
    
    // 1. OBTENER CITAS FINALIZADAS (Ingresos Servicios)
    const { data: citas } = await supabase
      .from('citas')
      .select(`fecha_hora, barberos(nombre), servicios(precio)`)
      .eq('estado', 'finalizada');

    // 2. OBTENER VENTAS DE PRODUCTOS (Ingresos Tienda)
    const { data: ventas } = await supabase
      .from('ventas_productos')
      .select('total, fecha');

    // 3. OBTENER GASTOS (Salidas)
    const { data: gastos } = await supabase
      .from('gastos')
      .select('monto, fecha');

    // --- PROCESAMIENTO DE DATOS ---
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    let sumaCitasMes = 0;
    let sumaVentasMes = 0;
    let sumaGastosMes = 0;
    let conteoBarberos = {};

    // A) Sumar Citas del Mes
    if(citas) {
        citas.forEach(c => {
            const fecha = new Date(c.fecha_hora);
            if(fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
                const precio = Number(c.servicios?.precio) || 0;
                sumaCitasMes += precio;
                
                // Barbero Top
                const nombre = c.barberos?.nombre || 'Desconocido';
                conteoBarberos[nombre] = (conteoBarberos[nombre] || 0) + precio;
            }
        });
    }

    // B) Sumar Ventas de Productos del Mes
    if(ventas) {
        ventas.forEach(v => {
            const fecha = new Date(v.fecha);
            if(fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
                sumaVentasMes += Number(v.total);
            }
        });
    }

    // C) Sumar Gastos del Mes
    if(gastos) {
        gastos.forEach(g => {
            const fecha = new Date(g.fecha);
            if(fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
                sumaGastosMes += Number(g.monto);
            }
        });
    }

    // Encontrar mejor barbero
    let topBarber = 'Nadie';
    let maxVenta = 0;
    Object.entries(conteoBarberos).forEach(([nombre, total]) => {
        if(total > maxVenta) { maxVenta = total; topBarber = nombre; }
    });

    // SETEAR ESTADOS
    setIngresosCitas(sumaCitasMes);
    setIngresosProductos(sumaVentasMes);
    setGastosTotales(sumaGastosMes);
    setUtilidadNeta((sumaCitasMes + sumaVentasMes) - sumaGastosMes);
    setTotalCitas(citas ? citas.length : 0); // Histórico total
    setMejorBarbero(topBarber);
    
    setLoading(false);
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">📊 Estado de Resultados</h1>
      <p className="text-gray-500 mb-8">Resumen financiero del mes actual.</p>

      {loading ? <p>Analizando datos...</p> : (
        <>
            {/* FILA 1: RESUMEN GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* INGRESOS TOTALES */}
                <div className="bg-white p-6 rounded-xl shadow border-t-4 border-green-500">
                    <p className="text-sm text-gray-500 font-bold uppercase">Ingresos Totales (Citas + Ventas)</p>
                    <h2 className="text-4xl font-bold text-slate-800 mt-2">
                        ${ingresosCitas + ingresosProductos}
                    </h2>
                    <div className="mt-2 text-xs text-gray-500 flex gap-2">
                        <span className="text-green-600 font-semibold">Servicios: ${ingresosCitas}</span>
                        <span>|</span>
                        <span className="text-blue-600 font-semibold">Productos: ${ingresosProductos}</span>
                    </div>
                </div>

                {/* GASTOS */}
                <div className="bg-white p-6 rounded-xl shadow border-t-4 border-red-500">
                    <p className="text-sm text-gray-500 font-bold uppercase">Gastos Operativos</p>
                    <h2 className="text-4xl font-bold text-red-600 mt-2">
                        -${gastosTotales}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2">Renta, luz, insumos, etc.</p>
                </div>

                {/* UTILIDAD NETA (LO MÁS IMPORTANTE) */}
                <div className="bg-slate-900 p-6 rounded-xl shadow-lg border-t-4 border-indigo-500 text-white">
                    <p className="text-sm text-slate-400 font-bold uppercase">Utilidad Neta (Ganancia Real)</p>
                    <h2 className={`text-4xl font-bold mt-2 ${utilidadNeta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${utilidadNeta}
                    </h2>
                    <p className="text-xs text-slate-400 mt-2">Dinero libre para ti</p>
                </div>
            </div>

            {/* FILA 2: DETALLES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Barbero del Mes */}
                 <div className="bg-white p-6 rounded-xl shadow flex items-center gap-4">
                    <div className="bg-yellow-100 p-4 rounded-full text-3xl">🏆</div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Barbero del Mes</p>
                        <h3 className="text-xl font-bold text-slate-800">{mejorBarbero}</h3>
                    </div>
                </div>

                {/* Resumen Productos */}
                <div className="bg-white p-6 rounded-xl shadow flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-full text-3xl">🛍️</div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Ventas en Tienda</p>
                        <h3 className="text-xl font-bold text-slate-800">${ingresosProductos}</h3>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;