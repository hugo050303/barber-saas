import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Sidebar = () => {
  const [nombreNegocio, setNombreNegocio] = useState('Cargando...');
  const [isOpen, setIsOpen] = useState(false); // Estado para abrir/cerrar en móvil

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

  // Función para cerrar el menú al hacer clic en un enlace (solo en móvil)
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* --- BOTÓN HAMBURGUESA (SOLO MÓVIL) --- */}
      {/* Este botón flota arriba a la izquierda siempre en celulares */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg focus:outline-none"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* --- FONDO OSCURO (OVERLAY) --- */}
      {/* Si el menú está abierto en móvil, oscurecemos el fondo */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* --- EL MENÚ LATERAL --- */}
      {/* Usamos clases dinámicas: 
          - md:translate-x-0 -> En PC siempre se ve.
          - translate-x-0 / -translate-x-full -> En móvil entra y sale.
      */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* LOGO Y NOMBRE */}
        <div className="p-6 text-xl font-bold text-center border-b border-slate-700 flex flex-col items-center justify-center gap-2 mt-8 md:mt-0">
          <span className="text-3xl">💈</span>
          <span className="break-words w-full text-sm md:text-base">{nombreNegocio}</span>
        </div>

        {/* LISTA DE NAVEGACIÓN */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            <li>
              <Link to="/panel" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                  <span>📊</span> Reportes
              </Link>
            </li>
            <li>
              <Link to="/" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>📅</span> Agenda
              </Link>
            </li>
            <li>
              <Link to="/venta" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>🛒</span> Caja / Venta
              </Link>
            </li>
            <li>
              <Link to="/servicios" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>✂️</span> Servicios
              </Link>
            </li>
            <li>
              <Link to="/inventario" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>📦</span> Inventario
              </Link>
            </li>
            <li>
              <Link to="/barberos" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>👤</span> Equipo
              </Link>
            </li>
            <li>
              <Link to="/clientes" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>👥</span> Clientes
              </Link>
            </li>
            <li>
              <Link to="/gastos" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span>💸</span> Gastos
              </Link>
            </li>
            <li>
              <Link to="/corte" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
           <span>📠</span> Corte de Caja
             </Link>
            </li>

            <li>
              <Link to="/nomina" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span>💰</span> Nómina
              </Link>
            </li>

            <li className="mt-8 border-t border-slate-700 pt-2">
              <Link to="/configuracion" onClick={handleLinkClick} className="block p-3 rounded hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-300">
                <span>⚙️</span> Configuración
              </Link>
            </li>
          </ul>
        </nav>

        {/* BOTÓN SALIR */}
        <div className="p-4 border-t border-slate-700">
          <button 
              onClick={cerrarSesion}
              className="w-full bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white p-2 rounded transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              🔒 Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;