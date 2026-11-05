import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuración pública del proyecto de Firebase (no es secreta: Firebase la
// diseñó para ir dentro de la app; la seguridad la dan las reglas de firestore.rules).
// Se puede sobrescribir con variables VITE_FIREBASE_* en .env o en Vercel.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB40rvrpeXiQ2zOubImuQd1sJpokz7yOZk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'barberia-659a5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'barberia-659a5',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:559406886947:web:a1cb80a177bdde1cd5c196',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Desarrollo local contra los emuladores de Firebase: VITE_USAR_EMULADOR=1 npm run dev
if (import.meta.env.VITE_USAR_EMULADOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8085);
}
