import { useEffect, useState, useCallback } from 'react';
import type { MailEnviado, MailsResponse } from '@/pages/api/mails';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatearMesLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-');
  return `${MESES_ES[parseInt(m) - 1]} ${y}`;
}

const PAGE_SIZE = 50;

export default function MailsEnviados() {
  const [data, setData] = useState<MailEnviado[]>([]);
  const [total, setTotal] = useState(0);
  const [totalEsteMes, setTotalEsteMes] = useState(0);
  const [totalErrorEsteMes, setTotalErrorEsteMes] = useState(0);
  const [mesesDisponibles, setMesesDisponibles] = useState<string[]>([]);

  const [page, setPage] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [reenviando, setReenviando] = useState<string | null>(null);

  const cargarMails = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (filtroMes) params.set('mes', filtroMes);
      if (filtroEstado) params.set('estado', filtroEstado);
      if (busqueda.trim()) params.set('q', busqueda.trim());

      const res = await fetch(`/api/mails?${params}`);
      if (!res.ok) return;
      const json: MailsResponse = await res.json();

      setData(json.data);
      setTotal(json.total);
      setTotalEsteMes(json.totalEsteMes);
      setTotalErrorEsteMes(json.totalErrorEsteMes);
      setMesesDisponibles(json.meses);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [filtroMes, filtroEstado, busqueda]);

  // Cargar cuando cambian filtros (vuelve a página 0)
  useEffect(() => {
    setPage(0);
    cargarMails(0);
  }, [filtroMes, filtroEstado]);

  // Cargar cuando cambia la página
  useEffect(() => {
    cargarMails(page);
  }, [page]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      cargarMails(0);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const desde = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const hasta = Math.min((page + 1) * PAGE_SIZE, total);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroMes('');
    setFiltroEstado('');
  };

  const hayFiltros = busqueda || filtroMes || filtroEstado;

  const reenviarMail = async (mail: MailEnviado) => {
    setReenviando(String(mail.id));
    try {
      const res = await fetch('/api/mails/reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail.email, nombre: mail.nombre }),
      });
      if (res.ok) {
        cargarMails(page);
      } else {
        alert('Error al reenviar el mail');
      }
    } catch {
      alert('Error al reenviar el mail');
    } finally {
      setReenviando(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Mails Enviados</h2>
        <p className="text-slate-600">Historial de recordatorios enviados a los miembros</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-600 mb-1">Total histórico</p>
          <p className="text-2xl font-bold text-blue-800">{total}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
          <p className="text-xs font-medium text-indigo-600 mb-1">Este mes</p>
          <p className="text-2xl font-bold text-indigo-800">{totalEsteMes}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <p className="text-xs font-medium text-green-600 mb-1">Exitosos este mes</p>
          <p className="text-2xl font-bold text-green-800">{totalEsteMes - totalErrorEsteMes}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <p className="text-xs font-medium text-red-600 mb-1">Fallidos este mes</p>
          <p className="text-2xl font-bold text-red-800">{totalErrorEsteMes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
          </svg>
          Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar usuario</label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mes</label>
            <select
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los meses</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>{formatearMesLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="enviado">Enviados</option>
              <option value="error">Con error</option>
            </select>
          </div>
        </div>
        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Barra de resultados + paginación superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Cargando...' : total === 0 ? 'Sin resultados' : `${desde}–${hasta} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => cargarMails(page)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-slate-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla / Cards */}
      {isLoading ? (
        <div className="text-center py-12">
          <svg className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-slate-500">Cargando historial...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
          <svg className="w-14 h-14 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-600 font-medium">No hay mails para mostrar</p>
          <p className="text-slate-400 text-sm mt-1">
            {hayFiltros ? 'Cambiá los filtros para ver otros resultados' : 'Los recordatorios enviados aparecerán aquí automáticamente'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {data.map(m => (
              <div key={m.id} className={`bg-white rounded-xl border shadow-sm p-4 ${m.estado === 'error' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-green-400'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-sm truncate">{m.nombre}</p>
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.estado === 'enviado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {m.estado === 'enviado' ? 'Enviado' : 'Error'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{m.asunto}</p>
                <p className="text-xs text-slate-400">{formatearFecha(m.fecha_envio)}</p>
                {m.estado === 'error' && m.error_detalle && (
                  <p className="text-xs text-red-500 mt-1 truncate">⚠ {m.error_detalle}</p>
                )}
                {m.estado === 'error' && (
                  <button
                    onClick={() => reenviarMail(m)}
                    disabled={reenviando === String(m.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {reenviando === String(m.id) ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Reenviar
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Usuario', 'Email', 'Fecha y Hora', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(m => (
                  <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.estado === 'error' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-800">{m.nombre}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-600">{m.email}</p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="text-sm text-slate-600">{formatearFecha(m.fecha_envio)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                          m.estado === 'enviado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {m.estado === 'enviado' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {m.estado === 'enviado' ? 'Enviado' : 'Error'}
                        </span>
                        {m.estado === 'error' && m.error_detalle && (
                          <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={m.error_detalle}>
                            {m.error_detalle}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {m.estado === 'error' && (
                        <button
                          onClick={() => reenviarMail(m)}
                          disabled={reenviando === String(m.id)}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {reenviando === String(m.id) ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                          Reenviar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación inferior */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">{desde}–{hasta} de {total} resultados</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(0)}
                  disabled={page === 0 || isLoading}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-700 font-medium px-3">
                  Pág. {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
                <button
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
