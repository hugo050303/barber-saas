// Componentes para subir fotos (planes de pago)
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { comprimir, subirImagen, borrarImagen, mensajeErrorFoto } from '../lib/imagenes';

function useSelector(onArchivos, multiple = false) {
  const input = useRef(null);
  const elemento = (
    <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden"
      onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) onArchivos(f); }} />
  );
  return [elemento, () => input.current?.click()];
}

// Una sola foto (logo, portada, foto de barbero)
export function FotoUnica({ url, ruta, onCambio, opciones, etiqueta, forma = 'cuadrada' }) {
  const [subiendo, setSubiendo] = useState(false);
  const [input, abrir] = useSelector(async ([archivo]) => {
    setSubiendo(true);
    try {
      const blob = await comprimir(archivo, opciones);
      const nueva = await subirImagen(ruta, blob);
      await onCambio(nueva);
      toast.success('Foto guardada');
    } catch (e) { toast.error(mensajeErrorFoto(e)); }
    setSubiendo(false);
  });
  async function quitar() {
    if (!window.confirm('¿Quitar esta foto?')) return;
    setSubiendo(true);
    try { await borrarImagen(ruta); await onCambio(null); } catch (e) { toast.error(mensajeErrorFoto(e)); }
    setSubiendo(false);
  }
  const caja = forma === 'ancha' ? 'aspect-[3/1] w-full' : forma === 'redonda' ? 'h-20 w-20 rounded-full' : 'h-24 w-24';
  return (
    <div className="flex items-center gap-4">
      {input}
      <button type="button" onClick={abrir} disabled={subiendo} aria-label={etiqueta}
        className={`relative shrink-0 overflow-hidden border border-dashed border-line bg-paper ${forma === 'redonda' ? '' : 'rounded'} ${caja} ${forma === 'ancha' ? 'flex-1' : ''}`}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-ink-3"><ImagePlus size={22} strokeWidth={1.5} /></span>}
        {subiendo && <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-paper"><Loader2 size={20} className="animate-spin" /></span>}
      </button>
      {forma !== 'ancha' && (
        <div className="flex flex-col items-start gap-1">
          <button type="button" onClick={abrir} disabled={subiendo} className="btn-link text-sm font-semibold text-ink">{url ? 'Cambiar' : 'Subir foto'}</button>
          {url && <button type="button" onClick={quitar} disabled={subiendo} className="btn-link text-sm text-ink-3">Quitar</button>}
        </div>
      )}
      {forma === 'ancha' && url && <button type="button" onClick={quitar} disabled={subiendo} className="btn-ghost shrink-0 px-3" aria-label="Quitar portada"><Trash2 size={16} /></button>}
    </div>
  );
}

// Galería de hasta `max` fotos en lugares fijos (0..max-1)
export function Galeria({ fotos, rutaBase, max, onCambio }) {
  const [subiendo, setSubiendo] = useState(0);
  const [input, abrir] = useSelector(async (archivos) => {
    const libres = Array.from({ length: max }, (_, i) => i).filter((i) => !fotos.some((f) => f.slot === i));
    const lote = archivos.slice(0, libres.length);
    if (archivos.length > libres.length) toast(`Solo caben ${libres.length} fotos más.`);
    setSubiendo(lote.length);
    const nuevas = [...fotos];
    for (const [k, archivo] of lote.entries()) {
      try {
        const blob = await comprimir(archivo, { ladoMax: 1400 });
        nuevas.push({ slot: libres[k], url: await subirImagen(`${rutaBase}/${libres[k]}`, blob) });
      } catch (e) { toast.error(mensajeErrorFoto(e)); break; }
      setSubiendo((n) => n - 1);
    }
    nuevas.sort((a, b) => a.slot - b.slot);
    await onCambio(nuevas);
    setSubiendo(0);
  }, true);

  async function quitar(foto) {
    if (!window.confirm('¿Quitar esta foto?')) return;
    try { await borrarImagen(`${rutaBase}/${foto.slot}`); await onCambio(fotos.filter((f) => f.slot !== foto.slot)); }
    catch (e) { toast.error(mensajeErrorFoto(e)); }
  }

  return (
    <div>
      {input}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((f) => (
          <div key={f.slot} className="group relative aspect-square overflow-hidden rounded bg-paper">
            <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            <button type="button" onClick={() => quitar(f)} aria-label="Quitar foto"
              className="absolute right-1.5 top-1.5 rounded bg-ink/70 p-1.5 text-paper opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14} /></button>
          </div>
        ))}
        {Array.from({ length: subiendo }, (_, i) => (
          <div key={`s${i}`} className="esqueleto aspect-square" />
        ))}
        {fotos.length + subiendo < max && (
          <button type="button" onClick={abrir} disabled={subiendo > 0}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded border border-dashed border-line text-ink-3 hover:border-ink hover:text-ink">
            <ImagePlus size={22} strokeWidth={1.5} /><span className="text-xs">Agregar</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-3">{fotos.length} de {max} fotos. Se comprimen solas antes de subirse.</p>
    </div>
  );
}
