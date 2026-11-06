import { Link } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { useSesion } from '../lib/sesion';
import { fechaLarga, linkWhatsApp, dinero } from '../lib/formato';
import { PageHeader, Badge } from '../components/ui';
import { PLANES, FUNDADOR, WHATSAPP_VENTAS, MARCA, MAX_FOTOS_GALERIA, FOTOS_ACTIVAS } from '../config';
import { cambiarPlanDemo } from '../lib/demo';

const pronto = FOTOS_ACTIVAS ? '' : ' (próximamente)';
const INCLUYE = {
  pro: ['Hasta 3 barberos', 'Caja con ticket impreso', 'Inventario, gastos y corte del día', 'Nómina y reportes del mes', `Logo, portada y ${MAX_FOTOS_GALERIA} fotos en tu página${pronto}`, `Tu página sin la marca de ${MARCA}`],
  plus: ['Todo lo del plan Pro', 'Barberos ilimitados', `Fotos de cada barbero${pronto}`],
};

function Tarjeta({ id, actual, fundador, user, negocio, demo }) {
  const p = PLANES[id];
  const mensual = id === 'pro' && fundador ? FUNDADOR.precio : p.mensual;
  const esActual = actual === id;
  const mensaje = `Hola, quiero ${esActual ? 'renovar' : 'contratar'} el plan ${p.nombre} de ${MARCA} para "${negocio.nombre}" (${user.email}). ¿Cómo hago el pago?`;
  return (
    <div className={`card flex flex-col overflow-hidden ${id === 'pro' ? 'border-ink' : ''}`}>
      {id === 'pro' && <div className="poste h-1.5" />}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="display text-4xl">{p.nombre}</p>
          {esActual ? <Badge tono="verde">Tu plan</Badge> : id === 'pro' && fundador ? <Badge tono="rojo">Precio fundador</Badge> : null}
        </div>
        <p className="mt-3">
          <span className="display text-5xl">{dinero(mensual).replace('.00', '')}</span> <span className="text-ink-2">MXN / mes</span>
          {id === 'pro' && fundador && <span className="ml-2 text-ink-3 line-through">{dinero(p.mensual).replace('.00', '')}</span>}
        </p>
        {!(id === 'pro' && fundador) && <p className="mt-1 text-sm text-ink-3">o {dinero(p.anual).replace('.00', '')} al año (2 meses gratis)</p>}
        <ul className="mt-5 flex-1 space-y-2">{INCLUYE[id].map((x) => <li key={x} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-rojo" />{x}</li>)}</ul>
        {demo
          ? <button onClick={() => cambiarPlanDemo(id)} disabled={esActual} className={`${id === 'pro' ? 'btn-rojo' : 'btn-primary'} mt-6 w-full py-3`}>{esActual ? `Estás viendo ${p.nombre}` : `Ver la demo con ${p.nombre}`}</button>
          : WHATSAPP_VENTAS
          ? <a href={linkWhatsApp(WHATSAPP_VENTAS, mensaje)} target="_blank" rel="noreferrer" className={`${id === 'pro' ? 'btn-rojo' : 'btn-primary'} mt-6 w-full py-3`}><MessageCircle size={18} /> {esActual ? 'Renovar' : `Quiero ${p.nombre}`}</a>
          : <p className="mt-6 text-sm text-ink-3">Muy pronto podrás solicitarlo desde aquí.</p>}
      </div>
    </div>
  );
}

export default function Plan() {
  const { plan, negocio, user, demo } = useSesion();
  const hasta = negocio.proHasta?.toDate?.();
  const vencido = ['pro', 'plus'].includes(negocio.plan) && plan === 'gratis';

  return (
    <>
      <PageHeader titulo="Tu plan" />
      <div className="card mb-6 flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Plan actual</p>
          <p className="display mt-1 text-4xl">{PLANES[plan].nombre}</p>
        </div>
        <div className="text-sm text-ink-2 sm:text-right">
          {plan !== 'gratis' && hasta && <p>Vigente hasta el <b className="text-ink">{fechaLarga(hasta)}</b></p>}
          {vencido && <p><Badge tono="rojo">Tu plan venció</Badge> Tus datos siguen guardados; renueva para volver a usarlo todo.</p>}
          {plan === 'gratis' && !vencido && <p>Agenda, reservas por link, clientes y servicios con 1 barbero.</p>}
          {negocio.fundador && <p className="mt-1"><Badge tono="rojo">Precio fundador de por vida</Badge></p>}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta id="pro" actual={plan} fundador={negocio.fundador} user={user} negocio={negocio} demo={demo} />
        <Tarjeta id="plus" actual={plan} fundador={false} user={user} negocio={negocio} demo={demo} />
      </div>

      <div className="mt-6 rounded bg-card p-5 text-sm text-ink-2">
        <p className="font-semibold text-ink">¿Cómo se paga?</p>
        <p className="mt-1">Escríbenos, te pasamos los datos para transferencia o depósito y activamos tu plan en cuanto se confirme el pago. Sin contratos: si un mes no renuevas, regresas al plan Gratis sin perder nada. <Link to="/terminos#pagos" className="underline">Términos de pago</Link>.</p>
      </div>
    </>
  );
}
