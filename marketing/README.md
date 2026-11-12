# Material de promoción de Filo

Imágenes y videos hechos con pantallas reales de la app (modo demo, con el nombre "Tu Barbería").

| Qué | Dónde queda | Cómo se genera |
|---|---|---|
| Capturas de la app | `capturas/` | `npm run dev` y `node marketing/src/capturar.cjs` |
| Tarjeta del link | `capturas/og.png` | `node marketing/src/og.mjs` |
| 6 imágenes × 2 formatos (publicación 1080×1350 e historia 1080×1920) | `salida/imagenes/` | `node marketing/src/render-imagenes.cjs` |
| Videos verticales 1080×1920 (`cliente`, `barbero`) | `salida/videos/` | `node marketing/src/render-video.cjs cliente` |

- Los textos y el diseño están en `src/imagenes.html` y `src/video.html` (colores y tipografía en `src/base.css`).
- `guiones.json` tiene la narración de cada escena de los videos (una frase por escena).
- `render-video.cjs` acepta `--d=3.4,8.6,…` (duración de cada escena), `--audio=voz.mp3` y `--cuadros=2,5` (solo cuadros sueltos para revisar).
- `capturas/` y `salida/` no se guardan en el repositorio: se vuelven a generar con los comandos de arriba. Requiere `ffmpeg`.
- Los precios y textos deben coincidir con `src/config.js`; si cambian, hay que volver a generar.
