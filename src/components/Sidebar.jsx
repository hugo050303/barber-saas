import React, { useEffect, useState } from 'react'; // <--- Agrega useEffect y useState
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Sidebar = () => {
  const [nombreNegocio, setNombreNegocio] = useState('Cargando...'); // Estado para el nombre

  // Al cargar el menú, buscamos el nombre en la base de datos
  useEffect(() => {
    const fetchNombre = async () => {
      const { data } = await supabase.from('configuracion').select('nombre_negocio').eq('id', 1).single();
      if (data) setNombreNegocio(data.nombre_negocio);
    };
    fetchNombre();
  }, []);
  
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
      {/* AQUÍ MOSTRAMOS EL NOMBRE DINÁMICO */}
      <div className="p-6 text-xl font-bold text-center border-b border-slate-700 flex flex-col items-center justify-center gap-2">
        <span className="text-3xl">💈</span>
        <span className="break-words w-full">{nombreNegocio}</span>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <Link to="/panel" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>📊</span> Reportes
            </Link>
          </li>
          <li>
            <Link to="/" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span>📅</span> Agenda
            </Link>
          </li>
          <li>
            <Link to="/venta" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
            <span>🛒</span> Caja / Venta
            </Link>
          </li>

          <li>
            <Link to="/servicios" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span>✂️</span> Servicios
            </Link>
          </li>
          <li>
            <Link to="/inventario" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
            <span>📦</span> Inventario
            </Link>
          </li>
          <li>
            <Link to="/barberos" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span>👤</span> Equipo
            </Link>
          </li>
          <li>
            <Link to="/clientes" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
            <span>👥</span> Clientes
            </Link>
          </li>
          {/* NUEVO LINK A CONFIGURACIÓN */}
          <li className="mt-8 border-t border-slate-700 pt-2">
            <Link to="/configuracion" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-300">
              <span>⚙️</span> Configuración
            </Link>
          </li>
          <li>
            <Link to="/gastos" className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
            <span>💸</span> Gastos
            </Link>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button 
            onClick={cerrarSesion}
            className="w-full bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white p-2 rounded transition-colors flex items-center justify-center gap-2 text-sm font-medium">
            🔒 Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;