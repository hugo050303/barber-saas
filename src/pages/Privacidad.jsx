// Aviso de Privacidad (borrador). Revísalo con un abogado o contador antes de publicarlo como definitivo.
import { Link } from 'react-router-dom';
import { Logo, HechoPor } from '../components/ui';
import { linkWhatsApp } from '../lib/formato';
import { MARCA, EMPRESA, PRIVACIDAD, WHATSAPP_VENTAS } from '../config';

const Pendiente = ({ children }) => <mark className="rounded-sm bg-ambar-soft px-1 text-ambar">[Por completar: {children}]</mark>;

function Bloque({ id, titulo, children }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-6">
      <h2 className="text-xl font-bold">{titulo}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-2 [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export default function Privacidad() {
  const responsable = PRIVACIDAD.responsable || <Pendiente>nombre completo o razón social</Pendiente>;
  const domicilio = PRIVACIDAD.domicilio || <Pendiente>domicilio</Pendiente>;
  const correo = PRIVACIDAD.correo ? <a href={`mailto:${PRIVACIDAD.correo}`} className="underline">{PRIVACIDAD.correo}</a> : <Pendiente>correo de contacto</Pendiente>;
  const whatsapp = WHATSAPP_VENTAS && <a href={linkWhatsApp(WHATSAPP_VENTAS, 'Hola, tengo una solicitud sobre mis datos personales.')} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>;

  return (
    <div className="min-h-screen bg-paper">
      <div className="poste h-1.5" />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 md:px-8">
        <Link to="/"><Logo /></Link>
        <HechoPor />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 md:px-8">
        <h1 className="display text-5xl md:text-6xl">Aviso de privacidad</h1>
        <p className="mt-2 text-sm text-ink-3">Última actualización: {PRIVACIDAD.actualizado}</p>
        <p className="mt-6 leading-relaxed text-ink-2">
          {MARCA} es un software para barberías hecho por <b className="text-ink">{EMPRESA.nombre}</b>. Este aviso explica qué datos personales
          tratamos, para qué y cómo puedes ejercer tus derechos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
        </p>

        <nav className="mt-6 rounded border border-line bg-card p-4 text-sm">
          <p className="font-semibold">¿Quién eres?</p>
          <ul className="mt-2 space-y-1">
            <li>• <a href="#duenos" className="underline">Tengo una barbería y uso {MARCA}</a></li>
            <li>• <a href="#clientes" className="underline">Aparté una cita en la página de una barbería</a></li>
          </ul>
        </nav>

        <div className="mt-8 space-y-8">
          <Bloque id="responsable" titulo="1. Quién es el responsable">
            <p>El responsable del tratamiento de los datos de las barberías que usan {MARCA} es <b>{responsable}</b> ({EMPRESA.nombre}), con domicilio en {domicilio}.</p>
            <p>Contacto para temas de privacidad: {correo}{whatsapp && <> o por {whatsapp}</>}.</p>
          </Bloque>

          <Bloque id="duenos" titulo="2. Si tienes una barbería y usas Filo">
            <p><b>Datos que tratamos:</b></p>
            <ul>
              <li>Tu nombre, correo electrónico, número de WhatsApp y, si entras con Google, los datos básicos de esa cuenta (nombre y correo).</li>
              <li>Los datos de tu barbería: nombre, dirección, horario, servicios, precios, equipo, fotos y la información que registres en la app (ventas, gastos, inventario).</li>
              <li>Datos de uso y técnicos necesarios para que la app funcione y sea segura (por ejemplo, el inicio de sesión).</li>
            </ul>
            <p><b>Finalidades necesarias</b> (sin ellas no podemos darte el servicio):</p>
            <ul>
              <li>Crear y administrar tu cuenta y tu página de reservas.</li>
              <li>Darte acceso a la agenda, clientes, caja, reportes y demás funciones de tu plan.</li>
              <li>Activar, renovar y dar seguimiento a tu plan de pago.</li>
              <li>Darte soporte y avisarte de cambios importantes del servicio.</li>
              <li>Proteger la seguridad de la plataforma y prevenir usos indebidos.</li>
            </ul>
            <p><b>Finalidades adicionales</b> (puedes negarte sin afectar el servicio): enviarte novedades, promociones y encuestas de {MARCA}. Para negarte, escríbenos al contacto de la sección 1.</p>
          </Bloque>

          <Bloque id="clientes" titulo="3. Si apartaste una cita en la página de una barbería">
            <p>Cuando reservas en la página de una barbería (por ejemplo, <i>/r/nombre-de-la-barberia</i>), le das tus datos <b>a esa barbería</b>. La barbería es la responsable de tus datos y {EMPRESA.nombre} solo los guarda y procesa por cuenta de ella, como proveedor del software.</p>
            <p><b>Datos:</b> tu nombre, tu número de WhatsApp, la cita que apartaste (servicio, barbero, día y hora) y, si la barbería lo registra, tu historial de visitas, consumo y notas.</p>
            <p><b>Para qué:</b> agendar y administrar tu cita, que la barbería pueda contactarte por WhatsApp sobre ella y llevar su registro de clientes.</p>
            <p>{EMPRESA.nombre} no usa tus datos para fines propios, no los vende y no te enviará publicidad. Para cualquier solicitud sobre tus datos, contacta directamente a la barbería; si no obtienes respuesta, puedes escribirnos y la canalizaremos.</p>
            <p>Otras personas que visitan la página de reservas no ven tu nombre ni tu teléfono: solo ven qué horarios están ocupados.</p>
          </Bloque>

          <Bloque id="proveedores" titulo="4. Con quién se comparten">
            <p>No vendemos ni rentamos datos personales. Para operar usamos proveedores que tratan los datos por nuestra cuenta y bajo sus propias medidas de seguridad:</p>
            <ul>
              <li><b>Google (Firebase)</b>: inicio de sesión, base de datos y almacenamiento de fotos. Sus servidores pueden estar fuera de México.</li>
              <li><b>Vercel</b>: alojamiento de la página web.</li>
            </ul>
            <p>Los mensajes que envías o recibes por WhatsApp se rigen por las políticas de WhatsApp (Meta). También podemos entregar información cuando lo ordene una autoridad competente conforme a la ley.</p>
          </Bloque>

          <Bloque id="arco" titulo="5. Tus derechos (ARCO) y cómo ejercerlos">
            <p>Tienes derecho a <b>Acceder</b> a tus datos, <b>Rectificarlos</b> si están mal, <b>Cancelarlos</b> (que los borremos) y <b>Oponerte</b> a ciertos usos, así como a revocar tu consentimiento y limitar el uso de tus datos.</p>
            <p>Envía tu solicitud a {correo} indicando: tu nombre, un medio para responderte, el derecho que quieres ejercer, los datos a los que se refiere y, en su caso, una identificación. Te responderemos dentro de los plazos que marca la ley.</p>
            <p>Si tienes cuenta, puedes corregir la mayoría de tus datos tú mismo desde la sección Configuración de tu panel.</p>
          </Bloque>

          <Bloque id="conservacion" titulo="6. Cuánto tiempo los guardamos">
            <p>Mientras tu cuenta esté activa. Si pides darla de baja, borraremos o anonimizaremos tus datos y los de tu barbería, salvo lo que debamos conservar por obligaciones legales o fiscales.</p>
          </Bloque>

          <Bloque id="tecnologias" titulo="7. Cookies y almacenamiento en tu navegador">
            <p>No usamos cookies de publicidad ni de rastreo. La app guarda en tu navegador lo necesario para funcionar: tu sesión iniciada, la última barbería donde reservaste (para abrirla más rápido) y archivos de la app para que cargue rápido o se pueda instalar. Puedes borrarlos desde la configuración de tu navegador.</p>
          </Bloque>

          <Bloque id="seguridad" titulo="8. Seguridad">
            <p>Cada barbería solo puede ver su propia información; las reglas de acceso se aplican en el servidor. La comunicación viaja cifrada (HTTPS) y los accesos se protegen con contraseña o con tu cuenta de Google.</p>
          </Bloque>

          <Bloque id="cambios" titulo="9. Cambios a este aviso">
            <p>Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha de actualización y, si el cambio es importante, avisaremos a las barberías registradas.</p>
          </Bloque>

          <Bloque id="autoridad" titulo="10. Autoridad">
            <p>Si consideras que tu derecho a la protección de datos personales fue vulnerado, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, autoridad competente en la materia.</p>
          </Bloque>
        </div>
      </main>
    </div>
  );
}
