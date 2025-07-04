// src/pages/index.tsx

import Head from 'next/head';
import { useState, useEffect } from 'react';
import AltaUsuario from '@/components/AltaUsuarios';
import ListaUsuarios from '@/components/ListaUsuarios';
import Estadisticas from '@/components/Estadisticas';

export default function Home() {
  const [vista, setVista] = useState<'alta' | 'lista' | 'estadisticas'>('alta');

  return (
    <>
      <Head>
        <title>SOMA - Gym</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gray-100 relative p-6">
        {/* Fondo e imagen */}
        <div className="absolute inset-0 z-0">
          <img
            src="/img/fondo-gym.png"
            alt="Fondo"
            className="w-full h-full object-cover blur-sm brightness-50"
          />
        </div>

        {/* Logo flotante */}
        <div className="fixed top-6 left-6 z-50 group">
          <img
            src="/img/soma-logo-sin-fondo.png"
            alt="Logo"
            className="w-40 transition-transform duration-300 transform group-hover:scale-110 group-hover:rotate-6 drop-shadow-lg"
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto bg-[#fdfcf9] shadow-2xl rounded-2xl p-6 backdrop-blur-sm bg-opacity-90">
          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              className={`tab-btn font-semibold border-b-2 px-3 py-1 rounded ${
                vista === 'alta' ? 'text-blue-700 border-blue-700' : 'text-gray-600 border-transparent'
              }`}
              onClick={() => setVista('alta')}
            >
              Alta de usuario
            </button>
            <button
              className={`tab-btn font-semibold border-b-2 px-3 py-1 rounded ${
                vista === 'lista' ? 'text-blue-700 border-blue-700' : 'text-gray-600 border-transparent'
              }`}
              onClick={() => setVista('lista')}
            >
              Lista de usuarios
            </button>
            <button
              className={`tab-btn font-semibold border-b-2 px-3 py-1 rounded ${
                vista === 'estadisticas' ? 'text-blue-700 border-blue-700' : 'text-gray-600 border-transparent'
              }`}
              onClick={() => setVista('estadisticas')}
            >
              Estadísticas
            </button>
          </div>

          {/* Vistas dinámicas */}
          {vista === 'alta' && <AltaUsuario />}
          {vista === 'lista' && <ListaUsuarios />}
          {vista === 'estadisticas' && <Estadisticas />}
        </div>
      </main>
    </>
  );
}
