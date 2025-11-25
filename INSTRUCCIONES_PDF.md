# 🔄 Instrucciones para Reiniciar la API y Probar el PDF

## ⚠️ Problema Identificado

El endpoint de reportes estaba generando archivos de texto simple con mimetype de PDF/Excel, pero **no eran archivos reales**. Esto causaba que:
- El navegador descargara el archivo
- Al intentar abrirlo, mostraba error porque no era un PDF/Excel válido

## ✅ Solución Implementada

He actualizado `api/routes/reports.py` para generar **PDFs y Excel REALES** usando:
- **reportlab**: Para generar PDFs profesionales con tablas y formato
- **openpyxl**: Para generar archivos Excel con múltiples hojas y estilos

### Características del PDF generado:
- ✅ Título profesional con formato
- ✅ Resumen ejecutivo en tabla formateada
- ✅ Análisis por sector con colores
- ✅ Análisis por evento
- ✅ Datos detallados
- ✅ Fecha de generación

### Características del Excel generado:
- ✅ 3 hojas: "Resumen Ejecutivo", "Análisis por Sector", "Datos Detallados"
- ✅ Headers con color azul y texto blanco
- ✅ Bordes en todas las celdas
- ✅ Anchos de columna ajustados
- ✅ Formateo de moneda chilena

## 🔄 Cómo Reiniciar la API

### Paso 1: Detener la API actual

En la terminal donde está corriendo `python -m api.app`, presiona:
```
Ctrl + C
```

### Paso 2: Reiniciar la API

```powershell
# Si no tienes el venv activado
.\venv\Scripts\Activate.ps1

# Reiniciar la API
python -m api.app
```

Deberías ver:
```
Flask API con SQLAlchemy iniciando en puerto 5001
Base de datos: sqlite:///entradas.db
Debug mode: False
 * Running on http://127.0.0.1:5001
```

## 🧪 Probar la Generación de Archivos

### Opción 1: Desde el Frontend

1. Ve a la sección **Reportes** en el navegador
2. Haz clic en **"Descargar PDF"**
3. El archivo se descargará automáticamente
4. Abre el PDF - debería verse profesional con tablas y formato

### Opción 2: Script de Prueba (Standalone)

```powershell
python test_pdf_generation.py
```

Esto generará:
- `test_reporte.pdf` - PDF de prueba con datos de ejemplo
- `test_reporte.xlsx` - Excel de prueba con datos de ejemplo

Abre estos archivos para verificar que se ven correctamente.

### Opción 3: Desde PowerShell (API en vivo)

```powershell
# Descargar PDF
Invoke-WebRequest -Uri "http://localhost:5001/api/reportes/ventas?formato=pdf" -OutFile "reporte_test.pdf"

# Descargar Excel
Invoke-WebRequest -Uri "http://localhost:5001/api/reportes/ventas?formato=excel" -OutFile "reporte_test.xlsx"
```

## 📊 Verificar que hay datos para reportar

Antes de generar reportes, asegúrate de tener compras en la base de datos:

```powershell
python verificar_compras.py
```

Si no hay compras:
1. Ve al frontend y haz una compra de prueba
2. Verifica que se guardó con `python verificar_compras.py`
3. Luego genera el reporte

## ❓ Si el PDF sigue dando error

### Verificar que las librerías están instaladas:

```powershell
pip list | Select-String -Pattern "reportlab|openpyxl"
```

Deberías ver:
```
openpyxl         3.1.2
reportlab        4.0.4
```

Si no están instaladas:

```powershell
pip install reportlab openpyxl
```

### Verificar errores en la API:

Cuando descargas un PDF desde el frontend, mira la terminal de la API. Si hay errores, los verás ahí.

Ejemplo de salida exitosa:
```
127.0.0.1 - - [26/Oct/2025 01:35:37] "GET /api/reportes/ventas?formato=pdf&... HTTP/1.1" 200
```

Ejemplo de error:
```
127.0.0.1 - - [26/Oct/2025 01:35:37] "GET /api/reportes/ventas?formato=pdf&... HTTP/1.1" 500
[Mensaje de error aquí]
```

## 📝 Contenido del PDF generado

El PDF incluye:

1. **Portada**
   - Título: "Reporte de Ventas"
   - Fecha y hora de generación

2. **Resumen Ejecutivo**
   - Total de ventas (CLP)
   - Total de entradas vendidas
   - Promedio por venta
   - Sector más vendido
   - Sector de mayor ingreso

3. **Análisis por Sector**
   - Tabla con todos los sectores
   - Entradas vendidas por sector
   - Ventas totales por sector
   - Precio promedio por sector

4. **Análisis por Evento**
   - Tabla con todos los eventos
   - Entradas vendidas por evento
   - Ventas totales por evento

## 📝 Contenido del Excel generado

El Excel tiene 3 hojas:

1. **Resumen Ejecutivo**
   - Métricas clave en formato tabla

2. **Análisis por Sector**
   - Desglose completo por sector

3. **Datos Detallados**
   - Hasta 100 registros de ventas individuales
   - Incluye: fecha, evento, cliente, sector, cantidad, precio, total

## 🎯 Resultado Esperado

Después de reiniciar la API:

1. ✅ Los PDFs se descargan correctamente
2. ✅ Los PDFs se abren sin errores
3. ✅ Los PDFs tienen formato profesional con tablas
4. ✅ Los Excel se descargan correctamente
5. ✅ Los Excel tienen 3 hojas con datos formateados
6. ✅ No hay errores en la consola del navegador
7. ✅ No hay errores en la terminal de la API

## 🐛 Troubleshooting

### Error: "Module not found: reportlab"
```powershell
pip install reportlab
```

### Error: "Module not found: openpyxl"
```powershell
pip install openpyxl
```

### El PDF se descarga pero está vacío
- Verifica que hay compras en la BD con `python verificar_compras.py`
- Mira los logs de la API para ver errores

### El archivo se descarga con nombre genérico
- Normal. El nombre del archivo es generado por la API
- Formato: `reporte_ventas_YYYYMMDDTHHMMSSZ.pdf`

---

**¡Reinicia la API y prueba de nuevo!** 🚀
