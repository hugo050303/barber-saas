// Función de Vercel: imagen de vista previa (1200×630) para WhatsApp, Facebook, etc.
//   GET /api/og              -> tarjeta de Filo
//   GET /api/og?slug=xxx     -> tarjeta con el nombre y la dirección de esa barbería
import { ImageResponse } from '@vercel/og';
import { datosBarberia, tarjeta, fuentesTarjeta } from '../server/vista.js';

export default async function handler(req, res) {
  const slug = typeof req.query?.slug === 'string' ? req.query.slug : '';
  let datos = null;
  if (slug) datos = await datosBarberia(slug).catch(() => null);
  try {
    const imagen = new ImageResponse(tarjeta(datos), { width: 1200, height: 630, fonts: fuentesTarjeta() });
    const png = Buffer.from(await imagen.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    // Con ?v= (cambia si cambia el nombre) se guarda mucho tiempo; sin él, un día
    res.setHeader('Cache-Control', req.query?.v && datos ? 'public, max-age=86400, s-maxage=31536000, immutable' : 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(png);
  } catch {
    return res.status(500).json({ error: 'No se pudo dibujar la imagen.' });
  }
}
