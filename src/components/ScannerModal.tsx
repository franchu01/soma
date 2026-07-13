import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Html5Qrcode } from 'html5-qrcode';

type EstadoPago = 'pagado' | 'pendiente' | 'deuda';

type ScanResult = {
  usuario: { name: string; email: string; sede: string; recordatorio: number; created_at: string };
  presente: { fecha: string; yaEstaba: boolean };
  mesActual: string;
  estadoMesActual: EstadoPago;
  mesesImpagos: string[];
  deBaja: boolean;
};

type Props = {
  onClose: () => void;
  onDatosCambiados?: () => void;
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearMes(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-');
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function getFechaActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const READER_ID = 'soma-qr-reader';

export default function ScannerModal({ onClose, onDatosCambiados }: Props) {
  const [fase, setFase] = useState<'scanning' | 'cargando' | 'resultado' | 'error'>('scanning');
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<ScanResult | null>(null);
  const [loadingPago, setLoadingPago] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const procesandoRef = useRef(false); // evita procesar el mismo QR varias veces por frame

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const detenerScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); } catch { /* ya estaba detenido */ }
      try { scanner.clear(); } catch { /* sin video que limpiar */ }
    }
  };

  // Iniciar/detener la cámara según la fase. Espera a `mounted` porque el
  // portal (y por lo tanto el div del lector) recién se renderiza después
  // del primer efecto; si el import del scanner resuelve antes (está
  // cacheado a partir de la segunda apertura), el div todavía no existe.
  useEffect(() => {
    if (!mounted || fase !== 'scanning') return;
    let cancelado = false;
    procesandoRef.current = false;

    (async () => {
      // Import dinámico: html5-qrcode usa APIs del navegador
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelado) return;

      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (texto) => procesarCodigo(texto),
          () => { /* frames sin QR: ignorar */ }
        );
      } catch (err: any) {
        if (cancelado) return;
        const msg = String(err?.name ?? err ?? '');
        setError(
          msg.includes('NotAllowedError')
            ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador y volvé a intentar.'
            : 'No se pudo acceder a la cámara. Verificá que el dispositivo tenga una disponible.'
        );
        setFase('error');
      }
    })();

    return () => {
      cancelado = true;
      detenerScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, fase]);

  const procesarCodigo = async (codigo: string) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;

    await detenerScanner();
    setFase('cargando');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar el QR');
        setFase('error');
        return;
      }

      setResultado(data as ScanResult);
      setFase('resultado');
      onDatosCambiados?.();
    } catch (e) {
      console.error(e);
      setError('Error de conexión al procesar el QR');
      setFase('error');
    }
  };

  const registrarPago = async (fecha: string, mesKey: string) => {
    if (!resultado) return;
    setLoadingPago(mesKey);
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resultado.usuario.email, fecha }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`⚠️ ${data.error ?? 'Error al registrar el pago'}`);
        return;
      }
      // Actualizar el panel sin re-escanear
      setResultado(prev => prev && {
        ...prev,
        estadoMesActual: mesKey === prev.mesActual ? 'pagado' : prev.estadoMesActual,
        mesesImpagos: prev.mesesImpagos.filter(m => m !== mesKey),
      });
      onDatosCambiados?.();
    } catch (e) {
      console.error(e);
      alert('❌ Error al registrar el pago');
    } finally {
      setLoadingPago(null);
    }
  };

  const escanearOtro = () => {
    setResultado(null);
    setError('');
    setFase('scanning');
  };

  const spinner = (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );

  const renderResultado = (r: ScanResult) => {
    const alDia = r.estadoMesActual === 'pagado' && r.mesesImpagos.length === 0;

    return (
      <div className="space-y-4">
        {/* Presente */}
        <div className={`rounded-xl px-4 py-3 border text-sm font-medium ${
          r.presente.yaEstaba
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {r.presente.yaEstaba
            ? '⚠️ Ya tenía el presente marcado hoy'
            : '✅ Presente registrado'}
        </div>

        {/* Datos del cliente */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="font-bold text-slate-900 text-lg">{r.usuario.name}</p>
          <p className="text-sm text-slate-500">{r.usuario.email}</p>
          <div className="flex gap-4 text-xs text-slate-500 mt-2">
            <span>📍 {r.usuario.sede}</span>
            <span>📅 Vence el día {r.usuario.recordatorio}</span>
          </div>
          {r.deBaja && (
            <p className="mt-2 text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded-full font-medium inline-block">
              ⚠️ Usuario dado de baja
            </p>
          )}
        </div>

        {/* Estado del mes actual */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
          r.estadoMesActual === 'pagado'
            ? 'bg-green-50 border-green-200'
            : r.estadoMesActual === 'pendiente'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div>
            <p className="text-sm font-semibold text-slate-800">{formatearMes(r.mesActual)}</p>
            <p className={`text-xs font-medium ${
              r.estadoMesActual === 'pagado'
                ? 'text-green-700'
                : r.estadoMesActual === 'pendiente'
                ? 'text-amber-700'
                : 'text-red-700'
            }`}>
              {r.estadoMesActual === 'pagado'
                ? 'Pagado ✓'
                : r.estadoMesActual === 'pendiente'
                ? `Aún no corresponde pagar (vence el día ${r.usuario.recordatorio})`
                : 'En deuda — pago vencido'}
            </p>
          </div>
          {r.estadoMesActual !== 'pagado' && (
            <button
              onClick={() => registrarPago(getFechaActual(), r.mesActual)}
              disabled={loadingPago !== null}
              className="inline-flex items-center text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loadingPago === r.mesActual ? spinner : 'Registrar pago'}
            </button>
          )}
        </div>

        {/* Meses anteriores impagos */}
        {r.mesesImpagos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">
              Meses anteriores adeudados ({r.mesesImpagos.length})
            </p>
            {r.mesesImpagos.map(mes => (
              <div key={mes} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium text-red-800">{formatearMes(mes)}</span>
                <button
                  onClick={() => registrarPago(mes, mes)}
                  disabled={loadingPago !== null}
                  className="inline-flex items-center text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loadingPago === mes ? spinner : 'Marcar pagado'}
                </button>
              </div>
            ))}
          </div>
        )}

        {alDia && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium text-green-800 text-center">
            🎉 Cliente al día, sin pagos pendientes
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={escanearOtro}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Escanear otro
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {fase === 'resultado' ? 'Resultado del escaneo' : 'Escanear QR'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {fase === 'scanning' && (
            <div className="space-y-3">
              <div id={READER_ID} className="rounded-xl overflow-hidden bg-slate-900 min-h-[250px]" />
              <p className="text-sm text-slate-500 text-center">
                Apuntá la cámara al código QR del cliente
              </p>
            </div>
          )}

          {fase === 'cargando' && (
            <div className="py-12 text-center">
              <svg className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p className="text-slate-600 font-medium">Procesando QR...</p>
            </div>
          )}

          {fase === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">{error}</p>
              <p className="text-xs text-slate-500">No se registró ningún presente.</p>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={escanearOtro}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {fase === 'resultado' && resultado && renderResultado(resultado)}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
