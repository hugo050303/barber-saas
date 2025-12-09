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
  const [fechaFiltro, setFechaFiltro] = useState(new Date());

  useEffect(() => { fetchData(); }, [fechaFiltro]);

  async function fetchData() {
    setLoading(true);
    const { data: dataBarberos } = await supabase.from('barberos').select('*').order('nombre');
    setBarberos(dataBarberos || []);

    const inicioDia = new Date(fechaFiltro); inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaFiltro); finDia.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('citas')
      .select(`*, servicios ( nombre, precio, duracion_min, duracion )`) // Traemos duracion
      .gte('fecha_hora', inicioDia.toISOString())
      .lte('fecha_hora', finDia.toISOString())
      .order('fecha_hora', { ascending: true });

    setCitas(data || []);
    setLoading(false);
  }

  // --- HELPERS ---
  const formatearHora = (f) => new Date(f).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  // Calcula hora fin basado en duración
  const obtenerHoraFin = (fechaInicio, duracionMin = 30) => {
    const d = new Date(fechaInicio);
    d.setMinutes(d.getMinutes() + duracionMin);
    return formatearHora(d);
  };

  const enviarWhatsApp = (e, telefono, nombre, fecha) => {
    e.stopPropagation(); // Evita abrir el modal de detalles
    const mensaje = `Hola ${nombre}, confirmamos tu cita para hoy a las ${formatearHora(fecha)} en la Barbería. 💈`;
    window.open(`https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const obtenerColorBorde = (estado) => {
    switch(estado) {
        case 'finalizada': return 'border-l-green-500 bg-green-50/50 opacity-75';
        case 'cancelada': return 'border-l-red-400 bg-red-50/50 opacity-60';
        default: return 'border-l-indigo-500 bg-white';
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">📅 Agenda</h1>
            <p className="text-slate-500 text-sm capitalize">
                {fechaFiltro.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <input type="date" className="border rounded-xl px-3 py-2 flex-1"
                value={fechaFiltro.toISOString().split('T')[0]}
                onChange={(e) => setFechaFiltro(new Date(e.target.value + 'T12:00:00'))}
            />
            <button onClick={() => setModalNuevoAbierto(true)}
                className="bg-slate-900 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
              <span>+</span> <span className="hidden md:inline">Nueva Cita</span>
            </button>
        </div>
      </header>

      <ModalCita isOpen={modalNuevoAbierto} onClose={() => setModalNuevoAbierto(false)} alGuardar={fetchData} />
      <ModalDetalles isOpen={!!citaSeleccionada} cita={citaSeleccionada} onClose={() => setCitaSeleccionada(null)} onUpdate={fetchData} />

      {loading ? <div className="text-center py-20 animate-pulse text-gray-400">Cargando agenda...</div> : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full snap-x">
          {barberos.map((barbero) => {
            const citasDelBarbero = citas.filter(c => c.barbero_id === barbero.id);
            return (
              <div key={barbero.id} className="min-w-[85vw] md:min-w-[320px] flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col snap-center">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-slate-800">{barbero.nombre}</h3>
                    <span className="text-xs font-bold bg-white border px-2 py-1 rounded-full text-slate-500">{citasDelBarbero.length}</span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                    {citasDelBarbero.map((cita) => (
                        <div key={cita.id} onClick={() => setCitaSeleccionada(cita)} 
                            className={`p-3 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all cursor-pointer group relative ${obtenerColorBorde(cita.estado)}`}>
                            
                            {/* Botón Flotante WhatsApp (Solo aparece en hover o siempre en movil) */}
                            {cita.cliente_telefono && (
                                <button onClick={(e) => enviarWhatsApp(e, cita.cliente_telefono, cita.cliente_nombre, cita.fecha_hora)}
                                    className="absolute top-2 right-2 bg-green-100 text-green-600 p-1.5 rounded-full hover:bg-green-500 hover:text-white transition-colors z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326z"/></svg>
                                </button>
                            )}

                            <div className="flex gap-2 items-center mb-1">
                                <span className="font-bold text-slate-700 text-lg">{formatearHora(cita.fecha_hora)}</span>
                                <span className="text-xs text-gray-400">➔ {obtenerHoraFin(cita.fecha_hora, cita.servicios?.duracion || 30)}</span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm truncate pr-6">{cita.cliente_nombre}</h4>
                            <p className="text-xs text-indigo-500 font-medium mb-1">{cita.servicios?.nombre}</p>
                        </div>
                    ))}
                    {citasDelBarbero.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                            <span className="text-4xl mb-2">💤</span>
                            <span className="text-sm">Libre</span>
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