import { useEffect, useState } from 'react';
import type { MailEnviado } from '@/pages/api/mails';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getMesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMesesDisponibles(mails: MailEnviado[]): string[] {
  const set = new Set<string>();
  for (const m of mails) {
    const mes = m.fecha_envio.slice(0, 7);
    set.add(mes);
  }
  return Array.from(set).sort().reverse();
}

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

export default function MailsEnviados() {
  const [mails, setMails] = useState<MailEnviado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMes, setFiltroMes] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'enviado' | 'error'>('todos');
  const [reenviando, setReenviando] = useState<string | null>(null);

  const cargarMails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mails');
      if (res.ok) setMails(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { cargarMails(); }, []);

  const mesesDisponibles = getMesesDisponibles(mails);
  const mesActual = getMesActual();

  const mailsFiltrados = mails.filter(m => {
    const mes = m.fecha_envio.slice(0, 7);
    if (filtroMes !== 'todos' && mes !== filtroMes) return false;
    if (filtroEstado !== 'todos' && m.estado !== filtroEstado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!m.nombre.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats
  const totalEsteMes = mails.filter(m => m.fecha_envio.startsWith(mesActual)).length;
  const totalErrorEsteMes = mails.filter(m => m.fecha_envio.startsWith(mesActual) && m.estado === 'error').length;
  const totalGeneral = mails.length;

  // Reenviar mail manualmente llamando al cron (solo disponible como referencia)
  const reenviarMail = async (mail: MailEnviado) => {
    setReenviando(String(mail.id));
    try {
      const res = await fetch('/api/mails/reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail.email, nombre: mail.nombre }),
      });
      if (res.ok) {
        await cargarMails();
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
          <p className="text-2xl font-bold text-blue-800">{totalGeneral}</p>
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
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>{formatearMesLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="enviado">Enviados</option>
              <option value="error">Con error</option>
            </select>
          </div>
        </div>
        {(busqueda || filtroMes !== 'todos' || filtroEstado !== 'todos') && (
          <button
            onClick={() => { setBusqueda(''); setFiltroMes('todos'); setFiltroEstado('todos'); }}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resultado del filtro */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {mailsFiltrados.length} resultado{mailsFiltrados.length !== 1 ? 's' : ''}
          {filtroMes !== 'todos' ? ` en ${formatearMesLabel(filtroMes)}` : ''}
        </p>
        <button
          onClick={cargarMails}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
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
      ) : mailsFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
          <svg className="w-14 h-14 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-600 font-medium">No hay mails para mostrar</p>
          <p className="text-slate-400 text-sm mt-1">
            {mails.length === 0
              ? 'Los recordatorios enviados aparecerán aquí automáticamente'
              : 'Cambia los filtros para ver otros resultados'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {mailsFiltrados.map(m => (
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
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
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
                {mailsFiltrados.map(m => (
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
                          m.estado === 'enviado'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
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
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
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
        </>
      )}
    </div>
  );
}
