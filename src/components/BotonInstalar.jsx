import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { useInstalar } from '../lib/instalar';
import { Modal } from './ui';

// Botón "Instalar app". No se muestra si ya está instalada o si el navegador no lo permite.
export default function BotonInstalar({ className = '', texto = 'Instalar app', nombre = 'Filo' }) {
  const { instalada, disponible, ios, instalar } = useInstalar();
  const [pasosIOS, setPasosIOS] = useState(false);
  if (instalada || (!disponible && !ios)) return null;
  return (
    <>
      <button type="button" onClick={() => (disponible ? instalar() : setPasosIOS(true))} className={className}>
        <Download size={16} /> {texto}
      </button>
      <Modal abierto={pasosIOS} onClose={() => setPasosIOS(false)} titulo="Instalar en iPhone" ancho="max-w-sm">
        <ol className="space-y-4 text-[15px]">
          <li className="flex gap-3"><span className="display w-5 text-xl text-rojo">1</span><span>Abre esta página en <b>Safari</b>.</span></li>
          <li className="flex gap-3"><span className="display w-5 text-xl text-rojo">2</span><span>Toca <b>Compartir</b> <Share size={16} className="inline align-text-bottom" /> en la barra de abajo.</span></li>
          <li className="flex gap-3"><span className="display w-5 text-xl text-rojo">3</span><span>Elige <b>Agregar a pantalla de inicio</b> <SquarePlus size={16} className="inline align-text-bottom" /> y toca <b>Agregar</b>.</span></li>
        </ol>
        <p className="mt-4 text-sm text-ink-2">Te queda el ícono de {nombre} junto a tus apps y abre en pantalla completa.</p>
        <button onClick={() => setPasosIOS(false)} className="btn-primary mt-5 w-full">Entendido</button>
      </Modal>
    </>
  );
}
