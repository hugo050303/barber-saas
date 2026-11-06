// Vista previa de los links (WhatsApp, Facebook, Instagram, Google): título, descripción e imagen.
//  - api/pagina.js pone en /r/{slug} el nombre y la dirección de la barbería.
//  - api/og.js dibuja la imagen 1200×630 con el nombre de la barbería (o de Filo).
import { readFileSync } from 'node:fs';
import { baseFirestore, campos } from './firestoreRest.js';

export const MARCA = 'Filo';
const TINTA = '#1A1714'; const PAPEL = '#F5F2EC'; const ROJO = '#B4322A'; const AZUL = '#22324A';

// ---------- Datos públicos de la barbería ----------
export async function datosBarberia(slug, { pedir = fetch } = {}) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug || '')) return null;
  const leer = async (ruta) => {
    const r = await pedir(`${baseFirestore()}/${ruta}`, { signal: AbortSignal.timeout(2500) });
    return r.ok ? campos((await r.json()).fields) : null;
  };
  const s = await leer(`slugs/${slug}`);
  if (!s?.negocioId) return null;
  const n = await leer(`negocios/${s.negocioId}`);
  if (!n?.nombre) return null;
  return { slug, nombre: String(n.nombre).slice(0, 80), direccion: n.direccion ? String(n.direccion).slice(0, 140) : '' };
}

// ---------- Etiquetas del <head> ----------
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Cambia cuando cambian el nombre o la dirección (así WhatsApp y Facebook piden la imagen nueva)
export const version = (d) => { let h = 0; for (const c of `${d.nombre}|${d.direccion}`) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };

export function etiquetas({ titulo, descripcion, url, imagen, alt }) {
  return [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${MARCA}" />`,
    '<meta property="og:locale" content="es_MX" />',
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(imagen)}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(alt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(titulo)}" />`,
    `<meta name="twitter:description" content="${esc(descripcion)}" />`,
    `<meta name="twitter:image" content="${esc(imagen)}" />`,
  ].join('\n    ');
}

export function etiquetasBarberia(d, origen) {
  return etiquetas({
    titulo: `${d.nombre} · Aparta tu cita`,
    descripcion: `Aparta tu cita en ${d.nombre} en línea, sin llamadas ni esperas.${d.direccion ? ` ${d.direccion}.` : ''}`.replace(/\.\.$/, '.'),
    url: `${origen}/r/${d.slug}`,
    imagen: `${origen}/api/og?slug=${d.slug}&v=${version(d)}`,
    alt: `${d.nombre}: reserva tu cita en línea`,
  });
}

// Quita el título y las etiquetas de vista previa de index.html y pone las nuevas
export function conEtiquetas(html, bloque) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `  ${bloque}\n  </head>`);
}

// ---------- Imagen 1200×630 ----------
const fuente = (archivo) => readFileSync(new URL(`./fuentes/${archivo}`, import.meta.url));
let fuentes = null;
export function fuentesTarjeta() {
  fuentes ||= [
    { name: 'Titulo', data: fuente('archivo-titulo.ttf'), weight: 800, style: 'normal' },
    { name: 'Texto', data: fuente('archivo-texto.ttf'), weight: 500, style: 'normal' },
    { name: 'Texto', data: fuente('archivo-negrita.ttf'), weight: 700, style: 'normal' },
  ];
  return fuentes;
}

// El logo de Filo (el mismo de la app, en versión clara)
const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#F5F2EC"/><path d="M9 25 L23 7" stroke="#B4322A" stroke-width="4" stroke-linecap="round"/><path d="M9 7 L14 13" stroke="#1A1714" stroke-width="2.5" stroke-linecap="round"/></svg>')}`;
const el = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } });
const POSTE = `repeating-linear-gradient(135deg, ${ROJO} 0px, ${ROJO} 22px, ${PAPEL} 22px, ${PAPEL} 44px, ${AZUL} 44px, ${AZUL} 66px, ${PAPEL} 66px, ${PAPEL} 88px)`;

// d: { nombre, direccion } de la barbería, o nada para la tarjeta de Filo
export function tarjeta(d) {
  const filo = !d;
  const nombre = filo ? MARCA : d.nombre;
  const largo = nombre.length;
  const tam = filo ? 190 : largo <= 12 ? 150 : largo <= 18 ? 124 : largo <= 26 ? 100 : 80;
  const arriba = filo ? 'SOFTWARE PARA BARBERÍAS' : 'RESERVA TU CITA EN LÍNEA';
  const abajo = filo ? 'Agenda, reservas por link, caja y nómina. Empieza gratis.' : (d.direccion || 'Elige servicio, barbero y hora en un minuto.');
  const boton = filo ? 'Pruébalo gratis  →' : 'Aparta tu lugar  →';

  return el('div', { width: 1200, height: 630, display: 'flex', background: TINTA, fontFamily: 'Texto', position: 'relative' },
    el('div', { position: 'absolute', top: 0, left: 0, width: 1200, height: 18, backgroundImage: POSTE }),
    // Poste de barbero a la derecha
    el('div', { position: 'absolute', right: 90, top: 90, width: 86, height: 450, borderRadius: 43, backgroundImage: POSTE, border: `6px solid ${PAPEL}` }),
    el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '78px 0 64px 80px', width: 960 },
      el('div', { display: 'flex', flexDirection: 'column' },
        el('div', { color: 'rgba(245,242,236,0.6)', fontSize: 26, fontWeight: 700, letterSpacing: 5 }, arriba),
        el('div', { color: PAPEL, fontFamily: 'Titulo', fontSize: tam, lineHeight: 0.92, marginTop: 22, textTransform: 'uppercase', display: 'flex', flexWrap: 'wrap', maxHeight: tam * 0.92 * 2 + 4, overflow: 'hidden' }, nombre),
        el('div', { color: 'rgba(245,242,236,0.78)', fontSize: 32, marginTop: 26, lineHeight: 1.3, maxHeight: 84, overflow: 'hidden' }, abajo),
      ),
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 880 },
        el('div', { display: 'flex', background: ROJO, color: '#fff', fontSize: 32, fontWeight: 700, padding: '18px 34px', borderRadius: 999 }, boton),
        el('div', { display: 'flex', alignItems: 'center', color: 'rgba(245,242,236,0.7)', fontSize: 24 },
          { type: 'img', props: { src: LOGO, width: 36, height: 36, style: { marginRight: 12 } } },
          filo ? 'reservas.somosdom.com' : `con ${MARCA}`,
        ),
      ),
    ),
  );
}
