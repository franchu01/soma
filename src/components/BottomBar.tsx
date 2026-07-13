import { useState } from 'react';
import ScannerModal from './ScannerModal';

type Props = {
  onDatosCambiados?: () => void;
};

// Barra flotante inferior, visible en todas las vistas, con el botón de
// escaneo de QR para registrar presentes en recepción.
export default function BottomBar({ onDatosCambiados }: Props) {
  const [scannerAbierto, setScannerAbierto] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none">
        <button
          onClick={() => setScannerAbierto(true)}
          className="pointer-events-auto inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-semibold shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.5 7V5.5A2 2 0 015.5 3.5H7M17 3.5h1.5a2 2 0 012 2V7M20.5 17v1.5a2 2 0 01-2 2H17M7 20.5H5.5a2 2 0 01-2-2V17M7 7h3v3H7V7zm7 0h3v3h-3V7zm-7 7h3v3H7v-3zm7 0h1.5m1.5 0H17m0 1.5V17" />
          </svg>
          Escanear QR
        </button>
      </div>

      {scannerAbierto && (
        <ScannerModal
          onClose={() => setScannerAbierto(false)}
          onDatosCambiados={onDatosCambiados}
        />
      )}
    </>
  );
}
