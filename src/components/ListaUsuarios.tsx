import { useEffect, useState } from 'react';

type Usuario = {
  name: string;
  email: string;
  created_at: string;
  recordatorio: string;
  sede:string;
};

type Pagos = Record<string, string[]>;

const obtenerMesActual = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
};

export default function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [filtro, setFiltro] = useState<'todos' | 'deuda'>('todos');
  const [estado, setEstado] = useState<'activos' | 'todos'>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [bajas, setBajas] = useState<Record<string, string[]>>({});
  const [sede, setSede] = useState<'todos' | 'Temperley' | 'Calzada'>('todos');


  const mesActual = obtenerMesActual();

  const cargarDatos = async () => {
    const [resUsers, resPagos, resBajas] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/pagos'),
      fetch('/api/bajas'),
    ]);
    const users = await resUsers.json();
    const pagos = await resPagos.json();
    const bajas = await resBajas.json();
    setUsuarios(users);
    setPagos(pagos);
    setBajas(bajas);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const enDeuda = !(pagos[u.email]?.includes(mesActual));
    const enBaja = bajas[u.email]?.includes(mesActual);

    if (estado === 'activos' && enBaja) return false;
    if (filtro === 'deuda' && !enDeuda) return false;
    if (busqueda && !u.name.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (sede !== 'todos' && u.sede !== sede) return false;

    return true;
  });

  const marcarPagado = async (email: string) => {
    await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    await cargarDatos();
  };

  const darDeBaja = async (email: string) => {
    await fetch('/api/bajas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    await cargarDatos();
  };

  const reactivar = async (email: string) => {
    await fetch('/api/bajas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    await cargarDatos();
  };

  return (
    <div>
      <div className="mb-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
        <select
          className="border p-1 rounded text-gray-800"
          value={estado}
          onChange={(e) => setEstado(e.target.value as 'activos' | 'todos')}
        >
          <option value="activos">Activos</option>
          <option value="todos">Todos</option>
        </select>

        <select
          className="border p-1 rounded text-gray-800"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as 'todos' | 'deuda')}
        >
          <option value="todos">Todos</option>
          <option value="deuda">En deuda este mes</option>
        </select>

        <input
          type="text"
          className="border p-1 rounded w-full text-gray-800"
          placeholder="Buscar por nombre"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select
          className="border p-1 rounded text-gray-800"
          value={sede}
          onChange={(e) => setSede(e.target.value as 'todos' | 'Temperley' | 'Calzada')}
        >
          <option value="todos">Todas las sedes</option>
          <option value="Temperley">Temperley</option>
          <option value="Calzada">Calzada</option>
        </select>

      </div>

      <table className="w-full text-left border mt-4">
        <thead className="bg-gray-200 text-gray-800 font-semibold">
          <tr>
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Alta</th>
            <th className="p-2 border">Día de recordatorio</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((u) => {
            const pagoMes = pagos[u.email]?.includes(mesActual);
            const recordatorio = parseInt(u.recordatorio ?? '1');
            const hoy = new Date();
            const fechaRecordatorio = new Date(`${mesActual}-${String(recordatorio).padStart(2, '0')}`);
            const diasDeuda =
              !pagoMes && hoy > fechaRecordatorio
                ? Math.floor((hoy.getTime() - fechaRecordatorio.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            return (
              <tr
                key={u.email}
                className={
                  bajas[u.email]?.includes(mesActual)
                    ? 'bg-gray-100'
                    : pagoMes
                    ? 'bg-green-200'
                    : 'bg-red-200'
                }
              >
                <td className="p-2 border text-gray-800">{u.name}</td>
                <td className="p-2 border text-gray-800">{u.email}</td>
                <td className="p-2 border text-gray-800">{u.created_at}</td>
                <td className="p-2 border text-gray-800 text-center">Día {recordatorio}</td>
                <td className="p-2 border text-gray-800 space-y-1">
                  {bajas[u.email]?.includes(mesActual) ? (
                    <button
                      className="bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                      onClick={() => reactivar(u.email)}
                    >
                      🔄 Reactivar
                    </button>
                  ) : (
                    <>
                      {!pagoMes ? (
                        <button
                          className="bg-green-700 text-white px-2 py-1 rounded text-sm mr-1"
                          onClick={() => marcarPagado(u.email)}
                        >
                          💰 Marcar pagado
                        </button>
                      ) : (
                        <span className="text-green-900 text-sm font-medium">✅ Pagó</span>
                      )}
                      <button
                        className="bg-red-700 text-white px-2 py-1 rounded text-sm"
                        onClick={() => darDeBaja(u.email)}
                      >
                        💤 Dar de baja
                      </button>
                    </>
                  )}
                  {diasDeuda > 0 && (
                    <div className="text-red-800 text-sm font-semibold">
                      {diasDeuda} día{diasDeuda > 1 ? 's' : ''} de deuda
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
