import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

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
    telefono: '' // Iniciamos vacío
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
    // Validación más estricta: Teléfono debe tener 10 dígitos exactos
    if(!seleccion.cliente || !seleccion.fecha || !seleccion.hora) {
        toast.error("Faltan datos por llenar");
        return;
    }
    if(seleccion.telefono.length !== 10) {
        toast.error("El teléfono debe tener 10 dígitos exactos");
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
        toast.error("Error al agendar: " + error.message);
    } else {
        // 2. Intentar guardar cliente en CRM (Auto-registro)
        await supabase.from('clientes').insert([{ 
            nombre: seleccion.cliente, 
            telefono: seleccion.telefono,
            notas: 'Registrado desde Web Pública'
        }]).select();
        
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
                <div className="space-y-4 animate-fade-in">
                    <h2 className="font-bold text-gray-700 text-lg">1. ¿Con quién y qué servicio?</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Elige Barbero</label>
                        <div className="grid grid-cols-2 gap-3">
                            {barberos.map(b => (
                                <div key={b.id} 
                                    onClick={() => setSeleccion({...seleccion, barbero: b})}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${seleccion.barbero?.id === b.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-indigo-200'}`}>
                                    <div className="font-bold text-slate-800">{b.nombre}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Elige Servicio</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                            onChange={e => setSeleccion({...seleccion, servicio: JSON.parse(e.target.value)})}>
                            <option value="">Selecciona...</option>
                            {servicios.map(s => (
                                <option key={s.id} value={JSON.stringify(s)}>{s.nombre} - ${s.precio}</option>
                            ))}
                        </select>
                    </div>

                    <button disabled={!seleccion.barbero || !seleccion.servicio} onClick={() => setPaso(2)}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 transition-all mt-4">
                        Siguiente →
                    </button>
                </div>
            )}

            {/* PASO 2: FECHA Y HORA */}
            {paso === 2 && (
                <div className="space-y-4 animate-fade-in">
                    <h2 className="font-bold text-gray-700 text-lg">2. ¿Cuándo te esperamos?</h2>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                        <input type="date" className="w-full border rounded-lg p-3 outline-none focus:border-indigo-500" 
                            onChange={e => setSeleccion({...seleccion, fecha: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                        <input type="time" className="w-full border rounded-lg p-3 outline-none focus:border-indigo-500" 
                            onChange={e => setSeleccion({...seleccion, hora: e.target.value})} />
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setPaso(1)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Atrás</button>
                        <button disabled={!seleccion.fecha || !seleccion.hora} onClick={() => setPaso(3)}
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 transition-all">
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 3: TUS DATOS (AQUÍ ESTÁ LA CORRECCIÓN) */}
            {paso === 3 && (
                <div className="space-y-4 animate-fade-in">
                    <h2 className="font-bold text-gray-700 text-lg">3. Tus Datos</h2>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tu Nombre</label>
                        <input type="text" placeholder="Ej. Juan Pérez" 
                            className="w-full border rounded-lg p-3 outline-none focus:border-indigo-500"
                            onChange={e => setSeleccion({...seleccion, cliente: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tu Teléfono (WhatsApp)</label>
                        <input 
                            type="tel" 
                            maxLength="10" // Límite HTML
                            placeholder="10 dígitos (Ej: 921...)" 
                            className="w-full border rounded-lg p-3 outline-none focus:border-indigo-500 tracking-wider font-medium"
                            value={seleccion.telefono}
                            onChange={e => {
                                // Lógica JS: Solo números
                                const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
                                setSeleccion({...seleccion, telefono: soloNumeros});
                            }} 
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{seleccion.telefono.length}/10</p>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 mt-4 border border-yellow-100">
                        <p><strong>Resumen:</strong> {seleccion.servicio?.nombre} con {seleccion.barbero?.nombre}</p>
                        <p>El <strong>{seleccion.fecha}</strong> a las <strong>{seleccion.hora}</strong></p>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setPaso(2)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Atrás</button>
                        <button onClick={agendar} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                            ¡Confirmar Cita!
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 4: ÉXITO */}
            {paso === 4 && (
                <div className="text-center py-10 animate-bounce-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-5xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">¡Cita Confirmada!</h2>
                    <p className="text-gray-500 mt-2">Ya te tenemos agendado.</p>
                    <button onClick={() => window.location.reload()} className="mt-8 text-indigo-600 font-bold hover:underline">
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