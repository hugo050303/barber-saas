import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { crearNegocio, configSistema } from '../lib/negocio';
import { useSesion } from '../lib/sesion';
import { soloDigitos } from '../lib/formato';
import AuthShell from '../components/AuthShell';
import RegistroCerrado from '../components/RegistroCerrado';
import { Field, Cargando } from '../components/ui';
import { RUTA_ADMIN } from '../config';

// Para cuentas que ya existen (por ejemplo, entraron con Google) pero aún no tienen barbería
export default function CrearNegocio() {
  const { user, negocio, cargando, admin } = useSesion();
  const nav = useNavigate();
  const [f, setF] = useState({ negocio: '', nombre: '', whatsapp: '' });
  const [enviando, setEnviando] = useState(false);
  const [sistema, setSistema] = useState(null);

  useEffect(() => { configSistema().then(setSistema); }, []);
  useEffect(() => { if (user?.displayName) setF((x) => ({ ...x, nombre: x.nombre || user.displayName })); }, [user]);

  if (cargando) return <div className="flex min-h-screen items-center justify-center"><Cargando texto="Cargando…" /></div>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (negocio) return <Navigate to="/app" replace />;

  async function enviar(e) {
    e.preventDefault();
    if (f.whatsapp.length !== 10) return toast.error('El WhatsApp debe tener 10 dígitos.');
    setEnviando(true);
    try {
      await crearNegocio(user, { nombre: f.negocio, dueno: f.nombre, whatsapp: f.whatsapp });
      nav('/app', { replace: true });
    } catch { toast.error('No pudimos crear tu barbería. Puede que ya no haya lugar; inténtalo más tarde.'); setEnviando(false); }
  }

  return (
    <AuthShell titulo="Un paso más" sub={`Entraste como ${user.email}. Cuéntanos de tu barbería.`}
      pie={<div className="flex flex-col items-start gap-2">
        {admin && <button onClick={() => nav(RUTA_ADMIN)} className="font-semibold text-ink underline underline-offset-4">Ir a Administración</button>}
        <button onClick={() => signOut(auth)} className="underline underline-offset-4">Usar otra cuenta</button>
      </div>}>
      {sistema === null ? <Cargando texto="Un momento…" /> : !sistema.hayLugar && !admin ? <RegistroCerrado /> : (
        <form onSubmit={enviar} className="space-y-4">
          <Field label="Nombre de la barbería"><input className="input" required maxLength={60} value={f.negocio} onChange={(e) => setF({ ...f, negocio: e.target.value })} /></Field>
          <Field label="Tu nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
          <Field label="WhatsApp de la barbería"><input className="input" required inputMode="numeric" placeholder="10 dígitos" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
          <button className="btn-rojo w-full py-3" disabled={enviando}>{enviando ? 'Creando…' : 'Crear mi barbería'}</button>
          <p className="text-xs text-ink-3">Al crear tu barbería aceptas los <Link to="/terminos" target="_blank" className="underline">Términos y condiciones</Link> y el <Link to="/privacidad" target="_blank" className="underline">Aviso de privacidad</Link>.</p>
        </form>
      )}
    </AuthShell>
  );
}
