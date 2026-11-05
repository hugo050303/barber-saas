import { Link } from 'react-router-dom';
import { Check, ArrowRight, Link2, CalendarDays, Calculator, Wallet, MessageCircle } from 'lucide-react';
import { Logo, HechoPor } from '../components/ui';
import { linkWhatsApp } from '../lib/formato';
import { useSesion } from '../lib/sesion';
import { useEffect, useState } from 'react';
import { MARCA, PLANES, FUNDADOR, MAX_FOTOS_GALERIA, EMPRESA, WHATSAPP_VENTAS } from '../config';
import { configSistema } from '../lib/negocio';

const FUNCIONES = [
  {
    icon: Link2, titulo: 'Citas por link',
    texto: 'Pon tu link en Instagram, Facebook o en tu estado de WhatsApp. El cliente elige barbero, servicio y una hora que de verdad esté libre. Se acabaron los empalmes.',
  },
  {
    icon: CalendarDays, titulo: 'Agenda por barbero',
    texto: 'El día de cada quien en su columna. Confirmas, cobras o cancelas con un toque, y le escribes al cliente por WhatsApp desde la misma cita.',
  },
  {
    icon: Calculator, titulo: 'Caja y corte del día',
    texto: 'Vende cera, aceites y lo que tengas en el mostrador, imprime ticket de 58 mm y cierra el día sabiendo cuánto tiene que haber en el cajón.',
  },
  {
    icon: Wallet, titulo: 'Nómina sin calculadora',
    texto: 'Pones el porcentaje de cada barbero y te dice cuánto le toca por los servicios que terminó en la semana o en el mes.',
  },
];

const GRATIS = ['Agenda y reservas por link', 'Horario, comida y días cerrados', 'Directorio de clientes', 'Servicios y precios', '1 barbero'];
const PRO = ['Todo lo del plan Gratis', 'Hasta 3 barberos', 'Caja con ticket impreso', 'Inventario, gastos y corte del día', 'Nómina y reportes del mes', `Logo, portada y ${MAX_FOTOS_GALERIA} fotos de tus trabajos`, `Tu página sin la marca de ${MARCA}`];
const PLUS = ['Todo lo del plan Pro', 'Barberos ilimitados', 'Fotos de cada barbero', 'Para barberías con equipo grande'];

const FAQ = [
  ['¿Tengo que instalar algo?', 'No. Funciona en el navegador del celular, la tablet o la compu. Entras con tu correo y listo.'],
  ['¿Mis clientes necesitan crear una cuenta?', 'No. Abren tu link, eligen su hora y dejan su nombre y WhatsApp. Tú ves la cita al momento en tu agenda.'],
  ['¿Cómo pago mi plan?', 'Desde tu panel, en "Pasar a Pro". Nos mandas mensaje, pagas por transferencia o depósito y activamos tu plan en cuanto se confirma. Si pagas el año completo, te regalamos 2 meses.'],
  ['¿Qué es el precio fundador?', `Las primeras ${FUNDADOR.lugares} barberías que se suscriban al plan Pro pagan $${FUNDADOR.precio} al mes en lugar de $${PLANES.pro.mensual}, y lo conservan mientras sigan suscritas.`],
  ['¿Qué pasa si un mes no pago?', 'Tu cuenta regresa al plan Gratis. Tu agenda, tus clientes y tu historial se quedan donde están; cuando renuevas, todo vuelve a funcionar.'],
  ['¿Quién puede ver mi información?', 'Solo tú. Cada barbería tiene su espacio privado y la página pública de reservas no muestra nombres ni teléfonos de tus clientes.'],
];

function Maqueta() {
  const col = (nombre, citas) => (
    <div className="flex-1 border-l border-line first:border-l-0">
      <p className="border-b border-line px-3 py-2 text-xs font-semibold">{nombre}</p>
      <div className="space-y-1.5 p-2">
        {citas.map(([h, c, s, e]) => (
          <div key={h} className={`rounded-sm border-l-[3px] px-2 py-1.5 text-[11px] leading-tight ${e === 'ok' ? 'border-verde bg-verde-soft' : e === 'web' ? 'border-rojo bg-card' : 'border-ink bg-card'}`}>
            <p className="font-bold">{h}</p>
            <p className="truncate">{c}</p>
            <p className="truncate text-ink-3">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="card overflow-hidden shadow-[0_30px_60px_-30px_rgba(26,23,20,0.45)]">
      <div className="flex items-center justify-between border-b border-line bg-paper px-3 py-2">
        <p className="text-xs font-semibold">Hoy · jueves 6 de noviembre</p>
        <span className="rounded-sm bg-rojo px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">2 nuevas por link</span>
      </div>
      <div className="flex bg-card">
        {col('Toño', [['10:00', 'Ricardo M.', 'Corte + barba', 'ok'], ['11:00', 'Daniel R.', 'Fade', 'web'], ['12:30', 'Iván P.', 'Corte clásico', '']])}
        {col('Memo', [['10:30', 'Jorge L.', 'Barba', 'ok'], ['12:00', 'Alan S.', 'Corte niño', 'web'], ['13:00', 'Luis C.', 'Corte + cejas', '']])}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useSesion();
  const [fundadoresQuedan, setFundadoresQuedan] = useState(null);
  useEffect(() => { configSistema().then((c) => setFundadoresQuedan(Math.max(0, FUNDADOR.lugares - (c.fundadoresUsados || 0)))); }, []);
  return (
    <div className="bg-paper">
      <div className="poste h-1.5" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-5 text-sm">
          <a href="#funciones" className="hidden text-ink-2 hover:text-ink md:inline">Funciones</a>
          <a href="#precios" className="hidden text-ink-2 hover:text-ink md:inline">Precios</a>
          <a href="#preguntas" className="hidden text-ink-2 hover:text-ink md:inline">Preguntas</a>
          {user
            ? <Link to="/app" className="btn-primary">Ir a mi panel</Link>
            : <>
                <Link to="/entrar" className="font-semibold">Entrar</Link>
                <Link to="/registro" className="btn-primary hidden sm:inline-flex">Empieza gratis</Link>
              </>}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-16">
        <div>
          <p className="eyebrow">Software para barberías en México</p>
          <h1 className="display mt-4 text-[64px] md:text-[96px]">
            Silla llena.<br /><span className="text-rojo">Caja cuadrada.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
            {MARCA} junta en un solo lugar la agenda, las reservas por link, la caja y la nómina de tu barbería.
            Deja el cuaderno y deja de contestar «¿tienes lugar a las 5?» todo el día.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/registro" className="btn-rojo px-6 py-3.5 text-base">Crear mi barbería gratis <ArrowRight size={18} /></Link>
            <a href="#precios" className="btn-ghost px-6 py-3.5 text-base">Ver precios</a>
          </div>
          <p className="mt-4 text-sm text-ink-3">Sin tarjeta. Entra con Google o con tu correo y la configuras en lo que se hace un corte.</p>
        </div>
        <Maqueta />
      </section>

      {/* Funciones */}
      <section id="funciones" className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="display max-w-2xl text-5xl md:text-6xl">Hecho para cómo trabaja una barbería de verdad</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-2">
            {FUNCIONES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="bg-card p-7">
                <Icon size={22} strokeWidth={1.75} className="text-rojo" />
                <h3 className="mt-4 text-xl font-bold">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pasos */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <h2 className="display text-5xl md:text-6xl">Empiezas hoy mismo</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ['Crea tu cuenta', 'Con tu cuenta de Google o con correo y contraseña. Nada más.'],
            ['Da de alta lo básico', 'Tus servicios con precio y duración, tu equipo, tu horario y tu hora de comida.'],
            ['Comparte tu link', 'Pégalo en tu bio y en WhatsApp. Las citas empiezan a caer solas en tu agenda.'],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4">
              <span className="display text-5xl text-rojo">0{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{t}</h3>
              <p className="mt-1 text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Precios */}
      <section id="precios" className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="display text-5xl md:text-6xl">Precios claros</h2>
          <p className="mt-3 max-w-xl text-paper/70">Empieza gratis y sube de plan cuando tengas equipo o quieras llevar la caja. Pagas mes a mes, sin plazos forzosos, o un año y te regalamos 2 meses.</p>
          {fundadoresQuedan > 0 && (
            <div className="mt-8 flex flex-col gap-1 rounded border border-rojo/60 bg-rojo/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p><b>Precio fundador:</b> Pro a <b>${FUNDADOR.precio}/mes de por vida</b> para las primeras {FUNDADOR.lugares} barberías.</p>
              <p className="text-sm text-paper/70">Quedan {fundadoresQuedan} lugares</p>
            </div>
          )}
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div className="flex flex-col rounded border border-paper/15 p-7">
              <p className="eyebrow text-paper/60">Gratis</p>
              <p className="mt-3"><span className="display text-6xl">$0</span></p>
              <p className="mt-1 text-sm text-paper/60">Para el barbero que trabaja solo</p>
              <ul className="mt-6 flex-1 space-y-2.5">{GRATIS.map((f) => <li key={f} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-paper/60" />{f}</li>)}</ul>
              <Link to="/registro" className="btn mt-8 w-full border border-paper/30 text-paper hover:bg-paper/10">Crear cuenta gratis</Link>
            </div>
            <div className="flex flex-col rounded bg-paper p-7 text-ink">
              <div className="flex items-center justify-between"><p className="eyebrow">Pro</p><span className="rounded-sm bg-rojo px-2 py-0.5 text-[11px] font-bold uppercase text-white">Recomendado</span></div>
              <p className="mt-3"><span className="display text-6xl">${PLANES.pro.mensual}</span> <span className="text-ink-2">MXN al mes</span></p>
              <p className="mt-1 text-sm text-ink-3">o ${PLANES.pro.anual.toLocaleString('es-MX')} al año · para barberías con equipo y caja</p>
              <ul className="mt-6 flex-1 space-y-2.5">{PRO.map((f) => <li key={f} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-rojo" />{f}</li>)}</ul>
              <Link to="/registro" className="btn-rojo mt-8 w-full">Empezar y pasar a Pro</Link>
            </div>
            <div className="flex flex-col rounded border border-paper/15 p-7">
              <p className="eyebrow text-paper/60">Plus</p>
              <p className="mt-3"><span className="display text-6xl">${PLANES.plus.mensual}</span> <span className="text-paper/60">MXN al mes</span></p>
              <p className="mt-1 text-sm text-paper/60">o ${PLANES.plus.anual.toLocaleString('es-MX')} al año · para equipos grandes</p>
              <ul className="mt-6 flex-1 space-y-2.5">{PLUS.map((f) => <li key={f} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-paper/60" />{f}</li>)}</ul>
              <Link to="/registro" className="btn mt-8 w-full border border-paper/30 text-paper hover:bg-paper/10">Empezar y pasar a Plus</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="preguntas" className="mx-auto max-w-3xl px-4 py-20 md:px-8">
        <h2 className="display text-5xl md:text-6xl">Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map(([p, r]) => (
            <details key={p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {p}<span className="text-2xl font-light text-ink-3 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-2">{r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="display text-4xl">¿Listo para soltar el cuaderno?</h2>
            <p className="mt-2 text-ink-2">Crea tu barbería gratis y comparte tu link hoy mismo.</p>
          </div>
          <Link to="/registro" className="btn-rojo px-6 py-3.5 text-base">Crear mi barbería <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-3 md:flex-row md:items-center md:justify-between md:px-8">
          <Logo />
          <HechoPor />
          <a href={linkWhatsApp(WHATSAPP_VENTAS, `Hola, tengo una pregunta sobre ${MARCA}.`)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-ink"><MessageCircle size={14} /> ¿Dudas? Escríbenos por WhatsApp</a>
          <p>© {new Date().getFullYear()} {EMPRESA.nombre}</p>
        </div>
      </footer>
    </div>
  );
}
