// Dibuja las imágenes de promoción (PNG) a partir de imagenes.html.
// Uso: node marketing/src/render-imagenes.cjs [pieza] [formato]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PIEZAS = ['hero', 'avisos', 'faltas', 'negocio', 'precio', 'link'];
const FORMATOS = { post: [1080, 1350], historia: [1080, 1920] };
const OUT = path.join(__dirname, '..', 'salida', 'imagenes');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const piezas = process.argv[2] && process.argv[2] !== 'todas' ? [process.argv[2]] : PIEZAS;
  const formatos = process.argv[3] ? [process.argv[3]] : Object.keys(FORMATOS);
  for (const f of formatos) {
    const [w, h] = FORMATOS[f];
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    for (const [i, pieza] of piezas.entries()) {
      await p.goto(`file://${path.join(__dirname, 'imagenes.html')}?p=${pieza}&f=${f}`);
      await p.evaluate(() => document.fonts.ready); await p.waitForLoadState('networkidle');
      const n = PIEZAS.indexOf(pieza) + 1;
      await p.screenshot({ path: path.join(OUT, `filo-${f}-${n}-${pieza}.png`) });
      console.log('✓', f, pieza);
    }
    await p.close();
  }
  await b.close();
})();
