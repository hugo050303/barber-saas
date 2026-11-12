// Captura pantallas reales de la app (modo demo, tamaño celular) para el material de promoción.
// Uso: npm run dev  (en otra terminal)  y luego  node marketing/src/capturar.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'capturas');
const FUENTES = process.env.FUENTES; // carpeta con fonts.css y .woff2 (opcional, si no hay internet)
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#1A1714"/><circle cx="200" cy="200" r="180" fill="#B4322A"/><circle cx="200" cy="200" r="164" fill="#1A1714"/><circle cx="200" cy="200" r="150" fill="none" stroke="#F5F2EC" stroke-width="3"/><g stroke="#F5F2EC" stroke-width="16" stroke-linecap="round" fill="none"><path d="M140 110 L250 270"/><path d="M260 110 L150 270"/><circle cx="135" cy="292" r="26"/><circle cx="265" cy="292" r="26"/></g></svg>`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-MX' });
  if (FUENTES) {
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(FUENTES, 'fonts.css'), 'utf8') }));
    await ctx.route(/fonts\.gstatic\.com/, (r) => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(FUENTES, path.basename(new URL(r.request().url()).pathname))) }));
  }
  await ctx.route(/firestore\.googleapis\.com|wa\.me/, (r) => r.abort());
  await ctx.route(/\/demo\/logo\.webp/, (r) => r.fulfill({ contentType: 'image/svg+xml', body: LOGO }));
  await ctx.addInitScript(`class N{constructor(){}static requestPermission(){return Promise.resolve('default')}};N.permission='default';Object.defineProperty(window,'Notification',{value:N,configurable:true});`);
  const p = await ctx.newPage(); p.on('dialog', (d) => d.accept());
  // Sin las franjas de "demo" ni los avisos flotantes
  const limpio = () => p.addStyleTag({ content: 'div.z-40.bg-rojo-soft{display:none!important} [data-rht-toaster],div[style*="z-index: 9999"]{display:none!important} *{scrollbar-width:none} ::-webkit-scrollbar{display:none}' });
  const foto = async (nombre, opciones = {}) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, `${nombre}.png`), ...opciones }); console.log('✓', nombre); };
  // Dónde queda cada botón dentro de la captura (en puntos de pantalla de 390 de ancho), para animar los toques
  const puntos = {};
  const punto = async (captura, nombre, loc) => { const r = await loc.boundingBox(); const sy = await p.evaluate(() => window.scrollY); (puntos[captura] ||= {})[nombre] = { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + sy + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; };
  const menu = async (texto) => { await p.click('button[aria-label="Abrir menú"]'); await p.click(`aside.w-72 >> text=${texto}`); await p.waitForTimeout(400); };

  await p.goto(BASE + '/demo'); await p.waitForSelector('text=Cobrado'); await limpio();
  // Nombre neutro para el material: "Tu Barbería"
  await menu('Configuración'); await p.waitForSelector('text=Tu WhatsApp');
  await p.locator('input[maxlength="60"]').first().fill('Tu Barbería');
  await p.click('button:has-text("Guardar cambios")'); await p.waitForTimeout(500);

  // ---- Panel del barbero ----
  await menu('Agenda'); await p.waitForSelector('text=Cobrado');
  await p.locator('button[aria-label="Ahora no"]').click().catch(() => {});
  await foto('agenda', { fullPage: true });
  await p.locator('div.overflow-auto').first().scrollIntoViewIfNeeded();
  await p.evaluate(() => { const c = document.querySelector('div.overflow-auto.card'); c.scrollTop = 60; window.scrollBy(0, c.getBoundingClientRect().top - 150); });
  await foto('agenda-horario');
  const bloque = p.locator('div.overflow-auto button.absolute').first();
  if (await bloque.count()) {
    await bloque.click(); await p.waitForSelector('[role=dialog]');
    if (await p.locator('[role=dialog] button:has-text("Terminado y cobrado")').count()) {
      await foto('cita-detalle');
      await punto('cita-detalle', 'cobrar', p.locator('[role=dialog] button:has-text("Terminado y cobrado")'));
      await p.click('[role=dialog] button:has-text("Terminado y cobrado")'); await p.waitForSelector('text=¿Le pides una reseña?');
      await foto('cita-resena');
      await punto('cita-resena', 'pedir', p.locator('[role=dialog] a:has-text("Pedir reseña por WhatsApp")'));
    }
    await p.keyboard.press('Escape');
  }
  await menu('Horarios'); await p.waitForSelector('text=Quién trabaja cuándo'); await foto('horarios', { fullPage: true });
  await menu('Clientes'); await p.click('button:text-is("Por recuperar")'); await p.waitForSelector('text=Si regresan'); await foto('recuperar', { fullPage: true });
  await menu('Reportes'); await p.waitForSelector('text=Ingresos por día'); await p.mouse.move(385, 5); await p.waitForTimeout(2200); await foto('reportes', { fullPage: true });
  await menu('Caja'); await p.waitForSelector('text=Cuenta'); await foto('caja', { fullPage: true });
  await menu('Nómina'); await p.waitForTimeout(800); await foto('nomina', { fullPage: true });

  // ---- Lo que ve el cliente ----
  await menu('Mi página de reservas'); await p.waitForSelector('text=¿Qué te vas a hacer?'); await limpio();
  await foto('reserva-1', { fullPage: true });
  await punto('reserva-1', 'servicio', p.locator('main button:has-text("Fade")'));
  await p.click('main button:has-text("Fade")'); await p.waitForSelector('text=¿Con quién?'); await foto('reserva-2', { fullPage: true });
  await punto('reserva-2', 'barbero', p.locator('main .grid-cols-2 > button', { hasText: 'Iván' }));
  await p.locator('main .grid-cols-2 > button', { hasText: 'Iván' }).click();
  await p.locator('main button:has(span.text-xl)').nth(2).click(); await p.waitForSelector('main .grid button');
  await foto('reserva-3', { fullPage: true });
  await punto('reserva-3', 'dia', p.locator('main button:has(span.text-xl)').nth(2));
  await punto('reserva-3', 'hora', p.locator('main .grid button').nth(3));
  await p.locator('main .grid button').nth(3).click();
  await p.fill('input[autocomplete="name"]', 'Juan Pérez'); await p.fill('input[placeholder="10 dígitos"]', '5512345678');
  await foto('reserva-4', { fullPage: true });
  await punto('reserva-4', 'apartar', p.locator('button:has-text("Apartar mi lugar")'));
  await p.click('button:has-text("Apartar mi lugar")'); await p.waitForSelector('text=Te esperamos');
  await foto('reserva-5', { fullPage: true });
  await punto('reserva-5', 'titulo', p.locator('h2:has-text("Te esperamos")'));
  await punto('reserva-5', 'avisame', p.locator('button:has-text("Sí, avísame")'));
  await p.click('a:has-text("Ver mi cita")'); await p.waitForSelector('text=Tu cita en'); await foto('mi-cita', { fullPage: true });
  fs.writeFileSync(path.join(OUT, 'puntos.json'), JSON.stringify(puntos, null, 2));
  await b.close();
})().catch((e) => { console.error('FALLÓ', e.message.split('\n')[0]); process.exit(1); });
