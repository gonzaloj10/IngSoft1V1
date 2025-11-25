import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onNavigate: (view: string) => void;
}

export const Header = ({ onNavigate }: HeaderProps) => {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    onNavigate('home');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <h1 className="text-blue-600 text-xl font-bold">Eventos Viña</h1>
          </div>
          
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar eventos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>
          
          {/* Enlaces de navegación para administración */}
          {isAuthenticated && user?.isAdmin && (
            <div className="hidden md:flex items-center gap-2 mr-4">
              <button
                onClick={() => onNavigate('management')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <span>⚙️</span>
                Gestión
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <span>📊</span>
                Reportes
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate('mypurchases')}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <span>🎟️</span>
                  Mis Entradas
                </button>
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <span>🚪</span>
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <span>👤</span>
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
