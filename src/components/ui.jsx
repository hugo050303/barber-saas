// Componentes visuales compartidos.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Lock, Loader2 } from 'lucide-react';
import { MARCA, EMPRESA } from '../config';

export function Logo({ className = '', claro = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="6" fill={claro ? '#F5F2EC' : '#1A1714'} />
        <path d="M9 25 L23 7" stroke="#B4322A" strokeWidth="4" strokeLinecap="round" />
        <path d="M9 7 L14 13" stroke={claro ? '#1A1714' : '#F5F2EC'} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="display text-2xl">{MARCA}</span>
    </span>
  );
}

export function PageHeader({ titulo, sub, children }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="display text-4xl md:text-5xl">{titulo}</h1>
        {sub && <p className="mt-2 max-w-xl text-[15px] text-ink-2">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Modal({ abierto, onClose, titulo, children, ancho = 'max-w-md' }) {
  useEffect(() => {
    if (!abierto) return;
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, onClose]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded ${ancho}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="display text-3xl">{titulo}</h2>
          <button onClick={onClose} className="-m-1 p-1 text-ink-3 hover:text-ink" aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Vacio({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {Icono && <Icono size={28} strokeWidth={1.5} className="mb-3 text-ink-3" />}
      <p className="font-semibold">{titulo}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-2">{children}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

// Siluetas de carga (se sienten más rápidas que un texto de "Cargando")
export function Cargando({ texto, filas = 4 }) {
  if (texto) {
    return <div className="flex items-center gap-2 py-8 text-sm text-ink-3"><Loader2 size={16} className="animate-spin" /> {texto}</div>;
  }
  return (
    <div className="card divide-y divide-line" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2"><div className="esqueleto h-3.5" style={{ width: `${55 - i * 7}%` }} /><div className="esqueleto h-3 w-1/3" /></div>
          <div className="esqueleto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

const TONOS = {
  neutro: 'bg-paper text-ink-2 border-line',
  rojo: 'bg-rojo-soft text-rojo-dark border-transparent',
  verde: 'bg-verde-soft text-verde border-transparent',
  ambar: 'bg-ambar-soft text-ambar border-transparent',
  tinta: 'bg-ink text-paper border-transparent',
};
export function Badge({ tono = 'neutro', children }) {
  return <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONOS[tono]}`}>{children}</span>;
}

export function Stat({ label, valor, nota, tono }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${tono === 'rojo' ? 'text-rojo' : tono === 'verde' ? 'text-verde' : ''}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-ink-3">{nota}</p>}
    </div>
  );
}

// Bloquea una sección del plan Pro
export function SoloPro({ titulo, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="poste h-1.5" />
      <div className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-lg">
          <Badge tono="tinta"><Lock size={11} /> Plan Pro</Badge>
          <h2 className="display mt-3 text-3xl">{titulo}</h2>
          <p className="mt-2 text-[15px] text-ink-2">{children}</p>
        </div>
        <Link to="/app/plan" className="btn-rojo shrink-0">Ver plan Pro</Link>
      </div>
    </div>
  );
}

// "Un producto de Somos Dom"
export function HechoPor({ claro = false, className = '' }) {
  return (
    <a href={EMPRESA.sitio} target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-2 text-xs ${claro ? 'text-paper/60 hover:text-paper' : 'text-ink-3 hover:text-ink'} ${className}`}>
      <span>Un producto de</span>
      <img src={EMPRESA.logo} alt="" className="h-5 w-5 rounded-full" />
      <span className="font-semibold">{EMPRESA.nombre}</span>
    </a>
  );
}
