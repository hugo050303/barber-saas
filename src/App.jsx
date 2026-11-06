import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SesionProvider, useSesion } from './lib/sesion';
import { Cargando } from './components/ui';
import AppLayout from './components/AppLayout';
import { RUTA_ADMIN } from './config';
import { esDemo } from './lib/demo';

// Páginas públicas
const Landing = lazy(() => import('./pages/Landing'));
const Registro = lazy(() => import('./pages/Registro'));
const Entrar = lazy(() => import('./pages/Entrar'));
const CrearNegocio = lazy(() => import('./pages/CrearNegocio'));
const Reserva = lazy(() => import('./pages/Reserva'));
const NoEncontrado = lazy(() => import('./pages/NoEncontrado'));
const Privacidad = lazy(() => import('./pages/Privacidad'));
// Panel
const Agenda = lazy(() => import('./pages/Agenda'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Servicios = lazy(() => import('./pages/Servicios'));
const Equipo = lazy(() => import('./pages/Equipo'));
const Venta = lazy(() => import('./pages/Venta'));
const CorteCaja = lazy(() => import('./pages/CorteCaja'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Nomina = lazy(() => import('./pages/Nomina'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Plan = lazy(() => import('./pages/Plan'));
const Admin = lazy(() => import('./pages/Admin'));

const PantallaCarga = () => <div className="flex min-h-screen items-center justify-center"><Cargando texto="Cargando…" /></div>;

// Solo usuarios con sesión y con negocio creado
function ConNegocio({ children }) {
  const { user, negocio, cargando, admin } = useSesion();
  const loc = useLocation();
  if (cargando) return <PantallaCarga />;
  if (!user) return <Navigate to="/entrar" replace state={{ desde: loc.pathname }} />;
  if (!negocio) return <Navigate to={admin ? RUTA_ADMIN : '/crear-negocio'} replace />;
  return children;
}

// A quien no sea la cuenta administradora se le muestra un 404 (no se revela que el panel existe)
function SoloAdmin({ children }) {
  const { admin, cargando } = useSesion();
  if (cargando) return <PantallaCarga />;
  if (!admin) return <NoEncontrado />;
  return children;
}

// /demo: si la demo ya arrancó (main.jsx), entra al panel; si se llegó navegando dentro de la app, recarga para arrancarla
function EntrarDemo() {
  if (esDemo()) return <Navigate to="/app" replace />;
  window.location.reload();
  return <PantallaCarga />;
}

export default function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{
          duration: 3000,
          style: { background: '#1A1714', color: '#F5F2EC', borderRadius: 6, fontSize: 14 },
        }} />
        <Suspense fallback={<PantallaCarga />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/crear-negocio" element={<CrearNegocio />} />
            <Route path="/r/:slug" element={<Reserva />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/demo" element={<EntrarDemo />} />
            <Route path="/reservar" element={<Navigate to="/" replace />} />

            <Route path="/app" element={<ConNegocio><AppLayout /></ConNegocio>}>
              <Route index element={<Agenda />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="servicios" element={<Servicios />} />
              <Route path="equipo" element={<Equipo />} />
              <Route path="venta" element={<Venta />} />
              <Route path="corte" element={<CorteCaja />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="gastos" element={<Gastos />} />
              <Route path="nomina" element={<Nomina />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="plan" element={<Plan />} />
            </Route>

            <Route path={RUTA_ADMIN} element={<SoloAdmin><Admin /></SoloAdmin>} />
            <Route path="*" element={<NoEncontrado />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SesionProvider>
  );
}
