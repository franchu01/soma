import { useEffect, useState } from 'react';
import type { EnviarResult } from '@/pages/api/mails/enviar';

type Usuario = {
  name: string;
  email: string;
  sede: string;
};

type ResultadoEnvio = EnviarResult & { asunto: string; total: number };

export default function EnviarMail() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selección de destinatarios
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState<'todos' | 'Temperley' | 'Calzada' | 'Pension'>('todos');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  // Contenido del mail
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Estados de envío
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsuarios)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroSede !== 'todos' && u.sede !== filtroSede) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleSeleccion = (email: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const seleccionarTodosFiltrados = () => {
    const todos = new Set(seleccionados);
    usuariosFiltrados.forEach(u => todos.add(u.email));
    setSeleccionados(todos);
  };

  const deseleccionarTodosFiltrados = () => {
    const restantes = new Set(seleccionados);
    usuariosFiltrados.forEach(u => restantes.delete(u.email));
    setSeleccionados(restantes);
  };

  const todosFiltrадосSeleccionados =
    usuariosFiltrados.length > 0 &&
    usuariosFiltrados.every(u => seleccionados.has(u.email));

  const destinatariosSeleccionados = usuarios.filter(u => seleccionados.has(u.email));

  const puedeEnviar =
    seleccionados.size > 0 && asunto.trim().length > 0 && mensaje.trim().length > 0;

  const handleEnviar = async () => {
    if (!puedeEnviar) return;
    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch('/api/mails/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: destinatariosSeleccionados.map(u => ({ email: u.email, nombre: u.name })),
          asunto,
          mensaje,
        }),
      });
      const data: EnviarResult = await res.json();
      setResultado({ ...data, asunto, total: destinatariosSeleccionados.length });
      if (data.enviados > 0) {
        // Reset form on (partial) success
        setAsunto('');
        setMensaje('');
        setSeleccionados(new Set());
        setBusqueda('');
        setFiltroSede('todos');
      }
    } catch {
      alert('Error de conexión al enviar los mails');
    } finally {
      setEnviando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <svg className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p className="text-slate-500">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Enviar Mail</h2>
        <p className="text-slate-600">Redactá y enviá un mensaje personalizado a los miembros</p>
      </div>

      {/* Resultado del envío */}
      {resultado && (
        <div className={`rounded-2xl border p-5 ${
          resultado.fallidos === 0
            ? 'bg-green-50 border-green-200'
            : resultado.enviados === 0
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            {resultado.fallidos === 0 ? (
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="font-semibold text-slate-800 mb-1">
                {resultado.fallidos === 0
                  ? `¡Listo! ${resultado.enviados} mail${resultado.enviados !== 1 ? 's' : ''} enviado${resultado.enviados !== 1 ? 's' : ''} correctamente`
                  : `${resultado.enviados} enviados, ${resultado.fallidos} fallidos de ${resultado.total} en total`}
              </p>
              <p className="text-sm text-slate-600">Asunto: <span className="font-medium">{resultado.asunto}</span></p>
              {resultado.errores.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {resultado.errores.map(e => (
                    <li key={e.email} className="text-xs text-red-600">
                      ✗ {e.email}: {e.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => setResultado(null)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Columna izquierda: selección de destinatarios ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Destinatarios
              {seleccionados.size > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            {seleccionados.size > 0 && (
              <button
                onClick={() => setSeleccionados(new Set())}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {/* Filtros de búsqueda */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filtroSede}
              onChange={e => setFiltroSede(e.target.value as typeof filtroSede)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas las sedes</option>
              <option value="Temperley">Temperley</option>
              <option value="Calzada">Calzada</option>
              <option value="Pension">Pension</option>
            </select>
          </div>

          {/* Seleccionar / deseleccionar todos los filtrados */}
          {usuariosFiltrados.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <span className="text-xs text-slate-600">
                {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} en la lista
              </span>
              <button
                onClick={todosFiltrадосSeleccionados ? deseleccionarTodosFiltrados : seleccionarTodosFiltrados}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {todosFiltrадосSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
          )}

          {/* Lista de usuarios */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {usuariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No hay usuarios con ese filtro</div>
            ) : (
              usuariosFiltrados.map(u => {
                const seleccionado = seleccionados.has(u.email);
                return (
                  <label
                    key={u.email}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                      seleccionado ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleSeleccion(u.email)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email} · {u.sede}</p>
                    </div>
                    {seleccionado && (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Columna derecha: redactar ─── */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Redactar mensaje</h3>

          {/* Asunto */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asunto</label>
            <input
              type="text"
              placeholder="Ej: Novedad importante de SOMA Gym"
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              maxLength={150}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{asunto.length}/150</p>
          </div>

          {/* Cuerpo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">Mensaje</label>
              <button
                onClick={() => setVistaPrevia(v => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {vistaPrevia ? 'Editar' : 'Vista previa'}
              </button>
            </div>
            {vistaPrevia ? (
              <div className="w-full min-h-40 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-800 whitespace-pre-wrap">
                {mensaje || <span className="text-slate-400 italic">El mensaje aparecerá aquí...</span>}
              </div>
            ) : (
              <textarea
                placeholder="Escribí tu mensaje aquí. Podés usar saltos de línea para separar párrafos."
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            )}
          </div>

          {/* Resumen antes de enviar */}
          {puedeEnviar && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Resumen del envío</p>
              <p>→ <span className="font-medium">{seleccionados.size}</span> destinatario{seleccionados.size !== 1 ? 's' : ''}</p>
              <p>→ Asunto: <span className="font-medium">{asunto}</span></p>
              <p className="text-xs text-blue-600 mt-1">
                Todos los envíos quedan registrados en la pestaña "Mails Enviados"
              </p>
            </div>
          )}

          {/* Botón enviar */}
          <button
            onClick={handleEnviar}
            disabled={!puedeEnviar || enviando}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Enviando {seleccionados.size} mail{seleccionados.size !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar{seleccionados.size > 0 ? ` a ${seleccionados.size} persona${seleccionados.size !== 1 ? 's' : ''}` : ''}
              </>
            )}
          </button>

          {!puedeEnviar && (
            <p className="text-xs text-slate-400 text-center">
              {seleccionados.size === 0
                ? 'Seleccioná al menos un destinatario'
                : !asunto.trim()
                ? 'Completá el asunto del mail'
                : 'Completá el cuerpo del mensaje'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
