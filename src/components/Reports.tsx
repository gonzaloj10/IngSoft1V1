import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Download, FileText, FileSpreadsheet, RefreshCw, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { 
  reportesService, 
  type ReporteVentasResponse, 
  type ReporteVenta,
  verificarConexionAPI,
  descargarArchivo 
} from '../../services/apiClient';

interface ReportsProps {
  onNavigate: (view: string) => void;
}

interface FiltrosReporte {
  evento_id: number | undefined;
  fecha_inicio: string;
  fecha_fin: string;
  sector_id: number | undefined;
}

export function Reports({ onNavigate }: ReportsProps) {
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

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      const filtroLimpio = {
        evento_id: filtros.evento_id || undefined,
        fecha_inicio: filtros.fecha_inicio || undefined,
        fecha_fin: filtros.fecha_fin || undefined,
        sector_id: filtros.sector_id || undefined,
      };

      const blob = await reportesService.descargarReporteExcel(filtroLimpio);
      const fileName = `reporte_estrategico_${new Date().toISOString().split('T')[0]}.xlsx`;
      descargarArchivo(blob, fileName);
    } catch (err) {
      setError(`❌ Error descargando Excel: ${err instanceof Error ? err.message : 'Error desconocido'}`);
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

  // Componente de estado de conexión
  const ConnectionStatus = () => (
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkApiConnection}
          className="ml-auto"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reconectar
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => onNavigate('home')}
            className="mb-4"
          >
            ← Volver al inicio
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Reportes de Ventas</h1>
          <p className="text-gray-600">
            Analiza las ventas de entradas y toma decisiones estratégicas para futuros eventos.
          </p>
        </div>

        {/* Estado de conexión */}
        <ConnectionStatus />

        {/* Mensajes de estado */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros del Reporte</CardTitle>
              <CardDescription>
                Personaliza el reporte con los filtros que necesites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="evento_id">ID del Evento</Label>
                  <Input
                    id="evento_id"
                    type="number"
                    value={filtros.evento_id || ''}
                    onChange={(e) => setFiltros({...filtros, evento_id: parseInt(e.target.value) || undefined})}
                    placeholder="Todos los eventos"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={filtros.fecha_inicio}
                    onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="fecha_fin">Fecha Fin</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={filtros.fecha_fin}
                    onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sector_id">ID del Sector</Label>
                  <Input
                    id="sector_id"
                    type="number"
                    value={filtros.sector_id || ''}
                    onChange={(e) => setFiltros({...filtros, sector_id: parseInt(e.target.value) || undefined})}
                    placeholder="Todos los sectores"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={!apiConnected || loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Generando...' : 'Generar Reporte'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={!apiConnected || loading}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Descargar PDF
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownloadExcel}
                  disabled={!apiConnected || loading}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Ejecutivo */}
          {reporte && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reporte.resumen_ejecutivo.total_ventas)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresos totales
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(reporte.resumen_ejecutivo.total_entradas)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entradas vendidas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reporte.resumen_ejecutivo.promedio_venta)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valor promedio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Registros</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(reporte.total_registros)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ventas registradas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Análisis por Sector */}
              <Card>
                <CardHeader>
                  <CardTitle>Análisis por Sector</CardTitle>
                  <CardDescription>
                    Rendimiento de ventas por categoría de entrada
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                        <Badge variant="default">Sector Más Vendido</Badge>
                        <span className="font-medium">{reporte.resumen_ejecutivo.sector_mas_vendido}</span>
                      </div>
                    </div>
                  )}
                  
                  {reporte.resumen_ejecutivo.sector_mayor_ingreso && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Mayor Ingreso</Badge>
                        <span className="font-medium">{reporte.resumen_ejecutivo.sector_mayor_ingreso}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Análisis por Evento */}
              {Object.keys(reporte.analisis_por_evento).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Análisis por Evento</CardTitle>
                    <CardDescription>
                      Comparación de rendimiento entre eventos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Datos Detallados */}
              {reporte.datos_detallados.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Datos Detallados</CardTitle>
                    <CardDescription>
                      Últimas {Math.min(10, reporte.datos_detallados.length)} ventas registradas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Estado de carga */}
          {loading && !reporte && (
            <Card>
              <CardContent className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Generando reporte...</p>
              </CardContent>
            </Card>
          )}

          {/* Estado vacío */}
          {!loading && !reporte && !error && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Genera un reporte para ver los datos</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}