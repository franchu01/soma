import React, { useEffect, useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Title
} from 'chart.js';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Title
);

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

const tooltipBase = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  titleColor: 'white',
  bodyColor: 'white',
  borderColor: 'rgba(148, 163, 184, 0.3)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 12,
  displayColors: false,
};

const scalesBase = {
  x: {
    grid: { display: false },
    ticks: { color: '#64748b', font: { size: 12, weight: 500 as const } },
  },
  y: {
    beginAtZero: true,
    ticks: { stepSize: 1, color: '#64748b', font: { size: 12 } },
    grid: { color: 'rgba(148, 163, 184, 0.1)' },
  },
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipBase },
  scales: scalesBase,
};

export default function Estadisticas() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [bajas, setBajas] = useState<Bajas>({});
  const [tipoGrafico, setTipoGrafico] = useState<'altas' | 'bajas' | 'pagos' | 'tendencias'>('altas');
  const [conteoMensual, setConteoMensual] = useState<number[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<'todas' | 'Temperley' | 'Calzada' | 'Pension'>('todas');
  const [modoAnual, setModoAnual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const diaHoy = hoy.getDate();
  const nombreMesActual = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true);
      try {
        const [uRes, pRes, bRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/pagos'),
          fetch('/api/bajas'),
        ]);
        setUsuarios(await uRes.json());
        setPagos(await pRes.json());
        setBajas(await bRes.json());
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setIsLoading(false);
      }
    }
    cargarDatos();
  }, []);

  // Conteo mensual para gráfico anual
  useEffect(() => {
    const añoActual = hoy.getFullYear().toString();
    const conteo = new Array(12).fill(0);

    const usuariosFiltrados =
      sedeSeleccionada === 'todas' ? usuarios : usuarios.filter(u => u.sede === sedeSeleccionada);

    if (tipoGrafico === 'altas') {
      usuariosFiltrados.forEach(u => {
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

  const usuariosDeSede =
    sedeSeleccionada === 'todas' ? usuarios : usuarios.filter(u => u.sede === sedeSeleccionada);

  // Fix: las fechas en pagos son YYYY-MM-DD, usar startsWith
  const cantidadTotal = usuariosDeSede.length;
  const cantidadPagosEsteMes = usuariosDeSede.filter(u =>
    pagos[u.email]?.some(p => p.startsWith(mesActual))
  ).length;
  const cantidadDeuda = cantidadTotal - cantidadPagosEsteMes;
  const cantidadBajasEsteMes = Object.entries(bajas).filter(
    ([email, fechas]) =>
      fechas.includes(mesActual) &&
      (sedeSeleccionada === 'todas' || usuarios.find(u => u.email === email)?.sede === sedeSeleccionada)
  ).length;

  const tasaRetencion =
    cantidadTotal > 0
      ? Math.round(((cantidadTotal - cantidadBajasEsteMes) / cantidadTotal) * 100)
      : 100;
  const crecimiento =
    cantidadTotal > 0
      ? Math.round(((conteoMensual[hoy.getMonth()] || 0) / cantidadTotal) * 100)
      : 0;

  // Pagos por día del mes actual
  const pagosPorDia = new Array(diaHoy).fill(0);
  Object.entries(pagos).forEach(([email, fechas]) => {
    const usuario = usuarios.find(u => u.email === email);
    if (!usuario) return;
    if (sedeSeleccionada !== 'todas' && usuario.sede !== sedeSeleccionada) return;
    fechas.forEach(fecha => {
      if (fecha.startsWith(mesActual) && fecha.length >= 10) {
        const dia = parseInt(fecha.slice(8, 10), 10);
        if (dia >= 1 && dia <= diaHoy) pagosPorDia[dia - 1]++;
      }
    });
  });

  const dailyChartData = {
    labels: Array.from({ length: diaHoy }, (_, i) => String(i + 1)),
    datasets: [
      {
        label: 'Pagos registrados',
        data: pagosPorDia,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  // Datos para gráfico anual
  const annualBarData = {
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
            ? 'rgba(59, 130, 246, 0.8)'
            : tipoGrafico === 'bajas'
            ? 'rgba(239, 68, 68, 0.8)'
            : 'rgba(34, 197, 94, 0.8)',
        borderColor:
          tipoGrafico === 'altas'
            ? 'rgba(59, 130, 246, 1)'
            : tipoGrafico === 'bajas'
            ? 'rgba(239, 68, 68, 1)'
            : 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false as const,
      },
    ],
  };

  const tendenciasData = {
    labels: meses,
    datasets: [
      {
        label: 'Altas',
        data: conteoMensual,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const doughnutData = {
    labels: ['Al día', 'Sin pagar'],
    datasets: [
      {
        data: [cantidadPagosEsteMes, cantidadDeuda],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Cargando estadísticas...</h3>
          <p className="text-slate-500">Analizando datos del gimnasio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Dashboard Analítico
        </h2>
        <p className="text-slate-600 text-lg">
          Inteligencia de negocio para optimizar la gestión del gimnasio
        </p>
      </div>

      {/* Filtros + toggle */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Sede:</label>
          <select
            value={sedeSeleccionada}
            onChange={e => setSedeSeleccionada(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="todas">Todas las sedes</option>
            <option value="Temperley">Temperley</option>
            <option value="Calzada">Calzada</option>
            <option value="Pension">Pension</option>
          </select>
        </div>

        <label className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 cursor-pointer select-none">
          <div
            onClick={() => setModoAnual(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${modoAnual ? 'bg-blue-500' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${modoAnual ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
          <span className="text-sm font-medium text-slate-700">Ver análisis anual</span>
        </label>
      </div>

      {/* Cards de estadísticas — siempre muestran el mes actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 rounded-xl p-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-xs text-blue-600 font-medium">Total</div>
          </div>
          <p className="text-sm font-medium text-blue-600 mb-1">Usuarios Registrados</p>
          <p className="text-3xl font-bold text-blue-800">{cantidadTotal}</p>
          <p className="text-xs text-blue-600 mt-1">Miembros activos</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 rounded-xl p-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-green-600 font-medium">
              {cantidadTotal > 0 ? Math.round((cantidadPagosEsteMes / cantidadTotal) * 100) : 0}%
            </div>
          </div>
          <p className="text-sm font-medium text-green-600 mb-1">Pagos este mes</p>
          <p className="text-3xl font-bold text-green-800">{cantidadPagosEsteMes}</p>
          <p className="text-xs text-green-600 mt-1 capitalize">{nombreMesActual}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 rounded-xl p-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-red-600 font-medium">
              {cantidadTotal > 0 ? Math.round((cantidadDeuda / cantidadTotal) * 100) : 0}%
            </div>
          </div>
          <p className="text-sm font-medium text-red-600 mb-1">Sin pagar este mes</p>
          <p className="text-3xl font-bold text-red-800">{cantidadDeuda}</p>
          <p className="text-xs text-red-600 mt-1">Solo mes actual</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 rounded-xl p-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-xs text-purple-600 font-medium">{tasaRetencion}%</div>
          </div>
          <p className="text-sm font-medium text-purple-600 mb-1">Retención</p>
          <p className="text-3xl font-bold text-purple-800">{cantidadBajasEsteMes}</p>
          <p className="text-xs text-purple-600 mt-1">Bajas del mes</p>
        </div>
      </div>

      {/* Sección de gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Gráfico principal */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 lg:p-8">
          {!modoAnual ? (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-1">
                  Pagos por día — <span className="capitalize">{nombreMesActual}</span>
                </h3>
                <p className="text-slate-500 text-sm">
                  Cantidad de pagos registrados cada día del mes actual
                </p>
              </div>
              <div className="h-96">
                {pagosPorDia.every(v => v === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm font-medium">Sin pagos registrados este mes</p>
                  </div>
                ) : (
                  <Bar data={dailyChartData} options={baseOptions} />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    Análisis Anual {hoy.getFullYear()}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Evolución mensual de{' '}
                    {tipoGrafico === 'altas'
                      ? 'nuevas altas'
                      : tipoGrafico === 'bajas'
                      ? 'bajas'
                      : tipoGrafico === 'pagos'
                      ? 'pagos'
                      : 'tendencias'}{' '}
                    por sede
                  </p>
                </div>
                <select
                  value={tipoGrafico}
                  onChange={e => setTipoGrafico(e.target.value as any)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="altas">Altas nuevas</option>
                  <option value="bajas">Bajas</option>
                  <option value="pagos">Pagos</option>
                  <option value="tendencias">Tendencias</option>
                </select>
              </div>
              <div className="h-96">
                {tipoGrafico === 'tendencias' ? (
                  <Line
                    data={tendenciasData}
                    options={{
                      ...baseOptions,
                      elements: {
                        point: {
                          radius: 6,
                          hoverRadius: 8,
                          backgroundColor: 'rgba(59, 130, 246, 1)',
                          borderColor: 'white',
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                ) : (
                  <Bar data={annualBarData} options={baseOptions} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Donut + métricas */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Distribución de Pagos
            </h3>
            <p className="text-xs text-slate-500 mb-3 capitalize">{nombreMesActual}</p>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 12, weight: 500 as const },
                        color: '#64748b',
                      },
                    },
                    tooltip: {
                      ...tooltipBase,
                      callbacks: {
                        label(context: any) {
                          const total = context.dataset.data.reduce(
                            (a: number, b: number) => a + b,
                            0
                          );
                          const pct = Math.round((context.parsed / total) * 100);
                          return `${context.label}: ${context.parsed} (${pct}%)`;
                        },
                      },
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Métricas Clave</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-700">Efectividad Cobranza</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {cantidadTotal > 0
                    ? Math.round((cantidadPagosEsteMes / cantidadTotal) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-700">Crecimiento Mensual</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{crecimiento}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-700">Tasa Retención</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{tasaRetencion}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
