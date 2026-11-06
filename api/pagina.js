// Función de Vercel: sirve la app en /r/{slug} con el nombre de la barbería en la vista previa
// (lo que ven WhatsApp, Facebook, Instagram y Google al compartir el link).
// Si algo falla, manda a la misma página sin vista previa: reservar nunca se rompe.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datosBarberia, etiquetasBarberia, conEtiquetas } from '../server/vista.js';

let plantilla = null;
export const olvidarPlantilla = () => { plantilla = null; }; // para las pruebas
async function indexHtml(origen) {
  if (plantilla) return plantilla;
  // En Vercel se pide a la misma página (archivo estático); en pruebas locales se lee de dist/
  if (process.env.VISTA_INDEX_LOCAL) plantilla = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  if (!plantilla) {
    const r = await fetch(`${origen}/index.html`, { signal: AbortSignal.timeout(2500) });
    if (r.ok) plantilla = await r.text();
  }
  return plantilla;
}

export default async function handler(req, res) {
  const slug = typeof req.query?.slug === 'string' ? req.query.slug.toLowerCase() : '';
  const resto = typeof req.query?.resto === 'string' ? req.query.resto : '';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origen = `https://${host}`;
  const ruta = `/r/${slug}${resto ? `/${resto}` : ''}`;
  try {
    const [html, datos] = await Promise.all([indexHtml(origen), datosBarberia(slug).catch(() => null)]);
    if (!html) throw new Error('sin index');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(datos ? conEtiquetas(html, etiquetasBarberia(datos, origen)) : html);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', `${ruta}?sv=1`);
    return res.status(307).end();
  }
}
