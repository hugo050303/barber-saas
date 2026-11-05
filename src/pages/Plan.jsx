import { Check, MessageCircle } from 'lucide-react';
import { useSesion } from '../lib/sesion';
import { fechaLarga, linkWhatsApp } from '../lib/formato';
import { PageHeader, Badge } from '../components/ui';
import { PRECIO_PRO, WHATSAPP_VENTAS, MARCA } from '../config';

const PRO = ['Barberos ilimitados', 'Caja con ticket impreso', 'Inventario de productos', 'Gastos y corte del día', 'Nómina y comisiones', 'Reportes del mes', `Tu página de reservas sin la marca de ${MARCA}`];

export default function Plan() {
  const { pro, negocio, user } = useSesion();
  const hasta = negocio.proHasta?.toDate?.();
  const vencido = negocio.plan === 'pro' && !pro;
  const mensaje = `Hola, quiero ${pro ? 'renovar' : 'activar'} el plan Pro de ${MARCA} para "${negocio.nombre}" (${user.email}). ¿Cómo hago el pago?`;

  return (
    <>
      <PageHeader titulo="Tu plan" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-6">
          <p className="eyebrow">Plan actual</p>
          <p className="display mt-2 text-5xl">{pro ? 'Pro' : 'Gratis'}</p>
          {pro && hasta && <p className="mt-2 text-ink-2">Vigente hasta el <b className="text-ink">{fechaLarga(hasta)}</b>.</p>}
          {vencido && <p className="mt-3"><Badge tono="rojo">Tu plan Pro venció</Badge></p>}
          {vencido && <p className="mt-2 text-sm text-ink-2">Tus datos siguen guardados. Renueva para volver a usar Caja, Inventario y demás.</p>}
          {!pro && !vencido && <p className="mt-2 text-ink-2">Agenda, reservas por link, clientes y servicios con 1 barbero.</p>}
        </div>

        <div className="card overflow-hidden">
          <div className="poste h-1.5" />
          <div className="p-6">
            <div className="flex items-baseline justify-between">
              <p className="display text-4xl">Pro</p>
              <p><span className="display text-4xl">${PRECIO_PRO}</span> <span className="text-ink-2">MXN / mes</span></p>
            </div>
            <ul className="mt-5 space-y-2">{PRO.map((x) => <li key={x} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-rojo" />{x}</li>)}</ul>
            <div className="mt-6 rounded bg-paper p-4 text-sm text-ink-2">
              <p className="font-semibold text-ink">¿Cómo se paga?</p>
              <p className="mt-1">Escríbenos, te pasamos los datos para transferencia o depósito y activamos tu mes en cuanto se confirme el pago. Sin contratos: si un mes no renuevas, regresas al plan Gratis sin perder nada.</p>
            </div>
            {WHATSAPP_VENTAS
              ? <a href={linkWhatsApp(WHATSAPP_VENTAS, mensaje)} target="_blank" rel="noreferrer" className="btn-rojo mt-5 w-full py-3.5 text-base"><MessageCircle size={18} /> {pro ? 'Renovar por WhatsApp' : 'Quiero el plan Pro'}</a>
              : <p className="mt-5 text-sm text-ink-3">Muy pronto podrás solicitarlo desde aquí.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
