// Función de Vercel: subir y borrar fotos en Vercel Blob.
// La llave BLOB_READ_WRITE_TOKEN la agrega Vercel sola al conectar el Blob store al proyecto.
//
//   POST /api/fotos  (lo usa upload() de @vercel/blob/client)  -> entrega un permiso de subida de un solo uso
//   POST /api/fotos  { accion: 'borrar', url, idToken }         -> borra una foto propia
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { autorizarSubida, autorizarBorrado, OPCIONES_SUBIDA } from '../server/fotos.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Las fotos todavía no están activadas en el servidor.' });
  }
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Solicitud inválida' }); }

  try {
    if (body?.accion === 'borrar') {
      await autorizarBorrado({ url: body.url, idToken: body.idToken });
      await del(body.url);
      return res.status(200).json({ ok: true });
    }

    const respuesta = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await autorizarSubida({ pathname, idToken: clientPayload });
        return OPCIONES_SUBIDA;
      },
    });
    return res.status(200).json(respuesta);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || 'No se pudo procesar la foto.' });
  }
}
