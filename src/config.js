// Ajustes generales del producto. Cambia aquí el nombre y los precios.
export const MARCA = 'Filo';

// Empresa que hace la app (aparece como "un producto de")
export const EMPRESA = { nombre: 'Somos Dom', lema: 'Soluciones digitales', sitio: 'https://somosdom.com', logo: '/somosdom.webp' };

// Planes (precios en MXN). Los límites de barberos también están en firestore.rules: si los cambias, cambia los dos.
export const PLANES = {
  gratis: { nombre: 'Gratis', mensual: 0, barberos: 1 },
  pro: { nombre: 'Pro', mensual: 299, anual: 2990, barberos: 3 },
  plus: { nombre: 'Plus', mensual: 499, anual: 4990, barberos: Infinity },
};

// Precio de lanzamiento: Pro a este precio de por vida para las primeras barberías
export const FUNDADOR = { precio: 199, lugares: 20 };

// Ids de documento que puede usar cada plan para sus barberos (así las reglas limitan cuántos hay)
export const SLOTS_BARBEROS = ['principal', 'b2', 'b3'];

// Dirección del panel de administración. Esconderla solo evita curiosos: la seguridad real
// está en las reglas de Firebase, que solo dejan pasar a ADMIN_EMAIL.
export const RUTA_ADMIN = '/somos053';

// Correo de la cuenta administradora (la que ve el panel de administración y activa planes).
// Debe coincidir con el correo usado en firestore.rules y storage.rules.
export const ADMIN_EMAIL = 'hugo050303@gmail.com';

// WhatsApp de ventas (10 dígitos, México). Los dueños lo usan para pagar su plan.
// Si está vacío, la página de planes no muestra el botón de WhatsApp.
export const WHATSAPP_VENTAS = '9212494549';

// Fotos (planes de pago)
export const MAX_FOTOS_GALERIA = 12;
