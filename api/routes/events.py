from flask import Blueprint, request, jsonify
from api.models import db, Event

events_bp = Blueprint('events', __name__)

@events_bp.route('/events', methods=['GET'])
def list_events():
    """Listar todos los eventos disponibles"""
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
        
        return jsonify({
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
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@events_bp.route('/events/<string:event_id>', methods=['GET'])
def get_event(event_id):
    """Obtener un evento específico"""
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'event': event.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@events_bp.route('/events', methods=['POST'])
def create_event():
    """Crear un nuevo evento (solo admin)"""
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['id', 'title', 'artist', 'date', 'venue', 'location', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        # Verificar si el evento ya existe
        existing_event = Event.query.get(data['id'])
        if existing_event:
            return jsonify({'error': 'El evento ya existe'}), 409
        
        # Crear nuevo evento
        event = Event(
            id=data['id'],
            title=data['title'],
            artist=data['artist'],
            date=data['date'],
            time=data.get('time'),
            venue=data['venue'],
            location=data['location'],
            price=data['price'],
            image=data.get('image'),
            description=data.get('description'),
            category=data.get('category'),
            available_tickets=data.get('availableTickets', 0),
            total_tickets=data.get('totalTickets', data.get('availableTickets', 0)),
            is_active=data.get('isActive', True)
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
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@events_bp.route('/events/<string:event_id>', methods=['PUT'])
def update_event(event_id):
    """Actualizar un evento (solo admin)"""
    try:
        data = request.get_json()
        
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Actualizar campos permitidos
        updatable_fields = [
            'title', 'artist', 'date', 'time', 'venue', 'location', 
            'price', 'image', 'description', 'category', 'available_tickets', 
            'total_tickets', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                snake_case_field = field.replace('T', '_t').replace('A', '_a').lower()
                if hasattr(event, snake_case_field):
                    setattr(event, snake_case_field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Evento actualizado exitosamente',
            'event': event.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@events_bp.route('/events/<string:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Eliminar un evento (solo admin)"""
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Guardar información del evento antes de eliminarlo
        event_info = {
            'id': event.id,
            'title': event.title,
            'artist': event.artist
        }
        
        db.session.delete(event)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Evento "{event_info["title"]}" eliminado exitosamente',
            'deleted_event': event_info
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500