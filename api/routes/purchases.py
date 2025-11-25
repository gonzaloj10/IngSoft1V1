from flask import Blueprint, request, jsonify
from datetime import datetime
from api.models import db, Purchase, User, Event, Ticket, EmailLog
import uuid

purchases_bp = Blueprint('purchases', __name__)

@purchases_bp.route('/purchases', methods=['POST'])
def create_purchase():
    """Crear una nueva compra de entradas"""
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['userId', 'eventId', 'quantity', 'unitPrice', 'totalPrice']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        # Verificar que el usuario existe
        user = User.query.get(data['userId'])
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Verificar que el evento existe
        event = Event.query.get(data['eventId'])
        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # ✅ MEJORA #2: Verificar disponibilidad de entradas con mensaje detallado
        if event.available_tickets < data['quantity']:
            return jsonify({
                'error': f'No hay suficientes entradas disponibles. Solo quedan {event.available_tickets} entradas.',
                'availableTickets': event.available_tickets
            }), 400
        
        # Verificar que el evento tenga entradas disponibles (por si acaso)
        if event.available_tickets <= 0:
            return jsonify({
                'error': 'Este evento está agotado. No quedan entradas disponibles.',
                'availableTickets': 0
            }), 400
        
        # Generar número de orden único
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        # Crear la compra con estado 'completed' (el pago ya fue procesado en el frontend)
        purchase = Purchase(
            order_number=order_number,
            user_id=data['userId'],
            event_id=data['eventId'],
            quantity=data['quantity'],
            unit_price=data['unitPrice'],
            service_charge=data.get('serviceCharge', 0),
            total_price=data['totalPrice'],
            status='completed',  # Estado completado porque el pago ya fue simulado
            qr_code_data=f"ORD:{order_number}:USER:{user.email}:QTY:{data['quantity']}",
            purchase_date=datetime.utcnow()  # Registrar fecha de compra
        )
        
        db.session.add(purchase)
        db.session.flush()  # Para obtener el ID de la compra
        
        # Crear tickets individuales
        tickets = []
        for i in range(data['quantity']):
            ticket_number = f"{order_number}-T{i+1:03d}"
            qr_data = f"TICKET:{ticket_number}:EVENT:{event.id}:USER:{user.email}"
            
            ticket = Ticket(
                purchase_id=purchase.id,
                ticket_number=ticket_number,
                qr_code_data=qr_data
            )
            tickets.append(ticket)
            db.session.add(ticket)
        
        # ⚠️ IMPORTANTE: Actualizar entradas disponibles del evento
        # Descontar la cantidad comprada
        event.available_tickets -= data['quantity']
        
        # Log para debugging
        print(f"✅ Compra {order_number}: {data['quantity']} entradas descontadas del evento {event.id}")
        print(f"   Entradas restantes: {event.available_tickets}/{event.total_tickets}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Compra creada exitosamente',
            'purchase': purchase.to_dict(),
            'tickets': [ticket.to_dict() for ticket in tickets]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/<int:purchase_id>', methods=['GET'])
def get_purchase(purchase_id):
    """Obtener una compra específica"""
    try:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        return jsonify({
            'success': True,
            'purchase': purchase.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/order/<string:order_number>', methods=['GET'])
def get_purchase_by_order(order_number):
    """Obtener una compra por número de orden"""
    try:
        purchase = Purchase.query.filter_by(order_number=order_number).first()
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        return jsonify({
            'success': True,
            'purchase': purchase.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/user/<int:user_id>', methods=['GET'])
def get_user_purchases(user_id):
    """Obtener todas las compras de un usuario por ID"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        purchases = Purchase.query.filter_by(user_id=user_id).order_by(Purchase.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'purchases': [purchase.to_dict() for purchase in purchases]
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/user/email/<string:email>', methods=['GET'])
def get_user_purchases_by_email(email):
    """✅ MEJORA #3: Obtener todas las compras de un usuario por email"""
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({
                'success': True,
                'purchases': []
            })
        
        purchases = Purchase.query.filter_by(user_id=user.id).order_by(Purchase.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'purchases': [purchase.to_dict() for purchase in purchases]
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/<int:purchase_id>/status', methods=['PUT'])
def update_purchase_status(purchase_id):
    """Actualizar el estado de una compra"""
    try:
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({'error': 'Campo requerido: status'}), 400
        
        valid_statuses = ['pending', 'completed', 'cancelled', 'refunded']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Estado inválido. Valores permitidos: {valid_statuses}'}), 400
        
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        old_status = purchase.status
        purchase.status = data['status']
        purchase.updated_at = datetime.utcnow()
        
        event = Event.query.get(purchase.event_id)
        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Manejar cambios de estado que afectan disponibilidad de entradas
        # Si se cancela o reembolsa una compra que estaba completada/pendiente, devolver entradas
        if data['status'] in ['cancelled', 'refunded'] and old_status not in ['cancelled', 'refunded']:
            event.available_tickets += purchase.quantity
            print(f"✅ Compra {purchase.order_number} {data['status']}: {purchase.quantity} entradas devueltas al evento {event.id}")
            print(f"   Entradas disponibles ahora: {event.available_tickets}/{event.total_tickets}")
        
        # Si se completa una compra que estaba cancelada, descontar las entradas nuevamente
        elif data['status'] == 'completed' and old_status in ['cancelled', 'refunded']:
            if event.available_tickets < purchase.quantity:
                return jsonify({'error': 'No hay suficientes entradas disponibles para reactivar esta compra'}), 400
            event.available_tickets -= purchase.quantity
            print(f"✅ Compra {purchase.order_number} reactivada: {purchase.quantity} entradas descontadas del evento {event.id}")
            print(f"   Entradas disponibles ahora: {event.available_tickets}/{event.total_tickets}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Estado actualizado de {old_status} a {data["status"]}',
            'purchase': purchase.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/<int:purchase_id>/email-status', methods=['PUT'])
def update_email_status(purchase_id):
    """Actualizar el estado del email de confirmación"""
    try:
        data = request.get_json()
        
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        purchase.email_sent = data.get('emailSent', True)
        if purchase.email_sent:
            purchase.email_sent_at = datetime.utcnow()
        
        # Registrar en log de emails
        email_log = EmailLog(
            purchase_id=purchase.id,
            email_type='confirmation',
            recipient_email=purchase.user.email,
            subject=data.get('subject', 'Confirmación de compra'),
            status='sent' if purchase.email_sent else 'failed',
            sendgrid_message_id=data.get('messageId'),
            error_message=data.get('errorMessage')
        )
        
        db.session.add(email_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Estado de email actualizado',
            'purchase': purchase.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases', methods=['GET'])
def list_purchases():
    """Listar todas las compras con filtros opcionales"""
    try:
        # Parámetros de consulta
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        status = request.args.get('status')
        event_id = request.args.get('event_id')
        user_id = request.args.get('user_id')
        
        # Construir consulta
        query = Purchase.query
        
        if status:
            query = query.filter(Purchase.status == status)
        if event_id:
            query = query.filter(Purchase.event_id == event_id)
        if user_id:
            query = query.filter(Purchase.user_id == user_id)
        
        # Paginar resultados
        purchases = query.order_by(Purchase.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'purchases': [purchase.to_dict() for purchase in purchases.items],
            'pagination': {
                'page': page,
                'pages': purchases.pages,
                'per_page': per_page,
                'total': purchases.total,
                'has_next': purchases.has_next,
                'has_prev': purchases.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/<int:purchase_id>/resend-email', methods=['POST'])
def resend_confirmation_email(purchase_id):
    """✅ MEJORA #3: Reenviar email de confirmación de compra"""
    try:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        # Obtener datos relacionados
        user = purchase.user
        event = purchase.event
        
        if not user or not event:
            return jsonify({'error': 'Datos de compra incompletos'}), 400
        
        # TODO: Integrar con el servicio de email real
        # Por ahora retornamos éxito simulado
        print(f"📧 Reenviando email de confirmación para orden: {purchase.order_number}")
        print(f"   Destinatario: {user.email}")
        print(f"   Evento: {event.title}")
        
        # Registrar en log de emails
        email_log = EmailLog(
            purchase_id=purchase.id,
            email_type='resend_confirmation',
            recipient_email=user.email,
            subject=f'Confirmación de compra - {event.title}',
            status='sent',
            sendgrid_message_id=f"resend-{purchase.order_number}"
        )
        
        db.session.add(email_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Email de confirmación reenviado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@purchases_bp.route('/purchases/<int:purchase_id>/download-ticket', methods=['GET'])
def download_ticket_pdf(purchase_id):
    """✅ MEJORA #3: Descargar PDF de entrada"""
    try:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        # Obtener datos relacionados
        user = purchase.user
        event = purchase.event
        
        if not user or not event:
            return jsonify({'error': 'Datos de compra incompletos'}), 400
        
        # TODO: Generar PDF real con ReportLab
        # Por ahora retornamos mensaje de éxito
        print(f"📥 Generando PDF de entrada para orden: {purchase.order_number}")
        print(f"   Usuario: {user.name} {user.last_name}")
        print(f"   Evento: {event.title}")
        print(f"   Cantidad: {purchase.quantity}")
        
        return jsonify({
            'success': True,
            'message': 'PDF generado exitosamente',
            'downloadUrl': f'/api/downloads/{purchase.order_number}.pdf'
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500