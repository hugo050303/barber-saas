import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ModalCita = ({ isOpen, onClose, alGuardar }) => {
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [barberoId, setBarberoId] = useState('');
  const [servicioId, setServicioId] = useState('');
  
  const [barberos, setBarberos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const hoy = new Date().toISOString().split('T')[0];
        setFecha(hoy);
        cargarListas();
    }
  }, [isOpen]);

  async function cargarListas() {
    const { data: dataBarberos } = await supabase.from('barberos').select('*');
    const { data: dataServicios } = await supabase.from('servicios').select('*');
    setBarberos(dataBarberos || []);
    setServicios(dataServicios || []);
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    
    // --- VALIDACIÓN ---
    if (!barberoId || !servicioId) {
        alert("⚠️ Por favor selecciona Barbero y Servicio.");
        return;
    }

    setGuardando(true);

    try {
        // ============================================================
        // PASO 1: AUTO-GUARDADO DE CLIENTE (LA SOLUCIÓN A TU PROBLEMA)
        // ============================================================
        
        // A. Revisamos si el cliente ya existe en el directorio (por nombre)
        const { data: clienteExistente } = await supabase
            .from('clientes')
            .select('id')
            .ilike('nombre', cliente) // ilike busca ignorando mayúsculas
            .maybeSingle();

        // B. Si NO existe, lo creamos
        if (!clienteExistente) {
            const { error: errorCrear } = await supabase
                .from('clientes')
                .insert([
                    { nombre: cliente, telefono: telefono, notas: 'Cliente registrado desde Agenda' }
                ]);
            
            if (errorCrear) {
                console.error("Error al registrar cliente nuevo:", errorCrear);
                // No detenemos el proceso, seguimos con la cita, pero avisamos en consola
            } else {
                console.log("✅ Cliente nuevo añadido al directorio:", cliente);
            }
        } else {
            // C. (Opcional) Si YA existe, podríamos actualizar su teléfono si cambió
            // Por ahora lo dejamos así para no complicar.
            console.log("ℹ️ El cliente ya existía, no es necesario crearlo.");
        }

        // ============================================================
        // PASO 2: GUARDAR LA CITA (NORMAL)
        // ============================================================

        const fechaObj = new Date(fecha + 'T' + hora + ':00');
        
        const { error: errorCita } = await supabase.from('citas').insert([
          {
            cliente_nombre: cliente,
            cliente_telefono: telefono,
            fecha_hora: fechaObj.toISOString(), 
            barbero_id: barberoId,
            servicio_id: servicioId,
            estado: 'pendiente'
          }
        ]);

        if (errorCita) throw errorCita;

        // ÉXITO TOTAL
        setCliente(''); setTelefono(''); setHora(''); setBarberoId(''); setServicioId('');
        alGuardar();
        onClose();
        alert("✅ Cita agendada (y cliente verificado)");

    } catch (error) {
        console.error("Error general:", error);
        alert('Ocurrió un error: ' + error.message);
    } finally {
        setGuardando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Nueva Cita</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold">✕</button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <input required className="w-full border rounded p-2 mt-1" 
                    value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente"/>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input required type="tel" maxLength="10" className="w-full border rounded p-2 mt-1" 
                    value={telefono} onChange={e => setTelefono(e.target.value.replace(/[^0-9]/g, ''))} placeholder="10 dígitos"/>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input required type="date" className="w-full border rounded p-2 mt-1" 
                        value={fecha} onChange={e => setFecha(e.target.value)}/>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Hora</label>
                    <input required type="time" className="w-full border rounded p-2 mt-1" 
                        value={hora} onChange={e => setHora(e.target.value)}/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Barbero</label>
                    <select required className="w-full border rounded p-2 mt-1" 
                        value={barberoId} onChange={e => setBarberoId(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Servicio</label>
                    <select required className="w-full border rounded p-2 mt-1" 
                        value={servicioId} onChange={e => setServicioId(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                    </select>
                </div>
            </div>

            <button type="submit" disabled={guardando} 
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold mt-4">
                {guardando ? 'Guardando...' : 'Confirmar Cita'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ModalCita;