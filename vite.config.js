import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // App instalable (PWA): ícono en el celular / escritorio, abre en su propia ventana y carga rápido.
    VitePWA({
      registerType: 'autoUpdate', // las actualizaciones se instalan solas
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'somosdom.webp'],
      manifest: {
        id: '/',
        name: 'Filo · Software para barberías',
        short_name: 'Filo',
        description: 'Agenda, reservas por link, caja y nómina para tu barbería.',
        lang: 'es-MX',
        start_url: '/?origen=app',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#1A1714',
        background_color: '#F5F2EC',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Agenda', url: '/app', icons: [{ src: '/icono-192.png', sizes: '192x192' }] },
          { name: 'Caja', url: '/app/venta', icons: [{ src: '/icono-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // Solo se descarga de entrada lo básico (para no gastar datos de quien solo va a reservar);
        // cada pantalla del panel se guarda la primera vez que se abre.
        globPatterns: ['index.html', 'assets/index-*.{js,css}', '*.{svg,png,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//], // /api/... siempre va al servidor
        cleanupOutdatedCaches: true,
        importScripts: ['/avisos-sw.js'], // avisos al celular (push)
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst', // los archivos de /assets cambian de nombre en cada versión
            options: { cacheName: 'pantallas', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          // Tipografía de Google: se guarda para que la app abra rápido aunque la conexión sea lenta
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
