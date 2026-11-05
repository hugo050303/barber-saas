# Barber SaaS

App de gestión para barberías (agenda, ventas, inventario, nómina, corte de caja y reservas públicas).
Hecha con React + Vite y **Supabase** (base de datos + login).

> ⚠️ Esta app usa `@supabase/supabase-js` (login y API de datos de Supabase).
> Por eso **no funciona con Neon** u otro Postgres "solo base de datos": necesita un proyecto de Supabase.

## Configurar la base de datos (Supabase, plan gratis)

1. Crea un proyecto en https://supabase.com/dashboard (o reactiva el tuyo: los proyectos gratis
   se **pausan** después de ~7 días sin uso, revisa si dice "Paused" y presiona "Restore").
2. Ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.
   Esto crea todas las tablas y los permisos.
3. Ve a **Authentication → Users → Add user → Create new user**, crea tu correo y contraseña
   (marca "Auto Confirm User"). Con ese usuario inicias sesión en la app.
4. Ve a **Project Settings → API** y copia la *Project URL* y la clave *anon / publishable*.
5. Ponlas en el archivo `.env` (ver `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
6. En **Vercel → Settings → Environment Variables** agrega esas mismas dos variables y vuelve a desplegar.

## Desarrollo

```bash
npm install
npm run dev
```
