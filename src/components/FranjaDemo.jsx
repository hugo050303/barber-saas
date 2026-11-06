// Franja fija del modo demo: avisa que nada se guarda y deja cambiar de plan al momento.
import { ArrowRight } from 'lucide-react';
import { useSesion } from '../lib/sesion';
import { cambiarPlanDemo, salirDeLaDemo } from '../lib/demo';
import { PLANES } from '../config';

export default function FranjaDemo() {
  const { plan } = useSesion();
  return (
    <div className="relative z-40 border-b border-rojo/30 bg-rojo-soft md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="text-sm text-rojo-dark"><b>Estás probando la demo.</b> <span className="hidden sm:inline">Toca lo que quieras: </span>los cambios no se guardan.</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-rojo-dark/70">Ver plan</span>
          <div className="flex rounded border border-rojo/30 bg-card p-0.5" role="radiogroup" aria-label="Plan de la demo">
            {['gratis', 'pro', 'plus'].map((p) => (
              <button key={p} role="radio" aria-checked={plan === p} onClick={() => cambiarPlanDemo(p)}
                className={`rounded-sm px-3 py-1 text-sm font-semibold transition ${plan === p ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>
                {PLANES[p].nombre}
              </button>
            ))}
          </div>
          <button onClick={() => salirDeLaDemo('/registro')} className="btn-rojo hidden px-3 py-1.5 lg:inline-flex">Crear mi barbería <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
