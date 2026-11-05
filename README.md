# Filo · Software para barberías

SaaS para barberías: agenda por barbero, página pública de reservas con horarios libres,
clientes, caja con ticket, inventario, gastos, corte del día, nómina y reportes.

Hecho con React + Vite + Tailwind y **Firebase** (Firestore + Authentication). Se publica en Vercel.

## Cómo funciona el negocio

- Cualquier barbería se registra gratis en `/registro` y obtiene su link de reservas: `/r/<nombre-de-la-barberia>`.
- **Gratis:** agenda, reservas por link, clientes, servicios y 1 barbero.
- **Pro ($299 MXN/mes o $2,990 al año):** hasta 3 barberos, caja, inventario, gastos, corte, nómina, reportes y fotos.
- **Plus ($499 MXN/mes o $4,990 al año):** todo lo de Pro con barberos ilimitados y foto de cada barbero.
- **Precio fundador:** las primeras 20 barberías pagan Pro a $199/mes de por vida (se marca en tu panel de administración).
- El cobro es manual: el dueño te escribe desde "Pasar a Pro", te paga y tú le activas el mes en tu **panel de administración**
  (dirección en `RUTA_ADMIN`, hoy `/somos053`; solo la cuenta `ADMIN_EMAIL` puede entrar, los demás ven un 404).
- Si el Pro vence, la cuenta regresa a Gratis sin perder datos.
- Los dueños se registran solos, con **Google** o con correo y contraseña.
- **Tope de registros:** en tu panel de administración puedes cerrar el registro o fijar cuántas barberías caben (por defecto 100).
  Lo respetan las reglas de seguridad, no solo la pantalla.

## Activar "Entrar con Google"

Firebase Console → Authentication → Método de acceso → **Google** → Habilitar → Guardar.
Después, en Authentication → Configuración → **Dominios autorizados**, agrega tu dominio de Vercel
(por ejemplo `mi-app.vercel.app`) y tu dominio propio si tienes uno.

## Costos de Firebase

- Plan gratis (Spark): 50,000 lecturas y 20,000 escrituras al día. Alcanza para unas 25 a 50 barberías
  usándolo a diario. Las cuentas que no se usan no gastan nada.
- Cuando crezcas, cambia a **Blaze** (pago por uso, ~$0.06 USD por cada 100,000 lecturas) y pon una
  **alerta de presupuesto** en Google Cloud. 100 barberías activas cuestan del orden de unos pocos dólares al mes.
- La app está hecha para leer poco: listas paginadas (clientes de 50 en 50, gastos por mes, últimos 10 cortes),
  el resumen de cada cliente se guarda en su ficha en vez de recalcularse, y las reglas de seguridad
  identifican al dueño sin lecturas extra.

## Ajustes rápidos (`src/config.js`)

| Ajuste | Para qué |
| --- | --- |
| `MARCA` | Nombre del producto en toda la app |
| `PLANES` | Precios y barberos incluidos por plan (los límites también están en `firestore.rules`) |
| `FUNDADOR` | Precio y lugares de lanzamiento |
| `ADMIN_EMAIL` | Cuenta administradora (también está en `firestore.rules`: cámbiala en los dos lugares) |
| `WHATSAPP_VENTAS` | Tu WhatsApp para que los dueños te pidan el plan Pro |
| `MAX_FOTOS_GALERIA` | Fotos de trabajos por barbería |

## Fotos (Cloud Storage)

Las fotos necesitan el plan **Blaze** de Firebase (los primeros 5 GB no cuestan). Para activarlas:
1. Firebase Console → Actualizar → **Blaze**, y en Google Cloud pon una alerta de presupuesto (por ejemplo $5 USD).
2. Firebase Console → **Storage** → Comenzar (ubicación `us-central1`).
3. Storage → **Reglas** → pega `storage.rules` → Publicar.

Las fotos se comprimen en el celular (una foto de 1.5 MB queda en ~115 KB) y cada barbería tiene un máximo
de archivos fijo (logo, portada, 12 de galería y una por barbero).

## Hosting

El plan gratis de Vercel (Hobby) **no permite uso comercial**. Al empezar a cobrar, pasa a Vercel Pro
o publica en Cloudflare Pages (gratis, permite uso comercial): conecta el repositorio, comando `npm run build`,
carpeta `dist`.

## Reglas de seguridad

`firestore.rules` protege los datos: cada barbería solo ve lo suyo, el público solo ve barberos,
servicios y horarios ocupados (sin nombres ni teléfonos), y solo el administrador cambia planes.

**Cada vez que cambien `firestore.rules` o `storage.rules`, hay que publicarlos:** Firebase Console →
Firestore Database → Reglas (y Storage → Reglas) → pegar el archivo completo → Publicar.

## Estructura de datos (Firestore)

```
negocios/{uid}           nombre, slug, ownerUid, whatsapp, direccion, zona, horario, plan, proHasta
  barberos/ servicios/ clientes/ citas/ ocupados/
  inventario/ ventas_productos/ gastos/ cortes_caja/
slugs/{slug}             negocioId (para las URLs de reservas)
usuarios/{uid}           negocioId, nombre, email, whatsapp
sistema/config           registroAbierto, maxNegocios (solo admin)
sistema/registro         total de barberías registradas
```

## Desarrollo

```bash
npm install
npm run dev                 # usa el proyecto real de Firebase
```

Para trabajar sin tocar datos reales, con los emuladores de Firebase (requiere Java):

```bash
npx firebase-tools emulators:start --only auth,firestore,storage --project barberia-659a5
VITE_USAR_EMULADOR=1 npm run dev
```

Pruebas de las reglas de seguridad:

```bash
npx firebase-tools emulators:exec --only firestore,auth,storage --project barberia-659a5 "npx vite-node tests/reglas.mjs"
```
