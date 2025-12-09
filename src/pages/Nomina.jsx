import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Nomina = () => {
  const [loading, setLoading] = useState(false);
  const [barberos, setBarberos] = useState([]);
  const [reporte, setReporte] = useState([]);
  
  // Fechas del filtro (Por defecto: Inicio y Fin de mes actual)
  const date = new Date();
  const primerDia = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDia);
  const [fechaFin, setFechaFin] = useState(ultimoDia);

  useEffect(() => {
    fetchBarberos();
  }, []);

  // Cuando cambian las fechas o cargan los barberos, recalculamos
  useEffect(() => {
    if (barberos.length > 0) {
        calcularNomina();
    }
  }, [fechaInicio, fechaFin, barberos]);

  async function fetchBarberos() {
    const { data } = await supabase.from('barberos').select('*').order('nombre');
    setBarberos(data || []);
  }

  async function actualizarComision(id, nuevoPorcentaje) {
    // Guardar el nuevo % en base de datos
    await supabase.from('barberos').update({ porcentaje_comision: nuevoPorcentaje }).eq('id', id);
    fetchBarberos(); // Recargar para actualizar cálculos
  }

  async function calcularNomina() {
    setLoading(true);

    // 1. Traer todas las citas FINALIZADAS en el rango de fechas
    const { data: citas } = await supabase
      .from('citas')
      .select(`
        barbero_id,
        servicios ( precio )
      `)
      .eq('estado', 'finalizada')
      .gte('fecha_hora', fechaInicio + 'T00:00:00')
      .lte('fecha_hora', fechaFin + 'T23:59:59');

    if (!citas) {
        setLoading(false);
        return;
    }

    // 2. Agrupar dinero por barbero
    const calculo = barberos.map(barbero => {
        // Filtrar citas de este barbero
        const susCitas = citas.filter(c => c.barbero_id === barbero.id);
        
        // Sumar el total generado (Venta Bruta)
        const totalVendido = susCitas.reduce((acc, curr) => acc + (curr.servicios?.precio || 0), 0);
        
        // Calcular su pago (Venta * Porcentaje / 100)
        const pagoBarbero = (totalVendido * barbero.porcentaje_comision) / 100;
        
        // Calcular ganancia del negocio (El resto)
        const gananciaNegocio = totalVendido - pagoBarbero;

        return {
            ...barbero,
            cortes: susCitas.length,
            totalVendido,
            pagoBarbero,
            gananciaNegocio
        };
    });

    setReporte(calculo);
    setLoading(false);
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">💰 Nómina y Comisiones</h1>
        <p className="text-gray-500 text-sm">Calcula cuánto pagar a tu equipo.</p>
      </header>

      {/* FILTROS DE FECHA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-end">
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
            <input 
                type="date" 
                className="border rounded p-2 text-slate-700"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
            <input 
                type="date" 
                className="border rounded p-2 text-slate-700"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
            />
        </div>
        <div className="pb-2 text-sm text-gray-400">
            * Se calculan solo citas finalizadas.
        </div>
      </div>

      {loading ? <p className="text-center py-10">Calculando pagos...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {reporte.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
                    
                    {/* ENCABEZADO TARJETA */}
                    <div className="p-6 border-b border-gray-100 bg-slate-50">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">{item.nombre}</h3>
                                <p className="text-sm text-gray-500">{item.cortes} cortes realizados</p>
                            </div>
                            <div className="text-right">
                                <label className="text-[10px] uppercase font-bold text-gray-400 block">Comisión</label>
                                <div className="flex items-center gap-1 justify-end">
                                    <input 
                                        type="number" 
                                        className="w-12 text-right border-b border-gray-300 bg-transparent font-bold focus:outline-none focus:border-indigo-500"
                                        value={item.porcentaje_comision}
                                        onChange={(e) => actualizarComision(item.id, e.target.value)}
                                    />
                                    <span className="text-gray-500 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CUERPO DE CÁLCULOS */}
                    <div className="p-6 space-y-4 flex-1">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Venta Total Generada</span>
                            <span className="font-bold text-slate-700">${item.totalVendido}</span>
                        </div>
                        
                        <div className="w-full bg-gray-100 h-px"></div>

                        <div className="flex justify-between items-center text-green-600">
                            <span className="font-bold text-sm">A Pagar (Barbero)</span>
                            <span className="font-extrabold text-2xl">${item.pagoBarbero.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-indigo-600 opacity-70 text-sm">
                            <span className="font-medium">Ganancia (Negocio)</span>
                            <span className="font-bold">+${item.gananciaNegocio.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* PIE DE TARJETA */}
                    <div className="p-4 bg-gray-50 text-center">
                        <button 
                            onClick={() => alert(`Pago de $${item.pagoBarbero} registrado para ${item.nombre} (Simulación)`)}
                            className="text-indigo-600 text-sm font-bold hover:underline">
                            Marcar como Pagado
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
      
      {reporte.length === 0 && !loading && (
          <p className="text-center text-gray-400 mt-10">No hay barberos registrados.</p>
      )}
    </div>
  );
};

export default Nomina;