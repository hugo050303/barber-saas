// Función de Vercel: avisos al celular del barbero (ver server/avisos.js).
//   GET  /api/avisos                                                 -> llave pública para activar los avisos
//   POST /api/avisos { accion: 'cita', negocio, cita, anterior? }  -> la página de reservas, tras apartar/cancelar/cambiar
//   POST /api/avisos { accion: 'probar', idToken }                  -> el dueño se manda un aviso de prueba
import { avisarCita, avisoDePrueba, llavePublica } from '../server/avisos.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try { return res.status(200).json({ publica: llavePublica() }); } catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Solicitud inválida' }); }
  try {
    if (body?.accion === 'probar') return res.status(200).json(await avisoDePrueba(body));
    if (body?.accion === 'cita') return res.status(200).json(await avisarCita(body));
    return res.status(400).json({ error: 'Acción desconocida' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'No se pudo mandar el aviso.' });
  }
}
