import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ModalCita from '../components/ModalCita';
import ModalDetalles from '../components/ModalDetalles';

const Agenda = () => {
  const [citas, setCitas] = useState([]);
  const [barberos, setBarberos] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null); 

  // Fecha actual para filtrar
  const [fechaFiltro, setFechaFiltro] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [fechaFiltro]); // Se recarga si cambias la fecha

  async function fetchData() {
    setLoading(true);
    const { data: dataBarberos } = await supabase.from('barberos').select('*').order('nombre');
    setBarberos(dataBarberos || []);
    await fetchCitas();
    setLoading(false);
  }

  async function fetchCitas() {
    // 1. Definimos el inicio y fin del día seleccionado para filtrar en la base de datos
    // Esto es CLAVE: Le pedimos a Supabase solo lo de hoy, ajustado a tu zona horaria
    const inicioDia = new Date(fechaFiltro);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fechaFiltro);
    finDia.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('citas')
      .select(`*, servicios ( nombre, precio, duracion_min )`)
      .gte('fecha_hora', inicioDia.toISOString()) // Mayor o igual al inicio del día
      .lte('fecha_hora', finDia.toISOString())    // Menor o igual al fin del día
      .order('fecha_hora', { ascending: true });

    if (error) console.error(error);
    else setCitas(data || []);
  }

  // --- FUNCIONES VISUALES ---
  const formatearHora = (f) => new Date(f).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatearFechaEncabezado = (f) => f.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const formatearTelefono = (tel) => {
    if (!tel) return 'Sin número';
    const limpio = tel.toString().replace(/\D/g, '');
    return limpio.length === 10 ? `(${limpio.slice(0, 3)}) ${limpio.slice(3, 6)}-${limpio.slice(6)}` : tel;
  };

  const obtenerColorBorde = (estado) => {
    switch(estado) {
        case 'finalizada': return 'border-green-500 bg-green-50 opacity-75';
        case 'cancelada': return 'border-red-400 bg-red-50 opacity-60';
        case 'confirmada': return 'border-blue-500 bg-white';
        default: return 'border-yellow-400 bg-white';
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">📅 Agenda Diaria</h1>
            {/* Muestra la fecha que estamos viendo */}
            <p className="text-slate-500 text-lg capitalize">{formatearFechaEncabezado(fechaFiltro)}</p>
        </div>
        
        <div className="flex gap-2">
            {/* Controles para cambiar de día (Opcional, pero muy útil) */}
            <input 
                type="date" 
                className="border rounded-lg px-3 py-2 text-gray-700 font-medium"
                value={fechaFiltro.toISOString().split('T')[0]}
                onChange={(e) => setFechaFiltro(new Date(e.target.value + 'T12:00:00'))} // Truco para evitar desfase al seleccionar
            />
            <button onClick={() => setModalNuevoAbierto(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow flex gap-2 items-center">
              <span>+</span> Agendar
            </button>
        </div>
      </header>

      <ModalCita isOpen={modalNuevoAbierto} onClose={() => setModalNuevoAbierto(false)} alGuardar={fetchData} />

      <ModalDetalles 
        isOpen={!!citaSeleccionada}     
        cita={citaSeleccionada}         
        onClose={() => setCitaSeleccionada(null)} 
        onUpdate={fetchData}           
      />

      {loading ? (
        <p className="text-center text-gray-500 mt-10">Cargando agenda...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {barberos.map((barbero) => {
            const citasDelBarbero = citas.filter(c => c.barbero_id === barbero.id);
            return (
              <div key={barbero.id} className="min-w-[300px] flex-1 bg-white rounded-xl shadow border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-slate-50 rounded-t-xl text-center">
                    <h3 className="font-bold text-lg text-slate-800">{barbero.nombre}</h3>
                    <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                        {citasDelBarbero.length} citas
                    </span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3 bg-gray-50/50 min-h-[200px]">
                    {citasDelBarbero.map((cita) => (
                        <div 
                            key={cita.id} 
                            onClick={() => setCitaSeleccionada(cita)} 
                            className={`p-3 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-all cursor-pointer ${obtenerColorBorde(cita.estado)}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-700 text-lg">
                                    {formatearHora(cita.fecha_hora)}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1 py-0.5 rounded bg-gray-200 text-gray-600">
                                    {cita.estado}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm">{cita.cliente_nombre}</h4>
                            <p className="text-xs text-gray-500 mb-2">{cita.servicios?.nombre}</p>
                            <div className="text-xs text-gray-400 flex justify-between">
                                <span>📞 {formatearTelefono(cita.cliente_telefono)}</span>
                            </div>
                        </div>
                    ))}
                    {citasDelBarbero.length === 0 && (
                        <div className="text-center py-10 opacity-40">
                            <p className="text-4xl mb-2">😴</p>
                            <p className="text-sm">Disponible</p>
                        </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Agenda;