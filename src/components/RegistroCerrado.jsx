import { MessageCircle } from 'lucide-react';
import { linkWhatsApp } from '../lib/formato';
import { WHATSAPP_VENTAS, MARCA } from '../config';

// Se muestra cuando el administrador cerró el registro o se llegó al tope de barberías
export default function RegistroCerrado() {
  return (
    <div className="card p-5">
      <p className="font-semibold">Por ahora no estamos abriendo cuentas nuevas</p>
      <p className="mt-1 text-sm text-ink-2">Estamos atendiendo a las barberías que ya usan {MARCA}. Escríbenos y te avisamos en cuanto haya lugar.</p>
      {WHATSAPP_VENTAS && (
        <a href={linkWhatsApp(WHATSAPP_VENTAS, `Hola, quiero usar ${MARCA} en mi barbería. ¿Me avisan cuando haya lugar?`)} target="_blank" rel="noreferrer" className="btn-primary mt-4">
          <MessageCircle size={16} /> Apartar mi lugar
        </a>
      )}
    </div>
  );
}
