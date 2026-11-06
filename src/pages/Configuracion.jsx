import { useState } from 'react';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import { X, MapPin, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { actualizarNegocio } from '../lib/negocio';
import { useSesion } from '../lib/sesion';
import { soloDigitos, aMinutos, ZONAS, ZONA_DEFAULT, usarZona, diaCorto, hoyYmd } from '../lib/formato';
import { normalizarHorario, NOMBRES_DIA } from '../lib/horario';
import { PageHeader, Field, Badge } from '../components/ui';
import { FotoUnica, Galeria } from '../components/Fotos';
import { MAX_FOTOS_GALERIA, FOTOS_ACTIVAS } from '../config';
import MensajesWhatsApp from '../components/MensajesWhatsApp';

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

function Seccion({ titulo, texto, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div><h2 className="text-lg font-bold">{titulo}</h2>{texto && <p className="mt-1 text-sm text-ink-2">{texto}</p>}</div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

function Interruptor({ activo, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={label} onClick={() => onChange(!activo)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? 'bg-ink' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${activo ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
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
  const [h, setH] = useState(() => normalizarHorario(negocio.horario));
  const [nuevoCerrado, setNuevoCerrado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setDia = (d, valor) => setH({ ...h, dias: { ...h.dias, [d]: valor } });

  async function guardar(e) {
    e.preventDefault();
    for (const d of ORDEN_DIAS) {
      const x = h.dias[d];
      if (x && aMinutos(x.cierra) <= aMinutos(x.abre)) return toast.error(`${NOMBRES_DIA[d]}: la hora de cierre debe ser después de la de apertura.`);
    }
    if (!ORDEN_DIAS.some((d) => h.dias[d])) return toast.error('Abre al menos un día a la semana.');
    if (h.descanso && aMinutos(h.descanso.fin) <= aMinutos(h.descanso.inicio)) return toast.error('La hora de comida debe terminar después de empezar.');
    setGuardando(true);
    try {
      const hoy = hoyYmd();
      await actualizarNegocio(negocio.id, {
        nombre: f.nombre.trim(), direccion: f.direccion.trim(), whatsapp: soloDigitos(f.whatsapp), telefono: soloDigitos(f.telefono),
        mensaje_ticket: f.mensaje_ticket.trim(), zona: f.zona,
        horario: { ...h, cerrados: h.cerrados.filter((x) => x >= hoy).sort() }, // los días cerrados que ya pasaron se limpian solos
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

        <Seccion titulo="Horario" texto="Solo se ofrecen horas dentro de este horario. Los días de descanso de cada barbero se ponen en Equipo.">
          <div className="card divide-y divide-line">
            {ORDEN_DIAS.map((d) => {
              const dia = h.dias[d];
              return (
                <div key={d} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Interruptor activo={!!dia} label={`Abrir ${NOMBRES_DIA[d]}`} onChange={(v) => setDia(d, v ? { abre: '10:00', cierra: '20:00' } : null)} />
                  <span className={`w-24 font-medium ${dia ? '' : 'text-ink-3'}`}>{NOMBRES_DIA[d]}</span>
                  {dia ? (
                    <span className="flex items-center gap-2">
                      <input type="time" className="input w-[136px] py-1.5" value={dia.abre} onChange={(e) => setDia(d, { ...dia, abre: e.target.value })} aria-label={`${NOMBRES_DIA[d]} abre`} />
                      <span className="text-ink-3">a</span>
                      <input type="time" className="input w-[136px] py-1.5" value={dia.cierra} onChange={(e) => setDia(d, { ...dia, cierra: e.target.value })} aria-label={`${NOMBRES_DIA[d]} cierra`} />
                    </span>
                  ) : <span className="text-sm text-ink-3">Cerrado</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Interruptor activo={!!h.descanso} label="Hora de comida" onChange={(v) => setH({ ...h, descanso: v ? { inicio: '14:00', fin: '15:00' } : null })} />
            <span className="font-medium">Hora de comida</span>
            {h.descanso && (
              <span className="flex items-center gap-2">
                <input type="time" className="input w-[136px] py-1.5" value={h.descanso.inicio} onChange={(e) => setH({ ...h, descanso: { ...h.descanso, inicio: e.target.value } })} aria-label="Comida inicia" />
                <span className="text-ink-3">a</span>
                <input type="time" className="input w-[136px] py-1.5" value={h.descanso.fin} onChange={(e) => setH({ ...h, descanso: { ...h.descanso, fin: e.target.value } })} aria-label="Comida termina" />
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Citas cada"><select className="input" value={h.intervalo} onChange={(e) => setH({ ...h, intervalo: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
            <Field label="Reservar con al menos"><select className="input" value={h.anticipacion} onChange={(e) => setH({ ...h, anticipacion: Number(e.target.value) })}>{[[0, 'Sin mínimo'], [30, '30 min'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [1440, '1 día']].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></Field>
            <Field label="Reservar hasta"><select className="input" value={h.diasMaximo} onChange={(e) => setH({ ...h, diasMaximo: Number(e.target.value) })}>{[7, 14, 21, 30, 60].map((v) => <option key={v} value={v}>{v} días antes</option>)}</select></Field>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold">Días cerrados</p>
            <p className="mt-0.5 text-xs text-ink-3">Vacaciones, días festivos o cualquier día que no abras.</p>
            <div className="mt-2 flex gap-2">
              <input type="date" className="input w-auto" min={hoyYmd()} value={nuevoCerrado} onChange={(e) => setNuevoCerrado(e.target.value)} />
              <button type="button" className="btn-ghost" disabled={!nuevoCerrado} onClick={() => { if (!h.cerrados.includes(nuevoCerrado)) setH({ ...h, cerrados: [...h.cerrados, nuevoCerrado].sort() }); setNuevoCerrado(''); }}>Agregar</button>
            </div>
            {h.cerrados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {h.cerrados.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 rounded border border-line bg-card py-1 pl-2.5 pr-1 text-sm">
                    {diaCorto(d)}
                    <button type="button" onClick={() => setH({ ...h, cerrados: h.cerrados.filter((x) => x !== d) })} className="p-0.5 text-ink-3 hover:text-rojo" aria-label="Quitar"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
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
