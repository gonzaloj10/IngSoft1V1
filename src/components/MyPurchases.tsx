import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { ArrowLeft, Loader2, Mail, Download, Calendar, MapPin, Ticket } from 'lucide-react';

interface PurchaseWithDetails {
  id: number;
  orderNumber: string;
  quantity: number;
  totalPrice: number;
  purchaseDate: string;
  status: string;
  event: {
    id: string;
    title: string;
    artist: string;
    date: string;
    venue: string;
    image: string;
  };
}

interface MyPurchasesProps {
  onNavigate: (view: string) => void;
}

export const MyPurchases: React.FC<MyPurchasesProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      onNavigate('home');
      return;
    }

    loadPurchases();
  }, [user]);

  const loadPurchases = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📥 Cargando compras del usuario:', user.id);
      
      try {
        // Intentar cargar desde el backend usando el email
        const response = await fetch(`/api/purchases/user/email/${encodeURIComponent(user.email)}`, {
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error('Error al cargar compras del servidor');
        }

        const data = await response.json();

        if (data.success && data.purchases) {
          console.log('✅ Compras cargadas desde servidor:', data.purchases.length);
          
          // Cargar eventos para cada compra
          const purchasesWithEvents = await Promise.all(
            data.purchases.map(async (purchase: any) => {
              try {
                const eventResponse = await fetch(`/api/events/${purchase.eventId}`);
                if (eventResponse.ok) {
                  const eventData = await eventResponse.json();
                  return {
                    ...purchase,
                    event: eventData.event
                  };
                }
              } catch {
                console.warn('No se pudo cargar evento:', purchase.eventId);
              }
              return purchase;
            })
          );
          
          setPurchases(purchasesWithEvents.filter(p => p.event));
          return;
        }
      } catch (backendError) {
        console.warn('⚠️ Backend no disponible, intentando localStorage:', backendError);
      }
      
      // Fallback: Cargar desde localStorage
      const localPurchases = JSON.parse(localStorage.getItem('purchases') || '[]');
      const userPurchases = localPurchases.filter((p: any) => p.userId === user.id);
      
      if (userPurchases.length > 0) {
        console.log('📦 Compras cargadas desde localStorage:', userPurchases.length);
        
        // Cargar datos de eventos para cada compra
        const purchasesWithEvents = await Promise.all(
          userPurchases.map(async (purchase: any) => {
            try {
              const eventResponse = await fetch(`/api/events/${purchase.eventId}`);
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                return {
                  ...purchase,
                  event: eventData.event
                };
              }
            } catch {
              // Si no se puede cargar desde API, usar datos estáticos
              const { events } = await import('../data/events');
              const event = events.find(e => e.id === purchase.eventId);
              if (event) {
                return {
                  ...purchase,
                  event: {
                    id: event.id,
                    title: event.title,
                    artist: event.artist,
                    date: event.date,
                    venue: event.venue,
                    image: event.image
                  }
                };
              }
            }
            return null;
          })
        );
        
        setPurchases(purchasesWithEvents.filter(p => p !== null));
      } else {
        console.log('ℹ️ No hay compras registradas');
        setPurchases([]);
      }
    } catch (err: any) {
      console.error('❌ Error cargando compras:', err);
      setError('No se pudieron cargar tus compras. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (purchaseId: number, orderNumber: string) => {
    setResendingEmail(orderNumber);

    try {
      console.log('📧 Reenviando email para orden:', orderNumber);
      
      const response = await fetch(`/api/purchases/${purchaseId}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al reenviar email');
      }

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('❌ Error reenviando email:', err);
      alert('❌ Error al reenviar el email. Intenta nuevamente.');
    } finally {
      setResendingEmail(null);
    }
  };

  const handleDownloadPDF = async (purchaseId: number, orderNumber: string) => {
    try {
      console.log('📥 Descargando PDF para orden:', orderNumber);
      
      const response = await fetch(`/api/purchases/${purchaseId}/download-ticket`);
      
      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}\n\nEn una implementación real, el PDF se descargaría automáticamente.`);
        // TODO: Aquí iría la lógica para descargar el PDF real
        // window.open(data.downloadUrl, '_blank');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('❌ Error descargando PDF:', err);
      alert('❌ Error al descargar el PDF. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando tus compras...</p>
        </div>
      </div>
    );
  }

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

        <h1 className="mb-8">Mis Entradas</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {purchases.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg shadow-md">
            <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl mb-2">No tienes compras todavía</h2>
            <p className="text-muted-foreground mb-6">
              Explora nuestros eventos y compra tus entradas
            </p>
            <Button onClick={() => onNavigate('home')}>
              Ver eventos disponibles
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-card rounded-lg shadow-md overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                  {/* Event Image */}
                  <div className="md:col-span-1">
                    <img
                      src={purchase.event.image}
                      alt={purchase.event.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>

                  {/* Event Details */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3>{purchase.event.title}</h3>
                          <p className="text-muted-foreground">{purchase.event.artist}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          purchase.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {purchase.status === 'completed' ? 'Completada' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {purchase.event.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {purchase.event.venue}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Número de orden</p>
                          <p className="font-mono font-medium">{purchase.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha de compra</p>
                          <p>{new Date(purchase.purchaseDate).toLocaleDateString('es-CL')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cantidad</p>
                          <p>{purchase.quantity} entrada{purchase.quantity > 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total pagado</p>
                          <p className="text-primary font-medium">
                            ${purchase.totalPrice.toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleResendEmail(purchase.id, purchase.orderNumber)}
                          disabled={resendingEmail === purchase.orderNumber}
                        >
                          {resendingEmail === purchase.orderNumber ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Reenviar confirmación
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadPDF(purchase.id, purchase.orderNumber)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar entrada
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
