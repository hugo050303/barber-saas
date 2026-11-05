import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import { usarNegocio } from '../db';
import { esPro } from './negocio';
import { usarZona } from './formato';
import { ADMIN_EMAIL } from '../config';

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

  const cargando = user === undefined || (user && (perfil === undefined || (perfil?.negocioId && negocio === undefined)));

  const valor = {
    user, perfil, negocio, cargando,
    pro: esPro(negocio),
    admin: !!user && user.email === ADMIN_EMAIL,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
