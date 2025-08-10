import { useEffect, useState } from 'react';

interface AltaUsuarioProps {
  onUserAdded?: () => void;
}

export default function AltaUsuario({ onUserAdded }: AltaUsuarioProps = {}) {
  const [dias, setDias] = useState<number[]>([]);
  const [pagoEsteMes, setPagoEsteMes] = useState(true);
  const [sede, setSede] = useState('Temperley');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDias(Array.from({ length: 28 }, (_, i) => i + 1));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const recordatorio = parseInt((form.elements.namedItem('recordatorio') as HTMLSelectElement).value);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, recordatorio, sede })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`⚠️ ${data.error}`);
        return;
      }

      // Si se marcó como "pago este mes", registramos el pago ahora
      if (pagoEsteMes) {
        await fetch('/api/pagos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      }

      form.reset();
      setPagoEsteMes(true);
      alert('✅ Usuario agregado correctamente');
      
      // Llamar callback para actualizar datos en el componente padre
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al agregar el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const hoy = new Date();
  const diaHoy = hoy.getDate() > 28 ? 28 : hoy.getDate(); // máximo 28

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-in">
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          Registro de Nuevo Usuario
        </h2>
        <p className="text-slate-600">
          Completa los datos para dar de alta un nuevo miembro
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
        {/* Nombre */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Nombre completo
          </label>
          <input 
            name="name" 
            placeholder="Ingresa el nombre completo" 
            required 
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 input-focus hover-lift"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Correo electrónico
          </label>
          <input 
            name="email" 
            type="email" 
            placeholder="ejemplo@correo.com" 
            required 
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 input-focus hover-lift"
          />
        </div>

        {/* Recordatorio */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Día del mes para recordatorio de pago
          </label>
          <select 
            name="recordatorio" 
            defaultValue={diaHoy} 
            required 
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 input-focus hover-lift"
          >
            {dias.map(dia => (
              <option key={dia} value={dia}>
                Día {dia} de cada mes
              </option>
            ))}
          </select>
        </div>

        {/* Sede */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Sede de entrenamiento
          </label>
          <select
            name="sede"
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-slate-400 input-focus hover-lift"
          >
            <option value="Temperley">📍 Temperley</option>
            <option value="Calzada">📍 Calzada</option>
          </select>
        </div>

        {/* Checkbox pago */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="pagoEsteMes"
              checked={pagoEsteMes}
              onChange={() => setPagoEsteMes(!pagoEsteMes)}
              className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="pagoEsteMes" className="text-slate-800 font-medium cursor-pointer">
                ¿Ya realizó el pago de este mes?
              </label>
              <p className="text-sm text-slate-600 mt-1">
                Marcar si el usuario ya abonó la cuota del mes actual
              </p>
            </div>
          </div>
        </div>

        {/* Botón submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Registrando usuario...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Registrar Usuario</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
}
