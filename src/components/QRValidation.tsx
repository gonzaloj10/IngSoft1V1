import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import {
  validateEntry,
  formatRutForDisplay,
  saveValidationRecord,
  getTodayValidations,
  type ValidationRecord,
} from '../services/validationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Scan, RefreshCw, History, Trash2 } from 'lucide-react';
import { Input } from './ui/input';

type ScanStep = 'ticket' | 'idCard' | 'result';

export const QRValidation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ScanStep>('ticket');
  const [ticketQr, setTicketQr] = useState<string>('');
  const [idCardQr, setIdCardQr] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    ticketRut?: string;
    idCardRut?: string;
    message: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualRut, setManualRut] = useState('');
  const [lastScans, setLastScans] = useState<{ ticket?: string; idCard?: string }>({});
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const lastTicketRef = useRef<string>('');

  // Cargar historial al montar
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const history = getTodayValidations();
    setValidationHistory(history);
  };

  const startScanning = (step: ScanStep) => {
    setCurrentStep(step);
    setIsScanning(true);
    
    // Limpiar scanner anterior si existe
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }

    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerDivId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleScanSuccess(decodedText, step);
          },
          (errorMessage) => {
            // Ignorar errores comunes de escaneo
            if (!errorMessage.includes('NotFoundException')) {
              console.warn('QR Scan error:', errorMessage);
            }
          }
        );

        scannerRef.current = scanner;
      } catch (error) {
        console.error('Error starting scanner:', error);
        setIsScanning(false);
      }
    }, 100);
  };

  const handleScanSuccess = (decodedText: string, step: ScanStep) => {
    // Detener el scanner
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);

    if (step === 'ticket') {
      setTicketQr(decodedText);
      lastTicketRef.current = decodedText;
      setLastScans(prev => ({ ...prev, ticket: decodedText }));
      // Automáticamente pasar al siguiente paso
      setTimeout(() => startScanning('idCard'), 500);
    } else if (step === 'idCard') {
      setIdCardQr(decodedText);
      setLastScans(prev => ({ ...prev, idCard: decodedText }));
      // Validar automáticamente usando el último ticket escaneado de forma robusta
      const ticket = lastTicketRef.current || ticketQr;
      performValidation(ticket, decodedText);
    }
  };

  const performValidation = (ticket: string, idCard: string) => {
    const result = validateEntry(ticket, idCard);
    setValidationResult(result);
    setCurrentStep('result');
    
    // Guardar en historial
    saveValidationRecord(result);
    loadHistory();

    // Reproducir sonido de feedback
    playFeedbackSound(result.isValid);
  };

  const playFeedbackSound = (isValid: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = isValid ? 800 : 300;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play feedback sound:', error);
    }
  };

  const resetValidation = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setTicketQr('');
    setIdCardQr('');
    setValidationResult(null);
    setCurrentStep('ticket');
    setIsScanning(false);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'ticket':
        return '1. Escanea el QR de la Entrada';
      case 'idCard':
        return '2. Escanea el QR del Carnet';
      case 'result':
        return 'Resultado de la Validación';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'ticket':
        return 'Apunta la cámara al código QR impreso en la entrada del evento';
      case 'idCard':
        return 'Apunta la cámara al código QR del carnet de identidad';
      case 'result':
        return 'Resultado de la comparación de RUTs';
      default:
        return '';
    }
  };

  const validCount = validationHistory.filter(v => v.isValid).length;
  const invalidCount = validationHistory.filter(v => !v.isValid).length;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Validación de Entradas</h1>
        <p className="text-muted-foreground">
          Sistema de verificación mediante comparación de RUT entre entrada y carnet
        </p>
      </div>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-muted-foreground">Válidas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{invalidCount}</div>
              <div className="text-sm text-muted-foreground">Inválidas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{validationHistory.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Principal de Validación */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-6 h-6" />
            {getStepTitle()}
          </CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Scanner Container */}
          {isScanning && (
            <div className="mb-4">
              <div id={scannerDivId} className="rounded-lg overflow-hidden"></div>
            </div>
          )}

          {/* Botones de Control */}
          {!isScanning && currentStep !== 'result' && (
            <div className="space-y-4">
              <Button
                onClick={() => startScanning(currentStep)}
                className="w-full h-16 text-lg"
                size="lg"
              >
                <Scan className="w-6 h-6 mr-2" />
                {currentStep === 'ticket' ? 'Escanear Entrada' : 'Escanear Carnet'}
              </Button>

              {currentStep === 'idCard' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Nota: El carnet chileno suele tener código de barras PDF417 (no QR). Si tu carnet no tiene QR o no se puede leer, ingresa el RUT manualmente.
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ingresa RUT (ej: 12.345.678-9)"
                      value={manualRut}
                      onChange={(e) => setManualRut(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        if (!ticketQr) return;
                        performValidation(ticketQr, manualRut);
                        setIdCardQr(manualRut);
                      }}
                    >
                      Validar con RUT
                    </Button>
                  </div>
                  <Button
                    onClick={resetValidation}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Progreso */}
          {currentStep !== 'result' && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant={ticketQr ? 'default' : 'secondary'}>
                  {ticketQr ? '✓' : '1'}
                </Badge>
                <span className={ticketQr ? 'font-semibold' : ''}>
                  QR de Entrada {ticketQr && '✓'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={idCardQr ? 'default' : 'secondary'}>
                  {idCardQr ? '✓' : '2'}
                </Badge>
                <span className={idCardQr ? 'font-semibold' : ''}>
                  QR de Carnet {idCardQr && '✓'}
                </span>
              </div>
            </div>
          )}

          {/* Resultado */}
          {currentStep === 'result' && validationResult && (
            <div className="space-y-4">
              <Alert
                className={
                  validationResult.isValid
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }
              >
                <div className="flex items-start gap-3">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className="text-lg font-semibold mb-2">
                      {validationResult.message}
                    </AlertDescription>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">RUT Entrada:</span>{' '}
                        <code className="bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                          {validationResult.ticketRut
                            ? formatRutForDisplay(validationResult.ticketRut)
                            : 'No detectado'}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">RUT Carnet:</span>{' '}
                        <code className="bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                          {validationResult.idCardRut
                            ? formatRutForDisplay(validationResult.idCardRut)
                            : 'No detectado'}
                        </code>
                      </div>
                      {/* Debug opcional de los últimos QR leídos */}
                      <div className="text-xs text-muted-foreground">
                        <div>Último QR Entrada: {lastScans.ticket || '—'}</div>
                        <div>Último QR Carnet: {lastScans.idCard || manualRut || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>

              <Button onClick={resetValidation} className="w-full h-14 text-lg" size="lg">
                <RefreshCw className="w-5 h-5 mr-2" />
                Validar Siguiente Entrada
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial del Día
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Ocultar' : 'Ver'}
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {validationHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay validaciones registradas hoy
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {validationHistory
                  .slice()
                  .reverse()
                  .map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      {record.isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {record.ticketRut
                            ? formatRutForDisplay(record.ticketRut)
                            : 'RUT no detectado'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleTimeString('es-CL')}
                        </div>
                      </div>
                      <Badge variant={record.isValid ? 'default' : 'destructive'}>
                        {record.isValid ? 'Válido' : 'Inválido'}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
