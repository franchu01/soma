// src/pages/index.tsx

import Head from 'next/head';
import { useState, useEffect } from 'react';
import AltaUsuario from '@/components/AltaUsuarios';
import ListaUsuarios from '@/components/ListaUsuarios';
import Estadisticas from '@/components/Estadisticas';
import ModificarUsuarios from '@/components/ModificarUsuarios';
import Login from '@/components/Login';
import Header from '@/components/Header';
import NotificationPanel from '@/components/NotificationPanel';

export default function Home() {
  const [vista, setVista] = useState<'alta' | 'lista' | 'estadisticas' | 'modificar'>('alta');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [pagos, setPagos] = useState({});
  const [bajas, setBajas] = useState({});

  // Verificar si hay sesión guardada
  useEffect(() => {
    const savedSession = localStorage.getItem('soma-session');
    if (savedSession === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Cargar datos para notificaciones
  useEffect(() => {
    if (isAuthenticated) {
      cargarDatos();
    }
  }, [isAuthenticated]);

  const cargarDatos = async () => {
    try {
      const [resUsers, resPagos, resBajas] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas'),
      ]);
      
      if (resUsers.ok && resPagos.ok && resBajas.ok) {
        setUsuarios(await resUsers.json());
        setPagos(await resPagos.json());
        setBajas(await resBajas.json());
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('soma-session', 'authenticated');
  };

  const handleUserSelect = (usuario: any) => {
    // Cambiar a la vista de lista cuando se selecciona un usuario
    setVista('lista');
    // Aquí podrías agregar lógica adicional, como resaltar el usuario seleccionado
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('soma-session');
    setVista('alta'); // Reset to default view
  };

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Head>
        <title>SOMA - Gym</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header fijo */}
      <Header 
        onLogout={handleLogout} 
        usuarios={usuarios}
        pagos={pagos}
        bajas={bajas}
        onUserSelect={handleUserSelect}
      />

      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative pt-16">
        {/* Fondo e imagen con overlay moderno */}
        <div className="absolute inset-0 z-0 pt-16">
          <img
            src="/img/fondo-gym.png"
            alt="Fondo"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-indigo-900/80"></div>
        </div>

        {/* Efectos decorativos */}
        <div className="absolute top-16 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Panel de notificaciones flotante */}
        <div className="fixed top-20 right-4 z-40">
          <NotificationPanel usuarios={usuarios} pagos={pagos} />
        </div>

        {/* Logo flotante mejorado - movido más abajo por el header */}
        <div className="hidden lg:fixed lg:top-24 lg:left-8 lg:z-30 lg:group">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl">
            <img
              src="/img/soma-logo-sin-fondo.png"
              alt="Logo"
              className="w-32 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3 drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Container principal con padding responsivo */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="max-w-6xl mx-auto">
            {/* Header con título */}
            <div className="text-center mb-8 lg:mb-12 animate-fade-in">
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 tracking-tight animate-slide-in">
                SOMA <span className="text-blue-400 animate-pulse-slow">GYM</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
                Sistema de gestión profesional para tu gimnasio
              </p>
            </div>

            {/* Card principal con diseño moderno */}
            <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 overflow-hidden hover-lift">
              {/* Tabs mejorados */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                <div className="flex flex-wrap justify-center lg:justify-start px-6 lg:px-8">
                  <button
                    className={`relative px-6 py-4 font-semibold text-sm lg:text-base transition-all duration-300 ${
                      vista === 'alta' 
                        ? 'text-blue-600 border-b-3 border-blue-600' 
                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                    }`}
                    onClick={() => setVista('alta')}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Alta de Usuario</span>
                    </div>
                  </button>
                  <button
                    className={`relative px-6 py-4 font-semibold text-sm lg:text-base transition-all duration-300 ${
                      vista === 'lista' 
                        ? 'text-blue-600 border-b-3 border-blue-600' 
                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                    }`}
                    onClick={() => setVista('lista')}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Lista de Usuarios</span>
                    </div>
                  </button>
                  <button
                    className={`relative px-6 py-4 font-semibold text-sm lg:text-base transition-all duration-300 ${
                      vista === 'estadisticas' 
                        ? 'text-blue-600 border-b-3 border-blue-600' 
                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                    }`}
                    onClick={() => setVista('estadisticas')}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Estadísticas</span>
                    </div>
                  </button>
                  <button
                    className={`relative px-6 py-4 font-semibold text-sm lg:text-base transition-all duration-300 ${
                      vista === 'modificar' 
                        ? 'text-blue-600 border-b-3 border-blue-600' 
                        : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
                    }`}
                    onClick={() => setVista('modificar')}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Modificar Usuarios</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Contenido con padding mejorado */}
              <div className="p-6 lg:p-8">
                {/* Vistas dinámicas */}
                {vista === 'alta' && <AltaUsuario onUserAdded={cargarDatos} />}
                {vista === 'lista' && <ListaUsuarios />}
                {vista === 'estadisticas' && <Estadisticas />}
                {vista === 'modificar' && <ModificarUsuarios onUserUpdated={cargarDatos} />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
