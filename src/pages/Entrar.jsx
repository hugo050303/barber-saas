import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { mensajeAuth } from '../lib/erroresAuth';
import { useSesion } from '../lib/sesion';
import AuthShell from '../components/AuthShell';
import BotonGoogle, { Separador } from '../components/BotonGoogle';
import { Field } from '../components/ui';

export default function Entrar() {
  const { user, cargando } = useSesion();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [recuperar, setRecuperar] = useState(false);

  if (!cargando && user) return <Navigate to={loc.state?.desde || '/app'} replace />;

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (err) { toast.error(mensajeAuth(err)); setEnviando(false); }
  }

  async function enviarRecuperacion(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('Te mandamos un correo para cambiar tu contraseña. Revisa también en spam.');
      setRecuperar(false);
    } catch (err) { toast.error(mensajeAuth(err)); }
    setEnviando(false);
  }

  if (recuperar) {
    return (
      <AuthShell titulo="Recupera tu acceso" sub="Escribe tu correo y te mandamos un enlace para crear una contraseña nueva."
        pie={<button onClick={() => setRecuperar(false)} className="font-semibold text-ink underline underline-offset-4">Volver a entrar</button>}>
        <form onSubmit={enviarRecuperacion} className="space-y-4">
          <Field label="Correo"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <button className="btn-primary w-full py-3" disabled={enviando}>{enviando ? 'Enviando…' : 'Mandar enlace'}</button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Entra a tu panel"
      pie={<>¿Aún no tienes cuenta? <Link to="/registro" className="font-semibold text-ink underline underline-offset-4">Crea tu barbería gratis</Link></>}>
      <BotonGoogle />
      <Separador />
      <form onSubmit={entrar} className="space-y-4">
        <Field label="Correo"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Contraseña"><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
        <button className="btn-primary w-full py-3" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" onClick={() => setRecuperar(true)} className="btn-link text-sm">Olvidé mi contraseña</button>
      </form>
    </AuthShell>
  );
}
