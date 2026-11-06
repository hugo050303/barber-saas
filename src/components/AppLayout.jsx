import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  CalendarDays, Users, Scissors, UserRound, ShoppingBag, Package, Receipt, Calculator,
  Wallet, BarChart3, Settings, Clock, LogOut, Menu, X, Lock, Shield, ExternalLink, Crown,
} from 'lucide-react';
import { auth } from '../firebase';
import { useSesion } from '../lib/sesion';
import { Logo, HechoPor } from './ui';
import BotonInstalar from './BotonInstalar';
import { RUTA_ADMIN } from '../config';
import FranjaDemo from './FranjaDemo';
import { salirDeLaDemo } from '../lib/demo';

const NAV = [
  { grupo: 'Día a día', items: [
    { to: '/app', end: true, label: 'Agenda', icon: CalendarDays },
    { to: '/app/clientes', label: 'Clientes', icon: Users },
    { to: '/app/venta', label: 'Caja', icon: ShoppingBag, pro: true },
    { to: '/app/corte', label: 'Corte del día', icon: Calculator, pro: true },
  ] },
  { grupo: 'Negocio', items: [
    { to: '/app/servicios', label: 'Servicios', icon: Scissors },
    { to: '/app/equipo', label: 'Equipo', icon: UserRound },
    { to: '/app/horarios', label: 'Horarios', icon: Clock },
    { to: '/app/inventario', label: 'Inventario', icon: Package, pro: true },
    { to: '/app/gastos', label: 'Gastos', icon: Receipt, pro: true },
    { to: '/app/nomina', label: 'Nómina', icon: Wallet, pro: true },
    { to: '/app/reportes', label: 'Reportes', icon: BarChart3, pro: true },
  ] },
];

function Navegacion({ onNavegar }) {
  const { negocio, pro, plan, admin, demo } = useSesion();
  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded px-3 py-2 text-[15px] transition ${isActive ? 'bg-paper/10 text-paper' : 'text-paper/65 hover:text-paper'}`;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Logo claro />
        <p className="mt-4 truncate text-sm font-semibold text-paper">{negocio?.nombre}</p>
        {pro
          ? <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm bg-paper/10 py-0.5 pl-1 pr-2 text-[11px] font-semibold uppercase tracking-wide text-paper"><span className="poste h-3 w-3 rounded-sm" />{plan === 'plus' ? 'Plus' : 'Pro'}</span>
          : <p className="text-xs text-paper/50">Plan Gratis</p>}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map((g) => (
          <div key={g.grupo} className="mt-4">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/40">{g.grupo}</p>
            {g.items.map(({ to, end, label, icon: Icon, pro: esPro }) => (
              <NavLink key={to} to={to} end={end} className={link} onClick={onNavegar}>
                <Icon size={17} strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {esPro && !pro && <Lock size={12} className="text-paper/40" />}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="mt-4 border-t border-paper/10 pt-4">
          <NavLink to="/app/configuracion" className={link} onClick={onNavegar}><Settings size={17} strokeWidth={1.75} /> Configuración</NavLink>
          {pro && <NavLink to="/app/plan" className={link} onClick={onNavegar}><Crown size={17} strokeWidth={1.75} /> Tu plan</NavLink>}
          {admin && <NavLink to={RUTA_ADMIN} className={link} onClick={onNavegar}><Shield size={17} strokeWidth={1.75} /> Administración</NavLink>}
          {negocio && (demo
            // En la demo se abre en la misma pestaña para conservar los datos de prueba
            ? <Link to={`/r/${negocio.slug}`} className={link({})} onClick={onNavegar}><ExternalLink size={17} strokeWidth={1.75} /> Mi página de reservas</Link>
            : <a href={`/r/${negocio.slug}`} target="_blank" rel="noreferrer" className={link({})}><ExternalLink size={17} strokeWidth={1.75} /> Mi página de reservas</a>
          )}
        </div>
      </nav>
      {!pro && (
        <Link to="/app/plan" onClick={onNavegar} className="mx-3 mb-3 block rounded bg-rojo px-3 py-2.5 text-sm font-semibold text-white hover:bg-rojo-dark">
          Pasar a Pro →
        </Link>
      )}
      {demo ? (
        <button onClick={() => salirDeLaDemo('/registro')} className="mx-3 mb-3 block rounded bg-paper px-3 py-2.5 text-sm font-semibold text-ink hover:bg-white">
          Crear mi barbería gratis →
        </button>
      ) : <BotonInstalar className="mx-3 mb-3 flex items-center justify-center gap-2 rounded border border-paper/20 px-3 py-2.5 text-sm font-semibold text-paper hover:bg-paper/10" />}
      <button onClick={() => (demo ? salirDeLaDemo('/') : signOut(auth))} className="flex items-center gap-3 border-t border-paper/10 px-5 py-3.5 text-sm text-paper/60 hover:text-paper">
        <LogOut size={16} /> {demo ? 'Salir de la demo' : 'Cerrar sesión'}
      </button>
      <HechoPor claro className="px-5 pb-4" />
    </div>
  );
}

export default function AppLayout() {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const { demo } = useSesion();
  return (
    <div className="min-h-screen md:pl-60">
      {demo && <FranjaDemo />}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-ink md:block"><Navegacion /></aside>

      {/* Barra superior en celular */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 text-paper md:hidden">
        <Logo claro />
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú" className="p-1"><Menu size={22} /></button>
      </div>
      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink">
            <button onClick={() => setAbierto(false)} className="absolute right-3 top-5 p-1 text-paper/70" aria-label="Cerrar menú"><X size={20} /></button>
            <Navegacion onNavegar={() => setAbierto(false)} />
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div key={pathname} className="entrar"><Outlet /></div>
      </main>
    </div>
  );
}
