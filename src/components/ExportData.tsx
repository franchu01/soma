import { useState } from 'react';

interface ExportDataProps {
  usuarios: any[];
  pagos: Record<string, string[]>;
  bajas: Record<string, string[]>;
}

export default function ExportData({ usuarios, pagos, bajas }: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllData = async () => {
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().slice(0, 10);

      // Exportar usuarios
      if (usuarios.length > 0) {
        exportToCSV(usuarios, `soma-usuarios-${timestamp}.csv`);
      }

      // Exportar pagos (formato plano)
      const pagosData = Object.entries(pagos).flatMap(([email, fechas]) =>
        fechas.map(fecha => ({ email, fecha_pago: fecha }))
      );
      if (pagosData.length > 0) {
        exportToCSV(pagosData, `soma-pagos-${timestamp}.csv`);
      }

      // Exportar bajas (formato plano)
      const bajasData = Object.entries(bajas).flatMap(([email, fechas]) =>
        fechas.map(fecha => ({ email, fecha_baja: fecha }))
      );
      if (bajasData.length > 0) {
        exportToCSV(bajasData, `soma-bajas-${timestamp}.csv`);
      }

      // Crear reporte de resumen
      const resumenData = [{
        fecha_reporte: new Date().toLocaleDateString('es-AR'),
        total_usuarios: usuarios.length,
        usuarios_activos: usuarios.length - Object.keys(bajas).length,
        pagos_este_mes: usuarios.filter(u => 
          pagos[u.email]?.includes(new Date().toISOString().slice(0, 7))
        ).length,
        bajas_este_mes: Object.entries(bajas).filter(([_, fechas]) =>
          fechas.includes(new Date().toISOString().slice(0, 7))
        ).length
      }];
      exportToCSV(resumenData, `soma-resumen-${timestamp}.csv`);

      alert('✅ Datos exportados correctamente');
    } catch (error) {
      console.error('Error exportando datos:', error);
      alert('❌ Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const exportUsuarios = () => {
    if (usuarios.length === 0) {
      alert('No hay usuarios para exportar');
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToCSV(usuarios, `soma-usuarios-${timestamp}.csv`);
  };

  return (
    <div className="relative">
      <button
        onClick={exportAllData}
        disabled={isExporting || usuarios.length === 0}
        className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200"
        title="Exportar datos"
      >
        {isExporting ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        <span className="text-sm font-medium hidden sm:inline">
          {isExporting ? 'Exportando...' : 'Exportar'}
        </span>
      </button>
    </div>
  );
}
