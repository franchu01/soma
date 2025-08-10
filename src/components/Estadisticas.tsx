import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Usuario = {
  email: string;
  name: string;
  created_at: string;
  recordatorio: number;
  sede: string;
};

type Pagos = Record<string, string[]>;
type Bajas = Record<string, string[]>;

export default function Estadisticas() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [bajas, setBajas] = useState<Bajas>({});
  const [tipoGrafico, setTipoGrafico] = useState<'altas' | 'bajas' | 'pagos'>('altas');
  const [conteoMensual, setConteoMensual] = useState<number[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<'todas' | 'Temperley' | 'Calzada'>('todas');

  const mesActual = new Date().toISOString().slice(0, 7); // yyyy-mm

  useEffect(() => {
    async function cargarDatos() {
      const [uRes, pRes, bRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas')
      ]);

      setUsuarios(await uRes.json());
      setPagos(await pRes.json());
      setBajas(await bRes.json());
    }

    cargarDatos();
  }, []);

  useEffect(() => {
    const añoActual = new Date().getFullYear().toString();
    const conteo = new Array(12).fill(0);

    const usuariosFiltrados = sedeSeleccionada === 'todas'
      ? usuarios
      : usuarios.filter(u => u.sede === sedeSeleccionada);

    if (tipoGrafico === 'altas') {
      usuariosFiltrados.forEach((u) => {
        const [año, mes] = u.created_at.split('-');
        if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
      });
    }

    if (tipoGrafico === 'bajas') {
      Object.entries(bajas).forEach(([email, fechas]) => {
        const usuario = usuarios.find(u => u.email === email);
        if (!usuario) return;
        if (sedeSeleccionada !== 'todas' && usuario.sede !== sedeSeleccionada) return;

        fechas.forEach(fecha => {
          const [año, mes] = fecha.split('-');
          if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
        });
      });
    }

    if (tipoGrafico === 'pagos') {
      Object.entries(pagos).forEach(([email, fechas]) => {
        const usuario = usuarios.find(u => u.email === email);
        if (!usuario) return;
        if (sedeSeleccionada !== 'todas' && usuario.sede !== sedeSeleccionada) return;

        fechas.forEach(fecha => {
          const [año, mes] = fecha.split('-');
          if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
        });
      });
    }

    setConteoMensual(conteo);
  }, [tipoGrafico, usuarios, pagos, bajas, sedeSeleccionada]);

  const usuariosDeSede = sedeSeleccionada === 'todas'
    ? usuarios
    : usuarios.filter(u => u.sede === sedeSeleccionada);

  const cantidadTotal = usuariosDeSede.length;
  const cantidadPagosEsteMes = usuariosDeSede.filter(u => pagos[u.email]?.includes(mesActual)).length;
  const cantidadDeuda = cantidadTotal - cantidadPagosEsteMes;
  const cantidadBajasEsteMes = Object.entries(bajas).filter(
    ([email, fechas]) =>
      fechas.includes(mesActual) &&
      (sedeSeleccionada === 'todas' || usuarios.find(u => u.email === email)?.sede === sedeSeleccionada)
  ).length;

  const data = {
    labels: meses,
    datasets: [
      {
        label:
          tipoGrafico === 'altas'
            ? 'Altas nuevas'
            : tipoGrafico === 'bajas'
            ? 'Bajas'
            : 'Pagos',
        data: conteoMensual,
        backgroundColor:
          tipoGrafico === 'altas'
            ? 'rgba(59, 130, 246, 0.7)'
            : tipoGrafico === 'bajas'
            ? 'rgba(234, 88, 12, 0.7)'
            : 'rgba(22, 163, 74, 0.7)'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Estadísticas y Análisis
        </h2>
        <p className="text-slate-600">
          Panel de control con métricas clave del gimnasio
        </p>
      </div>

      {/* Filtro de sede */}
      <div className="flex justify-center">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filtrar por sede
          </label>
          <select
            value={sedeSeleccionada}
            onChange={(e) => setSedeSeleccionada(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="todas">🏢 Todas las sedes</option>
            <option value="Temperley">📍 Temperley</option>
            <option value="Calzada">📍 Calzada</option>
          </select>
        </div>
      </div>

      {/* Cards de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 rounded-xl p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-600 mb-1">Usuarios Totales</p>
            <p className="text-3xl font-bold text-blue-800">{cantidadTotal}</p>
            <p className="text-xs text-blue-600 mt-1">Miembros registrados</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 rounded-xl p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-green-600 mb-1">Pagos al Día</p>
            <p className="text-3xl font-bold text-green-800">{cantidadPagosEsteMes}</p>
            <p className="text-xs text-green-600 mt-1">
              {cantidadTotal > 0 ? Math.round((cantidadPagosEsteMes / cantidadTotal) * 100) : 0}% del total
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 rounded-xl p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-red-600 mb-1">En Deuda</p>
            <p className="text-3xl font-bold text-red-800">{cantidadDeuda}</p>
            <p className="text-xs text-red-600 mt-1">
              {cantidadTotal > 0 ? Math.round((cantidadDeuda / cantidadTotal) * 100) : 0}% del total
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-slate-500 rounded-xl p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L12 21l-6.364-6.364M12 21l9-9M3 12l9-9" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Bajas del Mes</p>
            <p className="text-3xl font-bold text-slate-800">{cantidadBajasEsteMes}</p>
            <p className="text-xs text-slate-600 mt-1">Usuarios dados de baja</p>
          </div>
        </div>
      </div>

      {/* Gráfico anual */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Análisis Anual {new Date().getFullYear()}
            </h3>
            <p className="text-slate-600">
              Evolución mensual de {tipoGrafico === 'altas' ? 'nuevas altas' : tipoGrafico === 'bajas' ? 'bajas' : 'pagos'} por sede
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={tipoGrafico}
              onChange={(e) => setTipoGrafico(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="altas">📈 Altas nuevas</option>
              <option value="bajas">📉 Bajas</option>
              <option value="pagos">💰 Pagos</option>
            </select>
          </div>
        </div>

        <div className="h-96">
          <Bar data={data} options={{
            ...options,
            plugins: {
              ...options.plugins,
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(148, 163, 184, 0.3)',
                borderWidth: 1,
                cornerRadius: 8
              }
            },
            scales: {
              ...options.scales,
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#64748b',
                  font: {
                    size: 12,
                    weight: 500
                  }
                }
              },
              y: {
                ...options.scales.y,
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                  ...options.scales.y.ticks,
                  color: '#64748b',
                  font: {
                    size: 12
                  }
                }
              }
            }
          }} />
        </div>
      </div>
    </div>
  );
}
