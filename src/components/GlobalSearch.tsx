import { useState, useEffect, useRef } from 'react';

interface GlobalSearchProps {
  usuarios: any[];
  onUserSelect: (usuario: any) => void;
}

export default function GlobalSearch({ usuarios, onUserSelect }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar usuarios
  useEffect(() => {
    if (query.length > 0) {
      const filtered = usuarios.filter(usuario =>
        usuario.name.toLowerCase().includes(query.toLowerCase()) ||
        usuario.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8); // Máximo 8 resultados
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [query, usuarios]);

  // Atajo de teclado Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserClick = (usuario: any) => {
    onUserSelect(usuario);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Botón de búsqueda */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-slate-200"
        title="Buscar usuarios (Ctrl+K)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm font-medium hidden sm:inline">Buscar</span>
        <span className="hidden lg:inline-flex items-center text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
          Ctrl+K
        </span>
      </button>

      {/* Modal de búsqueda */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/20 backdrop-blur-sm pt-20">
          <div 
            ref={searchRef}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 animate-fade-in"
          >
            {/* Input de búsqueda */}
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar usuario por nombre o email..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Resultados */}
            <div className="max-h-96 overflow-y-auto">
              {query.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-slate-500 font-medium">Buscar usuarios</p>
                  <p className="text-slate-400 text-sm">Escribe para encontrar usuarios por nombre o email</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8a7.962 7.962 0 01-2.009 5.291z" />
                  </svg>
                  <p className="text-slate-500 font-medium">Sin resultados</p>
                  <p className="text-slate-400 text-sm">No se encontraron usuarios que coincidan con "{query}"</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredUsers.map((usuario) => (
                    <button
                      key={usuario.email}
                      onClick={() => handleUserClick(usuario)}
                      className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center space-x-3"
                    >
                      <div className="bg-blue-100 rounded-full p-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {usuario.name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {usuario.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-400">📍 {usuario.sede}</span>
                          <span className="text-xs text-slate-400">
                            Recordatorio: día {usuario.recordatorio}
                          </span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con atajos */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
              <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                <span>Presiona <kbd className="bg-white px-2 py-1 rounded border border-slate-300">ESC</kbd> para cerrar</span>
                <span>•</span>
                <span><kbd className="bg-white px-2 py-1 rounded border border-slate-300">Ctrl+K</kbd> para abrir</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
