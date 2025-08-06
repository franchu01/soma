import { useEffect, useState } from 'react';

export default function AltaUsuario() {
  const [dias, setDias] = useState<number[]>([]);
  const [pagoEsteMes, setPagoEsteMes] = useState(true);
  const [sede, setSede] = useState('Temperley');

  useEffect(() => {
    setDias(Array.from({ length: 28 }, (_, i) => i + 1));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const recordatorio = parseInt((form.elements.namedItem('recordatorio') as HTMLSelectElement).value);
    
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
  };

  const hoy = new Date();
  const diaHoy = hoy.getDate() > 28 ? 28 : hoy.getDate(); // máximo 28

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" placeholder="Nombre" required className="w-full p-2 border rounded text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input name="email" type="email" placeholder="Email" required className="w-full p-2 border rounded text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div>
        <label className="block text-sm mb-1 text-gray-800">Día del mes para recordatorio:</label>
        <select name="recordatorio" defaultValue={diaHoy} required className="w-full p-2 border text-gray-800 rounded">
          {dias.map(dia => (
            <option key={dia} value={dia}>
              Día {dia}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="pagoEsteMes"
          checked={pagoEsteMes}
          onChange={() => setPagoEsteMes(!pagoEsteMes)}
        />
        <label htmlFor="pagoEsteMes" className='text-gray-800'>¿Ya pagó este mes?</label>
      </div>

      <div>
      <label className="block text-sm mb-1 text-gray-800">Sede:</label>
      <select
        name="sede"
        value={sede}
        onChange={(e) => setSede(e.target.value)}
        required
        className="w-full p-2 border text-gray-800 rounded"
      >
        <option value="Temperley">Temperley</option>
        <option value="Calzada">Calzada</option>
      </select>
    </div>


      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Agregar usuario
      </button>
    </form>
  );
}
