import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface UseQRScannerProps {
  scannerId: string;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export const useQRScanner = ({ scannerId, onScanSuccess, onScanError }: UseQRScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Verificar permisos de cámara
  const checkCameraPermissions = async (): Promise<boolean> => {
    try {
      // Intentar obtener permisos de cámara explícitamente
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Cámara trasera preferida
        } 
      });
      
      // Si obtenemos el stream, tenemos permisos
      stream.getTracks().forEach(track => track.stop()); // Liberar la cámara
      setPermissionStatus('granted');
      setError(null);
      return true;
    } catch (err) {
      console.error('Error checking camera permissions:', err);
      setPermissionStatus('denied');
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('❌ Acceso a la cámara denegado. Por favor permite el acceso a la cámara en tu navegador.');
        } else if (err.name === 'NotFoundError') {
          setError('❌ No se encontró ninguna cámara en este dispositivo.');
        } else if (err.name === 'NotSupportedError') {
          setError('❌ Tu navegador no soporta acceso a la cámara. Intenta con Chrome, Firefox o Edge.');
        } else if (err.name === 'NotReadableError') {
          setError('❌ La cámara está siendo usada por otra aplicación.\n\nCierra aplicaciones como:\n• Zoom, Teams, Skype, Meet\n• Otras pestañas del navegador\n• Aplicaciones de cámara\n\nLuego presiona "Reintentar"');
        } else {
          setError(`❌ Error de cámara: ${err.message}`);
        }
      } else {
        setError('❌ Error desconocido al acceder a la cámara.');
      }
      return false;
    }
  };

  const startScanning = async () => {
    try {
      setError(null);

      // PASO 1: Verificar que el elemento DOM existe PRIMERO
      const element = document.getElementById(scannerId);
      if (!element) {
        const errorMsg = `No se encontró el elemento con ID: ${scannerId}. Asegúrate de que el componente esté renderizado.`;
        console.error(errorMsg);
        setError(errorMsg);
        return;
      }

      console.log('✅ Elemento DOM encontrado:', scannerId);

      // PASO 2: Ahora sí, establecer que estamos escaneando
      setIsScanning(true);

      // PASO 3: Verificar permisos de cámara
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        setIsScanning(false);
        return;
      }

      console.log('✅ Permisos de cámara verificados');

      // PASO 4: Limpiar scanner anterior si existe
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
          scannerRef.current = null;
          console.log('✅ Scanner anterior limpiado');
        } catch (err) {
          console.warn('Error limpiando scanner anterior:', err);
        }
      }

      // PASO 5: Limpiar el contenido del elemento
      element.innerHTML = '';

      // PASO 6: Esperar un momento para que el DOM se estabilice
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('🎥 Inicializando scanner...');

      // PASO 7: Crear e inicializar el scanner
      const scanner = new Html5QrcodeScanner(
        scannerId,
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: 'environment'
          }
        },
        false
      );

      scannerRef.current = scanner;

      // PASO 8: Renderizar el scanner
      scanner.render(
        (decodedText) => {
          try {
            console.log('✅ QR Code escaneado:', decodedText);
            onScanSuccess(decodedText);
          } catch (err) {
            console.error('Error en callback de éxito:', err);
          }
        },
        (errorMessage) => {
          // Solo mostrar errores relevantes, ignorar errores comunes de escaneo
          if (!errorMessage.includes('NotFoundException') && 
              !errorMessage.includes('NotFoundError') &&
              !errorMessage.includes('No QR code found') &&
              !errorMessage.includes('QR code parse error')) {
            console.warn('QR Scanner error:', errorMessage);
            
            // Manejar errores específicos
            if (errorMessage.includes('Could not start video source') || 
                errorMessage.includes('NotReadableError')) {
              setError('❌ La cámara está siendo usada por otra aplicación.\n\n🔍 Revisa y cierra:\n• Zoom, Teams, Skype, Google Meet\n• Otras pestañas del navegador con cámara\n• Aplicaciones de foto/video\n• OBS, Streamlabs, etc.\n\n💡 Luego presiona "Reintentar"');
              setIsScanning(false);
            } else if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
              setError('❌ Acceso a la cámara denegado. Refresca la página y permite el acceso.');
              setPermissionStatus('denied');
              setIsScanning(false);
            } else if (errorMessage.includes('NotFoundError')) {
              setError('❌ No se encontró ninguna cámara.');
              setIsScanning(false);
            } else if (errorMessage.includes('OverconstrainedError')) {
              setError('❌ La configuración de cámara no es compatible. Intenta con otra cámara.');
              setIsScanning(false);
            } else {
              onScanError?.(errorMessage);
            }
          }
        }
      );

      console.log('✅ Scanner inicializado correctamente');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al iniciar scanner';
      console.error('Error starting QR scanner:', err);
      setError(errorMsg);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    console.log('🛑 Deteniendo scanner...');
    setIsScanning(false);
    
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
          console.log('✅ Scanner detenido correctamente');
        }).catch((error) => {
          console.warn('Error clearing scanner:', error);
          scannerRef.current = null;
        });
      } catch (error) {
        console.warn('Error stopping scanner:', error);
        scannerRef.current = null;
      }
    }

    // Limpiar elemento DOM
    setTimeout(() => {
      const element = document.getElementById(scannerId);
      if (element) {
        element.innerHTML = '';
      }
    }, 100);
  };

  // Función para reintentar el scanner después de un error
  const retryScanning = async (delayMs: number = 1000) => {
    console.log('🔄 Reintentando scanner en', delayMs, 'ms...');
    stopScanning();
    
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        await startScanning();
        resolve();
      }, delayMs);
    });
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return {
    isScanning,
    error,
    permissionStatus,
    startScanning,
    stopScanning,
    checkCameraPermissions,
    retryScanning,
  };
};
