import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import { usarNegocio } from '../db';
import { esPro, planVigente } from './negocio';
import { usarZona } from './formato';
import { ADMIN_EMAIL } from '../config';
import { esDemo, suscribirDemo, negocioDemo, usuarioDemo } from './demo';

const Ctx = createContext(null);

// Estado de sesión: usuario de Firebase, su perfil (usuarios/{uid}) y su negocio, en vivo.
export function SesionProvider({ children }) {
  const [user, setUser] = useState(undefined);      // undefined = cargando
  const [perfil, setPerfil] = useState(undefined);
  const [negocio, setNegocio] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u || null);
    if (!u) { setPerfil(null); setNegocio(null); }
  }), []);

  useEffect(() => {
    if (!user) return;
    setPerfil(undefined);
    return onSnapshot(doc(firestore, 'usuarios', user.uid),
      (s) => setPerfil(s.exists() ? s.data() : null),
      () => setPerfil(null));
  }, [user]);

  useEffect(() => {
    if (!perfil?.negocioId) { if (perfil === null) setNegocio(null); return; }
    usarNegocio(perfil.negocioId);
    setNegocio((n) => (n?.id === perfil.negocioId ? n : undefined));
    return onSnapshot(doc(firestore, 'negocios', perfil.negocioId),
      (s) => { if (s.exists()) usarZona(s.data().zona); setNegocio(s.exists() ? { id: s.id, ...s.data() } : null); },
      () => setNegocio(null));
  }, [perfil]);

  // Modo demo: sesión de demostración con los datos en memoria (sin cuenta ni contraseña)
  const demo = useSyncExternalStore(suscribirDemo, negocioDemo, () => null);
  if (esDemo() && demo) {
    const valorDemo = { user: usuarioDemo, perfil: { negocioId: 'demo' }, negocio: demo, cargando: false, pro: esPro(demo), plan: planVigente(demo), admin: false, demo: true };
    return <Ctx.Provider value={valorDemo}>{children}</Ctx.Provider>;
  }

  const cargando = user === undefined || (user && (perfil === undefined || (perfil?.negocioId && negocio === undefined)));

  const valor = {
    user, perfil, negocio, cargando,
    pro: esPro(negocio),          // plan de pago vigente (Pro o Plus)
    plan: planVigente(negocio),   // 'gratis' | 'pro' | 'plus'
    admin: !!user && user.email === ADMIN_EMAIL,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
