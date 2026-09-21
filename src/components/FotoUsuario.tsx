import { useRef, useState } from 'react';
import { comprimirImagen } from '@/lib/imagen';

type Props = {
  email: string;
  name: string;
  fotoUrl?: string | null;
  editable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onFotoActualizada?: (url: string) => void;
};

const TAMANOS = {
  sm: { box: 'w-9 h-9', text: 'text-xs', badge: 'w-3.5 h-3.5' },
  md: { box: 'w-12 h-12', text: 'text-base', badge: 'w-4 h-4' },
  lg: { box: 'w-28 h-28', text: 'text-4xl', badge: 'w-7 h-7' },
};

// Avatar circular con la foto del usuario (o sus iniciales si no tiene).
// Si `editable`, tocarlo abre la cámara/selector de archivos, comprime la
// imagen en el navegador y la sube a /api/foto.
export default function FotoUsuario({ email, name, fotoUrl, editable = false, size = 'sm', onFotoActualizada }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(false);
  const t = TAMANOS[size];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    setSubiendo(true);
    try {
      const dataUrl = await comprimirImagen(file);
      const res = await fetch('/api/foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al subir la foto');
      onFotoActualizada?.(data.url);
    } catch (err) {
      console.error(err);
      alert('❌ No se pudo subir la foto. Probá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  const iniciales = name.charAt(0).toUpperCase();

  return (
    <div
      className={`relative ${t.box} flex-shrink-0 ${editable ? 'cursor-pointer group' : ''}`}
      onClick={() => editable && inputRef.current?.click()}
      title={editable ? 'Cambiar foto' : undefined}
    >
      {fotoUrl && !error ? (
        <img
          src={fotoUrl}
          alt={name}
          onError={() => setError(true)}
          className={`${t.box} rounded-full object-cover border border-slate-200`}
        />
      ) : (
        <div className={`${t.box} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold ${t.text}`}>
          {iniciales}
        </div>
      )}

      {editable && (
        <>
          <div className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors ${subiendo ? 'bg-black/40' : ''}`}>
            {subiendo ? (
              <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className={`${t.badge} text-white opacity-0 group-hover:opacity-100 transition-opacity`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
