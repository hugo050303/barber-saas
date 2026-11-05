import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { crearNegocio } from '../lib/negocio';
import { mensajeAuth } from '../lib/erroresAuth';
import { useSesion } from '../lib/sesion';
import { soloDigitos } from '../lib/formato';
import AuthShell from '../components/AuthShell';
import { Field } from '../components/ui';

export default function Registro() {
  const { user, negocio, cargando } = useSesion();
  const nav = useNavigate();
  const [f, setF] = useState({ negocio: '', nombre: '', whatsapp: '', email: '', password: '' });
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'whatsapp' ? soloDigitos(e.target.value).slice(0, 10) : e.target.value });

  if (!cargando && user && negocio && !enviando) return <Navigate to="/app" replace />;
  if (!cargando && user && !negocio && !enviando) return <Navigate to="/crear-negocio" replace />;

  async function enviar(e) {
    e.preventDefault();
    if (f.whatsapp.length !== 10) return toast.error('El WhatsApp debe tener 10 dígitos.');
    setEnviando(true);
    try {
      const { user: u } = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
      await updateProfile(u, { displayName: f.nombre.trim() });
      await crearNegocio(u, { nombre: f.negocio, dueno: f.nombre, whatsapp: f.whatsapp });
      toast.success('¡Listo! Tu barbería ya está creada.');
      nav('/app', { replace: true });
    } catch (err) {
      toast.error(err.code?.startsWith('auth/') ? mensajeAuth(err) : 'No pudimos crear tu barbería. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <AuthShell titulo="Crea tu barbería" sub="Gratis y sin tarjeta. Después decides si pasas a Pro."
      pie={<>¿Ya tienes cuenta? <Link to="/entrar" className="font-semibold text-ink underline underline-offset-4">Entra aquí</Link></>}>
      <form onSubmit={enviar} className="space-y-4">
        <Field label="Nombre de la barbería"><input className="input" required maxLength={60} value={f.negocio} onChange={set('negocio')} placeholder="Barbería Don Pepe" /></Field>
        <Field label="Tu nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={set('nombre')} placeholder="José Hernández" autoComplete="name" /></Field>
        <Field label="WhatsApp de la barbería" hint="Tus clientes lo verán en tu página de reservas.">
          <input className="input" required inputMode="numeric" value={f.whatsapp} onChange={set('whatsapp')} placeholder="10 dígitos" />
        </Field>
        <Field label="Correo"><input className="input" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres."><input className="input" type="password" required minLength={6} value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <button className="btn-rojo w-full py-3" disabled={enviando}>{enviando ? 'Creando tu barbería…' : 'Crear mi barbería'}</button>
      </form>
    </AuthShell>
  );
}
