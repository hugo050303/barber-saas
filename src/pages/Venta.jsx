import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { generarTicketVenta } from '../utils/ticketGenerator';

const Venta = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Datos del Negocio para el Ticket
  const [nombreNegocio, setNombreNegocio] = useState('Mi Negocio');
  const [configNegocio, setConfigNegocio] = useState({}); // Guardamos dirección y teléfono aquí

  // Estados para el Modal de Éxito
  const [ventaTerminada, setVentaTerminada] = useState(false);
  const [datosUltimaVenta, setDatosUltimaVenta] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. Cargar productos con stock
    const { data: dataProd } = await supabase.from('inventario').select('*').gt('stock', 0).order('nombre');
    setProductos(dataProd || []);
    
    // 2. Cargar datos del negocio (Nombre, Dirección, Teléfono)
    const { data: dataConfig } = await supabase.from('configuracion').select('*').single();
    if (dataConfig) {
        setNombreNegocio(dataConfig.nombre_negocio);
        setConfigNegocio(dataConfig); // Guardamos todo el objeto para usarlo al imprimir
    }
    
    setLoading(false);
  }

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find(item => item.id === producto.id);
    
    if (existe) {
      if (existe.cantidad < producto.stock) {
        setCarrito(carrito.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
      } else {
        alert("¡No hay más stock disponible!");
      }
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const totalPagar = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);

  const cobrar = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);

    // 1. Registrar venta en historial
    const { data: ventaGuardada, error } = await supabase.from('ventas_productos')
      .insert([{ total: totalPagar, detalle_items: carrito }])
      .select()
      .single();

    if (error) {
      alert("Error al procesar: " + error.message);
      setProcesando(false);
      return;
    }

    // 2. Descontar stock (en segundo plano)
    for (const item of carrito) {
      await supabase.from('inventario').update({ stock: item.stock - item.cantidad }).eq('id', item.id);
    }

    // 3. Preparar datos para el ticket
    const folio = ventaGuardada.id.slice(0, 8).toUpperCase();
    setDatosUltimaVenta({
        items: [...carrito],
        total: totalPagar,
        folio: folio
    });

    // 4. Limpiar y abrir modal
    setCarrito([]);
    fetchData(); // Recargar productos para ver stock actualizado
    setProcesando(false);
    setVentaTerminada(true);
  };

  const imprimirTicket = () => {
    if (!datosUltimaVenta) return;

    // Generamos el PDF con el diseño profesional
    const pdfUrl = generarTicketVenta(
        datosUltimaVenta.items, 
        datosUltimaVenta.total, 
        nombreNegocio, 
        datosUltimaVenta.folio,
        configNegocio.direccion, // Pasamos la dirección
        configNegocio.telefono   // Pasamos el teléfono
    );

    // Lo cargamos en el iframe invisible
    const iframe = document.getElementById('iframe-impresion');
    iframe.src = pdfUrl;

    // Esperamos un momento a que cargue y mandamos imprimir
    setTimeout(() => {
        iframe.contentWindow.print();
    }, 500);
  };

  const cerrarModal = () => {
    setVentaTerminada(false);
    setDatosUltimaVenta(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {/* IFRAME INVISIBLE (El secreto para imprimir sin salir) */}
      <iframe id="iframe-impresion" className="hidden" title="ticket-print"></iframe>

      {/* --- MODAL DE VENTA EXITOSA --- */}
      {ventaTerminada && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-bounce-in transform transition-all scale-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <span className="text-5xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">¡Cobro Exitoso!</h2>
                <p className="text-gray-500 mt-2">La venta se registró correctamente.</p>
                
                <div className="my-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 uppercase font-bold">Total Cobrado</p>
                    <p className="text-3xl font-bold text-slate-800">${datosUltimaVenta?.total}</p>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={imprimirTicket}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <span>🖨️</span> Imprimir Ticket
                    </button>
                    
                    <button 
                        onClick={cerrarModal}
                        className="w-full bg-white border-2 border-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                        Nueva Venta
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* IZQUIERDA: CATÁLOGO */}
      <div className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">🛒 Punto de Venta</h1>
                <p className="text-slate-500 text-sm">Selecciona productos para agregar</p>
            </div>
        </header>

        {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
            </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {productos.map(p => (
              <div key={p.id} onClick={() => agregarAlCarrito(p)}
                className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-indigo-500 transition-all duration-200 group relative overflow-hidden">
                
                {/* Badge de Stock bajo */}
                {p.stock <= 5 && (
                    <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full">
                        ¡Pocos!
                    </span>
                )}

                <div className="h-20 bg-indigo-50/50 rounded-lg mb-3 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
                  🧴
                </div>
                <h3 className="font-bold text-slate-800 truncate text-sm">{p.nombre}</h3>
                <div className="flex justify-between items-end mt-2">
                    <span className="text-lg text-indigo-600 font-bold">${p.precio_venta}</span>
                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">Stock: {p.stock}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DERECHA: TICKET EN CURSO */}
      <div className="w-96 bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col border-l border-gray-200 z-10 relative">
        {/* Cabecera Ticket */}
        <div className="p-6 bg-slate-900 text-white shadow-md">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">Ticket Actual</h2>
                    <p className="text-slate-400 text-xs mt-1 truncate max-w-[200px]">{nombreNegocio}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                    <span className="text-2xl">🧾</span>
                </div>
            </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
            {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                    <span className="text-6xl mb-4 grayscale">🛒</span>
                    <p className="font-medium">Carrito vacío</p>
                    <p className="text-xs">Agrega productos</p>
                </div>
            ) : (
                carrito.map(item => (
                    <div key={item.id} className="group flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors">
                        <div>
                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.nombre}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.cantidad} x <span className="font-semibold">${item.precio_venta}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700">${item.cantidad * item.precio_venta}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); quitarDelCarrito(item.id); }}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-100 hover:text-red-500 transition-all">
                                ✕
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Totales y Botón */}
        <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-end mb-6">
                <span className="text-gray-500 font-medium text-sm mb-1">Total a Pagar</span>
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">${totalPagar}</span>
            </div>
            
            <button 
                onClick={cobrar}
                disabled={carrito.length === 0 || procesando}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-500 shadow-lg shadow-emerald-200 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-[0.98] flex justify-center items-center gap-2"
            >
                {procesando ? (
                    <span className="animate-pulse">Procesando...</span>
                ) : (
                    <>
                        <span>💰</span> Cobrar Ticket
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Venta;