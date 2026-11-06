// Activar los avisos al celular (nueva cita, cancelación o cambio por link).
// compacto: la tarjetita de la Agenda que invita a activarlos.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellRing, Smartphone, X } from 'lucide-react';
import { soportaAvisos, iphoneSinInstalar, permisoAvisos, avisosActivos, activarAvisos, desactivarAvisos, listarDispositivos, quitarDispositivo, probarAvisos } from '../lib/avisos';
import { useSesion } from '../lib/sesion';
import { Interruptor } from './EditorHorario';
import BotonInstalar from './BotonInstalar';

const CLAVE_NO = 'avisosAhoraNo';
const errorAviso = (e) => toast.error(
  e.message === 'sin-permiso' ? 'Diste "No permitir". Actívalos desde el candado junto a la dirección de la página.'
    : e.message === 'sin-sw' ? 'Recarga la página e inténtalo de nuevo.'
      : e.message === 'sin-soporte' ? 'Este navegador no puede recibir avisos.'
        : e.message === 'sin-servidor' ? 'Los avisos todavía no están listos en el servidor. Inténtalo más tarde.' : 'No se pudieron activar los avisos.',
);

export function InvitarAvisos() {
  const { negocio } = useSesion();
  const [ver, setVer] = useState(false);
  useEffect(() => {
    let no = false; try { no = localStorage.getItem(CLAVE_NO) === '1'; } catch { /* sin almacenamiento */ }
    if (no || !('Notification' in window) || permisoAvisos() === 'denied') return;
    avisosActivos().then((a) => setVer(!a)).catch(() => {});
  }, []);
  if (!ver) return null;
  const cerrar = () => { setVer(false); try { localStorage.setItem(CLAVE_NO, '1'); } catch { /* sin almacenamiento */ } };
  return (
    <div className="card mb-5 flex items-center gap-3 border-ink/20 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rojo-soft text-rojo"><BellRing size={18} /></span>
      <p className="min-w-0 flex-1 text-sm"><b>¿Te aviso cuando alguien aparte?</b> <span className="text-ink-2">Te llega al celular cuando un cliente aparta, cancela o cambia su cita.</span></p>
      <button onClick={() => activarAvisos(negocio.id).then(() => { setVer(false); toast.success('Avisos activados en este celular'); }, errorAviso)} className="btn-primary shrink-0 px-3 py-2 text-sm">Activar</button>
      <button onClick={cerrar} className="p-1 text-ink-3 hover:text-ink" aria-label="Ahora no"><X size={16} /></button>
    </div>
  );
}

export default function AvisosCelular() {
  const { negocio, demo } = useSesion();
  const [activo, setActivo] = useState(null);
  const [dispositivos, setDispositivos] = useState([]);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = () => {
    avisosActivos().then(setActivo).catch(() => setActivo(false));
    listarDispositivos(negocio.id).then(setDispositivos).catch(() => setDispositivos([]));
  };
  useEffect(cargar, [negocio.id]);

  async function cambiar(v) {
    setTrabajando(true);
    try {
      if (v) { await activarAvisos(negocio.id); toast.success('Avisos activados en este celular'); }
      else { await desactivarAvisos(negocio.id); toast.success('Avisos apagados en este celular'); }
    } catch (e) { errorAviso(e); }
    setTrabajando(false); cargar();
  }
  async function probar() {
    setTrabajando(true);
    try { await probarAvisos(); toast.success('Aviso enviado. Revisa tu celular.'); } catch (e) { toast.error(e.message); }
    setTrabajando(false);
  }

  if (iphoneSinInstalar()) {
    return (
      <div className="card p-4">
        <p className="flex items-center gap-2 font-semibold"><Smartphone size={18} /> Primero instala Filo en tu iPhone</p>
        <p className="mt-1 text-sm text-ink-2">En iPhone los avisos solo llegan a la app instalada: toca Compartir → «Agregar a inicio», ábrela desde ahí y vuelve a esta sección.</p>
        <BotonInstalar className="btn-ghost mt-3" />
      </div>
    );
  }
  if (!soportaAvisos() && !demo) return <p className="text-sm text-ink-2">Este navegador no puede recibir avisos. Abre Filo en Chrome (Android o computadora) o instálala en tu celular.</p>;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3">
        <Interruptor activo={!!activo} label="Avisos en este celular" onChange={(v) => !trabajando && cambiar(v)} />
        <span><span className="block font-semibold">Avisos en este celular</span>
          <span className="block text-sm text-ink-2">{activo ? 'Te avisamos al apartar, cancelar o cambiar por link.' : 'Apagados en este celular.'}</span></span>
      </label>
      {permisoAvisos() === 'denied' && <p className="rounded bg-ambar-soft px-3 py-2 text-sm text-ambar">Este navegador tiene los avisos bloqueados. Permítelos desde el candado junto a la dirección de la página y vuelve a intentarlo.</p>}
      {activo && <button onClick={probar} disabled={trabajando} className="btn-ghost"><Bell size={16} /> Mandarme un aviso de prueba</button>}
      {dispositivos.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Reciben avisos</p>
          <div className="card divide-y divide-line">
            {dispositivos.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><Smartphone size={15} className="text-ink-3" /> {d.nombre}</span>
                {!demo && <button onClick={() => quitarDispositivo(negocio.id, d.id).then(cargar)} className="text-ink-3 hover:text-rojo" aria-label={`Quitar ${d.nombre}`}><X size={15} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-ink-3">Actívalos en cada celular o computadora donde quieras recibirlos (por ejemplo, el tuyo y el de la recepción).</p>
    </div>
  );
}
