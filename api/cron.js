// Función de Vercel que corre cada hora (vercel.json → crons): resúmenes de la noche y recordatorios.
// Si existe la variable CRON_SECRET, Vercel la manda y aquí se exige; las tareas ya son seguras de repetir
// (cada resumen y cada recordatorio se manda una sola vez y solo a su hora).
import { enviarResumenes, enviarRecordatorios } from '../server/rutinas.js';

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).json({ error: 'No autorizado' });
  const resultado = {};
  for (const [nombre, tarea] of [['resumenes', enviarResumenes], ['recordatorios', enviarRecordatorios]]) {
    try { resultado[nombre] = await tarea(); }
    catch (e) { resultado[nombre] = { error: e.message }; }
  }
  return res.status(200).json(resultado);
}
