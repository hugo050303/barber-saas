import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importación de Páginas
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Venta from './pages/Venta';
import Servicios from './pages/Servicios';
import Inventario from './pages/Inventario';
import Equipo from './pages/Equipo';
import Clientes from './pages/Clientes';
import Gastos from './pages/Gastos';
import Configuracion from './pages/Configuracion';
import Nomina from './pages/Nomina';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Revisar sesión al iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p className="text-slate-500 animate-pulse">Cargando sistema...</p>
      </div>
    );
  }

  // SI NO HAY SESIÓN -> LOGIN
  if (!session) {
    return <Login />;
  }

  // SI HAY SESIÓN -> SISTEMA COMPLETO
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar /> {/* Menú inteligente (fijo en PC, oculto en Móvil) */}
        
        {/* CONTENEDOR PRINCIPAL
            - md:ml-64 : En pantallas medianas/grandes (PC) deja 256px de margen para el menú.
            - ml-0 : En celulares NO deja margen (usa toda la pantalla).
        */}
        <div className="flex-1 md:ml-64 transition-all duration-300">
          <Routes>
            <Route path="/" element={<Agenda />} />
            <Route path="/panel" element={<Dashboard />} />
            <Route path="/venta" element={<Venta />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/barberos" element={<Equipo />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/nomina" element={<Nomina />} />
            
            {/* Redireccionar cualquier ruta desconocida a la agenda */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;