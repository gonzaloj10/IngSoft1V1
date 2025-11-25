import { useState, useEffect } from 'react';
import { eventosPublicosService } from '../services/apiClient';
import { Event } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Plus, Trash2, Edit3, Loader2, RefreshCw, AlertCircle, QrCode } from 'lucide-react';
import { QRValidationSimple } from './QRValidationSimple';

interface EventManagementAdminProps {
  onNavigate: (view: string) => void;
}

export function EventManagementAdmin({ onNavigate }: EventManagementAdminProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  // Estados para el formulario
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    artist: '',
    date: '',
    time: '',
    venue: '',
    location: '',
    price: 0,
    image: '',
    description: '',
    category: '',
    availableTickets: 100,
    totalTickets: 100,
    isActive: true
  });

  // Cargar eventos al montar el componente
  useEffect(() => {
    loadEvents();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const loadEvents = async () => {
    setLoading(true);
    clearMessages();
    
    try {
      const response = await eventosPublicosService.obtenerEventos({
        active: undefined, // Obtener todos los eventos (activos e inactivos)
        per_page: 100
      });
      
      if (response.success) {
        // Convertir los eventos de la API al formato del frontend
        const eventsFromAPI: Event[] = response.events.map(event => ({
          id: event.id,
          title: event.title,
          artist: event.artist,
          date: event.date,
          time: event.time || '',
          venue: event.venue,
          location: event.location,
          price: event.price,
          image: event.image || '',
          description: event.description || '',
          category: event.category || 'General',
          availableTickets: event.availableTickets
        }));
        
        setEvents(eventsFromAPI);
      } else {
        setError('Error cargando eventos desde la API');
      }
    } catch (err) {
      console.error('Error cargando eventos:', err);
      setError('Error conectando con la API. Verifica que esté funcionando.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      artist: '',
      date: '',
      time: '',
      venue: '',
      location: '',
      price: 0,
      image: '',
      description: '',
      category: '',
      availableTickets: 100,
      totalTickets: 100,
      isActive: true
    });
    setEditingEvent(null);
    setShowAddForm(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const response = await eventosPublicosService.crearEvento({
        id: formData.id,
        title: formData.title,
        artist: formData.artist,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        location: formData.location,
        price: formData.price,
        image: formData.image || undefined,
        description: formData.description,
        category: formData.category,
        availableTickets: formData.availableTickets,
        totalTickets: formData.totalTickets,
        isActive: formData.isActive
      });

      if (response.success) {
        setSuccess(`✅ Evento "${formData.title}" creado exitosamente`);
        resetForm();
        await loadEvents(); // Recargar la lista
      } else {
        setError(response.error || 'Error creando evento');
      }
    } catch (err) {
      setError(`❌ Error creando evento: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el evento "${event.title}"?`)) {
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const response = await eventosPublicosService.eliminarEvento(event.id);
      
      if (response.success) {
        setSuccess(`✅ Evento "${event.title}" eliminado exitosamente`);
        await loadEvents(); // Recargar la lista
      } else {
        setError(response.error || 'Error eliminando evento');
      }
    } catch (err) {
      setError(`❌ Error eliminando evento: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setFormData({
      id: event.id,
      title: event.title,
      artist: event.artist,
      date: event.date,
      time: event.time,
      venue: event.venue,
      location: event.location,
      price: event.price,
      image: event.image,
      description: event.description,
      category: event.category,
      availableTickets: event.availableTickets,
      totalTickets: event.availableTickets, // Asumimos que son iguales
      isActive: true // Por defecto activo
    });
    setEditingEvent(event);
    setShowAddForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Mostrar componente de validación si está activo */}
      {showValidation ? (
        <QRValidationSimple onBack={() => setShowValidation(false)} />
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => onNavigate('home')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Administración de Eventos</h1>
                <p className="text-muted-foreground">
                  Gestiona los eventos principales del sistema. Crea, edita y elimina eventos.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowValidation(true)}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Validar Entradas
                </Button>
                <Button
                  onClick={loadEvents}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>
          </div>

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de eventos */}
        <div className="lg:col-span-2 border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Eventos Registrados</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {events.length} eventos
              </span>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                disabled={loading}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </Button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading && events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Cargando eventos...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay eventos registrados
              </div>
            ) : (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {event.category}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>🎤 {event.artist}</div>
                        <div>📅 {formatDate(event.date)} {event.time && `- ${event.time}`}</div>
                        <div>📍 {event.venue}, {event.location}</div>
                        <div>💰 ${event.price.toLocaleString('es-CL')}</div>
                        <div>🎫 {event.availableTickets} entradas disponibles</div>
                        <div className="text-xs text-muted-foreground">ID: {event.id}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleEditEvent(event)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteEvent(event)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Formulario para agregar/editar eventos */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingEvent ? '✏️ Editar Evento' : '➕ Nuevo Evento'}
          </h2>
          
          {showAddForm ? (
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <Label htmlFor="id">ID del Evento *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  required
                  disabled={!!editingEvent} // No permitir cambiar el ID al editar
                  placeholder="evento_2024_01"
                />
              </div>
              
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Festival de Música 2024"
                />
              </div>
              
              <div>
                <Label htmlFor="artist">Artista *</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData({...formData, artist: e.target.value})}
                  required
                  placeholder="Artista Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  placeholder="20:00"
                />
              </div>
              
              <div>
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  required
                  placeholder="Teatro Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="location">Ubicación *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                  placeholder="Santiago, Chile"
                />
              </div>
              
              <div>
                <Label htmlFor="price">Precio *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  required
                  placeholder="25000"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Rock, Pop, Electrónica..."
                />
              </div>
              
              <div>
                <Label htmlFor="availableTickets">Entradas Disponibles</Label>
                <Input
                  id="availableTickets"
                  type="number"
                  value={formData.availableTickets}
                  onChange={(e) => setFormData({...formData, availableTickets: parseInt(e.target.value) || 0})}
                  placeholder="100"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  placeholder="Descripción del evento..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingEvent ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    editingEvent ? 'Actualizar Evento' : 'Crear Evento'
                  )}
                </Button>
                <Button 
                  type="button" 
                  onClick={resetForm}
                  disabled={loading}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Selecciona "Nuevo Evento" para crear un evento o "✏️" para editar uno existente.
              </p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Evento
              </Button>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}