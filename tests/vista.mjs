// Pruebas de la vista previa de los links (api/pagina.js y api/og.js).
// Ejecutar (después de npm run build): npx firebase-tools emulators:exec --only firestore --project barberia-659a5 "npx vite-node tests/vista.mjs"
import pagina, { olvidarPlantilla } from '../api/pagina.js';
import og from '../api/og.js';
import { conEtiquetas, etiquetasBarberia, version } from '../server/vista.js';

let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fallas++; };
process.env.VISTA_INDEX_LOCAL = '1';

function llamar(handler, query) {
  return new Promise((resolve) => {
    const res = {
      headers: {}, statusCode: 200,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(c) { this.statusCode = c; return this; },
      send(b) { resolve({ status: this.statusCode, headers: this.headers, body: b }); },
      json(b) { resolve({ status: this.statusCode, headers: this.headers, body: b }); },
      end() { resolve({ status: this.statusCode, headers: this.headers, body: null }); },
    };
    handler({ query, headers: { host: 'reservas.somosdom.com' } }, res);
  });
}

// ---------- Sin Firestore ----------
const base = '<html><head>\n<meta charset="UTF-8" />\n<meta name="description" content="x" />\n<title>Filo</title>\n<meta property="og:title" content="Filo" />\n<meta name="twitter:card" content="y" />\n</head><body></body></html>';
const d = { slug: 'el-guero', nombre: 'Barbería "El Güero" <3', direccion: 'Av. Hidalgo 45' };
const h = conEtiquetas(base, etiquetasBarberia(d, 'https://reservas.somosdom.com'));
ok((h.match(/<title>/g) || []).length === 1 && (h.match(/og:title/g) || []).length === 1 && (h.match(/twitter:card/g) || []).length === 1, 'reemplaza las etiquetas sin duplicarlas');
ok(h.includes('Barbería &quot;El Güero&quot; &lt;3 · Aparta tu cita') && !h.includes('<3 ·'), 'escapa el nombre de la barbería');
ok(h.includes(`/api/og?slug=el-guero&amp;v=${version(d)}`) && h.includes('<meta charset="UTF-8" />'), 'imagen con versión y el resto del head intacto');
ok(version(d) !== version({ ...d, nombre: 'Otro' }), 'la versión cambia si cambia el nombre');

// ---------- Con el emulador ----------
if (process.env.FIRESTORE_EMULATOR_HOST) {
  const raiz = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/barberia-659a5/databases/(default)/documents`;
  const poner = (ruta, fields) => fetch(`${raiz}/${ruta}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  await poner('slugs/barberia-el-guero', { negocioId: { stringValue: 'n1' } });
  await poner('negocios/n1', { nombre: { stringValue: 'Barbería El Güero' }, direccion: { stringValue: 'Av. Hidalgo 45, Centro, Puebla' } });

  let r = await llamar(pagina, { slug: 'barberia-el-guero' });
  ok(r.status === 200 && r.body.includes('<title>Barbería El Güero · Aparta tu cita</title>'), '/r/{slug}: título con el nombre de la barbería');
  ok(r.body.includes('og:description" content="Aparta tu cita en Barbería El Güero en línea, sin llamadas ni esperas. Av. Hidalgo 45, Centro, Puebla."'), '/r/{slug}: descripción con la dirección');
  ok(r.body.includes('og:url" content="https://reservas.somosdom.com/r/barberia-el-guero"') && /<script type="module"[^>]*src="\/assets\/index-/.test(r.body), '/r/{slug}: url correcta y la app sigue cargando');
  ok(/s-maxage=300/.test(r.headers['cache-control']), '/r/{slug}: se guarda 5 minutos en la CDN');
  r = await llamar(pagina, { slug: 'barberia-el-guero', resto: 'cita/abc123' });
  ok(r.status === 200 && r.body.includes('Barbería El Güero · Aparta tu cita'), '/r/{slug}/cita/{id}: también lleva la vista de la barbería');
  r = await llamar(pagina, { slug: 'no-existe' });
  ok(r.status === 200 && r.body.includes('<title>Filo · Software para barberías</title>'), 'barbería que no existe: la app normal (muestra su aviso)');

  r = await llamar(og, { slug: 'barberia-el-guero', v: 'x' });
  ok(r.status === 200 && r.headers['content-type'] === 'image/png' && r.body.subarray(1, 4).toString() === 'PNG' && r.body.length < 300000, `/api/og: PNG de ${Math.round(r.body.length / 1024)} KB`);
  ok(/immutable/.test(r.headers['cache-control']), '/api/og con versión: se guarda mucho tiempo');
  r = await llamar(og, {});
  ok(r.status === 200 && /s-maxage=86400/.test(r.headers['cache-control']), '/api/og sin barbería: tarjeta de Filo');
}

// ---------- Sin la app (falla al leer index.html): manda a la página normal ----------
delete process.env.VISTA_INDEX_LOCAL;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('sin red'); };
olvidarPlantilla();
const r = await llamar(pagina, { slug: 'barberia-el-guero', resto: 'cita/abc' });
ok(r.status === 307 && r.headers.location === '/r/barberia-el-guero/cita/abc?sv=1', 'si algo falla, reservar sigue funcionando (redirige sin vista previa)');
globalThis.fetch = fetchOriginal;

console.log(fallas ? `\n${fallas} FALLAS` : '\nTODO OK');
process.exit(fallas ? 1 : 0);
