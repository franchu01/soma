import { useState, useEffect } from 'react';
import GlobalSearch from './GlobalSearch';
import ExportData from './ExportData';

interface HeaderProps {
  onLogout: () => void;
  usuarios?: any[];
  pagos?: Record<string, string[]>;
  bajas?: Record<string, string[]>;
  onUserSelect?: (usuario: any) => void;
}

export default function Header({ onLogout, usuarios = [], pagos = {}, bajas = {}, onUserSelect }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      {/* Header fijo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center">
                <img src="img/soma-logo-sin-fondo.png" alt="SOMA GYM" className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  SOMA <span className="text-blue-600">GYM</span>
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">Sistema de Gestión</p>
              </div>
            </div>

            {/* Información central */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{formatTime(currentTime)}</p>
                <p className="text-xs text-slate-500 capitalize">{formatDate(currentTime)}</p>
              </div>
            </div>

            {/* Acciones del usuario */}
            <div className="flex items-center space-x-4">
              {/* Buscador global */}
              <GlobalSearch 
                usuarios={usuarios} 
                onUserSelect={onUserSelect || (() => {})} 
              />

              {/* Exportar datos */}
              <ExportData 
                usuarios={usuarios}
                pagos={pagos}
                bajas={bajas}
              />

              {/* Indicador de conexión */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600 hidden sm:inline">En línea</span>
              </div>

              {/* Botón de logout */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md animate-fade-in">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                ¿Cerrar sesión?
              </h3>
              <p className="text-slate-600 mb-6">
                ¿Estás seguro que deseas salir del sistema?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
