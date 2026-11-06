// Bloquear horas o días completos desde la Agenda (para toda la barbería o un barbero).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { actualizarNegocio } from '../lib/negocio';
import { normalizarHorario, bloqueosVigentes, MAX_BLOQUEOS } from '../lib/horario';
import { aMinutos, diaCorto, hoyYmd } from '../lib/formato';
import { Modal, Field, Badge } from './ui';
import { Interruptor } from './EditorHorario';

export default function BloquearHoras({ abierto, onClose, negocio, barberos, diaInicial, barberoInicial = '' }) {
  const [f, setF] = useState({ barbero: barberoInicial, desde: diaInicial, hasta: diaInicial, todoElDia: false, inicio: '12:00', fin: '15:00' });
  const [guardando, setGuardando] = useState(false);
  const vigentes = bloqueosVigentes(normalizarHorario(negocio.horario).bloqueos).sort((a, b) => a.desde.localeCompare(b.desde));
  const nombreDe = (id) => (id ? barberos.find((b) => b.id === id)?.nombre || 'Barbero' : 'Toda la barbería');

  async function guardarBloqueos(bloqueos, mensaje) {
    setGuardando(true);
    try {
      await actualizarNegocio(negocio.id, { horario: { ...normalizarHorario(negocio.horario), bloqueos } });
      toast.success(mensaje);
      return true;
    } catch { toast.error('No se pudo guardar.'); return false; }
    finally { setGuardando(false); }
  }

  async function agregar(e) {
    e.preventDefault();
    const hasta = f.hasta && f.hasta >= f.desde ? f.hasta : f.desde;
    if (!f.todoElDia && aMinutos(f.fin) <= aMinutos(f.inicio)) return toast.error('La hora final debe ser después de la inicial.');
    if (vigentes.length >= MAX_BLOQUEOS) return toast.error('Tienes demasiados bloqueos. Borra algunos que ya no necesites.');
    const nuevo = { desde: f.desde, ...(hasta !== f.desde ? { hasta } : {}), ...(f.todoElDia ? {} : { inicio: f.inicio, fin: f.fin }), ...(f.barbero ? { barbero: f.barbero } : {}) };
    if (await guardarBloqueos([...vigentes, nuevo], 'Listo: esas horas ya no se ofrecen')) onClose();
  }

  const quitar = (b) => guardarBloqueos(vigentes.filter((x) => x !== b), 'Bloqueo quitado');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Bloquear horas">
      <form onSubmit={agregar} className="space-y-4">
        <Field label="¿Para quién?">
          <select className="input" value={f.barbero} onChange={set('barbero')}>
            <option value="">Toda la barbería</option>
            {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde"><input className="input" type="date" required min={hoyYmd()} value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value, hasta: f.hasta < e.target.value ? e.target.value : f.hasta })} /></Field>
          <Field label="Hasta"><input className="input" type="date" min={f.desde} value={f.hasta} onChange={set('hasta')} /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <Interruptor activo={f.todoElDia} label="Todo el día" onChange={(v) => setF({ ...f, todoElDia: v })} /> Todo el día
        </label>
        {!f.todoElDia && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="De"><input className="input" type="time" required value={f.inicio} onChange={set('inicio')} /></Field>
            <Field label="A"><input className="input" type="time" required value={f.fin} onChange={set('fin')} /></Field>
          </div>
        )}
        <p className="text-xs text-ink-3">Tus clientes ya no verán esas horas en la página de reservas. Las citas que ya estaban apartadas no se cancelan.</p>
        <button className="btn-primary w-full py-3" disabled={guardando}>{guardando ? 'Guardando…' : 'Bloquear'}</button>
      </form>

      {vigentes.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="eyebrow mb-2">Próximos bloqueos</p>
          <div className="divide-y divide-line rounded border border-line">
            {vigentes.map((b, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{diaCorto(b.desde)}{b.hasta && b.hasta !== b.desde ? ` al ${diaCorto(b.hasta)}` : ''}</p>
                  <p className="text-ink-3">{b.inicio ? `${b.inicio} a ${b.fin}` : 'Todo el día'} · {nombreDe(b.barbero)}</p>
                </div>
                {!b.inicio && <Badge>Día completo</Badge>}
                <button type="button" onClick={() => quitar(b)} disabled={guardando} className="p-1.5 text-ink-3 hover:text-rojo" aria-label="Quitar bloqueo"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
