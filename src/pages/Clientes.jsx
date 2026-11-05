import { useEffect, useMemo, useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Search, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { firestore } from '../firebase';
import { db, ruta } from '../db';
import { useSesion } from '../lib/sesion';
import { dinero, fechaCorta, linkWhatsApp, soloDigitos } from '../lib/formato';
import { PageHeader, Cargando, Vacio, Modal, Field, Badge } from '../components/ui';

function EditarCliente({ cliente, onClose, onGuardado }) {
  const nuevo = !cliente.id;
  const [f, setF] = useState({ nombre: cliente.nombre || '', telefono: cliente.telefono || '', notas: cliente.notas || '' });
  const [enviando, setEnviando] = useState(false);
  async function guardar(e) {
    e.preventDefault();
    const tel = soloDigitos(f.telefono);
    if (tel.length !== 10) return toast.error('El WhatsApp debe tener 10 dígitos.');
    setEnviando(true);
    try {
      await setDoc(doc(firestore, ruta('clientes'), nuevo ? tel : cliente.id), { nombre: f.nombre.trim(), telefono: tel, notas: f.notas.trim() }, { merge: true });
      toast.success('Cliente guardado'); onGuardado(); onClose();
    } catch { toast.error('No se pudo guardar.'); }
    setEnviando(false);
  }
  async function borrar() {
    if (!window.confirm(`¿Borrar a ${cliente.nombre} del directorio? Sus citas pasadas no se borran.`)) return;
    try { await deleteDoc(doc(firestore, ruta('clientes'), cliente.id)); toast.success('Cliente borrado'); onGuardado(); onClose(); }
    catch { toast.error('No se pudo borrar.'); }
  }
  return (
    <Modal abierto onClose={onClose} titulo={nuevo ? 'Nuevo cliente' : cliente.nombre}>
      <form onSubmit={guardar} className="space-y-4">
        <Field label="Nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="WhatsApp"><input className="input" required inputMode="numeric" disabled={!nuevo} value={f.telefono} onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
        <Field label="Notas" hint="Cómo le gusta el corte, alergias, lo que quieras recordar."><textarea className="input h-24 resize-none" maxLength={300} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></Field>
        <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
        {!nuevo && <button type="button" onClick={borrar} className="btn-link text-sm text-ink-3"><Trash2 size={14} /> Borrar cliente</button>}
      </form>
    </Modal>
  );
}

export default function Clientes() {
  const { negocio } = useSesion();
  const [clientes, setClientes] = useState(null);
  const [citas, setCitas] = useState([]);
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState(null);

  async function cargar() {
    const [c, h] = await Promise.all([
      db.from('clientes').select('*').order('nombre'),
      db.from('citas').select('cliente_nombre, cliente_telefono, fecha_hora, estado, servicios(precio)').eq('estado', 'finalizada'),
    ]);
    if (c.error) toast.error('No se pudieron cargar los clientes.');
    setClientes(c.data || []);
    setCitas(h.data || []);
  }
  useEffect(() => { cargar(); }, []);

  const filas = useMemo(() => {
    if (!clientes) return [];
    const resumen = {};
    for (const c of citas) {
      const k = soloDigitos(c.cliente_telefono) || (c.cliente_nombre || '').toLowerCase();
      const r = (resumen[k] ||= { visitas: 0, gastado: 0, ultima: null });
      r.visitas++; r.gastado += Number(c.servicios?.precio) || 0;
      if (!r.ultima || c.fecha_hora > r.ultima) r.ultima = c.fecha_hora;
    }
    const t = q.trim().toLowerCase();
    return clientes
      .map((c) => ({ ...c, ...(resumen[c.telefono] || resumen[(c.nombre || '').toLowerCase()] || { visitas: 0, gastado: 0, ultima: null }) }))
      .filter((c) => !t || c.nombre?.toLowerCase().includes(t) || c.telefono?.includes(t))
      .sort((a, b) => b.visitas - a.visitas || a.nombre.localeCompare(b.nombre));
  }, [clientes, citas, q]);

  const diasDesde = (iso) => Math.floor((Date.now() - new Date(iso)) / 86400000);

  return (
    <>
      <PageHeader titulo="Clientes" sub="Se agregan solos cuando agendan. Los que más vienen aparecen primero.">
        <button onClick={() => setEditando({})} className="btn-rojo"><Plus size={16} /> Agregar</button>
      </PageHeader>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-10" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {clientes === null ? <Cargando /> : filas.length === 0 ? (
        <Vacio titulo={q ? 'Nadie con ese nombre o teléfono' : 'Aún no tienes clientes'}>{!q && 'Cuando alguien aparte por tu link o le agendes una cita, aparecerá aquí.'}</Vacio>
      ) : (
        <div className="card divide-y divide-line">
          {filas.map((c) => {
            const hace = c.ultima ? diasDesde(c.ultima) : null;
            const extrañado = hace !== null && hace > 30;
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                <button onClick={() => setEditando(c)} className="min-w-0 flex-1 text-left">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{c.nombre}{c.visitas >= 5 && <Badge tono="tinta">Frecuente</Badge>}{extrañado && <Badge tono="ambar">Hace {hace} días</Badge>}</p>
                  <p className="text-sm text-ink-3">
                    {c.telefono} · {c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'}{c.gastado > 0 && ` · ${dinero(c.gastado)}`}{c.ultima && ` · última ${fechaCorta(c.ultima)}`}
                  </p>
                  {c.notas && <p className="mt-0.5 truncate text-sm text-ink-2">{c.notas}</p>}
                </button>
                {c.telefono && (
                  <a href={linkWhatsApp(c.telefono, extrañado
                    ? `¡Hola ${c.nombre}! Hace rato no te vemos por ${negocio.nombre}. ¿Te apartamos tu lugar? ${window.location.origin}/r/${negocio.slug}`
                    : `Hola ${c.nombre}, te escribimos de ${negocio.nombre}.`)}
                    target="_blank" rel="noreferrer" className="btn-ghost shrink-0 px-3" aria-label="WhatsApp"><MessageCircle size={16} /></a>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editando && <EditarCliente cliente={editando} onClose={() => setEditando(null)} onGuardado={cargar} />}
    </>
  );
}
