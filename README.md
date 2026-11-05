# Filo · Software para barberías

SaaS para barberías: agenda por barbero, página pública de reservas con horarios libres,
clientes, caja con ticket, inventario, gastos, corte del día, nómina y reportes.

Hecho con React + Vite + Tailwind y **Firebase** (Firestore + Authentication). Se publica en Vercel.

## Cómo funciona el negocio

- Cualquier barbería se registra gratis en `/registro` y obtiene su link de reservas: `/r/<nombre-de-la-barberia>`.
- **Plan Gratis:** agenda, reservas por link, clientes, servicios y 1 barbero.
- **Plan Pro ($299 MXN/mes):** barberos ilimitados, caja, inventario, gastos, corte del día, nómina y reportes.
- El cobro es manual: el dueño te escribe desde "Pasar a Pro", te paga y tú le activas el mes en **`/admin`**
  (solo la cuenta configurada en `ADMIN_EMAIL` puede entrar).
- Si el Pro vence, la cuenta regresa a Gratis sin perder datos.

## Ajustes rápidos (`src/config.js`)

| Ajuste | Para qué |
| --- | --- |
| `MARCA` | Nombre del producto en toda la app |
| `PRECIO_PRO` | Precio mensual que se muestra |
| `ADMIN_EMAIL` | Cuenta administradora (también está en `firestore.rules`: cámbiala en los dos lugares) |
| `WHATSAPP_VENTAS` | Tu WhatsApp para que los dueños te pidan el plan Pro |
| `LIMITE_BARBEROS_GRATIS` | Barberos permitidos en el plan gratis |

## Reglas de seguridad

`firestore.rules` protege los datos: cada barbería solo ve lo suyo, el público solo ve barberos,
servicios y horarios ocupados (sin nombres ni teléfonos), y solo el administrador cambia planes.

**Cada vez que cambie `firestore.rules`, hay que publicarlo:** Firebase Console → Firestore Database →
Reglas → pegar el archivo completo → Publicar.

## Estructura de datos (Firestore)

```
negocios/{id}            nombre, slug, ownerUid, whatsapp, direccion, horario, plan, proHasta
  barberos/ servicios/ clientes/ citas/ ocupados/
  inventario/ ventas_productos/ gastos/ cortes_caja/
slugs/{slug}             negocioId (para las URLs de reservas)
usuarios/{uid}           negocioId, nombre, email, whatsapp
```

## Desarrollo

```bash
npm install
npm run dev                 # usa el proyecto real de Firebase
```

Para trabajar sin tocar datos reales, con los emuladores de Firebase (requiere Java):

```bash
npx firebase-tools emulators:start --only auth,firestore --project barberia-659a5
VITE_USAR_EMULADOR=1 npm run dev
```

Pruebas de las reglas de seguridad:

```bash
npx firebase-tools emulators:exec --only firestore,auth --project barberia-659a5 "npx vite-node tests/reglas.mjs"
```
