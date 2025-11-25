import { useState, useEffect } from 'react';
import { 
  reportesService, 
  type ReporteVentasResponse,
  verificarConexionAPI,
  descargarArchivo 
} from '../services/apiClient';

interface ReportsProps {
  onNavigate: (view: string) => void;
}

interface FiltrosReporte {
  evento_id: number | undefined;
  fecha_inicio: string;
  fecha_fin: string;
  sector_id: number | undefined;
}

export function ReportsSimple({ onNavigate }: ReportsProps) {
  const [reporte, setReporte] = useState<ReporteVentasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  
  // Estados para los filtros
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    evento_id: undefined,
    fecha_inicio: '',
    fecha_fin: '',
    sector_id: undefined
  });

  // Verificar conexión con la API al cargar el componente
  useEffect(() => {
    checkApiConnection();
    loadDefaultReport();
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

  const loadDefaultReport = async () => {
    if (apiConnected === false) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await reportesService.obtenerReporteVentas();
      if (response.success) {
        setReporte(response);
      } else {
        setError('Error cargando reporte de ventas');
      }
    } catch (err) {
      setError('❌ Error conectando con la API. Verifica que esté funcionando.');
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const filtroLimpio = {
        evento_id: filtros.evento_id || undefined,
        fecha_inicio: filtros.fecha_inicio || undefined,
        fecha_fin: filtros.fecha_fin || undefined,
        sector_id: filtros.sector_id || undefined,
      };

      const response = await reportesService.obtenerReporteVentas(filtroLimpio);
      if (response.success) {
        setReporte(response);
      } else {
        setError('Error generando reporte');
      }
    } catch (err) {
      setError(`❌ Error generando reporte: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const filtroLimpio = {
        evento_id: filtros.evento_id || undefined,
        fecha_inicio: filtros.fecha_inicio || undefined,
        fecha_fin: filtros.fecha_fin || undefined,
        sector_id: filtros.sector_id || undefined,
      };

      const blob = await reportesService.descargarReportePDF(filtroLimpio);
      const fileName = `reporte_estrategico_${new Date().toISOString().split('T')[0]}.pdf`;
      descargarArchivo(blob, fileName);
    } catch (err) {
      setError(`❌ Error descargando PDF: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CL').format(num);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('home')}
          className="mb-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Volver al inicio
        </button>
        
        <h1 className="text-3xl font-bold mb-2">📊 Reportes de Ventas</h1>
        <p className="text-gray-600">
          Analiza las ventas de entradas y toma decisiones estratégicas para futuros eventos.
        </p>
      </div>

      {/* Estado de conexión */}
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
          <button 
            onClick={checkApiConnection}
            className="ml-auto px-3 py-1 text-xs border border-gray-300 rounded"
          >
            🔄 Reconectar
          </button>
        )}
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Filtros */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">🔍 Filtros del Reporte</h2>
          <p className="text-gray-600 mb-4">Personaliza el reporte con los filtros que necesites</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID del Evento</label>
              <input
                type="number"
                value={filtros.evento_id || ''}
                onChange={(e) => setFiltros({...filtros, evento_id: parseInt(e.target.value) || undefined})}
                placeholder="Todos los eventos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">ID del Sector</label>
              <input
                type="number"
                value={filtros.sector_id || ''}
                onChange={(e) => setFiltros({...filtros, sector_id: parseInt(e.target.value) || undefined})}
                placeholder="Todos los sectores"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleGenerateReport}
              disabled={!apiConnected || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '🔄 Generando...' : '📊 Generar Reporte'}
            </button>
            
            <button 
              onClick={handleDownloadPDF}
              disabled={!apiConnected || loading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              📄 Descargar PDF
            </button>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        {reporte && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Ventas</span>
                  <span className="text-blue-600">💰</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(reporte.resumen_ejecutivo.total_ventas)}
                </div>
                <p className="text-xs text-gray-600">Ingresos totales</p>
              </div>

              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Entradas</span>
                  <span className="text-green-600">🎫</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatNumber(reporte.resumen_ejecutivo.total_entradas)}
                </div>
                <p className="text-xs text-gray-600">Entradas vendidas</p>
              </div>

              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Promedio por Venta</span>
                  <span className="text-purple-600">📈</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(reporte.resumen_ejecutivo.promedio_venta)}
                </div>
                <p className="text-xs text-gray-600">Valor promedio</p>
              </div>

              <div className="border rounded-lg p-4 bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Registros</span>
                  <span className="text-orange-600">📋</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatNumber(reporte.total_registros)}
                </div>
                <p className="text-xs text-gray-600">Ventas registradas</p>
              </div>
            </div>

            {/* Análisis por Sector */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">🎯 Análisis por Sector</h2>
              <p className="text-gray-600 mb-4">Rendimiento de ventas por categoría de entrada</p>
              
              <div className="space-y-3">
                {Object.entries(reporte.analisis_por_sector).map(([sector, analisis]) => (
                  <div key={sector} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{sector}</h4>
                      <p className="text-sm text-gray-600">
                        {formatNumber(analisis.entradas_vendidas)} entradas vendidas
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatCurrency(analisis.total_ventas)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Promedio: {formatCurrency(analisis.precio_promedio)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {reporte.resumen_ejecutivo.sector_mas_vendido && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Sector Más Vendido</span>
                    <span className="font-medium">{reporte.resumen_ejecutivo.sector_mas_vendido}</span>
                  </div>
                </div>
              )}
              
              {reporte.resumen_ejecutivo.sector_mayor_ingreso && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Mayor Ingreso</span>
                    <span className="font-medium">{reporte.resumen_ejecutivo.sector_mayor_ingreso}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Análisis por Evento */}
            {Object.keys(reporte.analisis_por_evento).length > 0 && (
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-2">🎪 Análisis por Evento</h2>
                <p className="text-gray-600 mb-4">Comparación de rendimiento entre eventos</p>
                
                <div className="space-y-3">
                  {Object.entries(reporte.analisis_por_evento).map(([evento, analisis]) => (
                    <div key={evento} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{evento}</h4>
                        <p className="text-sm text-gray-600">
                          {formatNumber(analisis.total_entradas)} entradas
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(analisis.total_ventas)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Datos Detallados */}
            {reporte.datos_detallados.length > 0 && (
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-2">📊 Datos Detallados</h2>
                <p className="text-gray-600 mb-4">
                  Últimas {Math.min(10, reporte.datos_detallados.length)} ventas registradas
                </p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {reporte.datos_detallados.slice(0, 10).map((venta, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div>
                        <div className="font-medium">{venta.evento_nombre}</div>
                        <div className="text-gray-600">
                          {venta.cliente_nombre} • {venta.sector_nombre}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(venta.fecha_venta).toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(venta.total)}</div>
                        <div className="text-gray-600">
                          {venta.cantidad} entradas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Estado de carga */}
        {loading && !reporte && (
          <div className="border rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p>Generando reporte...</p>
          </div>
        )}

        {/* Estado vacío */}
        {!loading && !reporte && !error && (
          <div className="border rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600">Genera un reporte para ver los datos</p>
          </div>
        )}
      </div>
    </div>
  );
}