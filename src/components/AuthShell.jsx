import { Link } from 'react-router-dom';
import { Logo } from './ui';

// Marco de las pantallas de registro / entrar
export default function AuthShell({ titulo, sub, children, pie }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper md:flex">
        <Link to="/"><Logo claro /></Link>
        <div>
          <p className="display text-[72px] leading-[0.9]">Silla llena.<br /><span className="text-rojo">Caja cuadrada.</span></p>
          <p className="mt-6 max-w-sm text-paper/70">Agenda, reservas por link, caja y nómina para tu barbería.</p>
        </div>
        <div className="poste absolute bottom-0 left-0 right-0 h-2" />
      </aside>
      <main className="flex flex-col px-5 py-8 md:justify-center md:px-16">
        <Link to="/" className="mb-10 md:hidden"><Logo /></Link>
        <div className="w-full max-w-sm">
          <h1 className="display text-5xl">{titulo}</h1>
          {sub && <p className="mt-2 text-ink-2">{sub}</p>}
          <div className="mt-8">{children}</div>
          {pie && <div className="mt-8 text-sm text-ink-2">{pie}</div>}
        </div>
      </main>
    </div>
  );
}
