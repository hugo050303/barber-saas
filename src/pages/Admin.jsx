// Panel de administración (solo la cuenta ADMIN_EMAIL): ver barberías y activar planes.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Search, MessageCircle, ExternalLink } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { useSesion } from '../lib/sesion';
import { esPro } from '../lib/negocio';
import { fechaCorta, linkWhatsApp } from '../lib/formato';
import { Logo, Badge, Cargando, Stat } from '../components/ui';
import { PRECIO_PRO, MARCA } from '../config';
import { dinero } from '../lib/formato';

const aFecha = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null);

export default function Admin() {
  const { negocio } = useSesion();
  const [negocios, setNegocios] = useState(null);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [ahora] = useState(() => Date.now());

  async function cargar() {
    const [n, u] = await Promise.all([getDocs(collection(firestore, 'negocios')), getDocs(collection(firestore, 'usuarios'))]);
    const usuarios = Object.fromEntries(u.docs.map((d) => [d.id, d.data()]));
    setNegocios(n.docs.map((d) => ({ id: d.id, ...d.data(), dueno: usuarios[d.data().ownerUid] || {} }))
      .sort((a, b) => (aFecha(b.creado) || 0) - (aFecha(a.creado) || 0)));
  }
  useEffect(() => { cargar().catch(() => toast.error('No se pudo cargar la lista.')); }, []);

  async function darMeses(n, meses) {
    const base = esPro(n) ? aFecha(n.proHasta) : new Date();
    const hasta = new Date(base); hasta.setMonth(hasta.getMonth() + meses);
    if (!window.confirm(`¿Activar Pro a "${n.nombre}" hasta el ${fechaCorta(hasta)}?`)) return;
    try { await updateDoc(doc(firestore, 'negocios', n.id), { plan: 'pro', proHasta: Timestamp.fromDate(hasta) }); toast.success('Plan Pro activado'); cargar(); }
    catch { toast.error('No se pudo actualizar.'); }
  }
  async function quitarPro(n) {
    if (!window.confirm(`¿Regresar "${n.nombre}" al plan Gratis?`)) return;
    try { await updateDoc(doc(firestore, 'negocios', n.id), { plan: 'gratis', proHasta: null }); toast.success('Regresó a Gratis'); cargar(); }
    catch { toast.error('No se pudo actualizar.'); }
  }

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    const semana = 7 * 86400000;
    return (negocios || []).filter((n) => {
      if (t && ![n.nombre, n.slug, n.dueno.email, n.dueno.nombre, n.whatsapp].some((x) => x?.toLowerCase?.().includes(t))) return false;
      if (filtro === 'pro') return esPro(n);
      if (filtro === 'gratis') return !esPro(n);
      if (filtro === 'vence') return esPro(n) && aFecha(n.proHasta) - ahora < semana;
      return true;
    });
  }, [negocios, q, filtro, ahora]);

  const nPro = (negocios || []).filter(esPro).length;

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Logo claro />
          <div className="flex items-center gap-5 text-sm text-paper/70">
            {negocio && <Link to="/app" className="hover:text-paper">Ir a mi panel</Link>}
            <button onClick={() => signOut(auth)} className="hover:text-paper">Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h1 className="display text-5xl">Administración</h1>
        <p className="mt-1 text-ink-2">Barberías registradas en {MARCA}. Activa Pro cuando confirmes el pago.</p>
        {negocios === null ? <Cargando /> : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Barberías" valor={negocios.length} />
              <Stat label="En Pro" valor={nPro} />
              <Stat label="Ingreso mensual" valor={dinero(nPro * PRECIO_PRO)} nota="Pro vigentes × precio" />
              <Stat label="Nuevas (7 días)" valor={negocios.filter((n) => ahora - (aFecha(n.creado) || 0) < 7 * 86400000).length} />
            </div>
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input className="input pl-10" placeholder="Buscar por nombre, correo o WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input md:w-48" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="todos">Todas</option><option value="pro">Pro vigente</option><option value="gratis">Gratis o vencidas</option><option value="vence">Vencen esta semana</option>
              </select>
            </div>
            <div className="card mt-4 divide-y divide-line">
              {lista.length === 0 && <p className="px-4 py-10 text-center text-ink-3">Sin resultados</p>}
              {lista.map((n) => {
                const pro = esPro(n); const hasta = aFecha(n.proHasta);
                return (
                  <div key={n.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {n.nombre}
                        {pro ? <Badge tono="verde">Pro hasta {fechaCorta(hasta)}</Badge> : n.plan === 'pro' ? <Badge tono="rojo">Pro vencido</Badge> : <Badge>Gratis</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-3">{n.dueno.nombre} · {n.dueno.email} · alta {aFecha(n.creado) ? fechaCorta(aFecha(n.creado)) : '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {n.whatsapp && <a href={linkWhatsApp(n.whatsapp, `Hola ${n.dueno.nombre || ''}, te escribo de ${MARCA}.`)} target="_blank" rel="noreferrer" className="btn-ghost px-3" aria-label="WhatsApp"><MessageCircle size={16} /></a>}
                      <a href={`/r/${n.slug}`} target="_blank" rel="noreferrer" className="btn-ghost px-3" aria-label="Ver página"><ExternalLink size={16} /></a>
                      <button onClick={() => darMeses(n, 1)} className="btn-primary">+1 mes Pro</button>
                      <button onClick={() => darMeses(n, 12)} className="btn-ghost">+12 meses</button>
                      {n.plan === 'pro' && <button onClick={() => quitarPro(n)} className="btn-ghost text-rojo">Quitar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
