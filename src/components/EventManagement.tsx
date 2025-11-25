import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Plus, Trash2, RefreshCw, Calendar, Clock, MapPin, AlertCircle, ScanLine } from 'lucide-react';
import { eventosService, type EventoLog, type EventoRequest, verificarConexionAPI } from '../services/apiClient';
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
  }, []);

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
      // Primero agregar al log de eventos (sistema actual)
      const logResponse = await eventosService.agregarEvento(formData);
      
      // Si se agrega al log exitosamente, también agregarlo a la tabla de eventos públicos
      if (logResponse.success) {
        try {
          // Crear evento en la tabla de eventos públicos para que aparezca en HomePage
          const eventoPublico = {
            id: formData.evento_id.toString(),
            title: formData.nombre,
            artist: 'Artista por definir',
            date: formData.fecha,
            time: formData.hora.slice(0, 5), // HH:MM
            venue: formData.ubicacion,
            location: 'Chile',
            price: 25000, // Precio por defecto
            image: 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
            description: `Evento ${formData.nombre} programado para ${formData.fecha}`,
            category: 'Evento',
            availableTickets: 100,
            totalTickets: 100,
            isActive: true
          };

          const { eventosPublicosService } = await import('../services/apiClient');
          await eventosPublicosService.crearEvento(eventoPublico);
          
          setSuccess(`✅ Evento "${formData.nombre}" agregado exitosamente y disponible en la página principal`);
        } catch (publicError) {
          console.warn('Error agregando evento público:', publicError);
          setSuccess(`✅ Evento "${formData.nombre}" agregado al log. Nota: No se pudo agregar a la página principal automáticamente.`);
        }
        
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
        setError(logResponse.error || 'Error agregando evento');
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

  // Componente de estado de conexión
  const ConnectionStatus = () => (
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkApiConnection}
          className="ml-auto"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reconectar
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Mostrar componente de validación si está activo */}
        {showValidation ? (
          <div>
            <Button
              variant="outline"
              onClick={() => setShowValidation(false)}
              className="mb-4"
            >
              ← Volver a Gestión de Eventos
            </Button>
            <QRValidation />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="outline"
                onClick={() => onNavigate('home')}
                className="mb-4"
              >
                ← Volver al inicio
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Gestión de Eventos</h1>
                  <p className="text-gray-600">
                    Administra los eventos del sistema. Agrega nuevos eventos o elimina existentes.
                  </p>
                </div>
                <Button
                  onClick={() => setShowValidation(true)}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <ScanLine className="w-5 h-5 mr-2" />
                  Validar Entradas
                </Button>
              </div>
            </div>

            {/* Estado de conexión */}
            <ConnectionStatus />

            {/* Mensajes de estado */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
                {success}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Formulario para agregar eventos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Agregar Evento
                  </CardTitle>
                  <CardDescription>
                    Registra un nuevo evento en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showAddForm ? (
                    <Button 
                      onClick={() => setShowAddForm(true)}
                      disabled={!apiConnected || loading}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Evento
                    </Button>
                  ) : (
                    <form onSubmit={handleAddEvent} className="space-y-4">
                      <div>
                        <Label htmlFor="evento_id">ID del Evento</Label>
                        <Input
                          id="evento_id"
                          type="number"
                          value={formData.evento_id || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, evento_id: parseInt(e.target.value) || 0})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="nombre">Nombre del Evento</Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nombre: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="fecha">Fecha (YYYY-MM-DD)</Label>
                        <Input
                          id="fecha"
                          type="date"
                          value={formData.fecha}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fecha: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="hora">Hora (HH:MM:SS)</Label>
                        <Input
                          id="hora"
                          type="time"
                          step="1"
                          value={formData.hora}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, hora: e.target.value + ':00'})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="ubicacion">Ubicación</Label>
                        <Input
                          id="ubicacion"
                          value={formData.ubicacion}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, ubicacion: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1">
                          {loading ? 'Agregando...' : 'Agregar Evento'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowAddForm(false)}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Log de eventos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Historial de Eventos</CardTitle>
                      <CardDescription>
                        {logs.length} eventos registrados
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLogs}
                      disabled={!apiConnected || loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
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
                                <Badge variant={log.tipo_operacion === 'add' ? 'default' : 'destructive'}>
                                  {log.tipo_operacion === 'add' ? 'Agregado' : 'Eliminado'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(log.fecha)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.hora)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {log.ubicacion}
                                </div>
                                <div className="text-xs text-gray-400">
                                  ID: {log.evento_id} • Registrado: {formatDateTime(log.fecha_operacion)}
                                </div>
                              </div>
                            </div>
                            
                            {log.tipo_operacion === 'add' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteEvent(log)}
                                disabled={loading}
                                className="ml-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}