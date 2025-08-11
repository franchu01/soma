import { useState, useEffect } from 'react';

interface QuickStatsProps {
  usuarios: any[];
  pagos: Record<string, string[]>;
  bajas: Record<string, string[]>;
}

export default function QuickStats({ usuarios, pagos, bajas }: QuickStatsProps) {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    pagosEsteMes: 0,
    ingresosMensuales: 0,
    bajasEsteMes: 0,
    tasaRetencion: 0
  });

  const mesActual = new Date().toISOString().slice(0, 7);
  const precioMensualidad = 15000; // Precio por defecto, podrías hacerlo configurable

  useEffect(() => {
    const totalUsuarios = usuarios.length;
    const usuariosEnBaja = Object.entries(bajas).filter(([_, fechas]) => 
      fechas.includes(mesActual)
    ).length;
    const usuariosActivos = totalUsuarios - usuariosEnBaja;
    
    const pagosEsteMes = usuarios.filter(u => 
      pagos[u.email]?.includes(mesActual)
    ).length;
    
    const ingresosMensuales = pagosEsteMes * precioMensualidad;
    
    const bajasEsteMes = usuariosEnBaja;
    
    const tasaRetencion = totalUsuarios > 0 
      ? Math.round(((totalUsuarios - bajasEsteMes) / totalUsuarios) * 100)
      : 100;

    setStats({
      totalUsuarios,
      usuariosActivos,
      pagosEsteMes,
      ingresosMensuales,
      bajasEsteMes,
      tasaRetencion
    });
  }, [usuarios, pagos, bajas, mesActual]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 w-80 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Resumen Rápido</h3>
        <div className="bg-green-100 rounded-full p-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {/* Usuarios Activos */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-sm text-slate-600">Usuarios Activos</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {stats.usuariosActivos}/{stats.totalUsuarios}
          </span>
        </div>

        {/* Pagos del Mes */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-slate-600">Pagos del Mes</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {stats.pagosEsteMes}
          </span>
        </div>

        {/* Tasa de Retención */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="text-sm text-slate-600">Retención</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {stats.tasaRetencion}%
          </span>
        </div>

        {/* Bajas del Mes */}
        {stats.bajasEsteMes > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-sm text-slate-600">Bajas del Mes</span>
            </div>
            <span className="text-sm font-semibold text-red-600">
              {stats.bajasEsteMes}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Actualizado en tiempo real
          </p>
          <div className="flex items-center justify-center space-x-1 mt-1">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">En línea</span>
          </div>
        </div>
      </div>
    </div>
  );
}
