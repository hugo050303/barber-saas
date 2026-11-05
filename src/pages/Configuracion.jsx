import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth, firestore } from '../firebase';
import { useSesion } from '../lib/sesion';
import { soloDigitos } from '../lib/formato';
import { PageHeader, Field } from '../components/ui';
import { HORARIO_DEFAULT } from '../config';

const DIAS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']];

function Seccion({ titulo, texto, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div><h2 className="text-lg font-bold">{titulo}</h2>{texto && <p className="mt-1 text-sm text-ink-2">{texto}</p>}</div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

export default function Configuracion() {
  const { negocio, user } = useSesion();
  const h0 = { ...HORARIO_DEFAULT, ...(negocio.horario || {}) };
  const [f, setF] = useState({
    nombre: negocio.nombre || '', direccion: negocio.direccion || '', whatsapp: negocio.whatsapp || '',
    telefono: negocio.telefono || '', mensaje_ticket: negocio.mensaje_ticket || '',
  });
  const [horario, setHorario] = useState(h0);
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    if (aMin(horario.cierra) <= aMin(horario.abre)) return toast.error('La hora de cierre debe ser después de la de apertura.');
    if (horario.dias.length === 0) return toast.error('Elige al menos un día de trabajo.');
    setGuardando(true);
    try {
      await updateDoc(doc(firestore, 'negocios', negocio.id), {
        nombre: f.nombre.trim(), direccion: f.direccion.trim(), whatsapp: soloDigitos(f.whatsapp), telefono: soloDigitos(f.telefono),
        mensaje_ticket: f.mensaje_ticket.trim(), horario,
      });
      toast.success('Cambios guardados');
    } catch { toast.error('No se pudieron guardar los cambios.'); }
    setGuardando(false);
  }

  const aMin = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
  const toggleDia = (d) => setHorario({ ...horario, dias: horario.dias.includes(d) ? horario.dias.filter((x) => x !== d) : [...horario.dias, d] });

  async function cambiarPassword() {
    try { auth.languageCode = 'es'; await sendPasswordResetEmail(auth, user.email); toast.success(`Te mandamos un enlace a ${user.email}`); }
    catch { toast.error('No se pudo enviar el correo.'); }
  }

  return (
    <>
      <PageHeader titulo="Configuración" />
      <form onSubmit={guardar}>
        <Seccion titulo="Tu barbería" texto="Así te ven tus clientes en la página de reservas.">
          <div className="space-y-4">
            <Field label="Nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={set('nombre')} /></Field>
            <Field label="Dirección"><input className="input" maxLength={120} placeholder="Av. Juárez 120, Centro" value={f.direccion} onChange={set('direccion')} /></Field>
            <Field label="WhatsApp" hint="Tus clientes te escriben a este número desde la página de reservas."><input className="input" inputMode="numeric" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
            <Field label="Link de reservas" hint="El link no cambia aunque cambies el nombre."><input className="input bg-paper" readOnly value={`${window.location.origin}/r/${negocio.slug}`} onFocus={(e) => e.target.select()} /></Field>
          </div>
        </Seccion>

        <Seccion titulo="Horario" texto="Solo se ofrecen horas dentro de este horario en tu página de reservas.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map(([d, n]) => (
                <button type="button" key={d} onClick={() => toggleDia(d)}
                  className={`w-12 rounded border py-2 text-sm font-semibold ${horario.dias.includes(d) ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-3'}`}>{n}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Abre"><input className="input" type="time" required value={horario.abre} onChange={(e) => setHorario({ ...horario, abre: e.target.value })} /></Field>
              <Field label="Cierra"><input className="input" type="time" required value={horario.cierra} onChange={(e) => setHorario({ ...horario, cierra: e.target.value })} /></Field>
              <Field label="Citas cada"><select className="input" value={horario.intervalo} onChange={(e) => setHorario({ ...horario, intervalo: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Ticket" texto="Datos que salen impresos en el ticket de Caja.">
          <div className="space-y-4">
            <Field label="Teléfono en el ticket"><input className="input" inputMode="numeric" value={f.telefono} onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
            <Field label="Mensaje al pie"><input className="input" maxLength={80} value={f.mensaje_ticket} onChange={set('mensaje_ticket')} /></Field>
          </div>
        </Seccion>

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
          <button className="btn-primary px-8 py-3" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      <Seccion titulo="Tu cuenta" texto={user.email}>
        <button onClick={cambiarPassword} className="btn-ghost">Cambiar contraseña</button>
      </Seccion>
    </>
  );
}
