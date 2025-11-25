import { useState, useEffect } from 'react';
import { Event } from '../types';
import { Calendar, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { eventosPublicosService } from '../services/apiClient';

interface HomePageProps {
  onSelectEvent: (eventId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar eventos desde la API
  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await eventosPublicosService.obtenerEventos({
        active: true,
        per_page: 50
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
          image: event.image || 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
          description: event.description || '',
          category: event.category || 'General',
          availableTickets: event.availableTickets
        }));
        
        setEvents(eventsFromAPI);
      } else {
        // Si no hay eventos en la API, usar eventos de respaldo
        const { events: fallbackEvents } = await import('../data/events');
        setEvents(fallbackEvents);
        setError('⚠️ Usando eventos de demostración. Los eventos del administrador no están disponibles.');
      }
    } catch (err) {
      console.error('Error cargando eventos:', err);
      // En caso de error, usar eventos de respaldo
      const { events: fallbackEvents } = await import('../data/events');
      setEvents(fallbackEvents);
      setError('⚠️ No se pudo conectar con la API. Mostrando eventos de demostración.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar eventos al montar el componente
  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080')`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4">Encuentra tu evento</h1>
            <p className="text-xl">Descubre los mejores conciertos y eventos en Chile</p>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Eventos destacados</h2>
          <Button
            variant="outline"
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground">Cargando eventos...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground mb-4">
              No hay eventos disponibles en este momento
            </div>
            <Button onClick={loadEvents} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => onSelectEvent(event.id)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      // Imagen de respaldo si falla la carga
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full">
                    {event.category}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                  <p className="text-muted-foreground mb-4">{event.artist}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {event.date} {event.time && `- ${event.time}`}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.venue}, {event.location}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-semibold">
                      Desde ${event.price.toLocaleString('es-CL')}
                    </span>
                    <Button size="sm">
                      Ver detalles
                    </Button>
                  </div>
                  
                  {/* Mostrar tickets disponibles si es relevante */}
                  {event.availableTickets !== undefined && event.availableTickets < 50 && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      Solo {event.availableTickets} entradas disponibles
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
