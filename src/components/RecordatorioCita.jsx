// "¿Te recordamos tu cita?": el cliente recibe un aviso en su celular un día antes.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, Check } from 'lucide-react';
import { puedeRecordar, pedirRecordatorio, tieneRecordatorio } from '../lib/avisos';

export default function RecordatorioCita({ negocioId, citaId, className = '' }) {
  const [listo, setListo] = useState(() => tieneRecordatorio(citaId));
  const [trabajando, setTrabajando] = useState(false);
  if (!citaId || !puedeRecordar()) return null;

  async function pedir() {
    setTrabajando(true);
    try { await pedirRecordatorio(negocioId, citaId); setListo(true); }
    catch (e) {
      toast.error(e.message === 'sin-permiso' ? 'Diste "No permitir". Si cambias de opinión, permítelo desde el candado junto a la dirección.'
        : ['sin-sw', 'sin-soporte', 'sin-servidor'].includes(e.message) ? 'Este celular no pudo activar el recordatorio. Guarda la cita en tu calendario.' : e.message);
    }
    setTrabajando(false);
  }

  if (listo) {
    return (
      <p className={`flex items-center gap-2 rounded bg-verde-soft px-4 py-3 text-sm text-verde ${className}`}>
        <Check size={17} className="shrink-0" /> <span><b>Listo:</b> te avisaremos en este celular un día antes de tu cita.</span>
      </p>
    );
  }
  return (
    <div className={`card flex items-center gap-3 px-4 py-3 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rojo-soft text-rojo"><BellRing size={18} /></span>
      <p className="min-w-0 flex-1 text-sm"><b>¿Te recordamos tu cita?</b> <span className="text-ink-2">Un aviso en este celular un día antes, por si se te pasa.</span></p>
      <button onClick={pedir} disabled={trabajando} className="btn-primary shrink-0 px-3 py-2 text-sm">{trabajando ? 'Un momento…' : 'Sí, avísame'}</button>
    </div>
  );
}
