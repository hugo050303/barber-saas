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

## Horarios (los decide cada barbería)

- **Sección Horarios** (menú Negocio): la semana dibujada como barras (abierto en negro, descansos rayados,
  cerrado en gris). Se toca un día para editarlo ahí mismo: atajos (corrido, mañana y tarde…), hasta 3 turnos y
  "copiar a" otros días. Pestañas:
  - **Barbería:** tabla "Quién trabaja cuándo", plantillas, horas sin citas que se repiten (comida, café…),
    citas cada 10–60 min (con sugerencia), anticipación, días máximos, vista previa y días cerrados.
  - **Una por barbero:** "Igual que la barbería" o "Su propio horario" (con el de la barbería de fondo),
    días de descanso, servicios que hace, bloqueos y vista previa de sus horas.
- **Bloquear horas o días** (Agenda y Horarios): unas horas o días completos, para la barbería o un barbero.
- **Equipo → Servicios que hace:** cada barbero hace todos o solo algunos. La página de reservas y la Agenda
  solo ofrecen a quien hace el servicio elegido (las reglas de Firestore también lo validan).
- Lógica en `src/lib/horario.js` (acepta los formatos de horario anteriores). Pruebas: `npx vite-node tests/horario.mjs`.

## Modo demo (`/demo`)

Botón "Probar la demo" en la página de ventas. Abre el panel completo de una barbería de ejemplo
**sin cuenta ni contraseña**, con un mes de citas, clientes, ventas y reportes. Desde la franja de arriba
se cambia entre **Gratis, Pro y Plus** para ver qué incluye cada plan. Todo vive en la memoria del navegador
(`src/lib/demo.js`): no se guarda nada en Firebase, no cuesta lecturas y al recargar empieza limpia.

## Fotos (Vercel Blob)

Las fotos (logo, portada, 12 trabajos y foto de cada barbero) son de los planes Pro y Plus y se guardan en
**Vercel Blob**, incluido en Vercel Pro (no necesita Firebase Blaze ni otra cuenta).

**Activarlas (una vez):** Vercel → proyecto → **Storage** → **Create** → **Blob** → conéctalo al proyecto
(Production y Preview). Vercel agrega solo la variable `BLOB_READ_WRITE_TOKEN`. Después, vuelve a desplegar.

Cómo funciona:
- Las fotos se comprimen en el navegador (~100-250 KB) y se suben con `@vercel/blob/client`.
- Antes de cada subida, `api/fotos.js` (lógica en `server/fotos.js`) revisa la sesión de Firebase (firma de
  Google), que la ruta sea de **su** barbería con un nombre permitido, que tenga **Pro o Plus vigente** y que
  sea una imagen de máximo 2 MB. Al reemplazar o quitar una foto, la anterior se borra.
- En el modo demo las fotos se quedan en el navegador.
- `FOTOS_ACTIVAS` y `FOTOS_PROVEEDOR` en `src/config.js` (también se puede usar Firebase Storage con Blaze).
- Pruebas: `npx vite-node tests/fotos.mjs`.

## Clientes: cambiar o cancelar su cita, avisos y recuperar

- **Link de la cita** (`/r/{slug}/cita/{id}`): al apartar, el cliente recibe su link (en la pantalla de
  confirmación, en su mensaje de WhatsApp y en el recordatorio del barbero). Ahí ve su cita, la guarda en su
  calendario, **cambia la hora** (elige otra; la vieja se libera al confirmar la nueva) o **la cancela**.
  El id de la cita es aleatorio: quien tiene el link es quien apartó. Las reglas solo le dejan leer esa cita
  y pasarla a "cancelada".
- **Avisos al celular** (notificaciones push): Configuración → Avisos al celular, o la tarjeta de la Agenda.
  Llegan cuando un cliente aparta, cancela o cambia por link. En iPhone, solo con la app instalada.
- **Por recuperar** (Clientes): quién no viene hace 30/45/60/90 días y no tiene cita próxima, cuánto valdría
  que regresen, un toque para mandarles WhatsApp con el link (mensaje editable), a quién ya le escribiste y
  cuántos regresaron después del mensaje.

**Activar los avisos en el servidor (una vez), en Vercel → Settings → Environment Variables:**
1. `VAPID_PRIVATE_KEY`: la llave privada de avisos (la pública está en `src/config.js`, `VAPID_PUBLICA`).
   Para cambiarlas: `npx web-push generate-vapid-keys`, pon la pública en `config.js` y la privada aquí
   (los celulares tendrán que volver a activar los avisos).
2. `FIREBASE_SERVICE_ACCOUNT`: Firebase Console → ⚙ Configuración del proyecto → **Cuentas de servicio** →
   **Generar nueva clave privada** → pega todo el contenido del archivo JSON. Con ella el servidor lee la
   cita real (nadie puede inventar el texto del aviso) y la marca como avisada para no avisar dos veces.
   Funciona con el plan gratis de Firebase.

Lógica en `server/avisos.js` (`api/avisos.js`). Pruebas: `npx vite-node tests/avisos.mjs` (con el emulador
de Firestore también prueba la lectura real).

## Hosting

El plan gratis de Vercel (Hobby) **no permite uso comercial**. Al empezar a cobrar, pasa a Vercel Pro
o publica en Cloudflare Pages (gratis, permite uso comercial): conecta el repositorio, comando `npm run build`,
carpeta `dist`.

## Reglas de seguridad

`firestore.rules` protege los datos: cada barbería solo ve lo suyo, el público solo ve barberos,
servicios y horarios ocupados (sin nombres ni teléfonos), cada cliente solo ve y cancela su propia cita
(con su link), y solo el administrador cambia planes.

**Cada vez que cambien `firestore.rules` o `storage.rules`, hay que publicarlos:** Firebase Console →
Firestore Database → Reglas (y Storage → Reglas) → pegar el archivo completo → Publicar.

## Estructura de datos (Firestore)

```
negocios/{uid}           nombre, slug, ownerUid, whatsapp, direccion, zona, horario, plan, proHasta
  barberos/ servicios/ clientes/ citas/ ocupados/
  dispositivos/            celulares del dueño que reciben avisos
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
