import { useEffect, useState } from 'react';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import { X, MapPin, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { actualizarNegocio } from '../lib/negocio';
import { useSesion } from '../lib/sesion';
import { soloDigitos, aMinutos, ZONAS, ZONA_DEFAULT, usarZona, diaCorto, hoyYmd, sumarDias, diaSemana, hora } from '../lib/formato';
import { normalizarHorario, NOMBRES_DIA, PLANTILLAS, INTERVALOS, ORDEN_SEMANA, validarTurnos, sugerirIntervalo, bloqueosVigentes, horariosLibres, textoTurnos, turnosDelDia } from '../lib/horario';
import { EditorTurnos, EditorDescansos, Interruptor } from '../components/EditorHorario';
import { db } from '../db';
import { PageHeader, Field, Badge } from '../components/ui';
import { FotoUnica, Galeria } from '../components/Fotos';
import { MAX_FOTOS_GALERIA, FOTOS_ACTIVAS } from '../config';
import MensajesWhatsApp from '../components/MensajesWhatsApp';

const ORDEN_DIAS = ORDEN_SEMANA;

function Seccion({ titulo, texto, children }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10">
      <div><h2 className="text-lg font-bold">{titulo}</h2>{texto && <p className="mt-1 text-sm text-ink-2">{texto}</p>}</div>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

// Vista previa: qué horas verían tus clientes un día de la semana
function VistaPrevia({ horario, servicios }) {
  const [dia, setDia] = useState(6);
  const duracion = servicios.length ? Math.min(...servicios.map((x) => Number(x.duracion_min) || 30)) : 30;
  let ymd = sumarDias(hoyYmd(), 1);
  while (diaSemana(ymd) !== dia) ymd = sumarDias(ymd, 1);
  const turnos = turnosDelDia({ ...horario, cerrados: [], bloqueos: [] }, ymd);
  const horas = horariosLibres({ ymd, horario: { ...horario, cerrados: [], bloqueos: [] }, duracion, ocupados: [], barbero: { id: '-' }, paraPanel: true });
  return (
    <div className="mt-6 rounded border border-dashed border-line p-4">
      <p className="text-sm font-semibold">Vista previa: así verán tus horas</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {ORDEN_SEMANA.map((d) => (
          <button type="button" key={d} onClick={() => setDia(d)} className={`w-12 rounded border py-1 text-xs font-semibold ${dia === d ? 'border-ink bg-ink text-paper' : 'border-line text-ink-3'}`}>{NOMBRES_DIA[d].slice(0, 3)}</button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">
        {turnos.length ? <>{NOMBRES_DIA[dia]}: {textoTurnos(turnos)} · <b className="text-ink">{horas.length} horas</b> para un servicio de {duracion} min</> : `${NOMBRES_DIA[dia]}: cerrado`}
      </p>
      {horas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {horas.map((x) => <span key={x} className="rounded-sm bg-paper px-1.5 py-0.5 text-xs">{hora(x)}</span>)}
        </div>
      )}
    </div>
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
  const [servicios, setServicios] = useState([]);
  useEffect(() => { db.from('servicios').select('*').then(({ data }) => setServicios(data || [])); }, []);
  const sugerido = sugerirIntervalo(servicios);

  async function guardar(e) {
    e.preventDefault();
    for (const d of ORDEN_DIAS) {
      const error = h.dias[d] && validarTurnos(h.dias[d].turnos, NOMBRES_DIA[d]);
      if (error) return toast.error(error);
    }
    if (!ORDEN_DIAS.some((d) => h.dias[d])) return toast.error('Abre al menos un día a la semana.');
    const malo = h.descansos.find((x) => aMinutos(x.fin) <= aMinutos(x.inicio));
    if (malo) return toast.error(`${malo.nombre || 'Un descanso'}: debe terminar después de empezar.`);
    setGuardando(true);
    try {
      const hoy = hoyYmd();
      await actualizarNegocio(negocio.id, {
        nombre: f.nombre.trim(), direccion: f.direccion.trim(), whatsapp: soloDigitos(f.whatsapp), telefono: soloDigitos(f.telefono),
        mensaje_ticket: f.mensaje_ticket.trim(), zona: f.zona,
        // Los bloqueos se manejan en la Agenda: se toman los más recientes para no pisarlos
        horario: { ...h, cerrados: h.cerrados.filter((x) => x >= hoy).sort(), bloqueos: bloqueosVigentes(normalizarHorario(negocio.horario).bloqueos) },
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

        <Seccion titulo="Horario" texto="Tú decides cuándo se puede reservar: turnos por día, descansos que se repiten y días cerrados. Para tapar unas horas o un día suelto usa «Bloquear horas» en la Agenda; el horario de cada barbero se ajusta en Equipo.">
          <p className="eyebrow mb-2">Empieza con una plantilla</p>
          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            {PLANTILLAS.map((pl) => (
              <button type="button" key={pl.id} onClick={() => { setH({ ...h, dias: structuredClone(pl.dias), descansos: structuredClone(pl.descansos) }); toast.success(`Plantilla "${pl.nombre}" aplicada. Ajusta lo que quieras y guarda.`); }}
                className="card px-3 py-2.5 text-left hover:border-ink">
                <span className="block text-sm font-semibold">{pl.nombre}</span>
                <span className="block text-xs text-ink-3">{pl.detalle}</span>
              </button>
            ))}
          </div>

          <p className="eyebrow mb-2">Días y turnos</p>
          <EditorTurnos dias={h.dias} onChange={(dias) => setH({ ...h, dias })} />
          <p className="mt-1.5 text-xs text-ink-3">Hasta 3 turnos por día, por ejemplo 9:00 a 13:00 y 16:00 a 21:00.</p>

          <p className="eyebrow mb-2 mt-6">Horas sin citas que se repiten</p>
          <p className="mb-2 text-xs text-ink-3">Comida, café o cualquier hora que quieras apagar siempre. Elige en qué días aplica.</p>
          <EditorDescansos descansos={h.descansos} onChange={(descansos) => setH({ ...h, descansos })} />

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Citas cada" hint={sugerido !== h.intervalo ? <>Según tus servicios te conviene <button type="button" className="font-semibold text-ink underline" onClick={() => setH({ ...h, intervalo: sugerido })}>cada {sugerido} min</button></> : 'Va bien con tus servicios.'}>
              <select className="input" value={h.intervalo} onChange={(e) => setH({ ...h, intervalo: Number(e.target.value) })}>{INTERVALOS.map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </Field>
            <Field label="Reservar con al menos"><select className="input" value={h.anticipacion} onChange={(e) => setH({ ...h, anticipacion: Number(e.target.value) })}>{[[0, 'Sin mínimo'], [15, '15 min'], [30, '30 min'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [1440, '1 día']].map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></Field>
            <Field label="Reservar hasta"><select className="input" value={h.diasMaximo} onChange={(e) => setH({ ...h, diasMaximo: Number(e.target.value) })}>{[7, 14, 21, 30, 60].map((v) => <option key={v} value={v}>{v} días antes</option>)}</select></Field>
          </div>

          <VistaPrevia horario={h} servicios={servicios} />

          <div className="mt-6">
            <p className="text-sm font-semibold">Días cerrados</p>
            <p className="mt-0.5 text-xs text-ink-3">Vacaciones, días festivos o cualquier día que no abra toda la barbería.</p>
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
