// Utilidades de fechas (siempre en hora local del navegador) y dinero.

const pad = (n) => String(n).padStart(2, '0');

// "2026-11-05" en hora local (no UTC, para que de noche no salte al día siguiente)
export const fechaInput = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Convierte "2026-11-05" (local) en Date a mediodía para evitar saltos de zona horaria
export const desdeInput = (s) => new Date(`${s}T12:00:00`);

export const inicioDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); };
export const finDia = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); };

export const hora = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
export const fechaLarga = (d) => new Date(d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const fechaCorta = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
export const dinero = (n) => fmt.format(Number(n) || 0);

export const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

export const linkWhatsApp = (tel, texto) =>
  `https://wa.me/52${soloDigitos(tel).slice(-10)}?text=${encodeURIComponent(texto)}`;

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'barberia';

// "10:30" -> minutos desde medianoche
export const aMinutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
