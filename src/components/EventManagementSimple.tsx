import { useState, useEffect } from 'react';
import { 
  eventosService, 
  type EventoLog, 
  type EventoRequest, 
  verificarConexionAPI 
} from '../services/apiClient';
import { QRValidation } from './QRValidation';

interface EventManagementProps {
  onNavigate: (view: string) => void;
}

export function EventManagement({ onNavigate }: EventManagementProps) {
  const [logs, setLogs] = useState<EventoLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  
  // Estados para el formulario
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<EventoRequest>({
    evento_id: 0,
    nombre: '',
    fecha: '',
    hora: '',
    ubicacion: ''
  });

  // Verificar conexión con la API al cargar el componente
  useEffect(() => {
    checkApiConnection();
    loadLogs();
    
    // Polling automático cada 3 segundos para detectar cambios desde Swagger
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh && apiConnected) {
      intervalId = setInterval(() => {
        loadLogs();
      }, 3000);
    }

    // Cleanup del interval cuando el componente se desmonta o cambian las dependencias
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [apiConnected, autoRefresh]);

  const checkApiConnection = async () => {
    try {
      const isConnected = await verificarConexionAPI();
      setApiConnected(isConnected);
      if (!isConnected) {
        setError('❌ No se puede conectar con la API de reportes. Asegúrate de que esté funcionando en el puerto 5001');
      }
    } catch (err) {
      setApiConnected(false);
      setError('❌ Error verificando conexión con la API');
    }
  };

  const loadLogs = async () => {
    if (apiConnected === false) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventosService.obtenerLogs();
      if (response.success) {
        setLogs(response.logs);
      } else {
        setError('Error cargando logs de eventos');
      }
    } catch (err) {
      setError('❌ Error conectando con la API. Verifica que esté funcionando.');
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await eventosService.agregarEvento(formData);
      if (response.success) {
        setSuccess(`✅ Evento "${formData.nombre}" agregado exitosamente`);
        setFormData({
          evento_id: 0,
          nombre: '',
          fecha: '',
          hora: '',
          ubicacion: ''
        });
        setShowAddForm(false);
        await loadLogs(); // Recargar los logs
      } else {
        setError(response.error || 'Error agregando evento');
      }
    } catch (err) {
      setError(`❌ Error agregando evento: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (log: EventoLog) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const deleteRequest: EventoRequest = {
      evento_id: log.evento_id,
      nombre: log.nombre,
      fecha: log.fecha,
      hora: log.hora,
      ubicacion: log.ubicacion
    };

    try {
      const response = await eventosService.eliminarEvento(deleteRequest);
      if (response.success) {
        setSuccess(`✅ Evento "${log.nombre}" eliminado exitosamente`);
        await loadLogs(); // Recargar los logs
      } else {
        setError(response.error || 'Error eliminando evento');
      }
    } catch (err) {
      setError(`❌ Error eliminando evento: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
  };

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('es-CL');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Mostrar componente de validación si está activo */}
      {showValidation ? (
        <div>
          <button
            onClick={() => setShowValidation(false)}
            className="mb-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ← Volver a Gestión de Eventos
          </button>
          <QRValidation />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => onNavigate('home')}
              className="mb-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Volver al inicio
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Gestión de Eventos</h1>
                <p className="text-gray-600">
                  Administra los eventos del sistema. Agrega nuevos eventos o elimina existentes.
                </p>
              </div>
              <button
                onClick={() => setShowValidation(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#9333ea',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7e22ce'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9333ea'}
              >
                <svg 
                  style={{ width: '20px', height: '20px' }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" 
                  />
                </svg>
                <span>Validar Entradas</span>
              </button>
            </div>
          </div>

          {/* Estado de conexión */}
          <div className={`flex items-center gap-2 p-3 rounded-md mb-4 ${
            apiConnected === true 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : apiConnected === false 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              apiConnected === true 
                ? 'bg-green-500' 
                : apiConnected === false 
                ? 'bg-red-500'
                : 'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium">
              {apiConnected === true && '🟢 API Conectada'}
              {apiConnected === false && '🔴 API Desconectada'}
              {apiConnected === null && '🟡 Verificando API...'}
            </span>
            {apiConnected === false && (
              <button 
                onClick={checkApiConnection}
                className="ml-auto px-3 py-1 text-xs border border-gray-300 rounded"
              >
                🔄 Reconectar
              </button>
            )}
          </div>

          {/* Mensajes de estado */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              ⚠️ {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
              {success}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario para agregar eventos */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">➕ Agregar Evento</h2>
          <p className="text-gray-600 mb-4">Registra un nuevo evento en el sistema</p>
          
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              disabled={!apiConnected || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              ➕ Nuevo Evento
            </button>
          ) : (
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID del Evento</label>
                <input
                  type="number"
                  value={formData.evento_id || ''}
                  onChange={(e) => setFormData({...formData, evento_id: parseInt(e.target.value) || 0})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del Evento</label>
                <input
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Fecha (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Hora (HH:MM)</label>
                <input
                  type="time"
                  value={formData.hora.slice(0, 5)}
                  onChange={(e) => setFormData({...formData, hora: e.target.value + ':00'})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Ubicación</label>
                <input
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Agregando...' : 'Agregar Evento'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Log de eventos */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">📋 Historial de Eventos</h2>
              <p className="text-gray-600">{logs.length} eventos registrados</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className={autoRefresh ? 'text-green-600' : 'text-gray-500'}>
                  {autoRefresh ? '🔄 Auto-actualización ON' : '⏸️ Auto-actualización OFF'}
                </span>
              </label>
              <button
                onClick={loadLogs}
                disabled={!apiConnected || loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '🔄' : '↻'} Actualizar
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading && logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Cargando eventos...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay eventos registrados
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{log.nombre}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          log.tipo_operacion === 'add' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.tipo_operacion === 'add' ? 'Agregado' : 'Eliminado'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>📅 {formatDate(log.fecha)}</div>
                        <div>🕐 {formatTime(log.hora)}</div>
                        <div>📍 {log.ubicacion}</div>
                        <div className="text-xs text-gray-400">
                          ID: {log.evento_id} • Registrado: {formatDateTime(log.fecha_operacion)}
                        </div>
                      </div>
                    </div>
                    
                    {log.tipo_operacion === 'add' && (
                      <button
                        onClick={() => handleDeleteEvent(log)}
                        disabled={loading}
                        className="ml-2 px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </>
    )}
    </div>
  );
}