import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el formulario de nuevo servicio
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchServicios();
  }, []);

  async function fetchServicios() {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .order('nombre', { ascending: true }); // Los ordena alfabéticamente
    
    if (error) console.error(error);
    else setServicios(data || []);
    setLoading(false);
  }

  async function agregarServicio(e) {
    e.preventDefault();
    setGuardando(true);

    // 1. VALIDACIÓN: Verificar si ya existe un servicio con ese nombre exacto (ignorando mayúsculas/minúsculas)
    const { data: existe } = await supabase
        .from('servicios')
        .select('id')
        .ilike('nombre', nombre); // ilike busca sin importar mayúsculas

    if (existe && existe.length > 0) {
        alert("⚠️ ¡Ese servicio ya existe! Intenta con otro nombre.");
        setGuardando(false);
        return; // Detenemos la función aquí
    }

    // 2. Si no existe, lo guardamos
    const { error } = await supabase.from('servicios').insert([
      { nombre, precio, duracion_min: duracion }
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNombre(''); setPrecio(''); setDuracion('');
      fetchServicios();
    }
    setGuardando(false);
  }

  async function eliminarServicio(id) {
    if (!window.confirm("¿Seguro que quieres borrar este servicio?")) return;

    const { error } = await supabase.from('servicios').delete().eq('id', id);

    if (error) alert("Error al borrar: " + error.message);
    else fetchServicios(); // Recargar la lista
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">✂️ Catálogo de Servicios</h1>

      {/* TARJETA DE FORMULARIO (Arriba) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Agregar Nuevo Servicio</h2>
        <form onSubmit={agregarServicio} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">Nombre del Servicio</label>
                <input required type="text" placeholder="Ej. Corte Escolar" className="w-full border p-2 rounded"
                    value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Precio ($)</label>
                <input required type="number" placeholder="0.00" className="w-full border p-2 rounded"
                    value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
            <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Mins.</label>
                <input required type="number" placeholder="30" className="w-full border p-2 rounded"
                    value={duracion} onChange={e => setDuracion(e.target.value)} />
            </div>
            <button type="submit" disabled={guardando} 
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-medium h-10">
                {guardando ? 'Guardando...' : 'Agregar +'}
            </button>
        </form>
      </div>

      {/* LISTA DE SERVICIOS (Abajo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicios.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-all">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{s.nombre}</h3>
                    <div className="text-sm text-gray-500 flex gap-3 mt-1">
                        <span className="bg-blue-50 text-blue-700 px-2 rounded">⏱️ {s.duracion_min} min</span>
                        <span className="font-semibold text-green-700">💲{s.precio}</span>
                    </div>
                </div>
                <button 
                    onClick={() => eliminarServicio(s.id)}
                    className="text-red-300 hover:text-red-600 p-2 transition-colors" title="Eliminar">
                    🗑️
                </button>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Servicios;