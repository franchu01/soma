import { useState, useEffect } from 'react';

interface NotificationProps {
  usuarios: any[];
  pagos: Record<string, string[]>;
}

export default function NotificationPanel({ usuarios, pagos }: NotificationProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const mesActual = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const hoy = new Date();
    const notifs: any[] = [];

    // Usuarios con deuda
    usuarios.forEach(usuario => {
      const hasPagado = pagos[usuario.email]?.includes(mesActual);
      if (!hasPagado) {
        const recordatorio = parseInt(usuario.recordatorio || '1');
        const fechaRecordatorio = new Date(`${mesActual}-${String(recordatorio).padStart(2, '0')}`);
        const diasDeuda = hoy > fechaRecordatorio 
          ? Math.floor((hoy.getTime() - fechaRecordatorio.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        if (diasDeuda > 0) {
          notifs.push({
            id: `deuda-${usuario.email}`,
            type: 'warning',
            title: 'Pago pendiente',
            message: `${usuario.name} tiene ${diasDeuda} día${diasDeuda > 1 ? 's' : ''} de atraso`,
            time: fechaRecordatorio
          });
        }
      }
    });

    // Recordatorios próximos (próximos 3 días)
    usuarios.forEach(usuario => {
      const hasPagado = pagos[usuario.email]?.includes(mesActual);
      if (!hasPagado) {
        const recordatorio = parseInt(usuario.recordatorio || '1');
        const fechaRecordatorio = new Date(`${mesActual}-${String(recordatorio).padStart(2, '0')}`);
        const diasHasta = Math.floor((fechaRecordatorio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diasHasta >= 0 && diasHasta <= 3) {
          notifs.push({
            id: `recordatorio-${usuario.email}`,
            type: 'info',
            title: 'Recordatorio próximo',
            message: `${usuario.name} debe pagar en ${diasHasta} día${diasHasta !== 1 ? 's' : ''}`,
            time: fechaRecordatorio
          });
        }
      }
    });

    setNotifications(notifs.slice(0, 10)); // Máximo 10 notificaciones
  }, [usuarios, pagos, mesActual]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
        title="Notificaciones"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9a5 5 0 10-10 0v3l-5 5h5a5 5 0 1010 0z" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-fade-in">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Notificaciones</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-500 font-medium">¡Todo al día!</p>
                <p className="text-slate-400 text-sm">No hay notificaciones pendientes</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl mb-2 border-l-4 transition-colors hover:bg-slate-50 ${
                      notif.type === 'warning' 
                        ? 'border-amber-400 bg-amber-50' 
                        : 'border-blue-400 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {notif.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Recordatorio: {notif.time.toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                Mostrando las {notifications.length} notificaciones más importantes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
