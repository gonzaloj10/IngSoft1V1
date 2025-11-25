import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, Scan, RefreshCw, Camera, QrCode } from 'lucide-react';
import { useQRScanner } from '../hooks/useQRScanner';

// Función simple para normalizar RUT
const normalizeRut = (rut: string): string => {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
};

// Función simple para extraer RUT de un QR
const extractRut = (qrText: string): string | null => {
  try {
    const text = qrText.trim();
    
    // Patrón para RUT chileno (con o sin puntos y guión)
    const rutPattern = /(\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK])/;
    const match = text.match(rutPattern);
    
    if (match) {
      return normalizeRut(match[1]);
    }
    
    // Si el QR es solo el RUT
    const normalized = normalizeRut(text);
    if (normalized.length >= 8 && normalized.length <= 9) {
      return normalized;
    }
    
    return null;
  } catch {
    return null;
  }
};

// Función simple para validar dígito verificador
const validateRut = (rut: string): boolean => {
  const normalized = normalizeRut(rut);
  if (normalized.length < 2) return false;

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = 11 - (sum % 11);
  let calculatedDv = '';

  if (expectedDv === 11) {
    calculatedDv = '0';
  } else if (expectedDv === 10) {
    calculatedDv = 'K';
  } else {
    calculatedDv = expectedDv.toString();
  }

  return dv === calculatedDv;
};

// Función para formatear RUT para mostrar
const formatRut = (rut: string): string => {
  const normalized = normalizeRut(rut);
  if (normalized.length < 2) return rut;

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);

  let formatted = '';
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formatted = '.' + formatted;
    }
    formatted = body[i] + formatted;
  }

  return `${formatted}-${dv}`;
};

interface QRValidationSimpleProps {
  onBack?: () => void;
}

export const QRValidationSimple: React.FC<QRValidationSimpleProps> = ({ onBack }) => {
  const [step, setStep] = useState<'ticket' | 'id' | 'result'>('ticket');
  const [ticketRut, setTicketRut] = useState<string>('');
  const [idRut, setIdRut] = useState<string>('');
  const [manualRut, setManualRut] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    ticketRut: string;
    idRut: string;
  } | null>(null);
  
  // Estados para estadísticas
  const [stats, setStats] = useState(() => {
    // Cargar estadísticas desde localStorage
    const savedStats = localStorage.getItem('qr-validation-stats');
    if (savedStats) {
      try {
        return JSON.parse(savedStats);
      } catch {
        return { valid: 0, invalid: 0, total: 0 };
      }
    }
    return { valid: 0, invalid: 0, total: 0 };
  });

  // Guardar estadísticas en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('qr-validation-stats', JSON.stringify(stats));
  }, [stats]);
  
  const scannerDivId = 'qr-scanner-simple';

  // Hook personalizado para manejar el scanner QR
  const { 
    isScanning, 
    error: scannerError, 
    permissionStatus, 
    startScanning, 
    stopScanning, 
    checkCameraPermissions,
    retryScanning
  } = useQRScanner({
    scannerId: scannerDivId,
    onScanSuccess: (decodedText: string) => {
      const rut = extractRut(decodedText);
      
      if (rut && validateRut(rut)) {
        if (step === 'ticket') {
          setTicketRut(rut);
          setStep('id');
          // Parar el scanner después de un escaneo exitoso
          setTimeout(() => stopScanning(), 100);
        } else if (step === 'id') {
          setIdRut(rut);
          validateEntries(ticketRut, rut);
          setTimeout(() => stopScanning(), 100);
        }
      } else {
        console.warn('RUT no válido en QR:', decodedText);
      }
    },
    onScanError: (error: string) => {
      console.warn('Error del scanner:', error);
    }
  });

  const validateEntries = (ticket: string, id: string) => {
    const isValid = ticket === id;
    
    // Actualizar estadísticas
    setStats((prevStats: { valid: number; invalid: number; total: number }) => ({
      valid: isValid ? prevStats.valid + 1 : prevStats.valid,
      invalid: isValid ? prevStats.invalid : prevStats.invalid + 1,
      total: prevStats.total + 1
    }));
    
    setValidationResult({
      isValid,
      message: isValid 
        ? '✅ Entrada VÁLIDA - Los RUTs coinciden' 
        : '❌ Entrada INVÁLIDA - Los RUTs NO coinciden',
      ticketRut: ticket,
      idRut: id
    });
    
    setStep('result');
    
    // Sonido de feedback
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = isValid ? 800 : 300;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('No se pudo reproducir sonido:', error);
    }
  };

  const handleManualValidation = () => {
    const normalizedManual = normalizeRut(manualRut);
    
    if (!validateRut(normalizedManual)) {
      alert('RUT inválido. Por favor verifica el formato.');
      return;
    }
    
    setIdRut(normalizedManual);
    validateEntries(ticketRut, normalizedManual);
  };

  const reset = () => {
    stopScanning();
    setStep('ticket');
    setTicketRut('');
    setIdRut('');
    setManualRut('');
    setValidationResult(null);
  };

  const handleRequestPermissions = async () => {
    await checkCameraPermissions();
  };

  // Función para cambiar a modo manual cuando hay problemas de cámara
  const handleSwitchToManual = () => {
    // El error se limpia automáticamente cuando se para el scanner
    stopScanning();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4">
            ← Volver
          </Button>
        )}
        <h1 className="text-3xl font-bold mb-2">🎫 Validación de Entradas</h1>
        <p className="text-muted-foreground">
          Escanea el código QR de la entrada y luego el RUT del carnet de identidad
        </p>
      </div>

      {/* Panel de Estadísticas */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Estadísticas de Validación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Total Escaneadas */}
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Escaneadas
              </div>
            </div>
            
            {/* Entradas Válidas */}
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.valid}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                ✅ Válidas
              </div>
              {stats.total > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {((stats.valid / stats.total) * 100).toFixed(1)}%
                </div>
              )}
            </div>
            
            {/* Entradas Inválidas */}
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.invalid}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                ❌ Inválidas
              </div>
              {stats.total > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {((stats.invalid / stats.total) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          
          {/* Botón para resetear estadísticas */}
          {stats.total > 0 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStats({ valid: 0, invalid: 0, total: 0 })}
                className="text-xs"
              >
                🔄 Resetear Estadísticas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            {step === 'ticket' && '1️⃣ Escanear QR de la Entrada'}
            {step === 'id' && '2️⃣ Escanear RUT del Carnet'}
            {step === 'result' && '✅ Resultado de Validación'}
          </CardTitle>
          <CardDescription>
            {step === 'ticket' && 'Apunta la cámara al código QR de la entrada'}
            {step === 'id' && 'Escanea el QR del carnet o ingresa el RUT manualmente'}
            {step === 'result' && 'Resultado de la comparación de RUTs'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Alertas de error y permisos */}
          {scannerError && (
            <Alert className="mb-4 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
              <AlertDescription className="text-red-700 dark:text-red-300">
                <div className="whitespace-pre-line font-medium mb-3">{scannerError}</div>
                
                {/* Detectar si es error de cámara ocupada */}
                {(scannerError.includes('siendo usada') || scannerError.includes('NotReadable')) && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 mb-3 text-sm">
                    <div className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">🔍 Cómo verificar qué usa la cámara:</div>
                    <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-400 space-y-1">
                      <li><strong>Windows:</strong> Administrador de tareas → Rendimiento → GPU → Motor de cámara</li>
                      <li><strong>Navegador:</strong> Busca pestañas con ícono 🎥 en el título</li>
                      <li><strong>Apps comunes:</strong> Zoom, Teams, Skype, Meet, Discord, OBS</li>
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button 
                    onClick={() => retryScanning(500)} 
                    variant="outline" 
                    size="sm"
                    className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 font-semibold"
                  >
                    🔄 Reintentar
                  </Button>
                  <Button 
                    onClick={handleRequestPermissions} 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    🔓 Solicitar Permisos
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    🔃 Refrescar Página
                  </Button>
                  <Button 
                    onClick={handleSwitchToManual} 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    ✏️ Ingresar Manual
                  </Button>
                </div>
                <div className="mt-3 text-xs opacity-75 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  💡 <strong>Tip rápido:</strong> Cierra todas las apps de videoconferencia (Zoom, Teams, etc.) y otras pestañas del navegador que usen cámara antes de presionar "Reintentar".
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Información sobre HTTPS */}
          {!isScanning && !scannerError && step !== 'result' && (
            <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>💡 Nota importante:</strong> La cámara requiere una conexión segura (HTTPS) o localhost para funcionar. 
                Si tienes problemas, asegúrate de que el navegador tenga permisos de cámara habilitados.
              </AlertDescription>
            </Alert>
          )}

          {/* Scanner - SIEMPRE renderizado pero oculto cuando no está escaneando */}
          <div className={isScanning ? "mb-6" : "hidden"}>
            <div id={scannerDivId} className="rounded-lg overflow-hidden border-2 border-primary"></div>
            {isScanning && (
              <Button 
                onClick={stopScanning} 
                variant="outline" 
                className="w-full mt-4"
              >
                Cancelar Escaneo
              </Button>
            )}
          </div>

          {/* Controles por paso */}
          {!isScanning && step === 'ticket' && (
            <div className="space-y-4">
              <Button onClick={startScanning} className="w-full h-16 text-lg">
                <Camera className="w-6 h-6 mr-2" />
                Escanear QR de Entrada
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                El QR debe contener el RUT del comprador de la entrada
              </p>
            </div>
          )}

          {!isScanning && step === 'id' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  ✅ RUT de entrada escaneado: <code className="bg-white px-2 py-1 rounded">{formatRut(ticketRut)}</code>
                </p>
              </div>
              
              <Button onClick={startScanning} className="w-full h-16 text-lg">
                <Camera className="w-6 h-6 mr-2" />
                Escanear QR del Carnet
              </Button>
              
              <div className="space-y-3">
                <div className="text-center text-sm text-muted-foreground">
                  - O si el carnet no tiene QR -
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="manual-rut">Ingresa RUT manualmente</Label>
                    <Input
                      id="manual-rut"
                      placeholder="12.345.678-9"
                      value={manualRut}
                      onChange={(e) => setManualRut(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleManualValidation}
                    disabled={!manualRut.trim()}
                    className="mt-6"
                  >
                    Validar
                  </Button>
                </div>
              </div>
              
              <Button onClick={reset} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            </div>
          )}

          {step === 'result' && validationResult && (
            <div className="space-y-4">
              <Alert className={validationResult.isValid 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }>
                <div className="flex items-start gap-3">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <AlertDescription className="text-lg font-semibold mb-3">
                      {validationResult.message}
                    </AlertDescription>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>RUT Entrada:</strong> {formatRut(validationResult.ticketRut)}
                      </div>
                      <div>
                        <strong>RUT Carnet:</strong> {formatRut(validationResult.idRut)}
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>

              <Button onClick={reset} className="w-full h-14 text-lg">
                <Scan className="w-5 h-5 mr-2" />
                Validar Siguiente Entrada
              </Button>
            </div>
          )}

          {/* Progreso */}
          {step !== 'result' && (
            <div className="mt-6 flex justify-center space-x-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                step === 'ticket' ? 'bg-primary text-primary-foreground' : 
                ticketRut ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <span className="font-semibold">1</span>
                <span>Entrada</span>
                {ticketRut && <span>✓</span>}
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                step === 'id' ? 'bg-primary text-primary-foreground' : 
                idRut ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <span className="font-semibold">2</span>
                <span>Carnet</span>
                {idRut && <span>✓</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones adicionales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>1. QR de Entrada:</strong> Debe contener el RUT del comprador (ej: 12345678-9)</p>
          <p><strong>2. QR del Carnet:</strong> Los carnets chilenos pueden tener código QR o PDF417</p>
          <p><strong>3. Validación Manual:</strong> Si el carnet no tiene código, ingresa el RUT manualmente</p>
          <p><strong>4. Resultado:</strong> La entrada es válida solo si ambos RUTs son iguales</p>
        </CardContent>
      </Card>
    </div>
  );
};