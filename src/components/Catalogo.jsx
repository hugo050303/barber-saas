// Patrón reutilizable: lista con alta / edición / borrado en un modal.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { db } from '../db';
import { Modal, Cargando, Vacio } from './ui';

export function useColeccion(tabla, orden = 'nombre', asc = true) {
  const [filas, setFilas] = useState(null);
  const recargar = useCallback(async () => {
    const { data, error } = await db.from(tabla).select('*').order(orden, { ascending: asc });
    if (error) toast.error('No se pudo cargar la información.');
    setFilas(data || []);
  }, [tabla, orden, asc]);
  useEffect(() => { recargar(); }, [recargar]);
  return [filas, recargar];
}

// idNuevo: id fijo para un registro nuevo (por ejemplo el barbero "principal" del plan gratis)
export async function guardarFila(tabla, id, datos, idNuevo) {
  const destino = id || idNuevo;
  const q = destino ? db.from(tabla).update(datos).eq('id', destino) : db.from(tabla).insert([datos]);
  const { error } = await q;
  if (error) { toast.error(error.code === 'permission-denied' ? 'Esta función requiere el plan Pro vigente.' : 'No se pudo guardar.'); return false; }
  toast.success(id ? 'Cambios guardados' : 'Agregado');
  return true;
}

export async function borrarFila(tabla, id, pregunta) {
  if (!window.confirm(pregunta)) return false;
  const { error } = await db.from(tabla).delete().eq('id', id);
  if (error) { toast.error('No se pudo borrar.'); return false; }
  toast.success('Borrado');
  return true;
}

// Lista + modal de formulario genérico
export function Catalogo({ tabla, filas, recargar, vacio, titulo, Formulario, columnas, puedeAgregar = true, bloqueo, textoAgregar = 'Agregar', idNuevo, formProps, anchoModal }) {
  const [editando, setEditando] = useState(null); // null | {} (nuevo) | fila
  if (filas === null) return <Cargando />;
  const cerrar = () => setEditando(null);
  const alGuardar = async (datos) => {
    if (await guardarFila(tabla, editando.id, datos, idNuevo)) { cerrar(); recargar(); }
  };
  return (
    <>
      <div className="mb-4 flex justify-end">
        {puedeAgregar ? <button onClick={() => setEditando({})} className="btn-rojo"><Plus size={16} /> {textoAgregar}</button> : bloqueo}
      </div>
      {filas.length === 0 ? <Vacio titulo={vacio.titulo}>{vacio.texto}</Vacio> : (
        <div className="card overflow-x-auto">
          <table className="tabla w-full min-w-[480px]">
            <thead><tr>{columnas.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}<th className="w-24" /></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-paper/60">
                  {columnas.map((c) => <td key={c.label} className={c.className}>{c.render(f)}</td>)}
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => setEditando(f)} className="p-2 text-ink-3 hover:text-ink" aria-label="Editar"><Pencil size={16} /></button>
                    <button onClick={async () => (await borrarFila(tabla, f.id, `¿Borrar "${f.nombre || f.descripcion}"?`)) && recargar()} className="p-2 text-ink-3 hover:text-rojo" aria-label="Borrar"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal abierto={!!editando} onClose={cerrar} titulo={editando?.id ? `Editar ${titulo}` : `Nuevo ${titulo}`} ancho={anchoModal}>
        {editando && <Formulario inicial={editando} onGuardar={alGuardar} {...formProps} />}
      </Modal>
    </>
  );
}
