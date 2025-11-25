import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Mail, Download, Calendar, MapPin, Ticket, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PurchaseWithDetails {
  id: number;
  event_name: string;
  event_date: string;
  event_location: string;
  quantity: number;
  total_amount: number;
  purchase_date: string;
}

interface MyPurchasesProps {
  onNavigate: (view: string) => void;
}

// Helper function to format dates in Chilean timezone
const formatearFecha = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santiago'  // Zona horaria de Chile
    });
  } catch {
    return dateString;
  }
};

export function MyPurchases({ onNavigate }: MyPurchasesProps) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [user]);

  const loadPurchases = async () => {
    if (!user?.email) {
      setError('No se encontró información del usuario');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/purchases/user/email/${encodeURIComponent(user.email)}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar las compras');
      }

      const data = await response.json();
      
      // Ordenar por ID: más alto primero (compras más recientes)
      const sortedPurchases = (data || []).sort((a: PurchaseWithDetails, b: PurchaseWithDetails) => {
        return b.id - a.id; // Descendente: ID más alto (más reciente) primero
      });
      
      setPurchases(sortedPurchases);
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Error al cargar el historial de compras');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (purchaseId: number) => {
    try {
      setResendingEmail(purchaseId);
      setSuccessMessage(null);
      setErrorMessage(null);
      
      const response = await fetch(`http://localhost:5001/api/purchases/${purchaseId}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al reenviar el email');
      }

      setSuccessMessage('✅ Email de confirmación reenviado exitosamente. Revisa tu bandeja de entrada.');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error resending email:', err);
      const errorMsg = err.message || 'No se pudo reenviar el email. Por favor verifica tu conexión e intenta nuevamente.';
      setErrorMessage(`❌ ${errorMsg}`);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleDownloadPDF = async (purchase: PurchaseWithDetails) => {
    try {
      setDownloadingPDF(purchase.id);
      setSuccessMessage(null);
      setErrorMessage(null);
      
      // Download PDF from backend endpoint
      const response = await fetch(`http://localhost:5001/api/purchases/${purchase.id}/download-pdf`);
      
      if (!response.ok) {
        throw new Error('Error al descargar el PDF');
      }
      
      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entrada-${purchase.event_name.replace(/\s+/g, '-')}-${purchase.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage('📄 Entrada descargada exitosamente. Revisa tu carpeta de descargas.');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setErrorMessage('❌ No se pudo descargar el PDF. Por favor verifica tu conexión e intenta nuevamente.');
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setDownloadingPDF(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg">Cargando historial de compras...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <Button onClick={() => onNavigate('home')} className="mt-4">
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mis Entradas</h1>
        <p className="text-muted-foreground">
          Historial de compras de {user?.email}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {purchases.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Aún no has realizado ninguna compra</h2>
            <p className="text-muted-foreground mb-6">
              Este campo está vacío porque no tienes entradas compradas todavía.
              Explora nuestros eventos y adquiere tus entradas para verlas aquí.
            </p>
            <Button 
              onClick={() => onNavigate('home')}
              size="lg"
              className="w-full sm:w-auto"
            >
              Explorar Eventos Disponibles
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">
                    {purchase.event_name || 'Evento'}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Evento: {formatearFecha(purchase.event_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{purchase.event_location || 'Ubicación no especificada'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      <span className="font-semibold">
                        {purchase.quantity} {purchase.quantity === 1 ? 'entrada' : 'entradas'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        Total: ${purchase.total_amount?.toLocaleString('es-CL') || '0'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Compra realizada: {formatearFecha(purchase.purchase_date)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:w-48">
                  <Button
                    onClick={() => handleResendEmail(purchase.id)}
                    disabled={resendingEmail === purchase.id}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {resendingEmail === purchase.id ? 'Enviando...' : 'Reenviar Email'}
                  </Button>
                  
                  <Button
                    onClick={() => handleDownloadPDF(purchase)}
                    disabled={downloadingPDF === purchase.id}
                    variant="default"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingPDF === purchase.id ? 'Descargando...' : 'Descargar PDF'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
