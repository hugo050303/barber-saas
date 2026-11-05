// Panel de administración (solo la cuenta ADMIN_EMAIL): ver barberías y activar planes.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Search, MessageCircle, ExternalLink } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { useSesion } from '../lib/sesion';
import { esPro, configSistema } from '../lib/negocio';
import { Logo, Badge, Cargando, Stat } from '../components/ui';
import { PLANES, FUNDADOR, MARCA } from '../config';
import { dinero, fechaCorta, linkWhatsApp } from '../lib/formato';

const aFecha = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null);

// Abrir/cerrar el registro y fijar el tope de barberías (lo respetan las reglas de seguridad)
function ControlRegistro() {
  const [cfg, setCfg] = useState(null);
  const [tope, setTope] = useState('');
  const cargar = () => configSistema().then((c) => { setCfg(c); setTope(String(c.maxNegocios)); });
  useEffect(() => { cargar(); }, []);
  async function guardar(cambios) {
    try { await setDoc(doc(firestore, 'sistema', 'config'), { registroAbierto: cfg.registroAbierto, maxNegocios: cfg.maxNegocios, ...cambios }, { merge: true }); toast.success('Guardado'); cargar(); }
    catch { toast.error('No se pudo guardar.'); }
  }
  if (!cfg) return null;
  const pct = Math.min(100, Math.round((cfg.total / Math.max(1, cfg.maxNegocios)) * 100));
  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold">Registro de barberías</p>
          <p className="mt-1 text-sm text-ink-2">{cfg.total} de {cfg.maxNegocios} lugares usados · {cfg.registroAbierto ? (cfg.hayLugar ? 'abierto' : 'lleno') : 'cerrado'}</p>
        </div>
        <button onClick={() => guardar({ registroAbierto: !cfg.registroAbierto })} className={cfg.registroAbierto ? 'btn-ghost' : 'btn-primary'}>
          {cfg.registroAbierto ? 'Cerrar registro' : 'Abrir registro'}
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper"><div className={`h-full ${pct >= 90 ? 'bg-rojo' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Tope de barberías</span>
          <input className="input w-32" type="number" min="1" value={tope} onChange={(e) => setTope(e.target.value)} /></label>
        <button className="btn-ghost" disabled={!Number(tope) || Number(tope) === cfg.maxNegocios} onClick={() => guardar({ maxNegocios: Math.max(1, Math.round(Number(tope))) })}>Guardar tope</button>
      </div>
      <p className="mt-3 text-xs text-ink-3">El plan gratis de Firebase (Spark) aguanta alrededor de 25 a 50 barberías usándolo a diario. Antes de subir el tope, cambia Firebase al plan Blaze y pon una alerta de presupuesto.</p>
    </div>
  );
}

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

  async function darMeses(n, meses, plan) {
    // Si aún tiene un plan vigente, el tiempo se suma al final; si no, empieza hoy
    const base = esPro(n) ? aFecha(n.proHasta) : new Date();
    const hasta = new Date(base); hasta.setMonth(hasta.getMonth() + meses);
    if (!window.confirm(`¿Activar ${PLANES[plan].nombre} a "${n.nombre}" hasta el ${fechaCorta(hasta)}?`)) return;
    try { await updateDoc(doc(firestore, 'negocios', n.id), { plan, proHasta: Timestamp.fromDate(hasta) }); toast.success(`Plan ${PLANES[plan].nombre} activado`); cargar(); }
    catch { toast.error('No se pudo actualizar.'); }
  }
  // Precio fundador: se marca en la barbería y se lleva la cuenta de lugares usados (se muestra en la página de ventas)
  async function cambiarFundador(n) {
    const usados = (negocios || []).filter((x) => x.fundador).length;
    const activar = !n.fundador;
    if (activar && usados >= FUNDADOR.lugares) return toast.error(`Ya se usaron los ${FUNDADOR.lugares} lugares de fundador.`);
    if (!window.confirm(activar ? `¿Dar precio fundador ($${FUNDADOR.precio}/mes de por vida) a "${n.nombre}"?` : `¿Quitar precio fundador a "${n.nombre}"?`)) return;
    try {
      const b = writeBatch(firestore);
      b.update(doc(firestore, 'negocios', n.id), { fundador: activar });
      b.set(doc(firestore, 'sistema', 'config'), { fundadoresUsados: usados + (activar ? 1 : -1) }, { merge: true });
      await b.commit();
      toast.success(activar ? 'Precio fundador activado' : 'Precio fundador quitado'); cargar();
    } catch { toast.error('No se pudo actualizar.'); }
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

  const dePago = (negocios || []).filter(esPro);
  const nPro = dePago.length;
  // Ingreso mensual estimado (precio fundador para los marcados; los anuales cuentan como su mensualidad)
  const ingreso = dePago.reduce((a, n) => a + (n.plan === 'pro' && n.fundador ? FUNDADOR.precio : PLANES[n.plan].mensual), 0);

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
              <Stat label="De pago" valor={nPro} nota={`${dePago.filter((n) => n.plan === 'plus').length} en Plus · ${negocios.filter((n) => n.fundador).length}/${FUNDADOR.lugares} fundadores`} />
              <Stat label="Ingreso mensual" valor={dinero(ingreso)} nota="Estimado con planes vigentes" />
              <Stat label="Nuevas (7 días)" valor={negocios.filter((n) => ahora - (aFecha(n.creado) || 0) < 7 * 86400000).length} />
            </div>
            <ControlRegistro />
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input className="input pl-10" placeholder="Buscar por nombre, correo o WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input md:w-48" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="todos">Todas</option><option value="pro">Pro o Plus vigente</option><option value="gratis">Gratis o vencidas</option><option value="vence">Vencen esta semana</option>
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
                        {pro ? <Badge tono="verde">{PLANES[n.plan].nombre} hasta {fechaCorta(hasta)}</Badge> : n.plan !== 'gratis' ? <Badge tono="rojo">{PLANES[n.plan]?.nombre || 'Plan'} vencido</Badge> : <Badge>Gratis</Badge>}
                        {n.fundador && <Badge tono="rojo">Fundador</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-3">{n.dueno.nombre} · {n.dueno.email} · alta {aFecha(n.creado) ? fechaCorta(aFecha(n.creado)) : '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {n.whatsapp && <a href={linkWhatsApp(n.whatsapp, `Hola ${n.dueno.nombre || ''}, te escribo de ${MARCA}.`)} target="_blank" rel="noreferrer" className="btn-ghost px-3" aria-label="WhatsApp"><MessageCircle size={16} /></a>}
                      <a href={`/r/${n.slug}`} target="_blank" rel="noreferrer" className="btn-ghost px-3" aria-label="Ver página"><ExternalLink size={16} /></a>
                      <select className="input w-auto py-2 text-sm" value="" aria-label="Activar plan"
                        onChange={(e) => { const [plan, meses] = e.target.value.split(':'); if (plan) darMeses(n, Number(meses), plan); }}>
                        <option value="">Activar plan…</option>
                        <option value="pro:1">Pro · 1 mes</option>
                        <option value="pro:12">Pro · 12 meses</option>
                        <option value="plus:1">Plus · 1 mes</option>
                        <option value="plus:12">Plus · 12 meses</option>
                      </select>
                      <button onClick={() => cambiarFundador(n)} className="btn-ghost">{n.fundador ? 'Quitar fundador' : 'Fundador'}</button>
                      {n.plan !== 'gratis' && <button onClick={() => quitarPro(n)} className="btn-ghost text-rojo">Quitar plan</button>}
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
