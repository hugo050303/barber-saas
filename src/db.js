// Capa de datos sobre Firestore.
//
// Ofrece una API encadenable sencilla para que las páginas lean así:
//   const { data, error } = await db.from('citas')
//     .select('*, servicios ( nombre, precio )')
//     .eq('estado', 'finalizada')
//     .gte('fecha_hora', '2026-01-01T00:00:00')
//     .order('fecha_hora');
//
// Notas:
// - Los filtros de rango (gte/lte/gt/lt) sobre un solo campo se envían a Firestore;
//   el resto de filtros y el orden se aplican en el navegador. Así no hace falta
//   crear índices compuestos en Firebase.
// - `servicios ( ... )` en el select trae el documento relacionado usando el
//   campo `servicio_id` (nombre de la colección sin la "s" final + "_id").
// - Las fechas se guardan como texto ISO (ej. "2026-11-05T18:30:00.000Z").
// - Multi-negocio: cada barbería guarda sus datos en negocios/{id}/<colección>.
//   Llama a usarNegocio(id) al iniciar sesión (o al abrir una página pública de reservas).

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, query, where,
} from 'firebase/firestore';
import { firestore } from './firebase';

// Campos que deben guardarse como número (los inputs de los formularios dan texto).
const NUMERIC_FIELDS = {
  servicios: ['precio', 'duracion_min'],
  barberos: ['porcentaje_comision'],
  inventario: ['precio_venta', 'stock'],
  ventas_productos: ['total'],
  gastos: ['monto'],
  cortes_caja: ['total_servicios', 'total_ventas', 'total_gastos', 'dinero_en_caja'],
};

// Valores por defecto al crear un documento nuevo.
const DEFAULTS = {
  barberos: () => ({ porcentaje_comision: 50 }),
  servicios: () => ({ duracion_min: 30 }),
  citas: () => ({ estado: 'pendiente' }),
  ventas_productos: () => ({ fecha: new Date().toISOString() }),
  gastos: () => ({ fecha: new Date().toISOString() }),
  cortes_caja: () => ({ fecha: new Date().toISOString() }),
};

let negocioActual = null;
export function usarNegocio(id) { negocioActual = id; }
export function negocioId() { return negocioActual; }

// Ruta de la colección dentro del negocio activo
export function ruta(table) {
  if (!negocioActual) throw new Error('No hay negocio activo');
  return `negocios/${negocioActual}/${table}`;
}

const RANGE_OPS = { gt: '>', gte: '>=', lt: '<', lte: '<=' };

function normalize(table, values) {
  const out = { ...values };
  delete out.id;
  for (const f of NUMERIC_FIELDS[table] || []) {
    if (out[f] !== undefined && out[f] !== null && out[f] !== '') out[f] = Number(out[f]);
  }
  return out;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'es', { sensitivity: 'base' });
  return a < b ? -1 : 1;
}

function matches(row, { op, field, value }) {
  const v = row[field];
  switch (op) {
    case 'eq': return field === 'id' ? String(v) === String(value) : v === value;
    case 'neq': return v !== value;
    case 'gt': return v !== undefined && v > value;
    case 'gte': return v !== undefined && v >= value;
    case 'lt': return v !== undefined && v < value;
    case 'lte': return v !== undefined && v <= value;
    case 'ilike': return typeof v === 'string' && v.toLowerCase() === String(value).toLowerCase();
    default: return true;
  }
}

// Busca relaciones en el select, ej: "*, servicios ( nombre, precio )" -> ['servicios']
function parseEmbeds(columns) {
  const embeds = [];
  const re = /(\w+)\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(columns || ''))) embeds.push(m[1]);
  return embeds;
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.columns = '*';
    this.filters = [];
    this.orders = [];
    this.values = null;
    this.returnRows = false;
    this.singleMode = null; // 'single' | 'maybe'
  }

  select(columns = '*') {
    if (this.action === 'select') this.columns = columns;
    else this.returnRows = true; // insert(...).select()
    return this;
  }
  insert(rows) { this.action = 'insert'; this.values = Array.isArray(rows) ? rows : [rows]; return this; }
  update(values) { this.action = 'update'; this.values = values; return this; }
  delete() { this.action = 'delete'; return this; }

  eq(field, value) { this.filters.push({ op: 'eq', field, value }); return this; }
  neq(field, value) { this.filters.push({ op: 'neq', field, value }); return this; }
  gt(field, value) { this.filters.push({ op: 'gt', field, value }); return this; }
  gte(field, value) { this.filters.push({ op: 'gte', field, value }); return this; }
  lt(field, value) { this.filters.push({ op: 'lt', field, value }); return this; }
  lte(field, value) { this.filters.push({ op: 'lte', field, value }); return this; }
  ilike(field, value) { this.filters.push({ op: 'ilike', field, value }); return this; }
  order(field, { ascending = true } = {}) { this.orders.push({ field, ascending }); return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }

  then(resolve, reject) {
    return this.run()
      .then((data) => ({ data, error: null }))
      .catch((err) => {
        console.error(`[db] Error en "${this.table}" (${this.action}):`, err);
        return { data: null, error: { message: err.message || String(err), code: err.code } };
      })
      .then(resolve, reject);
  }

  async run() {
    switch (this.action) {
      case 'insert': return this.runInsert();
      case 'update': return this.runWrite('update');
      case 'delete': return this.runWrite('delete');
      default: return this.runSelect();
    }
  }

  idFilter() {
    return this.filters.find((f) => f.op === 'eq' && f.field === 'id');
  }

  // Devuelve las filas que cumplen los filtros (sin relaciones).
  async fetchRows() {
    const idF = this.idFilter();
    if (idF) {
      const snap = await getDoc(doc(firestore, ruta(this.table), String(idF.value)));
      const rows = snap.exists() ? [{ id: snap.id, ...snap.data() }] : [];
      return rows.filter((r) => this.filters.every((f) => matches(r, f)));
    }

    // Enviar a Firestore los filtros de rango si todos son sobre el mismo campo.
    const ranges = this.filters.filter((f) => RANGE_OPS[f.op]);
    const rangeFields = new Set(ranges.map((f) => f.field));
    const constraints = rangeFields.size === 1
      ? ranges.map((f) => where(f.field, RANGE_OPS[f.op], f.value))
      : [];

    const snap = await getDocs(query(collection(firestore, ruta(this.table)), ...constraints));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => this.filters.every((f) => matches(r, f)));
  }

  async runSelect() {
    let rows = await this.fetchRows();

    for (const rel of parseEmbeds(this.columns)) {
      const fk = rel.replace(/s$/, '') + '_id';
      const relSnap = await getDocs(collection(firestore, ruta(rel)));
      const byId = new Map(relSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
      rows = rows.map((r) => ({ ...r, [rel]: r[fk] != null ? byId.get(String(r[fk])) || null : null }));
    }

    if (this.orders.length) {
      rows.sort((a, b) => {
        for (const { field, ascending } of this.orders) {
          const c = compare(a[field], b[field]);
          if (c !== 0) return ascending ? c : -c;
        }
        return 0;
      });
    }
    return this.finish(rows);
  }

  async runInsert() {
    const created = [];
    for (const row of this.values) {
      const data = {
        ...(DEFAULTS[this.table]?.() || {}),
        created_at: new Date().toISOString(),
        ...normalize(this.table, row),
      };
      const ref = await addDoc(collection(firestore, ruta(this.table)), data);
      created.push({ id: ref.id, ...data });
    }
    return this.returnRows || this.singleMode ? this.finish(created) : null;
  }

  async runWrite(kind) {
    const idF = this.idFilter();
    // Con id: escribimos directo (merge crea el documento si no existe, útil para "configuracion").
    const targets = idF && this.filters.length === 1
      ? [{ id: String(idF.value) }]
      : await this.fetchRows();

    for (const { id } of targets) {
      const ref = doc(firestore, ruta(this.table), id);
      if (kind === 'delete') await deleteDoc(ref);
      else await setDoc(ref, normalize(this.table, this.values), { merge: true });
    }
    return null;
  }

  finish(rows) {
    if (!this.singleMode) return rows;
    if (rows.length === 0) {
      if (this.singleMode === 'maybe') return null;
      throw new Error(`No se encontró ningún registro en "${this.table}"`);
    }
    return rows[0];
  }
}

export const db = {
  from: (table) => new QueryBuilder(table),
};
