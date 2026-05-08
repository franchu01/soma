import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Title,
  Filler,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Title, Filler);

type Usuario = {
  email: string;
  name: string;
  sede: string;
  recordatorio: number;
};

type ConteoData = { fecha: string; cantidad: string };

function toLocalDateString(date: Date) {
  return date.toLocaleDateString('sv-SE');
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, color: '#64748b', font: { size: 11 } },
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
    },
  },
};

export default function AsistenciaStats() {
  const [tab, setTab] = useState<'general' | 'individual'>('general');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [conteoDiario, setConteoDiario] = useState<ConteoData[]>([]);
  const [sedeFilter, setSedeFilter] = useState<string>('todas');
  const [rango, setRango] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(true);

  // Individual
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
  const [historialUsuario, setHistorialUsuario] = useState<string[]>([]);
  const [searchUsuario, setSearchUsuario] = useState('');
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/presentes').then(r => r.json()),
    ])
      .then(([users, conteo]) => {
        setUsuarios(users);
        setConteoDiario(conteo);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cargarHistorial = useCallback(async (email: string) => {
    if (!email) return;
    setLoadingHistorial(true);
    try {
      const res = await fetch(`/api/presentes?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setHistorialUsuario(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    if (usuarioSeleccionado) cargarHistorial(usuarioSeleccionado);
    else setHistorialUsuario([]);
  }, [usuarioSeleccionado, cargarHistorial]);

  // Filtrar datos por sede: necesito cruzar con presentes por día
  // Para el filtro por sede, hacemos fetch por cada fecha (costoso),
  // así que el conteo general no filtra por sede desde la DB sino que
  // mostramos "todas" con una nota. El filtro por sede se muestra en la tabla individual.
  const hoy = toLocalDateString(new Date());
  const fechaInicio = (() => {
    const d = new Date();
    d.setDate(d.getDate() - rango + 1);
    return toLocalDateString(d);
  })();

  const datosFiltrados = conteoDiario.filter(d => d.fecha >= fechaInicio && d.fecha <= hoy);

  // Generar labels con todos los días del rango
  const allDates: string[] = [];
  for (let i = rango - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    allDates.push(toLocalDateString(d));
  }

  const cantidadPorFecha = Object.fromEntries(datosFiltrados.map(d => [d.fecha, parseInt(d.cantidad)]));

  const chartData = {
    labels: allDates.map(f => {
      const [, m, d] = f.split('-');
      return `${d}/${m}`;
    }),
    datasets: [
      {
        label: 'Asistencia',
        data: allDates.map(f => cantidadPorFecha[f] ?? 0),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(5, 150, 105, 1)',
        borderWidth: 2,
        borderRadius: 6,
        fill: true,
      },
    ],
  };

  const lineData = {
    labels: allDates.map(f => {
      const [, m, d] = f.split('-');
      return `${d}/${m}`;
    }),
    datasets: [
      {
        label: 'Asistencia',
        data: allDates.map(f => cantidadPorFecha[f] ?? 0),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      },
    ],
  };

  const valores = allDates.map(f => cantidadPorFecha[f] ?? 0);
  const promedio = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
  const maximo = valores.length ? Math.max(...valores) : 0;
  const diasConPresentes = valores.filter(v => v > 0).length;

  // Historial del usuario seleccionado
  const usuarioObj = usuarios.find(u => u.email === usuarioSeleccionado);
  const historialEnRango = historialUsuario.filter(f => f >= fechaInicio && f <= hoy);
  const frecuencia = rango > 0 ? Math.round((historialEnRango.length / rango) * 100) : 0;
  const fechasSet = new Set(historialUsuario);

  const usuariosFiltradosParaLista = usuarios.filter(u =>
    (sedeFilter === 'todas' || u.sede === sedeFilter) &&
    (!searchUsuario || u.name.toLowerCase().includes(searchUsuario.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-slate-500">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
          Estadísticas de Asistencia
        </h2>
        <p className="text-slate-600 text-lg">Análisis de concurrencia al gimnasio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1 w-fit mx-auto">
        {(['general', 'individual'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              tab === t
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'general' ? 'General' : 'Seguimiento individual'}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-6">
          {/* Controles */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {([30, 60, 90] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRango(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    rango === r ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r} días
                </button>
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 border border-teal-200 text-center">
              <p className="text-3xl font-bold text-teal-700">{promedio}</p>
              <p className="text-sm font-medium text-teal-600 mt-1">Promedio diario</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200 text-center">
              <p className="text-3xl font-bold text-emerald-700">{maximo}</p>
              <p className="text-sm font-medium text-emerald-600 mt-1">Máximo en el día</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-4 border border-cyan-200 text-center">
              <p className="text-3xl font-bold text-cyan-700">{diasConPresentes}</p>
              <p className="text-sm font-medium text-cyan-600 mt-1">Días con registro</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {valores.reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-sm font-medium text-blue-600 mt-1">Total visitas</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Asistencia diaria (barras)</h3>
              <div className="h-64">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Tendencia de asistencia</h3>
              <div className="h-64">
                <Line data={lineData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Tabla de días con más asistencia */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-teal-50 px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Top días de mayor asistencia</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {[...datosFiltrados]
                .sort((a, b) => parseInt(b.cantidad) - parseInt(a.cantidad))
                .slice(0, 7)
                .map((d, i) => {
                  const [y, m, day] = d.fecha.split('-').map(Number);
                  const date = new Date(y, m - 1, day);
                  const label = date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  const pct = maximo > 0 ? Math.round((parseInt(d.cantidad) / maximo) * 100) : 0;
                  return (
                    <div key={d.fecha} className="flex items-center gap-4 px-5 py-3">
                      <span className="text-sm font-bold text-slate-400 w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 capitalize">{label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-teal-700 w-8 text-right">{d.cantidad}</span>
                    </div>
                  );
                })}
              {datosFiltrados.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-sm">Sin datos registrados en este período</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'individual' && (
        <div className="space-y-6">
          {/* Selector de usuario */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4">Seleccionar miembro</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar miembro..."
                  value={searchUsuario}
                  onChange={e => setSearchUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <select
                value={sedeFilter}
                onChange={e => setSedeFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              >
                <option value="todas">Todas las sedes</option>
                <option value="Temperley">Temperley</option>
                <option value="Calzada">Calzada</option>
                <option value="Pension">Pension</option>
              </select>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {usuariosFiltradosParaLista.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">Sin resultados</p>
              ) : (
                usuariosFiltradosParaLista.map(u => (
                  <button
                    key={u.email}
                    onClick={() => setUsuarioSeleccionado(u.email)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      usuarioSeleccionado === u.email
                        ? 'bg-teal-50 border-l-4 border-teal-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.sede}</p>
                    </div>
                    {usuarioSeleccionado === u.email && (
                      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detalle del usuario */}
          {usuarioSeleccionado && usuarioObj && (
            <div className="space-y-5">
              {/* Header usuario */}
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {usuarioObj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{usuarioObj.name}</h3>
                    <p className="text-teal-100 text-sm">{usuarioObj.sede} · {usuarioObj.email}</p>
                  </div>
                </div>
              </div>

              {/* Controles de rango */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {([30, 60, 90] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRango(r)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      rango === r ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {r} días
                  </button>
                ))}
              </div>

              {loadingHistorial ? (
                <div className="text-center py-10">
                  <svg className="w-8 h-8 text-teal-500 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <>
                  {/* Métricas individuales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 border border-teal-200 text-center">
                      <p className="text-3xl font-bold text-teal-700">{historialEnRango.length}</p>
                      <p className="text-sm font-medium text-teal-600 mt-1">Visitas en {rango} días</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200 text-center">
                      <p className="text-3xl font-bold text-emerald-700">{frecuencia}%</p>
                      <p className="text-sm font-medium text-emerald-600 mt-1">Frecuencia</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 text-center col-span-2 sm:col-span-1">
                      <p className="text-3xl font-bold text-blue-700">{historialUsuario.length}</p>
                      <p className="text-sm font-medium text-blue-600 mt-1">Total histórico</p>
                    </div>
                  </div>

                  {/* Calendario de asistencia */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h4 className="font-bold text-slate-800 mb-4">Calendario de asistencia (últimos {rango} días)</h4>
                    <div className="grid grid-cols-7 gap-1.5">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                      ))}
                      {(() => {
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - rango + 1);
                        const dayOfWeek = startDate.getDay();
                        const cells = [];

                        // Padding inicial
                        for (let i = 0; i < dayOfWeek; i++) {
                          cells.push(<div key={`pad-${i}`} />);
                        }

                        for (let i = 0; i < rango; i++) {
                          const d = new Date(startDate);
                          d.setDate(d.getDate() + i);
                          const dateStr = toLocalDateString(d);
                          const present = fechasSet.has(dateStr);
                          const isFuture = dateStr > hoy;
                          cells.push(
                            <div
                              key={dateStr}
                              title={dateStr}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                                isFuture
                                  ? 'bg-slate-50 text-slate-300'
                                  : present
                                  ? 'bg-teal-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {d.getDate()}
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-teal-500" />
                        <span>Presente</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                        <span>Ausente</span>
                      </div>
                    </div>
                  </div>

                  {/* Listado últimas visitas */}
                  {historialUsuario.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-50 to-teal-50 px-5 py-4 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800">Últimas visitas registradas</h4>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {historialUsuario.slice(0, 20).map(f => {
                          const [y, m, d] = f.split('-').map(Number);
                          const date = new Date(y, m - 1, d);
                          return (
                            <div key={f} className="flex items-center gap-3 px-5 py-3">
                              <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                              <p className="text-sm text-slate-700 capitalize">
                                {date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {historialUsuario.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                      <p className="text-slate-400 text-sm">Este miembro no tiene asistencia registrada</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!usuarioSeleccionado && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-slate-500 font-medium">Seleccioná un miembro para ver su historial</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
