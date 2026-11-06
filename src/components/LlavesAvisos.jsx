// Panel de administración: genera en este navegador el par de llaves de los avisos al celular (VAPID).
// Nada se guarda ni se envía: solo se muestran para copiarlas a Vercel.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Copy } from 'lucide-react';
import { generarLlavesVapid as generar } from '../lib/vapid';

export default function LlavesAvisos() {
  const [llaves, setLlaves] = useState(null);
  const copiar = (t) => navigator.clipboard.writeText(t).then(() => toast.success('Copiada'), () => toast.error('No se pudo copiar'));
  return (
    <div className="card mt-10 p-5">
      <p className="flex items-center gap-2 font-bold"><KeyRound size={18} /> Llaves de los avisos al celular</p>
      <p className="mt-1 text-sm text-ink-2">
        Se hacen <b>una sola vez</b>. Genera el par, cópialo a Vercel → Settings → Environment Variables
        (Production y Preview) y vuelve a desplegar. No se guardan en ningún lado: si cierras esta página sin copiarlas, genera otras.
        Si un día las cambias, cada barbería tendrá que volver a activar sus avisos.
      </p>
      {!llaves ? (
        <button onClick={() => generar().then(setLlaves, () => toast.error('Este navegador no pudo generar las llaves.'))} className="btn-ghost mt-4"><KeyRound size={16} /> Generar llaves</button>
      ) : (
        <div className="mt-4 space-y-3">
          {[['VAPID_PUBLIC_KEY', llaves.publica], ['VAPID_PRIVATE_KEY', llaves.privada]].map(([nombre, valor]) => (
            <div key={nombre}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">{nombre}</p>
              <div className="flex gap-2">
                <input className="input bg-paper font-mono text-xs" readOnly value={valor} onFocus={(e) => e.target.select()} />
                <button onClick={() => copiar(valor)} className="btn-ghost shrink-0 px-3" aria-label={`Copiar ${nombre}`}><Copy size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
