import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Toaster } from 'react-hot-toast';

// Páginas
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
import ReservaPublica from './pages/ReservaPublica';
import CorteCaja from './pages/CorteCaja'; // <--- NUEVA PÁGINA

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-slate-400">Cargando...</div>;

  return (
    <BrowserRouter>
      {/* Notificaciones modernas */}
      <Toaster position="top-right" toastOptions={{ className: 'rounded-xl shadow-lg border border-gray-100', duration: 3000 }} />

      <Routes>
        <Route path="/reservar" element={<ReservaPublica />} />

        <Route path="/*" element={!session ? <Login /> : (
          <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 md:ml-64 transition-all duration-300">
              <Routes>
                <Route path="/" element={<Agenda />} />
                <Route path="/panel" element={<Dashboard />} />
                <Route path="/venta" element={<Venta />} />
                <Route path="/corte" element={<CorteCaja />} /> {/* <--- NUEVA RUTA */}
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/barberos" element={<Equipo />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/gastos" element={<Gastos />} />
                <Route path="/nomina" element={<Nomina />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        )} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;