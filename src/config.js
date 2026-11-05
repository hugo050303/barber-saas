// Ajustes generales del producto. Cambia aquí el nombre y los precios.
export const MARCA = 'Filo';

export const PRECIO_PRO = 299; // MXN al mes

// Correo de la cuenta administradora (la que ve /admin y activa planes).
// Debe coincidir con el correo usado en firestore.rules.
export const ADMIN_EMAIL = 'hugo050303@gmail.com';

// WhatsApp de ventas (10 dígitos, México). Los dueños lo usan para pagar el plan Pro.
// Si está vacío, la página de planes no muestra el botón de WhatsApp.
export const WHATSAPP_VENTAS = '';

// Límites del plan gratis
export const LIMITE_BARBEROS_GRATIS = 1;
