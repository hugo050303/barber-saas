// Mensajes listos para el WhatsApp Business de la barbería (gratis, sin bots):
// bienvenida automática, mensaje de ausencia y respuesta rápida, todos con su link de reservas.
import { useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Check } from 'lucide-react';
import { resumenHorario } from '../lib/horario';

function Mensaje({ titulo, donde, texto, onCambio }) {
  const [copiado, setCopiado] = useState(false);
  const area = useRef(null);
  // El cuadro crece con el texto (en celular los renglones se doblan)
  useLayoutEffect(() => {
    const el = area.current; if (!el) return;
    const ajustar = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [texto]);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { toast.error('No se pudo copiar. Mantén presionado el texto para copiarlo.'); }
  };
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold">{titulo}</p>
          <p className="text-xs text-ink-3">{donde}</p>
        </div>
        <button type="button" onClick={copiar} className="btn-ghost shrink-0 px-3 py-2">{copiado ? <Check size={16} /> : <Copy size={16} />}{copiado ? 'Copiado' : 'Copiar'}</button>
      </div>
      {/* Se puede editar antes de copiar */}
      <textarea ref={area} className="block w-full resize-none overflow-hidden bg-[#E7F8E9] px-4 py-3 text-[15px] leading-relaxed text-ink outline-none" rows={2}
        value={texto} onChange={(e) => onCambio(e.target.value)} aria-label={titulo} />
    </div>
  );
}

export default function MensajesWhatsApp({ negocio, url }) {
  const horario = resumenHorario(negocio.horario);
  const [bienvenida, setBienvenida] = useState(
    `¡Hola! 💈 Gracias por escribir a ${negocio.nombre}.\nAparta tu cita en 30 segundos aquí 👉 ${url}\nAhí ves las horas libres de cada barbero.\nSi tienes otra duda, en un momento te contestamos.`,
  );
  const [ausencia, setAusencia] = useState(
    `¡Hola! Ahorita estamos cerrados ⏰\nNuestro horario: ${horario}.\nPuedes apartar tu cita a cualquier hora aquí 👉 ${url}`,
  );
  const [rapida, setRapida] = useState(`Aparta tu cita aquí 👉 ${url}`);

  return (
    <div className="space-y-4">
      <ol className="space-y-2 text-[15px]">
        <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">1</span><span>Usa la app <b>WhatsApp Business</b> (la del ícono con la "B"). Es gratis y puedes pasar tu número sin perder tus chats.</span></li>
        <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">2</span><span>Entra a <b>Ajustes → Herramientas para la empresa</b>.</span></li>
        <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">3</span><span>Copia cada mensaje de abajo y pégalo en su lugar. Puedes cambiar el texto antes de copiarlo.</span></li>
      </ol>
      <Mensaje titulo="Mensaje de bienvenida" donde="Herramientas para la empresa → Mensaje de bienvenida → Enviar a: todos. Le llega solo a quien te escribe por primera vez (o tras 14 días sin platicar)."
        texto={bienvenida} onCambio={setBienvenida} />
      <Mensaje titulo="Mensaje de ausencia" donde="Herramientas para la empresa → Mensaje de ausencia → Horario: fuera del horario de atención (pon tu horario en el perfil de empresa)."
        texto={ausencia} onCambio={setAusencia} />
      <Mensaje titulo="Respuesta rápida /cita" donde='Herramientas para la empresa → Respuestas rápidas → "+" → atajo: cita. En cualquier chat escribe /cita y se pega solo.'
        texto={rapida} onCambio={setRapida} />
      <p className="text-xs text-ink-3">Estos mensajes son de la app de WhatsApp Business: no tienen costo y no ponen en riesgo tu número.</p>
    </div>
  );
}
