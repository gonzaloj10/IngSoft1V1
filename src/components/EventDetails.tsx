import { useState, useEffect } from 'react';
import { Event } from '../types';
import { events } from '../data/events';
import { Calendar, MapPin, Clock, Ticket, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { eventosPublicosService } from '../services/apiClient';

interface EventDetailsProps {
  eventId: string;
  onNavigate: (view: string, eventId?: string) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ eventId, onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar evento desde la API
  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Primero intentar obtener desde la API
        const response = await eventosPublicosService.obtenerEvento(eventId);
        
        if (response.success && response.event) {
          // Convertir el evento de la API al formato del frontend
          const eventFromAPI: Event = {
            id: response.event.id,
            title: response.event.title,
            artist: response.event.artist,
            date: response.event.date,
            time: response.event.time || '',
            venue: response.event.venue,
            location: response.event.location,
            price: response.event.price,
            image: response.event.image || 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
            description: response.event.description || '',
            category: response.event.category || 'General',
            availableTickets: response.event.availableTickets
          };
          
          setEvent(eventFromAPI);
        } else {
          throw new Error('Evento no encontrado en la API');
        }
      } catch (err) {
        console.error('Error cargando evento desde API:', err);
        // Fallback: buscar en eventos estáticos
        const fallbackEvent = events.find(e => e.id === eventId);
        if (fallbackEvent) {
          setEvent(fallbackEvent);
          setError('⚠️ Mostrando evento de demostración. El evento de la API no está disponible.');
        } else {
          setError('Evento no encontrado');
        }
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => onNavigate('home')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Evento no encontrado</p>
          <Button onClick={() => onNavigate('home')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  const handleBuyTicket = () => {
    if (!isAuthenticated) {
      // Si el usuario no está autenticado, redirigir a login
      onNavigate('login', eventId);
    } else {
      // Si está autenticado, ir directo a checkout
      onNavigate('checkout', eventId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => onNavigate('home')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a eventos
        </Button>

        {/* Mostrar mensaje de error si existe */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="relative h-96 lg:h-auto rounded-lg overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="inline-block bg-primary text-primary-foreground px-4 py-1 rounded-full mb-4">
                {event.category}
              </div>
              <h1 className="mb-2">{event.title}</h1>
              <h2 className="text-muted-foreground">{event.artist}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p>{event.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Hora</p>
                  <p>{event.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Ubicación</p>
                  <p>{event.venue}</p>
                  <p>{event.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Ticket className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Entradas disponibles</p>
                  <div className="flex items-center gap-2">
                    <p>{event.availableTickets} tickets</p>
                    {event.availableTickets > 0 && event.availableTickets < 20 && (
                      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        ¡Solo quedan {event.availableTickets}!
                      </span>
                    )}
                    {event.availableTickets === 0 && (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        Agotado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-3">Descripción</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-muted-foreground">Precio desde</p>
                  <p className="text-3xl text-primary">
                    ${event.price.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleBuyTicket}
                disabled={event.availableTickets === 0}
              >
                {event.availableTickets === 0 ? 'Entradas agotadas' : 'Compra tu entrada aquí'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
