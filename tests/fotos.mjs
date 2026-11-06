// Pruebas de la seguridad de fotos (server/fotos.js y api/fotos.js).
// Ejecutar: npx vite-node tests/fotos.mjs
// Opcional: DEMO_EMAIL / DEMO_PASS para probar con una sesión real de Firebase (plan Gratis).
import { SignJWT, generateKeyPair } from 'jose';
import { handleUpload, getPayloadFromClientToken } from '@vercel/blob/client';
import {
  analizarRuta, planDePagoVigente, autorizarSubida, autorizarBorrado, verificarTokenFirebase, OPCIONES_SUBIDA, PROYECTO,
} from '../server/fotos.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const falla = async (fn, estado, texto) => {
  try { await fn(); return false; } catch (e) { return (!estado || e.status === estado) && (!texto || e.message.includes(texto)); }
};
const UID = 'dueno123';
const verificar = async (t) => { if (t !== 'token-bueno') { const e = new Error('Tu sesión expiró. Vuelve a entrar.'); e.status = 401; throw e; } return UID; };
const futuro = new Date(Date.now() + 30 * 86400000).toISOString();
const pasado = new Date(Date.now() - 86400000).toISOString();
const negocio = (plan, hasta) => ({ plan: { stringValue: plan }, proHasta: hasta ? { timestampValue: hasta } : { nullValue: null } });
const leerCon = (docs) => async (ruta) => docs[ruta] ?? null;

// ---- Nombres permitidos ----
ok(!(await falla(() => analizarRuta(`negocios/${UID}/logo`, UID))), 'logo permitido');
ok(!(await falla(() => analizarRuta(`negocios/${UID}/galeria/11`, UID))), 'galería lugar 11 permitido');
ok(await falla(() => analizarRuta(`negocios/${UID}/galeria/12`, UID), 403), 'galería lugar 12 rechazado (máx. 12 fotos)');
ok(await falla(() => analizarRuta(`negocios/otro/logo`, UID), 403), 'carpeta de otra barbería rechazada');
ok(await falla(() => analizarRuta(`negocios/${UID}/../otro/logo`, UID), 403), 'intento de salirse de la carpeta rechazado');
ok(await falla(() => analizarRuta(`negocios/${UID}/virus.exe`, UID), 403), 'nombre no permitido rechazado');
ok(analizarRuta(`negocios/${UID}/barberos/b2`, UID).barberoId === 'b2', 'foto de barbero reconoce el id');

// ---- Plan ----
ok(planDePagoVigente(negocio('pro', futuro)) && planDePagoVigente(negocio('plus', futuro)), 'Pro y Plus vigentes cuentan');
ok(!planDePagoVigente(negocio('pro', pasado)) && !planDePagoVigente(negocio('gratis', null)), 'Pro vencido y Gratis no cuentan');

// ---- Autorización de subida ----
const docsPro = { [`negocios/${UID}`]: negocio('pro', futuro), [`negocios/${UID}/barberos/b2`]: {} };
ok(!(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/portada`, idToken: 'token-bueno', verificar, leer: leerCon(docsPro) }))), 'Pro sube su portada');
ok(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/portada`, idToken: 'token-malo', verificar, leer: leerCon(docsPro) }), 401), 'sesión inválida rechazada');
ok(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/logo`, idToken: 'token-bueno', verificar, leer: leerCon({ [`negocios/${UID}`]: negocio('gratis', null) }) }), 403, 'Pro y Plus'), 'plan Gratis no sube fotos');
ok(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/logo`, idToken: 'token-bueno', verificar, leer: leerCon({ [`negocios/${UID}`]: negocio('pro', pasado) }) }), 403), 'Pro vencido no sube fotos');
ok(!(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/barberos/b2`, idToken: 'token-bueno', verificar, leer: leerCon(docsPro) }))), 'foto de barbero existente');
ok(await falla(() => autorizarSubida({ pathname: `negocios/${UID}/barberos/fantasma`, idToken: 'token-bueno', verificar, leer: leerCon(docsPro) }), 404), 'foto de barbero inexistente rechazada');

// ---- Autorización de borrado ----
const urlPropia = `https://abc123.public.blob.vercel-storage.com/negocios/${UID}/logo-XyZ.webp`;
ok(!(await falla(() => autorizarBorrado({ url: urlPropia, idToken: 'token-bueno', verificar }))), 'borrar foto propia');
ok(await falla(() => autorizarBorrado({ url: urlPropia.replace(UID, 'otro'), idToken: 'token-bueno', verificar }), 403), 'NO borra fotos de otra barbería');
ok(await falla(() => autorizarBorrado({ url: 'https://evil.com/negocios/dueno123/logo', idToken: 'token-bueno', verificar }), 403), 'NO borra archivos fuera de Vercel Blob');
ok(await falla(() => autorizarBorrado({ url: urlPropia, idToken: 'token-malo', verificar }), 401), 'borrar sin sesión rechazado');

// ---- Permiso de subida que entrega Vercel Blob ----
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_STOREPRUEBA123_secretodeprueba1234567890';
const r = await handleUpload({
  body: { type: 'blob.generate-client-token', payload: { pathname: `negocios/${UID}/logo`, clientPayload: 'token-bueno', multipart: false } },
  request: { headers: {} },
  onBeforeGenerateToken: async (pathname, clientPayload) => { await autorizarSubida({ pathname, idToken: clientPayload, verificar, leer: leerCon(docsPro) }); return OPCIONES_SUBIDA; },
});
const permiso = getPayloadFromClientToken(r.clientToken);
ok(permiso.pathname === `negocios/${UID}/logo` && permiso.maximumSizeInBytes === 2097152 && permiso.allowedContentTypes.includes('image/webp') && !permiso.allowedContentTypes.includes('image/svg+xml'),
  'el permiso queda limitado a esa ruta, 2 MB y solo imágenes');

// ---- La función completa (api/fotos.js) ----
const { default: handler } = await import('../api/fotos.js');
const llamar = async (method, body) => {
  let estado = 200; let json = null;
  const res = { status(s) { estado = s; return this; }, json(j) { json = j; return this; } };
  await handler({ method, body, headers: {} }, res);
  return { estado, json };
};
ok((await llamar('GET')).estado === 405, 'la función solo acepta POST');
const sinLlave = process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_READ_WRITE_TOKEN;
ok((await llamar('POST', {})).estado === 503, 'sin Blob store conectado avisa que no está activado');
process.env.BLOB_READ_WRITE_TOKEN = sinLlave;

// ---- Sesiones de Firebase de verdad (llaves públicas de Google) ----
const { privateKey } = await generateKeyPair('RS256');
const falsificado = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'falsa' }).setSubject(UID)
  .setIssuer(`https://securetoken.google.com/${PROYECTO}`).setAudience(PROYECTO).setIssuedAt().setExpirationTime('1h').sign(privateKey);
ok(await falla(() => verificarTokenFirebase(falsificado), 401), 'token falsificado rechazado (firma que no es de Google)');
const res1 = await llamar('POST', { type: 'blob.generate-client-token', payload: { pathname: `negocios/${UID}/logo`, clientPayload: falsificado, multipart: false } });
ok(res1.estado === 401, 'la función rechaza el token falsificado');

if (process.env.DEMO_EMAIL && process.env.DEMO_PASS) {
  const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB40rvrpeXiQ2zOubImuQd1sJpokz7yOZk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASS, returnSecureToken: true }),
  }).then((x) => x.json());
  ok(!!login.idToken, 'sesión real de Firebase (cuenta demo)');
  const uidReal = await verificarTokenFirebase(login.idToken);
  ok(uidReal === login.localId, 'el servidor acepta una sesión real firmada por Google');
  const real = await llamar('POST', { type: 'blob.generate-client-token', payload: { pathname: `negocios/${uidReal}/logo`, clientPayload: login.idToken, multipart: false } });
  ok(real.estado === 200 || (real.estado === 403 && real.json.error.includes('Pro y Plus')), `cuenta real: ${real.estado === 200 ? 'con plan de pago, recibe permiso' : 'en plan Gratis, NO recibe permiso'}`);
  const ajena = await llamar('POST', { type: 'blob.generate-client-token', payload: { pathname: `negocios/otra-barberia/logo`, clientPayload: login.idToken, multipart: false } });
  ok(ajena.estado === 403, 'cuenta real NO puede subir a la carpeta de otra barbería');
}

console.log(fails ? `\n${fails} FALLAS` : '\nTODO OK');
process.exit(fails ? 1 : 0);
