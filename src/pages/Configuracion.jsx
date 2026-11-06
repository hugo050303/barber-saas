import { useState } from 'react';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import { MapPin, Copy, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { actualizarNegocio } from '../lib/negocio';
import { useSesion } from '../lib/sesion';
import { soloDigitos, ZONAS, ZONA_DEFAULT, usarZona } from '../lib/formato';
import { PageHeader, Field, Badge } from '../components/ui';
import { FotoUnica, Galeria } from '../components/Fotos';
import { MAX_FOTOS_GALERIA, FOTOS_ACTIVAS } from '../config';
import MensajesWhatsApp from '../components/MensajesWhatsApp';
import AvisosCelular from '../components/AvisosCelular';

function Seccion({ titulo, texto, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div><h2 className="text-lg font-bold">{titulo}</h2>{texto && <p className="mt-1 text-sm text-ink-2">{texto}</p>}</div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

export default function Configuracion() {
  const { negocio, user, pro, demo } = useSesion();
  const guardarCampo = (campos) => actualizarNegocio(negocio.id, campos);
  const urlReservas = `${window.location.origin}/r/${negocio.slug}`;
  const [f, setF] = useState({
    nombre: negocio.nombre || '', direccion: negocio.direccion || '', whatsapp: negocio.whatsapp || '',
    telefono: negocio.telefono || '', mensaje_ticket: negocio.mensaje_ticket || '', zona: negocio.zona || ZONA_DEFAULT,
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarNegocio(negocio.id, {
        nombre: f.nombre.trim(), direccion: f.direccion.trim(), whatsapp: soloDigitos(f.whatsapp), telefono: soloDigitos(f.telefono),
        mensaje_ticket: f.mensaje_ticket.trim(), zona: f.zona,
      });
      usarZona(f.zona);
      toast.success('Cambios guardados');
    } catch { toast.error('No se pudieron guardar los cambios.'); }
    setGuardando(false);
  }

  async function cambiarPassword() {
    try { auth.languageCode = 'es'; await sendPasswordResetEmail(auth, user.email); toast.success(`Te mandamos un enlace a ${user.email}`); }
    catch { toast.error('No se pudo enviar el correo.'); }
  }
  async function verificar() {
    try { auth.languageCode = 'es'; await sendEmailVerification(user); toast.success('Revisa tu correo para confirmarlo.'); }
    catch { toast.error('No se pudo enviar. Espera unos minutos.'); }
  }
  const conGoogle = user.providerData?.some((p) => p.providerId === 'google.com');

  return (
    <>
      <PageHeader titulo="Configuración" />
      <form onSubmit={guardar}>
        <Seccion titulo="Tu barbería" texto="Así te ven tus clientes en la página de reservas.">
          <div className="space-y-4">
            <Field label="Nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={set('nombre')} /></Field>
            <Field label="Dirección" hint="Tus clientes la pueden abrir en Google Maps."><input className="input" maxLength={120} placeholder="Av. Juárez 120, Centro" value={f.direccion} onChange={set('direccion')} /></Field>
            <Field label="WhatsApp" hint="Tus clientes te escriben a este número desde la página de reservas."><input className="input" inputMode="numeric" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
            <Field label="Zona horaria" hint="Las horas de tu página de reservas se muestran en esta zona, sin importar dónde esté el cliente.">
              <select className="input" value={f.zona} onChange={set('zona')}>{ZONAS.map(([z, n]) => <option key={z} value={z}>{n}</option>)}</select>
            </Field>
            <Field label="Link de reservas" hint="El link no cambia aunque cambies el nombre."><input className="input bg-paper" readOnly value={`${window.location.origin}/r/${negocio.slug}`} onFocus={(e) => e.target.select()} /></Field>
          </div>
        </Seccion>

        <Seccion titulo="Horario" texto="Turnos, descansos, días cerrados y el horario de cada barbero.">
          <Link to="/app/horarios" className="card flex items-center gap-4 px-4 py-4 hover:border-ink">
            <Clock size={22} className="shrink-0 text-rojo" />
            <span className="flex-1">
              <span className="block font-semibold">Ahora el horario tiene su propia sección</span>
              <span className="block text-sm text-ink-2">Ves la semana dibujada y la editas tocando cada día.</span>
            </span>
            <ArrowRight size={18} className="text-ink-3" />
          </Link>
        </Seccion>

        <Seccion titulo="Ticket" texto="Datos que salen impresos en el ticket de Caja.">
          <div className="space-y-4">
            <Field label="Teléfono en el ticket"><input className="input" inputMode="numeric" value={f.telefono} onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
            <Field label="Mensaje al pie"><input className="input" maxLength={80} value={f.mensaje_ticket} onChange={set('mensaje_ticket')} /></Field>
          </div>
        </Seccion>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
          <button className="btn-primary px-8 py-3" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>

      {/* Fotos: se activan con FOTOS_ACTIVAS cuando el proyecto tenga Cloud Storage (plan Blaze) */}
      {FOTOS_ACTIVAS && (
      <Seccion titulo="Fotos" texto="Tu logo, una portada y fotos de tus trabajos. Se ven en tu página de reservas.">
        {!pro ? (
          <div className="card p-5">
            <Badge tono="tinta">Pro y Plus</Badge>
            <p className="mt-2 text-sm text-ink-2">Con un plan de pago tu página de reservas luce tu logo, una foto de portada y hasta {MAX_FOTOS_GALERIA} fotos de tus cortes.</p>
            <Link to="/app/plan" className="btn-rojo mt-4">Ver planes</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div><p className="mb-2 text-sm font-semibold">Logo</p>
              <FotoUnica url={negocio.logo} ruta={`negocios/${negocio.id}/logo`} etiqueta="Subir logo" forma="redonda"
                opciones={{ ladoMax: 400, cuadrada: true }} onCambio={(url) => guardarCampo({ logo: url })} /></div>
            <div><p className="mb-2 text-sm font-semibold">Portada</p>
              <FotoUnica url={negocio.portada} ruta={`negocios/${negocio.id}/portada`} etiqueta="Subir portada" forma="ancha"
                opciones={{ ladoMax: 1800 }} onCambio={(url) => guardarCampo({ portada: url })} /></div>
            <div><p className="mb-2 text-sm font-semibold">Tus trabajos</p>
              <Galeria fotos={negocio.galeria || []} rutaBase={`negocios/${negocio.id}/galeria`} max={MAX_FOTOS_GALERIA}
                onCambio={(galeria) => guardarCampo({ galeria })} /></div>
          </div>
        )}
      </Seccion>
      )}

      <Seccion titulo="Google Maps" texto="Pon tu link de reservas en tu perfil de Google para que te aparezca el botón de reservar en Maps.">
        <ol className="space-y-3 text-[15px]">
          <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">1</span><span>Copia tu link de reservas:
            <span className="mt-2 flex gap-2"><input className="input bg-paper py-2 text-sm" readOnly value={urlReservas} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-ghost shrink-0" onClick={() => navigator.clipboard.writeText(urlReservas).then(() => toast.success('Link copiado'), () => toast.error('No se pudo copiar'))}><Copy size={16} /></button></span></span></li>
          <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">2</span><span>En Google Maps o en Google busca el nombre de tu barbería y entra a tu <b>Perfil de Negocio</b> (si no tienes, créalo gratis en business.google.com).</span></li>
          <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">3</span><span>Toca <b>Editar perfil</b> → <b>Reservas</b> (o <b>Vínculos de citas</b>) y pega tu link. Google tarda unos días en mostrarlo.</span></li>
          <li className="flex gap-3"><span className="display w-5 shrink-0 text-xl text-rojo">4</span><span>Ponlo también en tu bio de Instagram, Facebook y en tu estado de WhatsApp.</span></li>
        </ol>
        <a href="https://business.google.com/" target="_blank" rel="noreferrer" className="btn-ghost mt-4"><MapPin size={16} /> Abrir Perfil de Negocio</a>
      </Seccion>

      <Seccion titulo="Tu WhatsApp" texto="Que tu WhatsApp conteste solo con tu link de reservas. Gratis, con la app de WhatsApp Business.">
        <MensajesWhatsApp negocio={negocio} url={urlReservas} key={`${negocio.nombre}|${JSON.stringify(negocio.horario)}`} />
      </Seccion>

      <Seccion titulo="Avisos al celular" texto="Una notificación cuando un cliente aparta, cancela o cambia su cita por tu link.">
        <AvisosCelular />
      </Seccion>

      {demo ? (
        <Seccion titulo="Tu cuenta" texto="Cuenta de demostración">
          <p className="text-sm text-ink-2">En tu barbería real aquí cambias tu contraseña y ves con qué cuenta entras (correo o Google).</p>
        </Seccion>
      ) : (
      <Seccion titulo="Tu cuenta" texto={user.email}>
        <div className="flex flex-wrap items-center gap-2">
          {conGoogle ? <Badge tono="verde">Entras con Google</Badge> : user.emailVerified ? <Badge tono="verde">Correo confirmado</Badge> : (
            <><Badge tono="ambar">Correo sin confirmar</Badge><button onClick={verificar} className="btn-link text-sm">Reenviar confirmación</button></>
          )}
        </div>
        {!conGoogle && <button onClick={cambiarPassword} className="btn-ghost mt-4">Cambiar contraseña</button>}
      </Seccion>
      )}
    </>
  );
}
