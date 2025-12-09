import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    
    // 1. OBTENER LISTA DE CLIENTES
    const { data: listaClientes, error: errorClientes } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre');

    if (errorClientes) {
      console.error("❌ Error al traer clientes:", errorClientes);
      alert("Error cargando clientes. Revisa la consola.");
      setLoading(false);
      return;
    }

    console.log("✅ Clientes encontrados en DB:", listaClientes);

    // 2. OBTENER HISTORIAL DE CITAS (Para saber cuánto han gastado)
    // Traemos todas las citas finalizadas con el precio del servicio
    const { data: historial, error: errorCitas } = await supabase
      .from('citas')
      .select('cliente_nombre, estado, servicios(precio)')
      .eq('estado', 'finalizada'); // Solo sumamos lo que ya pagaron

    if (errorCitas) console.error("⚠️ Error trayendo historial de citas:", errorCitas);

    // 3. CRUZAR INFORMACIÓN (CLIENTE + DINERO GASTADO)
    // Si la lista de clientes está vacía, no hacemos nada
    const clientesConDatos = (listaClientes || []).map(cliente => {
        // Buscamos las citas que coincidan con el nombre de este cliente
        // (Nota: Esto asume que el nombre es único, idealmente usaríamos ID en el futuro)
        const susCitas = (historial || []).filter(c => 
            c.cliente_nombre && 
            cliente.nombre && 
            c.cliente_nombre.toLowerCase() === cliente.nombre.toLowerCase()
        );
        
        // Sumamos el total de dinero
        const totalGastado = susCitas.reduce((acc, curr) => {
            const precio = Number(curr.servicios?.precio) || 0;
            return acc + precio;
        }, 0);
        
        return {
            ...cliente,
            visitas: susCitas.length,
            totalGastado
        };
    });

    // 4. ORDENAR: Los que más gastan van arriba (VIPs)
    const listaOrdenada = clientesConDatos.sort((a, b) => b.totalGastado - a.totalGastado);

    setClientes(listaOrdenada);
    setLoading(false);
  }

  // Filtro para el buscador
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.telefono && c.telefono.includes(busqueda))
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">👥 Directorio de Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión de lealtad y contacto.</p>
      </header>

      {/* BARRA DE BÚSQUEDA */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <span className="text-2xl">🔍</span>
        <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="w-full text-lg outline-none text-slate-700 placeholder-gray-400"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20">
            <p className="text-gray-500 animate-pulse">Analizando cartera de clientes...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold border-b border-gray-200">
                    <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Contacto</th>
                        <th className="p-4 text-center">Visitas</th>
                        <th className="p-4 text-right">Valor Total (LTV)</th>
                        <th className="p-4 text-center">WhatsApp</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {clientesFiltrados.map((c) => (
                        <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white
                                        ${c.totalGastado > 1000 ? 'bg-yellow-400 shadow-md ring-2 ring-yellow-200' : 'bg-slate-300'}`}>
                                        {c.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{c.nombre}</p>
                                        {c.totalGastado > 1000 && (
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold border border-yellow-200 inline-block mt-1">
                                                ⭐ CLIENTE VIP
                                            </span>
                                        )}
                                        {/* Mostramos notas si existen */}
                                        {c.notas && <p className="text-xs text-gray-400 mt-0.5 italic">"{c.notas}"</p>}
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <p className="text-sm font-medium text-slate-600">{c.telefono || 'Sin teléfono'}</p>
                                <p className="text-xs text-gray-400">{c.email}</p>
                            </td>
                            <td className="p-4 text-center">
                                <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg">
                                    {c.visitas}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <span className={`font-bold ${c.totalGastado > 1000 ? 'text-green-600 text-lg' : 'text-slate-600'}`}>
                                    ${c.totalGastado}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                {c.telefono ? (
                                    <a 
                                        href={`https://wa.me/52${c.telefono.replace(/\D/g,'')}?text=Hola ${c.nombre}, ¡te extrañamos en la barbería!`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-green-200 hover:-translate-y-1 transition-all"
                                        title="Enviar mensaje"
                                    >
                                        💬
                                    </a>
                                ) : (
                                    <span className="text-gray-300 text-2xl">📱</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {clientesFiltrados.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                    <p className="text-4xl mb-2">🤷‍♂️</p>
                    <p>No encontramos clientes con ese nombre.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Clientes;