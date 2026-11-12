// Dibuja la tarjeta de vista previa de "Tu Barbería" (la misma que sale al compartir un link real).
import { ImageResponse } from '@vercel/og';
import { writeFileSync } from 'node:fs';
import { tarjeta, fuentesTarjeta } from '../../server/vista.js';
const r = new ImageResponse(tarjeta({ nombre: 'Tu Barbería', direccion: '' }), { width: 1200, height: 630, fonts: fuentesTarjeta() });
writeFileSync(new URL('../capturas/og.png', import.meta.url), Buffer.from(await r.arrayBuffer()));
console.log('✓ og');
