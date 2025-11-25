from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api, Resource, reqparse
from flask_cors import CORS
from datetime import datetime, date, time
import io
# import pandas as pd  # Comentado temporalmente
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# Crear aplicación Flask
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///reportes_eventos.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar extensiones
db = SQLAlchemy(app)
CORS(app)
api = Api(app, doc='/docs/', title='Eventos Viña - Sistema de Reportes', 
          description='Reporte de ventas y registro histórico')

# MODELOS PARA LA HISTORIA DE USUARIO
class EventoReporte(db.Model):
    __tablename__ = "eventos_reporte"
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    fecha_evento = db.Column(db.DateTime, nullable=False)
    lugar = db.Column(db.String(200), nullable=False)

class EventoLog(db.Model):
    __tablename__ = "eventos_log"
    
    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    ubicacion = db.Column(db.String(200), nullable=False)
    tipo_operacion = db.Column(db.String(10), nullable=False)  # 'add' o 'delete'
    fecha_operacion = db.Column(db.DateTime, default=datetime.utcnow)

class SectorReporte(db.Model):
    __tablename__ = "sectores_reporte"
    
    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, db.ForeignKey('eventos_reporte.id'), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)  # VIP, Platea, General
    precio = db.Column(db.Float, nullable=False)
    
    evento = db.relationship('EventoReporte', backref='sectores')

class VentaReporte(db.Model):
    __tablename__ = "ventas_reporte"
    
    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, db.ForeignKey('eventos_reporte.id'), nullable=False)
    sector_id = db.Column(db.Integer, db.ForeignKey('sectores_reporte.id'), nullable=False)
    fecha_venta = db.Column(db.DateTime, default=datetime.utcnow)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    total = db.Column(db.Float, nullable=False)
    cliente_nombre = db.Column(db.String(100), nullable=False)
    cliente_rut = db.Column(db.String(20), nullable=False)
    metodo_pago = db.Column(db.String(50), nullable=False)
    
    evento = db.relationship('EventoReporte', backref='ventas')
    sector = db.relationship('SectorReporte', backref='ventas')

# Crear tablas
with app.app_context():
    db.create_all()

# Request parsers para validación de datos
add_evento_parser = reqparse.RequestParser()
add_evento_parser.add_argument('evento_id', type=int, required=True, help='ID del evento es requerido')
add_evento_parser.add_argument('nombre', type=str, required=True, help='Nombre del evento es requerido')
add_evento_parser.add_argument('fecha', type=str, required=True, help='Fecha del evento (YYYY-MM-DD) es requerida')
add_evento_parser.add_argument('hora', type=str, required=True, help='Hora del evento (HH:MM:SS) es requerida')
add_evento_parser.add_argument('ubicacion', type=str, required=True, help='Ubicación del evento es requerida')

delete_evento_parser = reqparse.RequestParser()
delete_evento_parser.add_argument('evento_id', type=int, required=True, help='ID del evento es requerido')
delete_evento_parser.add_argument('nombre', type=str, required=True, help='Nombre del evento es requerido')
delete_evento_parser.add_argument('fecha', type=str, required=True, help='Fecha del evento (YYYY-MM-DD) es requerida')
delete_evento_parser.add_argument('hora', type=str, required=True, help='Hora del evento (HH:MM:SS) es requerida')
delete_evento_parser.add_argument('ubicacion', type=str, required=True, help='Ubicación del evento es requerida')

# HISTORIA DE USUARIO PRINCIPAL
@api.route('/reportes/ventas')
class ReporteVentasResource(Resource):
    @api.doc(
        'generar_reporte_ventas',
        params={
            'evento_id': 'ID del evento (opcional)',
            'fecha_inicio': 'Fecha inicio YYYY-MM-DD (opcional)',
            'fecha_fin': 'Fecha fin YYYY-MM-DD (opcional)',
            'sector_id': 'ID del sector/categoría (opcional)',
            'formato': 'Formato de salida: json, pdf, excel (default: json)'
        }
    )
    def get(self):
        """
        Reporte de ventas filtrado por evento, fecha y categoría. Se puede descargar reportes via pdf/json/excel.
        """
        try:
            # Obtener parámetros de filtro
            evento_id = request.args.get("evento_id", type=int)
            fecha_inicio = request.args.get("fecha_inicio")
            fecha_fin = request.args.get("fecha_fin")
            sector_id = request.args.get("sector_id", type=int)
            formato = request.args.get("formato", "json").lower()
            
            # Construir query
            query = db.session.query(
                VentaReporte.id,
                VentaReporte.fecha_venta,
                VentaReporte.cantidad,
                VentaReporte.precio_unitario,
                VentaReporte.total,
                VentaReporte.cliente_nombre,
                VentaReporte.cliente_rut,
                VentaReporte.metodo_pago,
                EventoReporte.nombre.label('evento_nombre'),
                EventoReporte.fecha_evento,
                EventoReporte.lugar,
                SectorReporte.nombre.label('sector_nombre')
            ).join(EventoReporte, VentaReporte.evento_id == EventoReporte.id)\
             .join(SectorReporte, VentaReporte.sector_id == SectorReporte.id)
            
            # Aplicar filtros
            if evento_id:
                query = query.filter(VentaReporte.evento_id == evento_id)
            
            if fecha_inicio:
                try:
                    fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                    query = query.filter(VentaReporte.fecha_venta >= fecha_inicio_dt)
                except ValueError:
                    return {"error": "Formato de fecha_inicio inválido. Use YYYY-MM-DD"}, 400
            
            if fecha_fin:
                try:
                    fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                    query = query.filter(VentaReporte.fecha_venta <= fecha_fin_dt)
                except ValueError:
                    return {"error": "Formato de fecha_fin inválido. Use YYYY-MM-DD"}, 400
            
            if sector_id:
                query = query.filter(VentaReporte.sector_id == sector_id)
            
            # Ejecutar query
            resultados = query.all()
            
            # Procesar datos
            datos = []
            for r in resultados:
                datos.append({
                    'id': r.id,
                    'fecha_venta': r.fecha_venta.strftime('%Y-%m-%d %H:%M:%S'),
                    'cantidad': r.cantidad,
                    'precio_unitario': float(r.precio_unitario),
                    'total': float(r.total),
                    'cliente_nombre': r.cliente_nombre,
                    'cliente_rut': r.cliente_rut,
                    'metodo_pago': r.metodo_pago,
                    'evento_nombre': r.evento_nombre,
                    'fecha_evento': r.fecha_evento.strftime('%Y-%m-%d %H:%M:%S'),
                    'lugar': r.lugar,
                    'sector_nombre': r.sector_nombre
                })
            
            # Calcular estadísticas para decisiones estratégicas
            total_ventas = sum(d['total'] for d in datos)
            total_entradas = sum(d['cantidad'] for d in datos)
            
            # Análisis por sector (para decisiones estratégicas)
            analisis_sectores = {}
            for dato in datos:
                sector = dato['sector_nombre']
                if sector not in analisis_sectores:
                    analisis_sectores[sector] = {
                        'entradas_vendidas': 0,
                        'total_ventas': 0,
                        'precio_promedio': 0
                    }
                analisis_sectores[sector]['entradas_vendidas'] += dato['cantidad']
                analisis_sectores[sector]['total_ventas'] += dato['total']
            
            # Calcular precio promedio por sector
            for sector in analisis_sectores:
                if analisis_sectores[sector]['entradas_vendidas'] > 0:
                    analisis_sectores[sector]['precio_promedio'] = analisis_sectores[sector]['total_ventas'] / analisis_sectores[sector]['entradas_vendidas']
            
            # Análisis por evento
            analisis_eventos = {}
            for dato in datos:
                evento = dato['evento_nombre']
                if evento not in analisis_eventos:
                    analisis_eventos[evento] = {
                        'total_ventas': 0,
                        'total_entradas': 0
                    }
                analisis_eventos[evento]['total_ventas'] += dato['total']
                analisis_eventos[evento]['total_entradas'] += dato['cantidad']
            
            # Resumen ejecutivo para decisiones estratégicas
            resumen_ejecutivo = {
                'total_ventas': total_ventas,
                'total_entradas': total_entradas,
                'promedio_venta': total_ventas / len(datos) if len(datos) > 0 else 0,
                'sector_mas_vendido': max(analisis_sectores.items(), key=lambda x: x[1]['entradas_vendidas'])[0] if analisis_sectores else None,
                'sector_mayor_ingreso': max(analisis_sectores.items(), key=lambda x: x[1]['total_ventas'])[0] if analisis_sectores else None
            }
            
            # Respuesta según formato
            response_data = {
                'success': True,
                'resumen_ejecutivo': resumen_ejecutivo,
                'analisis_por_sector': analisis_sectores,
                'analisis_por_evento': analisis_eventos,
                'datos_detallados': datos,
                'filtros_aplicados': {
                    'evento_id': evento_id,
                    'fecha_inicio': fecha_inicio,
                    'fecha_fin': fecha_fin,
                    'sector_id': sector_id
                },
                'total_registros': len(datos)
            }
            
            if formato == "json":
                return response_data, 200
            elif formato == "pdf":
                return self._generar_pdf(response_data)
            elif formato == "excel":
                return self._generar_excel(response_data)
            else:
                return {"error": "Formato no válido. Use: json, pdf, excel"}, 400
                
        except Exception as e:
            return {"error": "Error generando reporte", "detalle": str(e)}, 500
    
    def _generar_pdf(self, data):
        """Generar PDF para decisiones estratégicas"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []
        
        # Título
        title = Paragraph("Reporte Estratégico de Ventas - Eventos Viña", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        # Resumen ejecutivo
        elements.append(Paragraph("RESUMEN EJECUTIVO", styles['Heading2']))
        resumen = data['resumen_ejecutivo']
        
        resumen_data = [
            ['Métrica', 'Valor'],
            ['Total Ventas', f"${resumen['total_ventas']:,.0f}"],
            ['Total Entradas', f"{resumen['total_entradas']:,}"],
            ['Promedio por Venta', f"${resumen['promedio_venta']:,.0f}"],
            ['Sector Más Vendido', resumen['sector_mas_vendido'] or 'N/A'],
            ['Sector Mayor Ingreso', resumen['sector_mayor_ingreso'] or 'N/A']
        ]
        
        resumen_table = Table(resumen_data)
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(resumen_table)
        elements.append(Spacer(1, 20))
        
        # Análisis por sector
        elements.append(Paragraph("ANÁLISIS POR SECTOR (CATEGORÍA)", styles['Heading2']))
        
        sector_data = [['Sector', 'Entradas', 'Ventas', 'Precio Promedio']]
        for sector, analisis in data['analisis_por_sector'].items():
            sector_data.append([
                sector,
                f"{analisis['entradas_vendidas']:,}",
                f"${analisis['total_ventas']:,.0f}",
                f"${analisis['precio_promedio']:,.0f}"
            ])
        
        sector_table = Table(sector_data)
        sector_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(sector_table)
        
        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'reporte_estrategico_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            mimetype='application/pdf'
        )
    
    def _generar_excel(self, data):
        """Generar Excel para análisis detallado"""
        # Funcionalidad de Excel temporalmente deshabilitada
        return jsonify({
            "error": "Funcionalidad de Excel temporalmente no disponible",
            "alternativa": "Use formato PDF o JSON"
        }), 503
        
        # CÓDIGO ORIGINAL COMENTADO:
        # buffer = io.BytesIO()
        # 
        # with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        #     # Hoja 1: Resumen Ejecutivo
        #     resumen_df = pd.DataFrame([data['resumen_ejecutivo']])
        #     resumen_df.to_excel(writer, sheet_name='Resumen Ejecutivo', index=False)
        #     
        #     # Hoja 2: Análisis por Sector
        #     sectores_data = []
        #     for sector, analisis in data['analisis_por_sector'].items():
        #         sectores_data.append({
        #             'Sector': sector,
        #             'Entradas_Vendidas': analisis['entradas_vendidas'],
        #             'Total_Ventas': analisis['total_ventas'],
        #             'Precio_Promedio': analisis['precio_promedio']
        #         })
        #     
        #     if sectores_data:
        #         sectores_df = pd.DataFrame(sectores_data)
        #         sectores_df.to_excel(writer, sheet_name='Análisis por Sector', index=False)
        #     
        #     # Hoja 3: Análisis por Evento
        #     eventos_data = []
        #     for evento, analisis in data['analisis_por_evento'].items():
        #         eventos_data.append({
        #             'Evento': evento,
        #             'Total_Ventas': analisis['total_ventas'],
        #             'Total_Entradas': analisis['total_entradas']
        #         })
        #     
        #     if eventos_data:
        #         eventos_df = pd.DataFrame(eventos_data)
        #         eventos_df.to_excel(writer, sheet_name='Análisis por Evento', index=False)
        #     
        #     # Hoja 4: Datos Detallados
        #     if data['datos_detallados']:
        #         detalle_df = pd.DataFrame(data['datos_detallados'])
        #         detalle_df.to_excel(writer, sheet_name='Datos Detallados', index=False)
        # 
        # buffer.seek(0)
        # 
        # return send_file(
        #     buffer,
        #     as_attachment=True,
        #     download_name=f'reporte_estrategico_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
        #     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        # )

# Endpoints auxiliares para gestión de datos
@api.route('/eventos')
class EventosResource(Resource):
    def get(self):
        """Listar eventos"""
        eventos = EventoReporte.query.all()
        return [{'id': e.id, 'nombre': e.nombre, 'fecha_evento': e.fecha_evento.isoformat(), 'lugar': e.lugar} for e in eventos], 200

@api.route('/sectores')
class SectoresResource(Resource):
    def get(self):
        """Listar sectores"""
        sectores = SectorReporte.query.all()
        return [{'id': s.id, 'evento_id': s.evento_id, 'nombre': s.nombre, 'precio': s.precio} for s in sectores], 200

@api.route('/ventas')
class VentasResource(Resource):
    def get(self):
        """Listar ventas"""
        ventas = VentaReporte.query.all()
        return [{'id': v.id, 'evento_id': v.evento_id, 'sector_id': v.sector_id, 'fecha_venta': v.fecha_venta.isoformat(), 'cantidad': v.cantidad, 'total': v.total} for v in ventas], 200

# Endpoints para logging de eventos
@api.route('/eventos/add')
class AddEventoResource(Resource):
    @api.doc(
        'agregar_evento',
        params={
            'evento_id': 'ID del evento (requerido)',
            'nombre': 'Nombre del evento (requerido)',
            'fecha': 'Fecha del evento formato YYYY-MM-DD (requerido)',
            'hora': 'Hora del evento formato HH:MM:SS (requerido)',
            'ubicacion': 'Ubicación del evento (requerido)'
        }
    )
    @api.expect(add_evento_parser)
    def post(self):
        """
        Agregar un evento al log del sistema
        """
        try:
            # Usar el parser para obtener y validar los datos
            args = add_evento_parser.parse_args()
            
            # Validar y convertir fecha
            try:
                fecha_evento = datetime.strptime(args['fecha'], '%Y-%m-%d').date()
            except ValueError:
                return {
                    'success': False,
                    'error': 'Formato de fecha inválido. Use YYYY-MM-DD'
                }, 400
            
            # Validar y convertir hora
            try:
                hora_evento = datetime.strptime(args['hora'], '%H:%M:%S').time()
            except ValueError:
                return {
                    'success': False,
                    'error': 'Formato de hora inválido. Use HH:MM:SS'
                }, 400
            
            # Combinar fecha y hora para crear datetime
            fecha_hora_evento = datetime.combine(fecha_evento, hora_evento)
            
            # Crear/actualizar evento en la tabla principal
            evento_existente = EventoReporte.query.filter_by(id=args['evento_id']).first()
            if not evento_existente:
                # Crear nuevo evento en la tabla principal
                nuevo_evento = EventoReporte(
                    id=args['evento_id'],
                    nombre=args['nombre'],
                    fecha_evento=fecha_hora_evento,
                    lugar=args['ubicacion']
                )
                db.session.add(nuevo_evento)
            
            # Crear log de la operación
            nuevo_evento_log = EventoLog(
                evento_id=args['evento_id'],
                nombre=args['nombre'],
                fecha=fecha_evento,
                hora=hora_evento,
                ubicacion=args['ubicacion'],
                tipo_operacion='add'
            )
            
            # Guardar en base de datos
            db.session.add(nuevo_evento_log)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Evento agregado exitosamente',
                'evento': {
                    'id': nuevo_evento_log.id,
                    'evento_id': nuevo_evento_log.evento_id,
                    'nombre': nuevo_evento_log.nombre,
                    'fecha': nuevo_evento_log.fecha.isoformat(),
                    'hora': nuevo_evento_log.hora.isoformat(),
                    'ubicacion': nuevo_evento_log.ubicacion,
                    'tipo_operacion': nuevo_evento_log.tipo_operacion,
                    'fecha_operacion': nuevo_evento_log.fecha_operacion.isoformat()
                }
            }, 201
            
        except Exception as e:
            db.session.rollback()
            return {
                'success': False,
                'error': 'Error interno del servidor',
                'detalle': str(e)
            }, 500

@api.route('/eventos/delete')
class DeleteEventoResource(Resource):
    @api.doc(
        'eliminar_evento',
        params={
            'evento_id': 'ID del evento a eliminar (requerido)',
            'nombre': 'Nombre del evento (requerido)',
            'fecha': 'Fecha del evento formato YYYY-MM-DD (requerido)',
            'hora': 'Hora del evento formato HH:MM:SS (requerido)',
            'ubicacion': 'Ubicación del evento (requerido)'
        }
    )
    @api.expect(delete_evento_parser)
    def delete(self):
        """
        Eliminar un evento del sistema y registrar en el log
        """
        try:
            # Usar el parser para obtener y validar los datos
            args = delete_evento_parser.parse_args()
            
            # Validar y convertir fecha
            try:
                fecha_evento = datetime.strptime(args['fecha'], '%Y-%m-%d').date()
            except ValueError:
                return {
                    'success': False,
                    'error': 'Formato de fecha inválido. Use YYYY-MM-DD'
                }, 400
            
            # Validar y convertir hora
            try:
                hora_evento = datetime.strptime(args['hora'], '%H:%M:%S').time()
            except ValueError:
                return {
                    'success': False,
                    'error': 'Formato de hora inválido. Use HH:MM:SS'
                }, 400
            
            # Eliminar evento de la tabla principal si existe
            evento_existente = EventoReporte.query.filter_by(id=args['evento_id']).first()
            if evento_existente:
                db.session.delete(evento_existente)
            
            # Crear log de eliminación
            evento_log_delete = EventoLog(
                evento_id=args['evento_id'],
                nombre=args['nombre'],
                fecha=fecha_evento,
                hora=hora_evento,
                ubicacion=args['ubicacion'],
                tipo_operacion='delete'
            )
            
            # Guardar en base de datos
            db.session.add(evento_log_delete)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Evento eliminado exitosamente',
                'evento': {
                    'id': evento_log_delete.id,
                    'evento_id': evento_log_delete.evento_id,
                    'nombre': evento_log_delete.nombre,
                    'fecha': evento_log_delete.fecha.isoformat(),
                    'hora': evento_log_delete.hora.isoformat(),
                    'ubicacion': evento_log_delete.ubicacion,
                    'tipo_operacion': evento_log_delete.tipo_operacion,
                    'fecha_operacion': evento_log_delete.fecha_operacion.isoformat()
                }
            }, 200
            
        except Exception as e:
            db.session.rollback()
            return {
                'success': False,
                'error': 'Error interno del servidor',
                'detalle': str(e)
            }, 500

@api.route('/eventos/logs')
class EventosLogsResource(Resource):
    @api.doc(
        'listar_logs_eventos',
        params={
            'tipo_operacion': 'Filtrar por tipo de operación: add, delete (opcional)',
            'evento_id': 'Filtrar por ID de evento (opcional)'
        }
    )
    def get(self):
        """
        Listar todos los logs de eventos con filtros opcionales
        """
        try:
            tipo_operacion = request.args.get('tipo_operacion')
            evento_id = request.args.get('evento_id', type=int)
            
            query = EventoLog.query
            
            if tipo_operacion:
                if tipo_operacion not in ['add', 'delete']:
                    return {
                        'success': False,
                        'error': 'tipo_operacion debe ser "add" o "delete"'
                    }, 400
                query = query.filter(EventoLog.tipo_operacion == tipo_operacion)
            
            if evento_id:
                query = query.filter(EventoLog.evento_id == evento_id)
            
            logs = query.order_by(EventoLog.fecha_operacion.desc()).all()
            
            logs_data = []
            for log in logs:
                logs_data.append({
                    'id': log.id,
                    'evento_id': log.evento_id,
                    'nombre': log.nombre,
                    'fecha': log.fecha.isoformat(),
                    'hora': log.hora.isoformat(),
                    'ubicacion': log.ubicacion,
                    'tipo_operacion': log.tipo_operacion,
                    'fecha_operacion': log.fecha_operacion.isoformat()
                })
            
            return {
                'success': True,
                'logs': logs_data,
                'total': len(logs_data)
            }, 200
            
        except Exception as e:
            return {
                'success': False,
                'error': 'Error interno del servidor',
                'detalle': str(e)
            }, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)