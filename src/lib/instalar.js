// Instalar la app (PWA). El navegador avisa con "beforeinstallprompt" cuando se puede instalar;
// lo guardamos para mostrar nuestro propio botón. iPhone no tiene ese aviso: ahí se explican los pasos.
import { useSyncExternalStore } from 'react';

let aviso = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); aviso = e; avisar(); });
  window.addEventListener('appinstalled', () => { aviso = null; avisar(); });
}

export const enApp = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const esIOS = () =>
  typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useInstalar() {
  const disponible = useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, () => !!aviso, () => false);
  return {
    instalada: enApp(),
    disponible,                        // Android / Chrome / Edge: se puede instalar con un toque
    ios: esIOS() && !enApp(),          // iPhone / iPad: hay que hacerlo desde "Compartir"
    async instalar() {
      if (!aviso) return false;
      aviso.prompt();
      const { outcome } = await aviso.userChoice;
      aviso = null; avisar();
      return outcome === 'accepted';
    },
  };
}
