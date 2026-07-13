import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Usuario = {
  name: string;
  email: string;
  created_at: string;
  recordatorio: string;
  sede: string;
};

type Props = {
  usuario: Usuario;
  pagos: string[];   // ["2024-12", "2025-01-15", ...]
  bajas: string[];   // ["2025-02", ...]
  onClose: () => void;
  onPagoRegistrado: () => void;
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getMesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generarMeses(desdeStr: string): string[] {
  const mesActual = getMesActual();
  const desde = new Date(desdeStr);
  let y = desde.getFullYear();
  let m = desde.getMonth() + 1;

  const meses: string[] = [];
  while (true) {
    const label = `${y}-${String(m).padStart(2, '0')}`;
    meses.push(label);
    if (label === mesActual) break;
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return meses;
}

function formatearMes(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

// Busca el pago de un mes (soporta "YYYY-MM" y "YYYY-MM-DD" en la lista)
function pagoDelMes(pagos: string[], mes: string): string | null {
  return pagos.find(p => p.startsWith(mes)) ?? null;
}

// Extrae el día si la fecha es YYYY-MM-DD
function extraerDia(fecha: string): string | null {
  if (fecha.length === 10) {
    const dia = Number(fecha.slice(8, 10));
    return `día ${dia}`;
  }
  return null;
}

export default function HistorialPagos({ usuario, pagos, bajas, onClose, onPagoRegistrado }: Props) {
  const [loadingMes, setLoadingMes] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);
  const [enviandoMail, setEnviandoMail] = useState(false);

  const qrUrl = `/api/qr?email=${encodeURIComponent(usuario.email)}`;

  const compartirQr = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const file = new File([blob], 'qr-soma.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `QR de ${usuario.name}` });
      } else {
        // Sin Web Share API: abrir la imagen para guardarla/compartirla a mano
        window.open(qrUrl, '_blank');
      }
    } catch {
      // El usuario canceló el share; no es un error
    }
  };

  const enviarQrPorMail = async () => {
    setEnviandoMail(true);
    try {
      const res = await fetch('/api/mails/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`⚠️ ${data.error ?? 'Error al enviar el mail'}`);
      } else if (data.skipped) {
        alert('⚠️ El envío de QR por mail está deshabilitado (flag ENVIAR_QR_POR_MAIL). No se envió nada.');
      } else {
        alert('✅ QR enviado por mail');
      }
    } catch (e) {
      console.error(e);
      alert('❌ Error al enviar el mail');
    } finally {
      setEnviandoMail(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const meses = generarMeses(usuario.created_at).reverse(); // más reciente primero

  const registrarPago = async (fecha: string) => {
    setLoadingMes(fecha);
    try {
      await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.email, fecha }),
      });
      onPagoRegistrado();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMes(null);
    }
  };

  const pagados = meses.filter(m => pagoDelMes(pagos, m)).length;
  const total = meses.length;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="text-lg font-bold text-slate-800 truncate">{usuario.name}</h2>
            <p className="text-xs text-slate-500 truncate">{usuario.email} · {usuario.sede}</p>
          </div>
          <button
            onClick={() => setMostrarQr(v => !v)}
            className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors mr-1 ${
              mostrarQr ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3.5 7V5.5A2 2 0 015.5 3.5H7M17 3.5h1.5a2 2 0 012 2V7M20.5 17v1.5a2 2 0 01-2 2H17M7 20.5H5.5a2 2 0 01-2-2V17M7 7h3v3H7V7zm7 0h3v3h-3V7zm-7 7h3v3H7v-3zm7 0h1.5m1.5 0H17m0 1.5V17" />
            </svg>
            QR
          </button>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR de acceso del cliente */}
        {mostrarQr && (
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={qrUrl}
              alt={`QR de ${usuario.name}`}
              className="w-36 h-36 bg-white rounded-xl border border-slate-200 p-2"
            />
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <a
                href={`${qrUrl}&download=1`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </a>
              <button
                onClick={compartirQr}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir
              </button>
              <button
                onClick={enviarQrPorMail}
                disabled={enviandoMail}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                {enviandoMail ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                Enviar por mail
              </button>
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 text-sm">
          <span className="text-green-700 font-semibold">{pagados} pagados</span>
          <span className="text-slate-300">|</span>
          <span className="text-red-600 font-semibold">{total - pagados} faltantes</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">{total} meses en total</span>
        </div>

        {/* Lista de meses */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {meses.map(mes => {
            const pagoEncontrado = pagoDelMes(pagos, mes);
            const esBaja = bajas.some(b => b.startsWith(mes));

            return (
              <div
                key={mes}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                  esBaja
                    ? 'bg-slate-50 border-slate-200'
                    : pagoEncontrado
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div>
                  <span className={`font-medium text-sm ${
                    esBaja ? 'text-slate-500' : pagoEncontrado ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {formatearMes(mes)}
                  </span>
                  {pagoEncontrado && extraerDia(pagoEncontrado) && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Pagó el {extraerDia(pagoEncontrado)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {esBaja ? (
                    <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full font-medium">
                      Baja
                    </span>
                  ) : pagoEncontrado ? (
                    <span className="inline-flex items-center text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Pagado
                    </span>
                  ) : (
                    <button
                      onClick={() => registrarPago(mes)}
                      disabled={loadingMes === mes}
                      className="inline-flex items-center text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loadingMes === mes ? (
                        <svg className="w-3.5 h-3.5 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      Marcar pagado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
