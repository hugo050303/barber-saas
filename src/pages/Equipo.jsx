import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Equipo = () => {
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchBarberos();
  }, []);

  async function fetchBarberos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('barberos')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) console.error(error);
    else setBarberos(data || []);
    setLoading(false);
  }

  async function agregarBarbero(e) {
    e.preventDefault();
    setGuardando(true);

    const { error } = await supabase.from('barberos').insert([
      { nombre, especialidad }
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNombre(''); setEspecialidad('');
      fetchBarberos();
    }
    setGuardando(false);
  }

  async function eliminarBarbero(id) {
    if (!window.confirm("¿Estás seguro? Si borras al barbero, sus citas podrían quedar huérfanas.")) return;

    const { error } = await supabase.from('barberos').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else fetchBarberos();
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">👤 Gestión del Equipo</h1>

      {/* FORMULARIO DE ALTA */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Contratar Nuevo Barbero</h2>
        <form onSubmit={agregarBarbero} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">Nombre Completo</label>
                <input required type="text" placeholder="Ej. Daniel López" className="w-full border p-2 rounded"
                    value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">Especialidad</label>
                <input required type="text" placeholder="Ej. Colorimetría / Fade Master" className="w-full border p-2 rounded"
                    value={especialidad} onChange={e => setEspecialidad(e.target.value)} />
            </div>
            <button type="submit" disabled={guardando} 
                className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium h-10">
                {guardando ? 'Guardando...' : 'Contratar +'}
            </button>
        </form>
      </div>

      {/* LISTA DE BARBEROS (TARJETAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {barberos.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-all text-center p-6">
                {/* Avatar (Usamos una imagen genérica por ahora) */}
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                    🧔🏻‍♂️
                </div>
                
                <h3 className="font-bold text-xl text-slate-800">{b.nombre}</h3>
                <p className="text-indigo-600 font-medium text-sm mb-4">{b.especialidad}</p>
                
                <div className="pt-4 border-t border-gray-100">
                    <button 
                        onClick={() => eliminarBarbero(b.id)}
                        className="text-red-400 hover:text-red-600 text-sm font-semibold flex items-center justify-center gap-1 w-full">
                        🗑️ Despedir
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Equipo;