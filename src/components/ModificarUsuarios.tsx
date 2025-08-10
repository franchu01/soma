import { useEffect, useState } from 'react';

type Usuario = {
  name: string;
  email: string;
  created_at: string;
  recordatorio: string;
  sede: string;
};

type Pagos = Record<string, string[]>;
type Bajas = Record<string, string[]>;

interface ModificarUsuariosProps {
  onUserUpdated?: () => void;
}

export default function ModificarUsuarios({ onUserUpdated }: ModificarUsuariosProps = {}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [bajas, setBajas] = useState<Bajas>({});
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Estados del formulario de edición
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    recordatorio: '1',
    sede: 'Temperley'
  });

  const mesActual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resUsers, resPagos, resBajas] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas'),
      ]);
      const users = await resUsers.json();
      const pagosData = await resPagos.json();
      const bajasData = await resBajas.json();
      
      setUsuarios(users);
      setPagos(pagosData);
      setBajas(bajasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const seleccionarUsuario = (usuario: Usuario) => {
    setUsuarioSeleccionado(usuario);
    setFormData({
      name: usuario.name,
      email: usuario.email,
      recordatorio: usuario.recordatorio,
      sede: usuario.sede
    });
    setShowEditForm(true);
  };

  const handleActualizarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSeleccionado) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOriginal: usuarioSeleccionado.email,
          name: formData.name,
          email: formData.email,
          recordatorio: parseInt(formData.recordatorio),
          sede: formData.sede
        })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`⚠️ ${data.error}`);
        return;
      }

      alert('✅ Usuario actualizado correctamente');
      setShowEditForm(false);
      setUsuarioSeleccionado(null);
      await cargarDatos();
      
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al actualizar el usuario');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmarPago = async (email: string) => {
    setIsPaymentLoading(true);
    try {
      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`⚠️ ${data.error}`);
        return;
      }

      alert('✅ Pago confirmado correctamente');
      await cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al confirmar el pago');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.name.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Cargando usuarios...</h3>
          <p className="text-slate-500">Preparando datos para edición</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          ✏️ Modificar Usuarios
        </h2>
        <p className="text-slate-600 text-lg">
          Edita información de usuarios existentes y confirma pagos
        </p>
      </div>

      {/* Buscador */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar usuario por nombre o email..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Grid de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuariosFiltrados.map((usuario) => {
          const pagoMes = pagos[usuario.email]?.includes(mesActual);
          const esBaja = bajas[usuario.email]?.includes(mesActual);
          
          return (
            <div
              key={usuario.email}
              className={`bg-white rounded-2xl shadow-lg border p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                esBaja 
                  ? 'border-gray-300 bg-gray-50' 
                  : pagoMes 
                    ? 'border-green-200' 
                    : 'border-red-200'
              }`}
            >
              {/* Header del card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    esBaja ? 'bg-gray-400' : pagoMes ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">{usuario.name}</h3>
                    <p className="text-sm text-slate-500">{usuario.email}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  esBaja 
                    ? 'bg-gray-100 text-gray-600' 
                    : pagoMes 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                }`}>
                  {esBaja ? '🚫 Baja' : pagoMes ? '✅ Al día' : '⚠️ Deuda'}
                </div>
              </div>

              {/* Información del usuario */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Sede:</span>
                  <span className="font-medium text-slate-800">📍 {usuario.sede}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Recordatorio:</span>
                  <span className="font-medium text-slate-800">📅 Día {usuario.recordatorio}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Alta:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(usuario.created_at).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <button
                  onClick={() => seleccionarUsuario(usuario)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Editar Usuario</span>
                </button>

                {!pagoMes && !esBaja && (
                  <button
                    onClick={() => handleConfirmarPago(usuario.email)}
                    disabled={isPaymentLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isPaymentLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span>Confirmar Pago</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de edición */}
      {showEditForm && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">
                ✏️ Editar Usuario
              </h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setUsuarioSeleccionado(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleActualizarUsuario} className="space-y-6">
              {/* Nombre */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo del usuario"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email del usuario"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Sede */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Sede
                </label>
                <select
                  value={formData.sede}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="Temperley">📍 Temperley</option>
                  <option value="Calzada">📍 Calzada</option>
                </select>
              </div>

              {/* Recordatorio */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Día de recordatorio de pago
                </label>
                <select
                  value={formData.recordatorio}
                  onChange={(e) => setFormData({ ...formData, recordatorio: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>Día {dia} del mes</option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setUsuarioSeleccionado(null);
                  }}
                  className="flex-1 bg-slate-200 text-slate-800 px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Actualizando...</span>
                    </div>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mensaje si no hay usuarios */}
      {usuariosFiltrados.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {busqueda ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
          </h3>
          <p className="text-slate-500">
            {busqueda ? 'Intenta con una búsqueda diferente' : 'Comienza registrando usuarios en la sección "Alta de Usuario"'}
          </p>
        </div>
      )}
    </div>
  );
}
