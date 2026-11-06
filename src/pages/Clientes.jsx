import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import { useSesion } from '../lib/sesion';
import { nuevoCliente, guardarCliente, borrarCliente } from '../lib/negocio';
import { dinero, fechaCorta, linkWhatsApp, soloDigitos, normalizar } from '../lib/formato';
import { PageHeader, Cargando, Vacio, Modal, Field, Badge } from '../components/ui';
import Recuperar from '../components/Recuperar';

const POR_PAGINA = 50;
const VISTAS = [
  ['frecuentes', 'Frecuentes'],
  ['nuevos', 'Nuevos'],
  ['recuperar', 'Por recuperar'],
];

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
      await guardarCliente(nuevo ? tel : cliente.id, nuevo ? nuevoCliente(f.nombre, tel, f.notas.trim()) : { nombre: f.nombre.trim(), nombre_busqueda: normalizar(f.nombre), notas: f.notas.trim() }, { fusionar: true });
      toast.success('Cliente guardado'); onGuardado(); onClose();
    } catch { toast.error('No se pudo guardar.'); }
    setEnviando(false);
  }
  async function borrar() {
    if (!window.confirm(`¿Borrar a ${cliente.nombre} del directorio? Sus citas pasadas no se borran.`)) return;
    try { await borrarCliente(cliente.id); toast.success('Cliente borrado'); onGuardado(); onClose(); }
    catch { toast.error('No se pudo borrar.'); }
  }
  return (
    <Modal abierto onClose={onClose} titulo={nuevo ? 'Nuevo cliente' : cliente.nombre}>
      <form onSubmit={guardar} className="space-y-4">
        <Field label="Nombre"><input className="input" required maxLength={60} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="WhatsApp"><input className="input" required inputMode="numeric" disabled={!nuevo} value={f.telefono} onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value).slice(0, 10) })} /></Field>
        <Field label="Notas" hint="Cómo le gusta el corte, alergias, lo que quieras recordar."><textarea className="input h-24 resize-none" maxLength={300} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></Field>
        {!nuevo && (
          <p className="text-sm text-ink-2">{cliente.visitas || 0} visitas · {dinero(cliente.gastado)} en total{cliente.ultima && ` · última ${fechaCorta(cliente.ultima)}`}</p>
        )}
        <button className="btn-primary w-full py-3" disabled={enviando}>Guardar</button>
        {!nuevo && <button type="button" onClick={borrar} className="btn-link text-sm text-ink-3"><Trash2 size={14} /> Borrar cliente</button>}
      </form>
    </Modal>
  );
}

// Consultas paginadas: solo se leen los clientes que se muestran (no todo el directorio)
function consulta(vista, q, max) {
  const t = q.trim();
  const base = db.from('clientes').select('*');
  if (t) {
    const digitos = soloDigitos(t);
    const [campo, valor] = digitos.length >= 3 && digitos === t.replace(/\s/g, '') ? ['telefono', digitos] : ['nombre_busqueda', normalizar(t)];
    return base.gte(campo, valor).lte(campo, valor + '').order(campo).limit(max);
  }
  if (vista === 'nuevos') return base.order('created_at', { ascending: false }).limit(max);
  return base.order('visitas', { ascending: false }).limit(max);
}

export default function Clientes() {
  const { negocio } = useSesion();
  const [vista, setVista] = useState('frecuentes');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [max, setMax] = useState(POR_PAGINA);
  const [filas, setFilas] = useState(null);
  const [editando, setEditando] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [ahora] = useState(() => Date.now());

  // Espera a que dejes de escribir antes de buscar (menos lecturas)
  useEffect(() => { const t = setTimeout(() => { setBusqueda(q); setMax(POR_PAGINA); }, 350); return () => clearTimeout(t); }, [q]);
  const recuperando = vista === 'recuperar' && !busqueda;
  useEffect(() => {
    if (recuperando) return undefined;
    let vigente = true;
    consulta(vista, busqueda, max).then(({ data, error }) => {
      if (!vigente) return;
      if (error) toast.error('No se pudieron cargar los clientes.');
      setFilas(data || []);
    });
    return () => { vigente = false; };
  }, [vista, busqueda, max, recarga, recuperando]);

  const diasDesde = (iso) => Math.floor((ahora - new Date(iso)) / 86400000);
  const recargar = () => setRecarga((n) => n + 1);

  return (
    <>
      <PageHeader titulo="Clientes" sub="Se agregan solos cuando agendan. Las visitas y el gasto se suman al marcar una cita como terminada.">
        <button onClick={() => setEditando({})} className="btn-rojo"><Plus size={16} /> Agregar</button>
      </PageHeader>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-10" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!busqueda && (
        <div className="mb-4 flex gap-1 border-b border-line">
          {VISTAS.map(([k, label]) => (
            <button key={k} onClick={() => { setVista(k); setMax(POR_PAGINA); setFilas(null); }}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${vista === k ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      )}
      {recuperando ? <Recuperar key={recarga} negocio={negocio} onEditar={setEditando} /> : filas === null ? <Cargando /> : filas.length === 0 ? (
        <Vacio titulo={busqueda ? 'Nadie con ese nombre o teléfono' : 'Aún no tienes clientes'}>
          {!busqueda && 'Cuando alguien aparte por tu link o le agendes una cita, aparecerá aquí.'}
        </Vacio>
      ) : (
        <>
          <div className="card divide-y divide-line">
            {filas.map((c) => {
              const hace = c.ultima ? diasDesde(c.ultima) : null;
              const extrañado = hace !== null && hace > 30;
              return (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                  <button onClick={() => setEditando(c)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{c.nombre}{c.visitas >= 5 && <Badge tono="tinta">Frecuente</Badge>}{extrañado && <Badge tono="ambar">Hace {hace} días</Badge>}</p>
                    <p className="text-sm text-ink-3">
                      {c.telefono} · {c.visitas || 0} {c.visitas === 1 ? 'visita' : 'visitas'}{c.gastado > 0 && ` · ${dinero(c.gastado)}`}{c.ultima && ` · última ${fechaCorta(c.ultima)}`}
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
          {filas.length >= max && <button onClick={() => setMax(max + POR_PAGINA)} className="btn-ghost mt-4 w-full">Ver más</button>}
        </>
      )}
      {editando && <EditarCliente cliente={editando} onClose={() => setEditando(null)} onGuardado={recargar} />}
    </>
  );
}
