import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast'; // ¡Usamos las notificaciones nuevas!

const ReservaPublica = () => {
  const [paso, setPaso] = useState(1);
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  
  // Datos de la reserva
  const [seleccion, setSeleccion] = useState({
    barbero: null,
    servicio: null,
    fecha: '',
    hora: '',
    cliente: '',
    telefono: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: b } = await supabase.from('barberos').select('*');
    const { data: s } = await supabase.from('servicios').select('*');
    setBarberos(b || []);
    setServicios(s || []);
  }

  const agendar = async () => {
    if(!seleccion.cliente || !seleccion.telefono || !seleccion.fecha || !seleccion.hora) {
        toast.error("Por favor completa todos los datos");
        return;
    }

    const fechaFinal = new Date(`${seleccion.fecha}T${seleccion.hora}:00`);
    
    // 1. Guardar Cita
    const { error } = await supabase.from('citas').insert([{
        cliente_nombre: seleccion.cliente,
        cliente_telefono: seleccion.telefono,
        fecha_hora: fechaFinal.toISOString(),
        barbero_id: seleccion.barbero.id,
        servicio_id: seleccion.servicio.id,
        estado: 'pendiente'
    }]);

    if(error) {
        toast.error("Hubo un error al agendar. Intenta de nuevo.");
    } else {
        // 2. Intentar guardar cliente en CRM (sin romper si falla)
        await supabase.from('clientes').insert([{ nombre: seleccion.cliente, telefono: seleccion.telefono }]).select();
        
        setPaso(4); // Pantalla de éxito
        toast.success("¡Tu cita ha sido agendada!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* ENCABEZADO */}
        <div className="bg-indigo-600 p-6 text-center">
            <h1 className="text-white text-2xl font-bold">Reserva tu Cita 💈</h1>
            <p className="text-indigo-200 text-sm">Agenda en segundos</p>
        </div>

        <div className="p-6">
            {/* PASO 1: SELECCIÓN */}
            {paso === 1 && (
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-700 text-lg">1. ¿Con quién y qué servicio?</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Elige Barbero</label>
                        <div className="grid grid-cols-2 gap-3">
                            {barberos.map(b => (
                                <div key={b.id} 
                                    onClick={() => setSeleccion({...seleccion, barbero: b})}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${seleccion.barbero?.id === b.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                                    <div className="font-bold text-slate-800">{b.nombre}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Elige Servicio</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50"
                            onChange={e => setSeleccion({...seleccion, servicio: JSON.parse(e.target.value)})}>
                            <option value="">Selecciona...</option>
                            {servicios.map(s => (
                                <option key={s.id} value={JSON.stringify(s)}>{s.nombre} - ${s.precio}</option>
                            ))}
                        </select>
                    </div>

                    <button disabled={!seleccion.barbero || !seleccion.servicio} onClick={() => setPaso(2)}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 mt-4">
                        Siguiente →
                    </button>
                </div>
            )}

            {/* PASO 2: FECHA Y HORA */}
            {paso === 2 && (
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-700 text-lg">2. ¿Cuándo te esperamos?</h2>
                    <input type="date" className="w-full border rounded-lg p-3" 
                        onChange={e => setSeleccion({...seleccion, fecha: e.target.value})} />
                    <input type="time" className="w-full border rounded-lg p-3" 
                        onChange={e => setSeleccion({...seleccion, hora: e.target.value})} />
                    
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setPaso(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Atrás</button>
                        <button disabled={!seleccion.fecha || !seleccion.hora} onClick={() => setPaso(3)}
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold disabled:bg-gray-300">
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 3: TUS DATOS */}
            {paso === 3 && (
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-700 text-lg">3. Tus Datos</h2>
                    <input type="text" placeholder="Tu Nombre" className="w-full border rounded-lg p-3"
                        onChange={e => setSeleccion({...seleccion, cliente: e.target.value})} />
                    <input type="tel" placeholder="Tu Teléfono" className="w-full border rounded-lg p-3"
                        onChange={e => setSeleccion({...seleccion, telefono: e.target.value})} />
                    
                    <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 mt-4">
                        <p><strong>Resumen:</strong> {seleccion.servicio?.nombre} con {seleccion.barbero?.nombre}</p>
                        <p>El {seleccion.fecha} a las {seleccion.hora}</p>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setPaso(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Atrás</button>
                        <button onClick={agendar} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
                            ¡Confirmar Cita!
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 4: ÉXITO */}
            {paso === 4 && (
                <div className="text-center py-10">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-slate-800">¡Cita Confirmada!</h2>
                    <p className="text-gray-500 mt-2">Te esperamos en la barbería.</p>
                    <button onClick={() => window.location.reload()} className="mt-8 text-indigo-600 font-bold underline">
                        Agendar otra cita
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReservaPublica;