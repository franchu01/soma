import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Usuario = {
  name: string;
  email: string;
  sede: string;
};

type Props = {
  usuarios: Usuario[]; // usuarios actualmente en deuda
  onClose: () => void;
};

function getMesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function diasDesde(fechaISO: string): number {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
}

function formatearFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

// Panel para ver, de los usuarios que están en deuda, quiénes siguen viniendo
// al gimnasio igual (dato clave para saber a quién frenar en la puerta y a
// quién ya se le fue el mes sin pisar el gym).
export default function DeudoresAsistencia({ usuarios, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [asistencias, setAsistencias] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [orden, setOrden] = useState<'recientes' | 'ausentes'>('recientes');

  const mesActual = getMesActual();

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (usuarios.length === 0) { setIsLoading(false); return; }
    setIsLoading(true);
    const emails = usuarios.map(u => u.email).join(',');
    fetch(`/api/presentes?emails=${encodeURIComponent(emails)}`)
      .then(r => r.json())
      .then(setAsistencias)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [usuarios]);

  const filas = usuarios.map(u => {
    const fechas = asistencias[u.email] ?? [];
    const ultimaVisita = fechas[0] ?? null; // viene ordenado DESC desde la API
    const visitasEsteMes = fechas.filter(f => f.startsWith(mesActual)).length;
    const diasSinVenir = ultimaVisita ? diasDesde(ultimaVisita) : null;
    return { usuario: u, ultimaVisita, visitasEsteMes, diasSinVenir };
  });

  const filasOrdenadas = [...filas].sort((a, b) => {
    // Sin visitas nunca → siempre al final
    if (a.diasSinVenir === null && b.diasSinVenir === null) return 0;
    if (a.diasSinVenir === null) return 1;
    if (b.diasSinVenir === null) return -1;
    return orden === 'recientes' ? a.diasSinVenir - b.diasSinVenir : b.diasSinVenir - a.diasSinVenir;
  });

  const vieneIgual = filas.filter(f => f.diasSinVenir !== null && f.diasSinVenir <= 7).length;
  const sinVenirNunca = filas.filter(f => f.diasSinVenir === null).length;

  const EstadoAsistencia = ({ diasSinVenir }: { diasSinVenir: number | null }) => {
    if (diasSinVenir === null) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        Nunca vino
      </span>
    );
    if (diasSinVenir <= 1) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {diasSinVenir === 0 ? 'Vino hoy' : 'Vino ayer'}
      </span>
    );
    if (diasSinVenir <= 7) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Hace {diasSinVenir} días
      </span>
    );
    if (diasSinVenir <= 30) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        Hace {diasSinVenir} días
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Hace {diasSinVenir} días
      </span>
    );
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Asistencia de deudores</h2>
            <p className="text-xs text-slate-500">
              {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} en deuda
              {!isLoading && usuarios.length > 0 && (
                <> · {vieneIgual} vinieron en los últimos 7 días · {sinVenirNunca} nunca registraron asistencia</>
              )}
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Orden */}
        {usuarios.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Ordenar por:</span>
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => setOrden('recientes')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  orden === 'recientes' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Vinieron más recientemente
              </button>
              <button
                onClick={() => setOrden('ausentes')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  orden === 'ausentes' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Más ausentes
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-10">
              <svg className="w-8 h-8 text-blue-500 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="font-semibold">No hay usuarios en deuda</p>
              <p className="text-sm">Con los filtros actuales, nadie está en deuda</p>
            </div>
          ) : (
            filasOrdenadas.map(({ usuario, visitasEsteMes, diasSinVenir, ultimaVisita }) => (
              <div
                key={usuario.email}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{usuario.name}</p>
                  <p className="text-xs text-slate-500">
                    📍 {usuario.sede} · {visitasEsteMes} visita{visitasEsteMes !== 1 ? 's' : ''} este mes
                    {ultimaVisita && <> · última: {formatearFecha(ultimaVisita)}</>}
                  </p>
                </div>
                <EstadoAsistencia diasSinVenir={diasSinVenir} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
