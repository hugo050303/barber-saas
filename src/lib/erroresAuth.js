// Mensajes de error de Firebase Auth en español
const MENSAJES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Entra con tu contraseña.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/account-exists-with-different-credential': 'Ese correo ya está registrado con contraseña. Entra con tu correo y contraseña.',
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase para entrar con Google.',
};
export const mensajeAuth = (e) => MENSAJES[e?.code] || 'Algo salió mal. Inténtalo de nuevo.';
