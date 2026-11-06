// Términos y condiciones (borrador). Revísalos con un abogado antes de tomarlos como definitivos.
import { Link } from 'react-router-dom';
import { Logo, HechoPor } from '../components/ui';
import { linkWhatsApp, dinero } from '../lib/formato';
import { MARCA, EMPRESA, PRIVACIDAD, WHATSAPP_VENTAS, PLANES, FUNDADOR, TERMINOS } from '../config';

function Bloque({ id, titulo, children }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-6">
      <h2 className="text-xl font-bold">{titulo}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-2 [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

const precio = (n) => dinero(n).replace('.00', '');

export default function Terminos() {
  const correo = <a href={`mailto:${PRIVACIDAD.correo}`} className="underline">{PRIVACIDAD.correo}</a>;
  const whatsapp = WHATSAPP_VENTAS && <a href={linkWhatsApp(WHATSAPP_VENTAS, `Hola, tengo una duda sobre los términos de ${MARCA}.`)} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>;

  return (
    <div className="min-h-screen bg-paper">
      <div className="poste h-1.5" />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 md:px-8">
        <Link to="/"><Logo /></Link>
        <HechoPor />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 md:px-8">
        <h1 className="display text-5xl md:text-6xl">Términos y condiciones</h1>
        <p className="mt-2 text-sm text-ink-3">Última actualización: {TERMINOS.actualizado}</p>
        <p className="mt-6 leading-relaxed text-ink-2">
          Estos términos son el acuerdo entre tu barbería y <b className="text-ink">{PRIVACIDAD.responsable}</b> ({EMPRESA.nombre}) para usar {MARCA}.
          Al crear tu cuenta o usar {MARCA} los aceptas. Los escribimos en palabras sencillas; si algo no queda claro, escríbenos.
        </p>

        <div className="mt-8 space-y-8">
          <Bloque id="servicio" titulo="1. Qué es Filo">
            <p>{MARCA} es un software en internet para administrar una barbería: agenda, página de reservas en línea, clientes, caja, inventario, gastos, nómina y reportes. Lo ofrece {EMPRESA.nombre}, con domicilio en {PRIVACIDAD.domicilio}.</p>
            <p>{MARCA} es una herramienta: <b>la barbería es quien presta sus servicios a sus clientes</b> y es responsable de ellos (horarios, precios, calidad, cobros y trato).</p>
          </Bloque>

          <Bloque id="cuenta" titulo="2. Tu cuenta">
            <ul>
              <li>Debes ser mayor de edad y dar datos reales de ti y de tu barbería.</li>
              <li>Cuida tu contraseña o tu cuenta de Google: lo que se haga con tu sesión es tu responsabilidad. Si crees que alguien entró a tu cuenta, avísanos de inmediato.</li>
              <li>Una cuenta es para una barbería. Puedes dar de alta a tu equipo como barberos dentro de ella.</li>
            </ul>
          </Bloque>

          <Bloque id="planes" titulo="3. Planes y precios">
            <ul>
              <li><b>Gratis:</b> {PLANES.gratis.barberos} barbero, agenda, página de reservas y clientes, sin costo y sin fecha de vencimiento.</li>
              <li><b>Pro:</b> {precio(PLANES.pro.mensual)} MXN al mes o {precio(PLANES.pro.anual)} MXN al año, hasta {PLANES.pro.barberos} barberos y las funciones de caja, inventario, gastos, nómina, reportes y fotos.</li>
              <li><b>Plus:</b> {precio(PLANES.plus.mensual)} MXN al mes o {precio(PLANES.plus.anual)} MXN al año, con barberos ilimitados.</li>
              <li><b>Precio fundador:</b> las primeras {FUNDADOR.lugares} barberías que se suscriban a Pro pagan {precio(FUNDADOR.precio)} MXN al mes y conservan ese precio <b>mientras su plan siga activo sin interrupción</b>. Si el plan se vence y no se renueva, el precio fundador se pierde.</li>
            </ul>
            <p>Los precios incluyen lo que se muestra en la página de planes. Podemos cambiar los precios avisándote con al menos <b>30 días</b> de anticipación; el cambio aplica a partir de tu siguiente renovación. Un precio ya pagado no cambia.</p>
          </Bloque>

          <Bloque id="pagos" titulo="4. Pagos, renovación y reembolsos">
            <ul>
              <li>Los planes de pago se pagan <b>por adelantado</b> (mensual o anual) por transferencia o depósito. Activamos tu plan cuando confirmamos el pago.</li>
              <li>No hay renovación automática ni contratos forzosos: si no renuevas, al vencer tu plan tu barbería regresa al plan Gratis.</li>
              <li>Al regresar a Gratis <b>no se borra tu información</b>: tus citas, clientes e historial se quedan. Lo que el plan Gratis no incluye (barberos extra, caja, inventario, fotos) se deja de mostrar o de poder editar hasta que vuelvas a un plan de pago.</li>
              <li>Como el servicio se puede probar gratis y en la demo antes de pagar, <b>no hacemos reembolsos</b> de periodos ya iniciados, salvo que no hayamos podido darte el servicio por una falla nuestra. En ese caso te reembolsamos la parte proporcional o te damos los días perdidos, lo que prefieras.</li>
            </ul>
          </Bloque>

          <Bloque id="clientes" titulo="5. Los datos de tus clientes">
            <p>Los nombres, teléfonos y citas de tus clientes son <b>de tu barbería</b>. {MARCA} solo los guarda y los usa para darte el servicio (por ejemplo, para mostrarte tu agenda o avisarte de una cita), conforme a nuestro <Link to="/privacidad" className="underline">Aviso de privacidad</Link>.</p>
            <p>Tú te comprometes a usar esos datos solo para atender a tus clientes (confirmar, recordar o reagendar citas, e invitarlos a regresar) y a respetar a quien te pida que no le escribas más. No los vendas ni los uses para mandar publicidad masiva no solicitada.</p>
          </Bloque>

          <Bloque id="uso" titulo="6. Uso permitido">
            <p>No puedes usar {MARCA} para:</p>
            <ul>
              <li>Actividades ilegales, engañosas o que dañen a otras personas.</li>
              <li>Publicar fotos o textos que no sean tuyos o que ofendan, discriminen o sean para adultos.</li>
              <li>Intentar entrar a cuentas o datos de otras barberías, saturar el servicio o copiar el software.</li>
              <li>Revender {MARCA} o dar acceso a otras barberías con una sola cuenta.</li>
            </ul>
            <p>Si alguien incumple estas reglas podemos suspender su cuenta. Salvo casos graves o urgentes, primero te avisamos y te damos oportunidad de corregirlo.</p>
          </Bloque>

          <Bloque id="disponibilidad" titulo="7. Disponibilidad y cambios del servicio">
            <p>Hacemos lo posible por que {MARCA} funcione todo el tiempo, pero puede haber interrupciones por mantenimiento, fallas de internet o de los proveedores que usamos (Google Firebase, Vercel, WhatsApp, navegadores). No garantizamos que el servicio esté libre de errores o disponible el 100% del tiempo.</p>
            <p>{MARCA} se mejora constantemente: podemos agregar, cambiar o quitar funciones. Si quitamos algo importante de un plan que ya pagaste, te avisamos y te damos los días proporcionales o un reembolso.</p>
            <p>Los avisos al celular dependen de que tu celular y tu navegador los permitan; los mensajes de WhatsApp los mandas tú desde tu propia cuenta.</p>
          </Bloque>

          <Bloque id="responsabilidad" titulo="8. Responsabilidad">
            <p>{MARCA} no es responsable de citas perdidas, cobros, disputas con tus clientes ni de ganancias que dejes de recibir por usar o no poder usar el servicio. En cualquier caso, nuestra responsabilidad total hacia ti se limita a lo que hayas pagado por {MARCA} en los <b>3 meses anteriores</b> al problema.</p>
            <p>Nada de esto limita los derechos que te da la ley y que no se pueden renunciar.</p>
          </Bloque>

          <Bloque id="baja" titulo="9. Dar de baja tu cuenta">
            <p>Puedes dejar de usar {MARCA} cuando quieras. Si quieres que borremos tu barbería y su información, o una copia de tus datos antes de irte, escríbenos a {correo}{whatsapp && <> o por {whatsapp}</>} y lo hacemos en un plazo máximo de 20 días hábiles.</p>
            <p>Si una cuenta del plan Gratis no se usa durante más de 12 meses, podemos avisarte y, si no respondes en 30 días, borrarla.</p>
          </Bloque>

          <Bloque id="cambios" titulo="10. Cambios a estos términos">
            <p>Si cambiamos estos términos, publicamos la nueva versión aquí con su fecha y, si el cambio es importante, te avisamos dentro de la app o por correo antes de que aplique. Si sigues usando {MARCA} después del cambio, se entiende que lo aceptas.</p>
          </Bloque>

          <Bloque id="ley" titulo="11. Ley aplicable">
            <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes de {TERMINOS.jurisdiccion}, salvo que la ley te dé derecho a otros.</p>
            <p>Contacto: {correo}{whatsapp && <> · {whatsapp}</>}</p>
          </Bloque>
        </div>
      </main>
    </div>
  );
}
