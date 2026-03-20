import { useEffect, useState } from 'react';
import HistorialPagos from './HistorialPagos';

type Usuario = {
  name: string;
  email: string;
  created_at: string;
  recordatorio: string;
  sede: string;
};

type Pagos = Record<string, string[]>;

function getMesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getFechaActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hasPagado(pagos: string[], mes: string): boolean {
  return pagos?.some(p => p.startsWith(mes)) ?? false;
}

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [filtro, setFiltro] = useState<'todos' | 'deuda'>('todos');
  const [estado, setEstado] = useState<'activos' | 'todos'>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [bajas, setBajas] = useState<Record<string, string[]>>({});
  const [sede, setSede] = useState<'todos' | 'Temperley' | 'Calzada' | 'Pension'>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [historialUsuario, setHistorialUsuario] = useState<Usuario | null>(null);

  const mesActual = getMesActual();

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resUsers, resPagos, resBajas] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas'),
      ]);
      setUsuarios(await resUsers.json());
      setPagos(await resPagos.json());
      setBajas(await resBajas.json());
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const pagado = hasPagado(pagos[u.email] ?? [], mesActual);
    const enBaja = bajas[u.email]?.some(b => b.startsWith(mesActual));

    if (estado === 'activos' && enBaja) return false;
    if (filtro === 'deuda' && pagado) return false;
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
        body: JSON.stringify({ email, fecha: getFechaActual() }),
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

  // ─── Spinner while loading ────────────────────────────────────────────────
  const loadingUI = (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Cargando usuarios...</h3>
      <p className="text-slate-500">Por favor espera</p>
    </div>
  );

  // ─── Shared action buttons ────────────────────────────────────────────────
  const renderAcciones = (u: Usuario, pagado: boolean, enBaja: boolean) => {
    const loading = isActionLoading === u.email;
    const spinner = (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    );

    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHistorialUsuario(u)}
          className="inline-flex items-center px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-semibold"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Historial
        </button>

        {enBaja ? (
          <button
            onClick={() => reactivar(u.email)}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50"
          >
            {loading ? spinner : (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            Reactivar
          </button>
        ) : (
          <>
            {!pagado && (
              <button
                onClick={() => marcarPagado(u.email)}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                {loading ? spinner : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                )}
                Pagar
              </button>
            )}
            <button
              onClick={() => darDeBaja(u.email)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold disabled:opacity-50"
            >
              {loading ? spinner : (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Baja
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Gestión de Usuarios</h2>
        <p className="text-slate-600">Administra los miembros y controla los pagos del gimnasio</p>
      </div>

      {/* Filtros */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
          </svg>
          Filtros
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Estado</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'activos' | 'todos')}
            >
              <option value="activos">Activos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Pagos</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as 'todos' | 'deuda')}
            >
              <option value="todos">Todos</option>
              <option value="deuda">En deuda</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Sede</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={sede}
              onChange={(e) => setSede(e.target.value as typeof sede)}
            >
              <option value="todos">Todas</option>
              <option value="Temperley">Temperley</option>
              <option value="Calzada">Calzada</option>
              <option value="Pension">Pension</option>
            </select>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-slate-700">Buscar</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-600">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-800">{usuariosFiltrados.length}</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200">
          <p className="text-xs font-medium text-green-600">Al día</p>
          <p className="text-xl sm:text-2xl font-bold text-green-800">
            {usuariosFiltrados.filter(u => hasPagado(pagos[u.email] ?? [], mesActual)).length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 sm:p-4 border border-red-200">
          <p className="text-xs font-medium text-red-600">En deuda</p>
          <p className="text-xl sm:text-2xl font-bold text-red-800">
            {usuariosFiltrados.filter(u => !hasPagado(pagos[u.email] ?? [], mesActual)).length}
          </p>
        </div>
      </div>

      {isLoading ? loadingUI : (
        <>
          {/* ── MOBILE: tarjetas ── */}
          <div className="md:hidden space-y-3">
            {usuariosFiltrados.map((u) => {
              const pagado = hasPagado(pagos[u.email] ?? [], mesActual);
              const enBaja = bajas[u.email]?.some(b => b.startsWith(mesActual)) ?? false;
              const recordatorio = parseInt(u.recordatorio ?? '1');

              return (
                <div
                  key={u.email}
                  className={`bg-white rounded-2xl border shadow-sm p-4 ${
                    enBaja ? 'border-slate-200' : pagado ? 'border-l-4 border-l-green-400 border-slate-200' : 'border-l-4 border-l-red-400 border-slate-200'
                  }`}
                >
                  {/* Nombre y estado */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 ${
                        enBaja ? 'bg-gray-400' : 'bg-green-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {enBaja ? (
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">Baja</span>
                      ) : pagado ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Al día</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">En deuda</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex gap-4 text-xs text-slate-500 mb-3">
                    <span>📍 {u.sede}</span>
                    <span>📅 Día {recordatorio}</span>
                    <span>Alta: {new Date(u.created_at).toLocaleDateString('es-AR')}</span>
                  </div>

                  {/* Acciones */}
                  {renderAcciones(u, pagado, enBaja)}
                </div>
              );
            })}

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="font-semibold">No hay usuarios</p>
                <p className="text-sm">Cambia los filtros para ver más resultados</p>
              </div>
            )}
          </div>

          {/* ── DESKTOP: tabla ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    {['Usuario', 'Contacto', 'Fecha de Alta', 'Recordatorio', 'Estado de Pago', 'Acciones'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {usuariosFiltrados.map((u) => {
                    const pagado = hasPagado(pagos[u.email] ?? [], mesActual);
                    const enBaja = bajas[u.email]?.some(b => b.startsWith(mesActual)) ?? false;
                    const recordatorio = parseInt(u.recordatorio ?? '1');
                    const hoy = new Date();
                    const fechaRec = new Date(`${mesActual}-${String(recordatorio).padStart(2, '0')}`);
                    const diasDeuda = !pagado && hoy > fechaRec
                      ? Math.floor((hoy.getTime() - fechaRec.getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <tr
                        key={u.email}
                        className={`hover:bg-slate-50 transition-colors duration-200 ${
                          !pagado ? 'bg-red-50 border-l-4 border-red-400' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${enBaja ? 'bg-gray-400' : 'bg-green-400'}`} />
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
                          {pagado ? (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {renderAcciones(u, pagado, enBaja)}
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
          </div>
        </>
      )}
    </div>

    {historialUsuario && (
      <HistorialPagos
        usuario={historialUsuario}
        pagos={pagos[historialUsuario.email] ?? []}
        bajas={bajas[historialUsuario.email] ?? []}
        onClose={() => setHistorialUsuario(null)}
        onPagoRegistrado={cargarDatos}
      />
    )}
    </>
  );
}
