import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Error de acceso: ' + error.message);
    } 
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      
      {/* SECCIÓN IZQUIERDA: IMAGEN (Solo PC) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative justify-center items-center overflow-hidden">
        <div 
            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')" }}
        ></div>
        
        <div className="relative z-10 text-center px-10">
            <h2 className="text-4xl font-bold text-white mb-4">Gestiona tu Barbería como un Pro</h2>
            <p className="text-gray-300 text-lg">Agenda, caja y equipo en un solo lugar.</p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
            <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-indigo-50 mb-4">
                    <span className="text-4xl">💈</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900">Bienvenido de nuevo</h1>
                <p className="text-slate-500 mt-2">Ingresa tus credenciales para acceder al panel.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
                    <input
                        type="email"
                        required
                        // AQUÍ AGREGAMOS text-slate-900 PARA FORZAR EL COLOR NEGRO
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white text-slate-900"
                        placeholder="admin@tu-barberia.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
                    </div>
                    <input
                        type="password"
                        required
                        // AQUÍ TAMBIÉN AGREGAMOS text-slate-900
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white text-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold hover:bg-slate-800 transition-transform active:scale-[0.98] shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verificando...' : 'Iniciar Sesión →'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
                ¿No tienes cuenta? <span className="text-indigo-600 font-bold cursor-pointer hover:underline">Contacta a soporte</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;