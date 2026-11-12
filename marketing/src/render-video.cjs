// Genera un video de promoción (MP4 vertical 1080×1920) cuadro por cuadro a partir de video.html.
// Uso: node marketing/src/render-video.cjs cliente|barbero [--d=3.4,8.6,...] [--audio=voz.mp3] [--cuadros=1.5,4,9] [--salida=archivo.mp4]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { spawn } = require('child_process');
const FPS = 30;
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');
(async () => {
  const v = process.argv[2] || 'cliente';
  const OUT = path.join(__dirname, '..', 'salida', 'videos'); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto(`file://${path.join(__dirname, 'video.html')}?v=${v}${arg('d') ? `&d=${arg('d')}` : ''}`);
  await p.evaluate(() => window.lista);
  const total = await p.evaluate(() => window.TOTAL);
  if (arg('info')) { console.log(JSON.stringify(await p.evaluate(() => window.ESCENAS))); await b.close(); return; }

  if (arg('cuadros')) { // solo unos cuadros sueltos, para revisar
    for (const t of arg('cuadros').split(',').map(Number)) {
      await p.evaluate((x) => window.seek(x), t);
      await p.screenshot({ path: path.join(arg('carpeta') || OUT, `${v}-${String(t).replace('.', '_')}.jpg`), type: 'jpeg', quality: 80 });
    }
    await b.close(); return;
  }

  const salida = arg('salida') || path.join(OUT, `filo-${v}.mp4`);
  const audio = arg('audio');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(audio ? ['-i', audio] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-t', total.toFixed(3), '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cuadros = Math.round(total * FPS);
  for (let i = 0; i < cuadros; i++) {
    await p.evaluate((x) => window.seek(x), i / FPS);
    const img = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${v}: ${Math.round((i / cuadros) * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close();
  console.log('✓', salida, `${total.toFixed(1)} s`);
})();
