import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api, Resource, fields
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def create_app():
    """Factory function para crear la aplicación Flask"""
    app = Flask(__name__)
    
    # Configuración de la base de datos
    database_url = os.getenv('DATABASE_URL', 'sqlite:///entradas.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Configuración de CORS
    CORS(app, origins=['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'])
    
    # Configurar Flask-RESTX para Swagger UI
    api = Api(
        app,
        version='1.0',
        title='API de Eventos',
        description='API para gestión de eventos, usuarios y compras de entradas',
        doc='/docs/',
        prefix='/api/v1'
    )
    
    # Inicializar extensiones
    from api.models import db
    db.init_app(app)
    
    # Definir modelos para Swagger
    event_model = api.model('Event', {
        'id': fields.String(required=True, description='ID único del evento', example='8'),
        'title': fields.String(required=True, description='Título del evento', example='Concierto de Rock'),
        'artist': fields.String(required=True, description='Artista o banda', example='Banda de Rock'),
        'date': fields.String(required=True, description='Fecha del evento', example='2024-04-15'),
        'time': fields.String(description='Hora del evento', example='20:00'),
        'venue': fields.String(required=True, description='Lugar del evento', example='Estadio Nacional'),
        'location': fields.String(required=True, description='Ciudad/región', example='Santiago, Chile'),
        'price': fields.Float(required=True, description='Precio de entrada', example=35000.0),
        'image': fields.String(description='URL de la imagen', example='https://images.unsplash.com/photo-1543147012-c049aefea8a0'),
        'description': fields.String(description='Descripción del evento', example='Un gran concierto de rock'),
        'category': fields.String(description='Categoría del evento', example='Rock'),
        'availableTickets': fields.Integer(description='Entradas disponibles', example=200),
        'totalTickets': fields.Integer(description='Total de entradas', example=200),
        'isActive': fields.Boolean(description='Estado del evento', example=True)
    })
    
    # Namespace para eventos
    events_ns = api.namespace('events', description='Operaciones de eventos')
    
    @events_ns.route('/')
    class EventsList(Resource):
        @events_ns.doc('list_events')
        @events_ns.param('category', 'Filtrar por categoría')
        @events_ns.param('active', 'Filtrar por estado (true/false)', default='true')
        @events_ns.param('page', 'Número de página', type='integer', default=1)
        @events_ns.param('per_page', 'Eventos por página', type='integer', default=50)
        def get(self):
            """Obtener lista de eventos"""
            from flask import request
            from api.models import Event
            
            try:
                page = request.args.get('page', 1, type=int)
                per_page = min(request.args.get('per_page', 50, type=int), 100)
                category = request.args.get('category')
                active_only = request.args.get('active', 'true').lower() == 'true'
                
                # Construir consulta
                query = Event.query
                
                if active_only:
                    query = query.filter(Event.is_active == True)
                if category:
                    query = query.filter(Event.category.ilike(f'%{category}%'))
                
                # Paginar resultados
                events = query.order_by(Event.created_at.desc()).paginate(
                    page=page, per_page=per_page, error_out=False
                )
                
                return {
                    'success': True,
                    'events': [event.to_dict() for event in events.items],
                    'pagination': {
                        'page': page,
                        'pages': events.pages,
                        'per_page': per_page,
                        'total': events.total,
                        'has_next': events.has_next,
                        'has_prev': events.has_prev
                    }
                }
                
            except Exception as e:
                return {'success': False, 'error': f'Error interno del servidor: {str(e)}'}, 500
        
        @events_ns.doc('create_event')
        @events_ns.expect(event_model, validate=False)  # Cambiar a False para evitar validación estricta
        @events_ns.response(201, 'Evento creado exitosamente')
        @events_ns.response(400, 'Datos inválidos')
        @events_ns.response(409, 'Evento ya existe')
        def post(self):
            """Crear un nuevo evento"""
            from flask import request
            from api.models import Event, db
            
            try:
                data = request.get_json()
                
                # Validar campos requeridos
                required_fields = ['id', 'title', 'artist', 'date', 'venue', 'location', 'price']
                missing_fields = [field for field in required_fields if field not in data or not data[field]]
                
                if missing_fields:
                    return {
                        'success': False, 
                        'error': f'Campos requeridos faltantes: {", ".join(missing_fields)}'
                    }, 400
                
                # Verificar si el evento ya existe
                existing_event = Event.query.get(data['id'])
                if existing_event:
                    return {'success': False, 'error': 'El evento ya existe'}, 409
                
                # Crear nuevo evento con valores por defecto
                event = Event(
                    id=str(data['id']),
                    title=data['title'],
                    artist=data['artist'],
                    date=data['date'],
                    time=data.get('time', ''),
                    venue=data['venue'],
                    location=data['location'],
                    price=float(data['price']),
                    image=data.get('image', 'https://images.unsplash.com/photo-1543147012-c049aefea8a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NTk1MjczMDV8MA&ixlib=rb-4.1.0&q=80&w=1080'),
                    description=data.get('description', ''),
                    category=data.get('category', 'General'),
                    available_tickets=int(data.get('availableTickets', 100)),
                    total_tickets=int(data.get('totalTickets', data.get('availableTickets', 100))),
                    is_active=bool(data.get('isActive', True))
                )
                
                db.session.add(event)
                db.session.commit()
                
                return {
                    'success': True,
                    'message': 'Evento creado exitosamente',
                    'event': event.to_dict()
                }, 201
                
            except ValueError as e:
                return {'success': False, 'error': f'Error en el formato de datos: {str(e)}'}, 400
            except Exception as e:
                db.session.rollback()
                return {'success': False, 'error': f'Error interno del servidor: {str(e)}'}, 500
    
    @events_ns.route('/<string:event_id>')
    @events_ns.param('event_id', 'ID del evento')
    class EventsDetail(Resource):
        @events_ns.doc('get_event')
        def get(self, event_id):
            """Obtener un evento específico"""
            from api.models import Event
            
            try:
                event = Event.query.get(event_id)
                if not event:
                    return {'success': False, 'error': 'Evento no encontrado'}, 404
                
                return {
                    'success': True,
                    'event': event.to_dict()
                }
                
            except Exception as e:
                return {'success': False, 'error': f'Error interno del servidor: {str(e)}'}, 500
        
        @events_ns.doc('delete_event')
        @events_ns.response(200, 'Evento eliminado exitosamente')
        @events_ns.response(404, 'Evento no encontrado')
        @events_ns.response(500, 'Error interno del servidor')
        def delete(self, event_id):
            """Eliminar un evento específico"""
            from api.models import Event, db
            
            try:
                event = Event.query.get(event_id)
                if not event:
                    return {'success': False, 'error': 'Evento no encontrado'}, 404
                
                # Guardar información del evento antes de eliminarlo
                event_info = {
                    'id': event.id,
                    'title': event.title,
                    'artist': event.artist
                }
                
                db.session.delete(event)
                db.session.commit()
                
                return {
                    'success': True,
                    'message': f'Evento "{event_info["title"]}" eliminado exitosamente',
                    'deleted_event': event_info
                }
                
            except Exception as e:
                db.session.rollback()
                return {'success': False, 'error': f'Error interno del servidor: {str(e)}'}, 500
    
    # Registrar blueprints originales (mantener compatibilidad)
    from api.routes.users import users_bp
    from api.routes.events import events_bp
    from api.routes.reports import reports_bp
    from api.routes.purchases import purchases_bp
    from api.routes.tickets import tickets_bp
    from api.routes.email import email_bp  # ✅ MEJORA #3: Blueprint de emails
    
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(events_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/api')
    app.register_blueprint(purchases_bp, url_prefix='/api')
    app.register_blueprint(tickets_bp, url_prefix='/api')
    app.register_blueprint(email_bp, url_prefix='/api')  # ✅ MEJORA #3: Registrar blueprint de emails
    
    # Ruta simple para crear eventos (alternativa a Swagger)
    @app.route('/api/test/event', methods=['POST'])
    def create_event_simple():
        """Ruta simple para crear eventos - para testing"""
        from flask import request
        from api.models import Event, db
        
        try:
            data = request.get_json() or {}
            
            # Datos de ejemplo si no se proporcionan
            if not data:
                data = {
                    'id': '999',
                    'title': 'Evento de Prueba',
                    'artist': 'Artista de Prueba',
                    'date': '2024-06-01',
                    'time': '20:00',
                    'venue': 'Venue de Prueba',
                    'location': 'Santiago, Chile',
                    'price': 25000,
                    'description': 'Este es un evento de prueba',
                    'category': 'Prueba',
                    'availableTickets': 50,
                    'totalTickets': 50,
                    'isActive': True
                }
            
            # Verificar si el evento ya existe
            existing_event = Event.query.get(data['id'])
            if existing_event:
                return jsonify({'success': False, 'error': 'El evento ya existe'}), 409
            
            # Crear nuevo evento
            event = Event(
                id=str(data['id']),
                title=data['title'],
                artist=data['artist'],
                date=data['date'],
                time=data.get('time', ''),
                venue=data['venue'],
                location=data['location'],
                price=float(data['price']),
                image=data.get('image', 'https://images.unsplash.com/photo-1543147012-c049aefea8a0'),
                description=data.get('description', ''),
                category=data.get('category', 'General'),
                available_tickets=int(data.get('availableTickets', 100)),
                total_tickets=int(data.get('totalTickets', data.get('availableTickets', 100))),
                is_active=bool(data.get('isActive', True))
            )
            
            db.session.add(event)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Evento creado exitosamente',
                'event': event.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': f'Error: {str(e)}'}), 500
    
    # Ruta de debug para verificar que la API está funcionando
    @app.route('/')
    def health_check():
        return jsonify({
            'status': 'OK',
            'message': 'API de eventos funcionando correctamente',
            'swagger_ui': 'http://localhost:5001/docs/',
            'endpoints': {
                'events_swagger': 'http://localhost:5001/api/v1/events/',
                'events_original': 'http://localhost:5001/api/events',
                'users': 'http://localhost:5001/api/users',
                'purchases': 'http://localhost:5001/api/purchases',
                'tickets': 'http://localhost:5001/api/tickets'
            }
        })
    
    # Crear tablas si no existen
    with app.app_context():
        db.create_all()
        
        # Poblar con datos iniciales si la base está vacía
        from api.utils.seed_data import seed_initial_data
        seed_initial_data()
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Flask API con SQLAlchemy iniciando en puerto {port}")
    print(f"Base de datos: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)