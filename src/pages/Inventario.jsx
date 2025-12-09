import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario nuevo producto
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchProductos();
  }, []);

  async function fetchProductos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) console.error(error);
    else setProductos(data || []);
    setLoading(false);
  }

  async function agregarProducto(e) {
    e.preventDefault();
    setGuardando(true);

    const { error } = await supabase.from('inventario').insert([
      { nombre, precio_venta: precio, stock: stock }
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNombre(''); setPrecio(''); setStock('');
      fetchProductos();
    }
    setGuardando(false);
  }

  // Función rápida para restar stock al vender
  async function ajustarStock(id, cantidadActual, cambio) {
    const nuevoStock = cantidadActual + cambio;
    if (nuevoStock < 0) return; // No permitir negativos

    const { error } = await supabase
      .from('inventario')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) alert("Error: " + error.message);
    else fetchProductos(); // Recargar visualmente
  }

  async function eliminarProducto(id) {
    if(!window.confirm("¿Borrar producto del sistema?")) return;
    const { error } = await supabase.from('inventario').delete().eq('id', id);
    if (!error) fetchProductos();
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">📦 Control de Inventario</h1>

      {/* FORMULARIO */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Registrar Producto Nuevo</h2>
        <form onSubmit={agregarProducto} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">Nombre Producto</label>
                <input required type="text" placeholder="Ej. Pomada Suavecito" className="w-full border p-2 rounded"
                    value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Precio Venta</label>
                <input required type="number" placeholder="$" className="w-full border p-2 rounded"
                    value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
            <div className="w-32">
                <label className="block text-sm text-gray-600 mb-1">Stock Inicial</label>
                <input required type="number" placeholder="Cant." className="w-full border p-2 rounded"
                    value={stock} onChange={e => setStock(e.target.value)} />
            </div>
            <button type="submit" disabled={guardando} 
                className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 font-medium h-10">
                {guardando ? 'Guardando...' : 'Registrar +'}
            </button>
        </form>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                <tr>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4 text-center">Existencia</th>
                    <th className="p-4 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {productos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-slate-800">{p.nombre}</td>
                        <td className="p-4 text-emerald-600 font-bold">${p.precio_venta}</td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => ajustarStock(p.id, p.stock, -1)} 
                                    className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 font-bold">-</button>
                                <span className={`font-bold text-lg ${p.stock < 5 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {p.stock}
                                </span>
                                <button onClick={() => ajustarStock(p.id, p.stock, 1)}
                                    className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 font-bold">+</button>
                            </div>
                            {p.stock < 5 && <p className="text-[10px] text-red-500 font-bold mt-1">¡POCO STOCK!</p>}
                        </td>
                        <td className="p-4 text-right">
                            <button onClick={() => eliminarProducto(p.id)} className="text-gray-400 hover:text-red-500">
                                🗑️
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {productos.length === 0 && <p className="text-center p-8 text-gray-400">No hay productos registrados.</p>}
      </div>
    </div>
  );
};

export default Inventario;