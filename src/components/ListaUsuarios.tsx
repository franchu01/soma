import { useEffect, useState } from 'react';

type Usuario = {
  name: string;
  email: string;
  created_at: string;
  recordatorio: string;
  sede: string;
};

type Pagos = Record<string, string[]>;

const obtenerMesActual = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
};

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [filtro, setFiltro] = useState<'todos' | 'deuda'>('todos');
  const [estado, setEstado] = useState<'activos' | 'todos'>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [bajas, setBajas] = useState<Record<string, string[]>>({});
  const [sede, setSede] = useState<'todos' | 'Temperley' | 'Calzada'>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const mesActual = obtenerMesActual();

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resUsers, resPagos, resBajas] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas'),
      ]);
      const users = await resUsers.json();
      const pagos = await resPagos.json();
      const bajas = await resBajas.json();
      setUsuarios(users);
      setPagos(pagos);
      setBajas(bajas);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const enDeuda = !(pagos[u.email]?.includes(mesActual));
    const enBaja = bajas[u.email]?.includes(mesActual);

    if (estado === 'activos' && enBaja) return false;
    if (filtro === 'deuda' && !enDeuda) return false;
    if (busqueda && !u.name.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (sede !== 'todos' && u.sede !== sede) return false;

    return true;
  });

  const marcarPagado = async (email: string) => {
    setIsActionLoading(email);
    try {
      await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const darDeBaja = async (email: string) => {
    setIsActionLoading(email);
    try {
      await fetch('/api/bajas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const reactivar = async (email: string) => {
    setIsActionLoading(email);
    try {
      await fetch('/api/bajas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Gestión de Usuarios
        </h2>
        <p className="text-slate-600">
          Administra los miembros y controla los pagos del gimnasio
        </p>
      </div>

      {/* Filtros modernos */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
          </svg>
          Filtros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Estado</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'activos' | 'todos')}
            >
              <option value="activos">👥 Activos</option>
              <option value="todos">📋 Todos</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Pagos</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as 'todos' | 'deuda')}
            >
              <option value="todos">💳 Todos</option>
              <option value="deuda">⚠️ En deuda este mes</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Sede</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={sede}
              onChange={(e) => setSede(e.target.value as 'todos' | 'Temperley' | 'Calzada')}
            >
              <option value="todos">🏢 Todas las sedes</option>
              <option value="Temperley">📍 Temperley</option>
              <option value="Calzada">📍 Calzada</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Buscar</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="🔍 Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-blue-800">{usuariosFiltrados.length}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Al día</p>
              <p className="text-2xl font-bold text-green-800">
                {usuariosFiltrados.filter(u => pagos[u.email]?.includes(mesActual)).length}
              </p>
            </div>
            <div className="bg-green-500 rounded-full p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">En deuda</p>
              <p className="text-2xl font-bold text-red-800">
                {usuariosFiltrados.filter(u => !pagos[u.email]?.includes(mesActual)).length}
              </p>
            </div>
            <div className="bg-red-500 rounded-full p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla mejorada */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {isLoading ? (
          /* Loading State */
          <div className="p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Cargando usuarios...</h3>
              <p className="text-slate-500">Por favor espera mientras obtenemos los datos</p>
            </div>
            
            {/* Skeleton loader */}
            <div className="mt-8 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border border-slate-200 rounded-lg">
                    <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="space-x-2">
                      <div className="h-8 w-20 bg-slate-200 rounded inline-block"></div>
                      <div className="h-8 w-20 bg-slate-200 rounded inline-block"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fecha de Alta
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Recordatorio
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Estado de Pago
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {usuariosFiltrados.map((u) => {
                const pagoMes = pagos[u.email]?.includes(mesActual);
                const recordatorio = parseInt(u.recordatorio ?? '1');
                const hoy = new Date();
                const fechaRecordatorio = new Date(`${mesActual}-${String(recordatorio).padStart(2, '0')}`);
                const diasDeuda =
                  !pagoMes && hoy > fechaRecordatorio
                    ? Math.floor((hoy.getTime() - fechaRecordatorio.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                return (
                  <tr
                    key={u.email}
                    className={`hover:bg-slate-50 transition-colors duration-200 ${
                      !pagoMes ? 'bg-red-50 border-l-4 border-red-400' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          bajas[u.email]?.includes(mesActual) ? 'bg-gray-400' : 'bg-green-400'
                        }`}></div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                          <div className="text-sm text-slate-500">📍 {u.sede}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {new Date(u.created_at).toLocaleDateString('es-AR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Día {recordatorio}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pagoMes ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Al día
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            En deuda
                          </span>
                          {diasDeuda > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              {diasDeuda} día{diasDeuda > 1 ? 's' : ''} de atraso
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {bajas[u.email]?.includes(mesActual) ? (
                        <button
                          onClick={() => reactivar(u.email)}
                          disabled={isActionLoading === u.email}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isActionLoading === u.email ? (
                            <svg className="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          )}
                          Reactivar
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          {!pagoMes && (
                            <button
                              onClick={() => marcarPagado(u.email)}
                              disabled={isActionLoading === u.email}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isActionLoading === u.email ? (
                                <svg className="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              )}
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => darDeBaja(u.email)}
                            disabled={isActionLoading === u.email}
                            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActionLoading === u.email ? (
                              <svg className="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            Dar de baja
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay usuarios</h3>
              <p className="text-slate-500">No se encontraron usuarios con los filtros aplicados.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
