import { useState, useEffect } from 'react';
import { events } from '../data/events';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { CheckCircle, Download, Calendar, MapPin, Mail, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Purchase, Event } from '../types';
import { generateAndDownloadTicketPDF } from '../services/emailService';
import { PurchaseDetails } from '../types/emailTypes';
import { eventosPublicosService } from '../services/apiClient';

interface ConfirmationProps {
  eventId: string;
  onNavigate: (view: string) => void;
  purchaseData?: Purchase;
}

export const Confirmation: React.FC<ConfirmationProps> = ({ 
  eventId, 
  onNavigate, 
  purchaseData 
}) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
          <p className="text-muted-foreground">Cargando confirmación...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Evento no encontrado'}</p>
          <Button onClick={() => onNavigate('home')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  // Usar datos de compra si están disponibles, sino generar datos por defecto
  const orderNumber = purchaseData?.orderNumber || `ORD-${Date.now()}`;
  const emailSent = purchaseData?.emailSent ?? true;

  // Función para descargar la entrada PDF
  const handleDownloadTicket = async () => {
    if (!user || !event) {
      console.error('Usuario o evento no disponible');
      alert('Error: Datos de usuario o evento no disponibles');
      return;
    }

    setIsDownloading(true);
    
    try {
      console.log('🎫 Iniciando descarga de entrada desde página de confirmación...');
      
      // Preparar datos de compra para generar el PDF
      const purchaseDetails: PurchaseDetails = {
        orderNumber: orderNumber,
        event: event,
        quantity: purchaseData?.quantity || 1,
        totalPrice: purchaseData?.totalPrice || (event.price + 4500), // Precio + cargo servicio
        serviceCharge: 4500,
        purchaseDate: new Date().toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName || ''
        }
      };

      console.log('📄 Generando PDF con datos:', {
        evento: event.title,
        usuario: user.name,
        orden: orderNumber
      });

      // Generar y descargar el PDF
      const result = await generateAndDownloadTicketPDF(purchaseDetails);
      
      if (result.success) {
        console.log('✅ Entrada descargada exitosamente:', result.message);
        
        // Mostrar mensaje de éxito temporal
        const successMsg = document.createElement('div');
        successMsg.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px; border-radius: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>✅</span>
              <span>Entrada descargada exitosamente</span>
            </div>
          </div>
        `;
        document.body.appendChild(successMsg);
        setTimeout(() => {
          document.body.removeChild(successMsg);
        }, 3000);
        
      } else {
        console.error('❌ Error descargando entrada:', result.message);
        alert(`Error al descargar la entrada: ${result.message}\n\nInténtalo nuevamente o contacta a soporte.`);
      }
      
    } catch (error) {
      console.error('❌ Error descargando entrada:', error);
      alert(`Error inesperado al descargar la entrada.\n\nDetalles: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nInténtalo nuevamente o contacta a soporte.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">¡Compra Exitosa!</h1>
          <p className="text-xl text-green-600 mb-4">¡Tu entrada está lista!</p>
          
          <div className="mb-6">
            {emailSent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Email enviado ✓</p>
                  <p className="text-sm text-green-600">Revisa tu bandeja de entrada</p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Procesando email...</p>
                  <p className="text-sm text-yellow-600">Recibirás tu confirmación pronto</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-1">Tu compra ha sido procesada correctamente</p>
            <p className="text-sm text-blue-600">Confirmación enviada a {user?.email}</p>
          </div>

          <div className="bg-muted rounded-lg p-6 mb-8 text-left">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Número de orden</p>
                <p className="text-lg">{orderNumber}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTicket}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Generando...' : 'Descargar'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2">{event.title}</h3>
                <p className="text-muted-foreground">{event.artist}</p>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Fecha y hora</p>
                  <p>{event.date} - {event.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="text-muted-foreground">Ubicación</p>
                  <p>{event.venue}, {event.location}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => onNavigate('home')}
            >
              Volver al inicio
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onNavigate('home')}
            >
              Ver detalles del evento
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-2">
            ¿Tienes alguna pregunta? Contáctanos a soporte@eventoschile.cl
          </p>
          {!emailSent && (
            <p className="text-sm text-yellow-600">
              Si no recibes el email en los próximos minutos, revisa tu carpeta de spam
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
