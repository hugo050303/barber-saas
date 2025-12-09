import React from 'react';
import { supabase } from '../supabaseClient';

const ModalDetalles = ({ cita, isOpen, onClose, onUpdate }) => {
  if (!isOpen || !cita) return null;

  // Función para cambiar el estado en la base de datos
  const cambiarEstado = async (nuevoEstado) => {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', cita.id);

    if (error) alert(error.message);
    else {
      onUpdate(); // Recargar el tablero
      onClose();  // Cerrar modal
    }
  };

  // Función para borrar la cita definitivamente
  const eliminarCita = async () => {
    if (!window.confirm("¿Seguro que quieres eliminar esta cita del historial?")) return;

    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', cita.id);

    if (error) alert(error.message);
    else {
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
        
        <h2 className="text-xl font-bold text-slate-800 mb-1">{cita.cliente_nombre}</h2>
        <p className="text-sm text-gray-500 mb-6">{cita.servicios?.nombre}</p>

        <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Cambiar Estado:</p>
            
            <button onClick={() => cambiarEstado('confirmada')} 
                className="w-full flex items-center justify-center gap-2 p-3 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                👍 Confirmar Asistencia
            </button>

            <button onClick={() => cambiarEstado('finalizada')} 
                className="w-full flex items-center justify-center gap-2 p-3 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors">
                ✅ Marcar como Finalizada (Cobrar)
            </button>

            <button onClick={() => cambiarEstado('cancelada')} 
                className="w-full flex items-center justify-center gap-2 p-3 rounded bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition-colors">
                🚫 Cancelar Cita
            </button>
            
            <div className="border-t border-gray-100 my-4 pt-4">
                <button onClick={eliminarCita} 
                    className="w-full text-red-400 hover:text-red-600 text-sm font-semibold">
                    🗑️ Eliminar del sistema
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalles;