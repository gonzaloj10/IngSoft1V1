from flask import Blueprint, request, jsonify
from api.models import db, Ticket, Purchase

tickets_bp = Blueprint('tickets', __name__)

@tickets_bp.route('/tickets/<string:ticket_number>', methods=['GET'])
def get_ticket(ticket_number):
    """Obtener información de un ticket específico"""
    try:
        ticket = Ticket.query.filter_by(ticket_number=ticket_number).first()
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@tickets_bp.route('/tickets/<string:ticket_number>/validate', methods=['POST'])
def validate_ticket(ticket_number):
    """Validar y marcar un ticket como usado"""
    try:
        ticket = Ticket.query.filter_by(ticket_number=ticket_number).first()
        if not ticket:
            return jsonify({'error': 'Ticket no encontrado'}), 404
        
        if ticket.is_used:
            return jsonify({
                'error': 'Ticket ya ha sido utilizado',
                'used_at': ticket.used_at.isoformat() if ticket.used_at else None
            }), 400
        
        # Marcar ticket como usado
        from datetime import datetime
        ticket.is_used = True
        ticket.used_at = datetime.utcnow()
        ticket.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Ticket validado exitosamente',
            'ticket': ticket.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@tickets_bp.route('/tickets/purchase/<int:purchase_id>', methods=['GET'])
def get_purchase_tickets(purchase_id):
    """Obtener todos los tickets de una compra"""
    try:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        tickets = Ticket.query.filter_by(purchase_id=purchase_id).all()
        
        return jsonify({
            'success': True,
            'tickets': [ticket.to_dict() for ticket in tickets],
            'purchase': purchase.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@tickets_bp.route('/tickets/qr/<path:qr_data>', methods=['GET'])
def validate_qr_code(qr_data):
    """Validar un código QR y obtener información del ticket"""
    try:
        ticket = Ticket.query.filter_by(qr_code_data=qr_data).first()
        if not ticket:
            return jsonify({'error': 'Código QR inválido'}), 404
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict(),
            'valid': not ticket.is_used,
            'message': 'Código QR válido' if not ticket.is_used else 'Ticket ya utilizado'
        })
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500