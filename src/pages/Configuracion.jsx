import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Configuracion = () => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Datos del formulario
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    // Siempre pedimos la fila con ID 1
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1) 
      .single();

    if (error) {
      console.error('Error cargando config:', error);
    } else if (data) {
      setNombre(data.nombre_negocio);
      setDireccion(data.direccion || '');
      setTelefono(data.telefono || '');
      setMensaje(data.mensaje_ticket || '');
    }
    setLoading(false);
  }

  async function guardarCambios(e) {
    e.preventDefault();
    setGuardando(true);

    const { error } = await supabase
      .from('configuracion')
      .update({ 
        nombre_negocio: nombre,
        direccion: direccion,
        telefono: telefono,
        mensaje_ticket: mensaje
      })
      .eq('id', 1);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('✅ ¡Información actualizada correctamente!');
      // Opcional: Recargar la página para ver cambios si afectan el menú
      window.location.reload(); 
    }
    setGuardando(false);
  }

  if (loading) return <div className="p-8">Cargando configuración...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">⚙️ Configuración del Negocio</h1>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden max-w-2xl">
        <div className="p-6 bg-slate-900 text-white">
            <h2 className="text-xl font-bold">Identidad de la Marca</h2>
            <p className="text-slate-400 text-sm">Esta información aparecerá en los reportes y en la barra lateral.</p>
        </div>

        <form onSubmit={guardarCambios} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Negocio</label>
                    <input 
                        type="text" 
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono de Contacto</label>
                    <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
                    <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={direccion}
                        onChange={e => setDireccion(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mensaje en Ticket (Pie de página)</label>
                <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Gracias por su preferencia..."
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                ></textarea>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                    type="submit" 
                    disabled={guardando}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:bg-gray-400">
                    {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Configuracion;