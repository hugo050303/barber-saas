import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Importamos Supabase

// Páginas
import Sidebar from './components/Sidebar';
import Agenda from './pages/Agenda';
import Servicios from './pages/Servicios';
import Equipo from './pages/Equipo';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login'; 
import Configuracion from './pages/Configuracion';
import Inventario from './pages/Inventario';
import Venta from './pages/Venta';
import Gastos from './pages/Gastos';
import Clientes from './pages/Clientes';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Revisar si ya había una sesión guardada al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (login o logout) en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mientras Supabase revisa si estás logueado, mostramos cargando...
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-100">Cargando sistema...</div>;
  }

  // SI NO HAY SESIÓN: Mostramos SOLO el Login
  if (!session) {
    return <Login />;
  }

  // SI HAY SESIÓN: Mostramos la App completa con el Menú
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar /> {/* El menú solo sale si estás logueado */}
        <div className="flex-1 ml-64"> 
          <Routes>
            <Route path="/" element={<Agenda />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/barberos" element={<Equipo />} />
            <Route path="/panel" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/venta" element={<Venta />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/clientes" element={<Clientes />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;