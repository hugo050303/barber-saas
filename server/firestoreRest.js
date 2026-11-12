// Lectura de Firestore por REST (sin el SDK), para las funciones de Vercel.
export const PROYECTO_FIRESTORE = process.env.FIREBASE_PROJECT_ID || 'barberia-659a5';

export const baseFirestore = () => (process.env.FIRESTORE_EMULATOR_HOST
  ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROYECTO_FIRESTORE}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROYECTO_FIRESTORE}/databases/(default)/documents`);

export function deFirestore(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return campos(v.mapValue.fields);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(deFirestore);
  return null;
}
export const campos = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, deFirestore(v)]));

// Valor de JavaScript -> valor de Firestore (REST)
export function aFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aFirestore(x)])) } };
}
export const aCampos = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, aFirestore(v)]));
