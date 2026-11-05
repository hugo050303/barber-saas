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
5. Los datos de conexión del proyecto (`barberia-659a5`) ya están en `src/firebase.js`
   (son públicos; la seguridad la dan las reglas). Para usar otro proyecto, copia `.env.example`
   como `.env` o agrega las variables `VITE_FIREBASE_*` en Vercel.

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
