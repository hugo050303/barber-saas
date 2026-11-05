# Barber SaaS

App de gestión para barberías (agenda, ventas, inventario, nómina, corte de caja y reservas públicas).
Hecha con React + Vite y **Firebase** (Firestore como base de datos + Firebase Authentication para el login).

## Configurar Firebase (plan gratis "Spark", sin tarjeta)

1. Entra a https://console.firebase.google.com → **Agregar proyecto** (puedes desactivar Google Analytics).
2. **Compilación → Firestore Database → Crear base de datos** → elige una ubicación
   (ej. `us-central1` o `southamerica-east1`) → modo **producción**.
3. En Firestore, pestaña **Reglas**: borra lo que hay, pega el contenido de
   [`firestore.rules`](firestore.rules) y presiona **Publicar**.
4. **Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
   Luego en la pestaña **Usuarios → Agregar usuario**: crea tu correo y contraseña.
   Con ese usuario inicias sesión en la app.
5. **⚙️ Configuración del proyecto → General → Tus apps → ícono `</>` (Web)** → registra la app.
   Te mostrará un bloque `firebaseConfig`. Copia esos valores al archivo `.env`
   (usa `.env.example` como guía):
   ```
   VITE_FIREBASE_API_KEY=...        (apiKey)
   VITE_FIREBASE_AUTH_DOMAIN=...    (authDomain)
   VITE_FIREBASE_PROJECT_ID=...     (projectId)
   VITE_FIREBASE_APP_ID=...         (appId)
   ```
6. **Vercel → tu proyecto → Settings → Environment Variables**: agrega esas mismas 4 variables
   y vuelve a desplegar (Deployments → ⋯ → Redeploy).
7. En Firebase → Authentication → **Configuración → Dominios autorizados**, agrega tu dominio de Vercel
   (ej. `mi-barberia.vercel.app`).

La primera vez entra a **Configuración** en la app y guarda el nombre del negocio.
Las colecciones de Firestore se crean solas al guardar el primer dato.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura de datos

- `src/firebase.js`: conexión a Firebase.
- `src/db.js`: capa de datos sobre Firestore (`db.from('citas').select(...).eq(...)`).
- Colecciones: `configuracion` (documento `1`), `barberos`, `servicios`, `clientes`, `citas`,
  `inventario`, `ventas_productos`, `gastos`, `cortes_caja`.
