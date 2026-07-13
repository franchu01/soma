import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Usuario = {
  name: string;
  email: string;
  sede: string;
};

type Props = {
  usuario: Usuario;
  onClose: () => void;
};

// Modal para ver / compartir el QR de acceso de un usuario desde la lista.
// - Descargar: guarda el PNG.
// - Compartir: usa la Web Share API. En el celular abre el menú nativo, donde
//   el admin elige WhatsApp (y el contacto) a mano — no manda nada solo.
// - Enviar por mail: usa /api/mails/qr (gated por ENVIAR_QR_POR_MAIL).
export default function QrModal({ usuario, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [enviandoMail, setEnviandoMail] = useState(false);

  const qrUrl = `/api/qr?email=${encodeURIComponent(usuario.email)}`;

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const compartirQr = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const file = new File([blob], 'qr-soma.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `QR de ${usuario.name}` });
      } else {
        // Sin Web Share API (ej. desktop): abrir la imagen para guardarla a mano
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

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="text-lg font-bold text-slate-800 truncate">{usuario.name}</h2>
            <p className="text-xs text-slate-500 truncate">{usuario.email} · {usuario.sede}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR */}
        <div className="px-5 py-6 flex flex-col items-center gap-4 bg-slate-50 border-b border-slate-200">
          <img
            src={qrUrl}
            alt={`QR de ${usuario.name}`}
            className="w-56 h-56 bg-white rounded-xl border border-slate-200 p-3"
          />
          <p className="text-xs text-slate-500 text-center">
            Código QR personal de acceso. El cliente lo muestra en recepción.
          </p>
        </div>

        {/* Acciones */}
        <div className="p-5 flex flex-col gap-2">
          <button
            onClick={compartirQr}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir (WhatsApp)
          </button>
          <div className="flex gap-2">
            <a
              href={`${qrUrl}&download=1`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors text-xs font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </a>
            <button
              onClick={enviarQrPorMail}
              disabled={enviandoMail}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50"
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
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
