import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Gastos = () => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    fetchGastos();
  }, []);

  async function fetchGastos() {
    setLoading(true);
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false }); // Los más recientes primero
    setGastos(data || []);
    setLoading(false);
  }

  async function agregarGasto(e) {
    e.preventDefault();
    setGuardando(true);

    const { error } = await supabase.from('gastos').insert([
      { descripcion, monto, categoria }
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setDescripcion(''); setMonto(''); setCategoria('');
      fetchGastos();
    }
    setGuardando(false);
  }

  async function eliminarGasto(id) {
    if(!window.confirm("¿Eliminar este registro?")) return;
    await supabase.from('gastos').delete().eq('id', id);
    fetchGastos();
  }

  // Calcular el total de gastos mostrados
  const totalGastos = gastos.reduce((acc, curr) => acc + Number(curr.monto), 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">💸 Control de Gastos</h1>

      {/* FORMULARIO */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Registrar Salida de Dinero</h2>
        <form onSubmit={agregarGasto} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">Descripción</label>
                <input required type="text" placeholder="Ej. Recibo de Luz" className="w-full border p-2 rounded"
                    value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div className="w-40">
                <label className="block text-sm text-gray-600 mb-1">Categoría</label>
                <select className="w-full border p-2 rounded" 
                    value={categoria} onChange={e => setCategoria(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    <option value="Servicios">Servicios (Luz/Agua)</option>
                    <option value="Renta">Renta</option>
                    <option value="Nomina">Nómina / Salarios</option>
                    <option value="Insumos">Compra de Insumos</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Otros">Otros</option>
                </select>
            </div>
            <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Monto</label>
                <input required type="number" placeholder="$" className="w-full border p-2 rounded"
                    value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <button type="submit" disabled={guardando} 
                className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 font-medium h-10">
                {guardando ? '...' : 'Registrar -'}
            </button>
        </form>
      </div>

      {/* RESUMEN RÁPIDO */}
      <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 font-bold flex justify-between items-center">
        <span>Total Gastado (Histórico):</span>
        <span className="text-2xl">${totalGastos}</span>
      </div>

      {/* LISTA DE GASTOS */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4 text-right"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {gastos.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                        <td className="p-4 text-gray-500 text-sm">
                            {new Date(g.fecha).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-medium text-slate-800">{g.descripcion}</td>
                        <td className="p-4">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">
                                {g.categoria}
                            </span>
                        </td>
                        <td className="p-4 text-red-600 font-bold">-${g.monto}</td>
                        <td className="p-4 text-right">
                            <button onClick={() => eliminarGasto(g.id)} className="text-gray-400 hover:text-red-500">
                                🗑️
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {gastos.length === 0 && <p className="text-center p-8 text-gray-400">No hay gastos registrados.</p>}
      </div>
    </div>
  );
};

export default Gastos;