import React, { useEffect, useState, useCallback } from 'react';

type Usuario = {
  email: string;
  name: string;
  sede: string;
};

type Presente = {
  email: string;
  name: string;
  sede: string;
};

function toLocalDateString(date: Date) {
  return date.toLocaleDateString('sv-SE'); // yyyy-mm-dd en timezone local
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Presentes() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [bajas, setBajas] = useState<Record<string, string[]>>({});
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [sedeFilter, setSedeFilter] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/bajas').then(r => r.json()),
    ])
      .then(([users, bajasData]) => {
        setUsuarios(users);
        setBajas(bajasData);
      })
      .catch(console.error);
  }, []);

  const cargarPresentes = useCallback(async (fecha: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/presentes?fecha=${fecha}`);
      const data: Presente[] = await res.json();
      setPresentes(new Set(data.map(p => p.email)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPresentes(selectedDate);
  }, [selectedDate, cargarPresentes]);

  const togglePresente = async (email: string) => {
    setSaving(email);
    const isPresente = presentes.has(email);
    try {
      await fetch('/api/presentes', {
        method: isPresente ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fecha: selectedDate }),
      });
      setPresentes(prev => {
        const next = new Set(prev);
        isPresente ? next.delete(email) : next.add(email);
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const cambiarDia = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    setSelectedDate(toLocalDateString(date));
  };

  const esHoy = selectedDate === toLocalDateString(new Date());

  // Una baja persiste hasta reactivar: se excluyen de la lista de presentes
  const estaDeBaja = (email: string) => (bajas[email]?.length ?? 0) > 0;

  const usuariosFiltrados = usuarios
    .filter(u => !estaDeBaja(u.email))
    .filter(u => sedeFilter === 'todas' || u.sede === sedeFilter)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()));

  const presentesFiltrados = usuariosFiltrados.filter(u => presentes.has(u.email));
  const ausentesFiltrados = usuariosFiltrados.filter(u => !presentes.has(u.email));

  // Totales sobre el roster activo de la sede (sin búsqueda)
  const rosterSede = usuarios.filter(
    u => !estaDeBaja(u.email) && (sedeFilter === 'todas' || u.sede === sedeFilter)
  );
  const totalPresentes = rosterSede.filter(u => presentes.has(u.email)).length;
  const totalAusentes = rosterSede.length - totalPresentes;
  const pctAsistencia = rosterSede.length > 0 ? Math.round((totalPresentes / rosterSede.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
          Lista de Presentes
        </h2>
        <p className="text-slate-600 text-lg">Registro diario de asistencia al gimnasio</p>
      </div>

      {/* Navegador de fecha */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2.5">
          <button
            onClick={() => cambiarDia(-1)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center min-w-[180px]">
            <p className="text-base font-bold text-slate-800 capitalize leading-tight">{formatDisplayDate(selectedDate)}</p>
          </div>

          <button
            onClick={() => cambiarDia(1)}
            disabled={esHoy}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            max={toLocalDateString(new Date())}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          {!esHoy && (
            <button
              onClick={() => setSelectedDate(toLocalDateString(new Date()))}
              className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-medium text-sm hover:bg-emerald-200 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Resumen compacto (en lugar de cards grandes) */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-emerald-700">{totalPresentes}</span>
          <span className="text-emerald-600">presentes</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span className="font-bold text-slate-700">{totalAusentes}</span>
          <span className="text-slate-500">ausentes</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200">
          <span className="font-bold text-violet-700">{pctAsistencia}%</span>
          <span className="text-violet-600">asistencia</span>
        </span>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar miembro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={sedeFilter}
          onChange={e => setSedeFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        >
          <option value="todas">Todas las sedes</option>
          <option value="Temperley">Temperley</option>
          <option value="Calzada">Calzada</option>
          <option value="Pension">Pension</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-500">Cargando asistencia...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Presentes */}
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border-b border-emerald-100">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                Presentes ({presentesFiltrados.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {presentesFiltrados.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-sm">
                  {search ? 'Sin resultados' : 'Nadie marcado como presente aún'}
                </p>
              ) : (
                presentesFiltrados.map(u => (
                  <div key={u.email} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.sede}</p>
                    </div>
                    <button
                      onClick={() => togglePresente(u.email)}
                      disabled={saving === u.email}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {saving === u.email ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ausentes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span>
                Ausentes ({ausentesFiltrados.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {ausentesFiltrados.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-sm">
                  {search ? 'Sin resultados' : 'Todos los miembros están presentes'}
                </p>
              ) : (
                ausentesFiltrados.map(u => (
                  <div key={u.email} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.sede}</p>
                    </div>
                    <button
                      onClick={() => togglePresente(u.email)}
                      disabled={saving === u.email}
                      className="w-8 h-8 rounded-full border-2 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {saving === u.email ? (
                        <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
