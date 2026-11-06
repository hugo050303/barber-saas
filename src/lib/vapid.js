// Par de llaves de los avisos al celular (VAPID, curva P-256), generado con WebCrypto.
// publica: punto sin comprimir (65 bytes) · privada: el número secreto "d" (32 bytes). Ambas en base64url.
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

export async function generarLlavesVapid() {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica: b64url(new Uint8Array([4, ...deB64url(jwk.x), ...deB64url(jwk.y)])), privada: jwk.d };
}
