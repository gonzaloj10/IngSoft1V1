from flask import Blueprint, request, jsonify
from datetime import datetime
from api.models import db, Purchase, User, Event, Ticket, EmailLog
import uuid
import requests  # ✅ Para enviar emails a través del servidor Node.js
import pytz  # Para zona horaria de Chile

# Definir zona horaria de Chile
chile_tz = pytz.timezone('America/Santiago')

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
        
        # Verificar disponibilidad de entradas
        if event.available_tickets < data['quantity']:
            return jsonify({'error': 'No hay suficientes entradas disponibles'}), 400
        
        # Generar número de orden único con hora de Chile
        now_chile = datetime.now(chile_tz)
        order_number = f"ORD-{now_chile.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
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
            purchase_date=now_chile  # Registrar fecha de compra en hora de Chile
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
    """Obtener todas las compras de un usuario"""
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

# ✅ MEJORA #3: Endpoint para obtener compras por email del usuario
@purchases_bp.route('/purchases/user/email/<email>', methods=['GET'])
def get_purchases_by_email(email):
    """Obtener todas las compras de un usuario por su email"""
    try:
        # Buscar usuario por email
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify([]), 200  # Retornar array vacío si no existe el usuario
        
        # Obtener todas las compras del usuario con información del evento
        purchases = Purchase.query.filter_by(user_id=user.id).order_by(Purchase.purchase_date.desc()).all()
        
        result = []
        for purchase in purchases:
            event = Event.query.get(purchase.event_id)
            result.append({
                'id': purchase.id,
                'event_name': event.title if event else 'Evento no encontrado',
                'event_date': event.date if event else '',
                'event_location': f"{event.venue}, {event.location}" if event else '',
                'quantity': purchase.quantity,
                'total_amount': purchase.total_price,
                'purchase_date': purchase.purchase_date.isoformat() if purchase.purchase_date else ''
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

# ✅ MEJORA #3: Endpoint para reenviar email de confirmación
@purchases_bp.route('/purchases/<int:purchase_id>/resend-email', methods=['POST'])
def resend_purchase_email(purchase_id):
    """Reenviar email de confirmación de compra"""
    try:
        import requests
        
        # Buscar la compra
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        # Obtener información del usuario y evento
        user = User.query.get(purchase.user_id)
        event = Event.query.get(purchase.event_id)
        
        if not user or not event:
            return jsonify({'error': 'Usuario o evento no encontrado'}), 404
        
        # Calcular totales y formatear fecha
        unit_price = int(purchase.unit_price)
        service_charge = 500
        total_price = int(purchase.total_price)
        purchase_date_formatted = purchase.purchase_date.strftime('%d de %B de %Y, %H:%M a. m.') if purchase.purchase_date else 'N/A'
        
        # Preparar datos para el email usando el mismo template HTML que la compra original
        email_html = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Compra - Eventos Viña</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f8fafc; padding: 20px; }}
        .email-container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px 20px; }}
        .logo {{ font-size: 28px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.5px; }}
        .header h1 {{ font-size: 24px; font-weight: 600; margin-top: 10px; }}
        .content {{ padding: 30px; }}
        .greeting {{ font-size: 16px; margin-bottom: 20px; color: #4a5568; }}
        .thank-you {{ font-size: 16px; margin-bottom: 30px; color: #4a5568; line-height: 1.6; }}
        .event-card {{ background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; margin: 25px 0; }}
        .event-title {{ font-size: 22px; font-weight: 700; color: #2d3748; margin-bottom: 20px; text-align: center; }}
        .event-details {{ display: grid; gap: 12px; }}
        .detail-row {{ display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }}
        .detail-row:last-child {{ border-bottom: none; }}
        .detail-label {{ font-weight: 600; color: #4a5568; min-width: 140px; }}
        .detail-value {{ color: #2d3748; text-align: right; flex: 1; }}
        .order-number-section {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; font-size: 18px; font-weight: 700; }}
        .purchase-summary {{ background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; margin: 25px 0; }}
        .summary-title {{ font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 20px; }}
        .summary-row {{ display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }}
        .summary-row:last-child {{ border-bottom: 2px solid #667eea; font-weight: 700; font-size: 16px; color: #2d3748; margin-top: 10px; padding-top: 15px; }}
        .instructions {{ background-color: #fef5e7; border: 1px solid #f6e05e; border-radius: 10px; padding: 20px; margin: 25px 0; }}
        .instructions h4 {{ color: #744210; font-size: 16px; margin-bottom: 15px; }}
        .instructions ul {{ list-style: none; padding-left: 0; }}
        .instructions li {{ color: #744210; margin-bottom: 8px; padding-left: 20px; position: relative; }}
        .instructions li:before {{ content: "•"; color: #d69e2e; font-weight: bold; position: absolute; left: 0; }}
        .footer {{ background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }}
        .footer p {{ color: #718096; margin-bottom: 10px; }}
        .contact-info {{ color: #4299e1; text-decoration: none; }}
        .team-name {{ color: #2d3748; font-weight: 600; }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">Eventos Viña</div>
            <h1>¡Confirmación de Compra!</h1>
        </div>
        <div class="content">
            <p class="greeting">Hola {user.name},</p>
            <p class="thank-you">¡Gracias por tu compra! Hemos recibido tu pago y confirmamos tu entrada para el siguiente evento:</p>
            <div class="event-card">
                <h2 class="event-title">{event.title}</h2>
                <div class="event-details">
                    <div class="detail-row">
                        <span class="detail-label">🎤 Artista:</span>
                        <span class="detail-value">{event.artist}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📅 Fecha:</span>
                        <span class="detail-value">{event.date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🕐 Hora:</span>
                        <span class="detail-value">{event.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📍 Lugar:</span>
                        <span class="detail-value">{event.venue}, {event.location}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🎫 Cantidad de entradas:</span>
                        <span class="detail-value">{purchase.quantity}</span>
                    </div>
                </div>
            </div>
            <div class="order-number-section">
                Número de Orden: {purchase.order_number}
            </div>
            <div class="purchase-summary">
                <h3 class="summary-title">Resumen de la compra:</h3>
                <div class="summary-row">
                    <span>Entradas ({purchase.quantity}):</span>
                    <span>${unit_price:,} CLP</span>
                </div>
                <div class="summary-row">
                    <span>Cargo por servicio:</span>
                    <span>$500 CLP</span>
                </div>
                <div class="summary-row">
                    <span><strong>Total:</strong></span>
                    <span><strong>${total_price:,} CLP</strong></span>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
                    Fecha de compra: {purchase_date_formatted}
                </div>
            </div>
            <div class="instructions">
                <h4>Instrucciones importantes:</h4>
                <ul>
                    <li>Presenta tu entrada digital o impresa para validar tu entrada</li>
                    <li>Llega con al menos 30 minutos de anticipación</li>
                    <li>Recuerda traer un documento de identidad válido</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>Si tienes alguna pregunta, contáctanos a <a href="mailto:soporte@eventosviña.cl" class="contact-info">soporte@eventosviña.cl</a></p>
            <p>© 2024 <span class="team-name">Eventos Viña</span>. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Generar PDF para adjuntar al email
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas as pdf_canvas
        from reportlab.lib.units import inch
        from reportlab.pdfgen.canvas import Canvas
        from reportlab.lib.utils import ImageReader
        import qrcode
        from io import BytesIO as IO
        
        # Crear PDF en memoria
        pdf_buffer = IO()
        p = pdf_canvas.Canvas(pdf_buffer, pagesize=letter)
        width, height = letter
        
        # Encabezado con color
        p.setFillColorRGB(0.388, 0.4, 0.945)
        p.rect(0, height - 80, width, 80, fill=True, stroke=False)
        
        p.setFillColorRGB(1, 1, 1)
        p.setFont("Helvetica-Bold", 24)
        p.drawCentredString(width / 2, height - 40, "EVENTOS VIÑA")
        p.setFont("Helvetica", 14)
        p.drawCentredString(width / 2, height - 60, "ENTRADA DIGITAL")
        
        # Información del evento
        y = height - 120
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Bold", 16)
        p.drawCentredString(width / 2, y, event.title)
        
        y -= 40
        p.setFont("Helvetica", 12)
        p.drawString(72, y, f"Artista: {event.artist}")
        y -= 20
        p.drawString(72, y, f"Fecha: {event.date}")
        y -= 20
        p.drawString(72, y, f"Hora: {event.time}")
        y -= 20
        p.drawString(72, y, f"Lugar: {event.venue}")
        y -= 20
        p.drawString(72, y, f"       {event.location}")
        
        # Datos del comprador
        y -= 40
        p.setFont("Helvetica-Bold", 12)
        p.drawString(72, y, "DATOS DEL COMPRADOR")
        y -= 20
        p.setFont("Helvetica", 11)
        p.drawString(72, y, f"Nombre: {user.name} {getattr(user, 'last_name', '')}")
        y -= 20
        p.drawString(72, y, f"Email: {user.email}")
        y -= 20
        p.drawString(72, y, f"Cantidad de entradas: {purchase.quantity}")
        
        # Número de orden
        y -= 40
        p.setFillColorRGB(0.388, 0.4, 0.945)
        p.rect(72, y - 25, width - 144, 35, fill=True, stroke=False)
        p.setFillColorRGB(1, 1, 1)
        p.setFont("Helvetica-Bold", 12)
        p.drawCentredString(width / 2, y - 10, f"NÚMERO DE ORDEN: {purchase.order_number}")
        
        # Resumen de compra
        y -= 60
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Bold", 12)
        p.drawString(72, y, "RESUMEN DE COMPRA")
        y -= 25
        p.setFont("Helvetica", 11)
        p.drawString(72, y, f"Entradas ({purchase.quantity}): ${unit_price:,} CLP")
        p.drawString(width - 200, y, "")
        y -= 20
        p.drawString(72, y, f"Cargo por servicio: $500 CLP")
        y -= 20
        p.setFont("Helvetica-Bold", 11)
        p.drawString(72, y, f"Total: ${total_price:,} CLP")
        y -= 25
        p.setFont("Helvetica", 9)
        p.drawString(72, y, f"Fecha de compra: {purchase_date_formatted}")
        
        # Generar código QR
        qr_data = f"ORDER:{purchase.order_number}|EVENT:{event.id}|USER:{user.id}|QTY:{purchase.quantity}"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = IO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        # Agregar QR al PDF
        qr_image = ImageReader(qr_buffer)
        qr_size = 150
        p.drawImage(qr_image, width - qr_size - 72, y - qr_size - 20, qr_size, qr_size)
        
        # Texto junto al QR
        p.setFont("Helvetica", 9)
        p.drawString(72, y - 80, "Presenta este código QR")
        p.drawString(72, y - 95, "en la entrada del evento")
        
        # Instrucciones
        y = y - qr_size - 40
        p.setFont("Helvetica-Bold", 11)
        p.drawString(72, y, "INSTRUCCIONES IMPORTANTES")
        y -= 20
        p.setFont("Helvetica", 9)
        p.drawString(72, y, "• Presenta este documento en el evento para validar tu entrada")
        y -= 15
        p.drawString(72, y, "• Llega con al menos 30 minutos de anticipación")
        y -= 15
        p.drawString(72, y, "• Recuerda traer un documento de identidad válido")
        
        # Footer
        p.setFont("Helvetica", 8)
        p.drawCentredString(width / 2, 40, "Generado por EventosViña - www.eventosviña.cl")
        
        p.showPage()
        p.save()
        
        # Convertir PDF a base64
        pdf_buffer.seek(0)
        import base64
        pdf_base64 = base64.b64encode(pdf_buffer.read()).decode('utf-8')
        
        email_data = {
            'toEmail': user.email,
            'toName': f"{user.name} {getattr(user, 'last_name', '')}",
            'subject': f'Confirmación de compra - {event.title}',
            'html': email_html,
            'pdfBase64': pdf_base64,
            'pdfFilename': f'entrada-{purchase.order_number}.pdf'
        }
        
        # Enviar email a través del servidor Node.js
        try:
            response = requests.post(
                'http://localhost:4000/api/send-confirmation',
                json=email_data,
                timeout=30
            )
            
            if response.status_code == 200:
                # Actualizar fecha de último envío
                purchase.email_sent = True
                purchase.email_sent_at = datetime.now(chile_tz)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Email reenviado exitosamente'
                }), 200
            else:
                error_message = 'No se pudo enviar el email. Por favor verifica tu conexión e intenta nuevamente.'
                return jsonify({
                    'success': False,
                    'error': error_message
                }), 500
                
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'error': 'No se pudo conectar con el servidor de emails. Por favor intenta nuevamente.'
            }), 500
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Error en resend-email: {error_trace}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'No se pudo reenviar el email. Por favor verifica tu conexión e intenta nuevamente.'
        }), 500

# ✅ MEJORA #3: Endpoint para descargar PDF de entrada
@purchases_bp.route('/purchases/<int:purchase_id>/download-pdf', methods=['GET'])
def download_purchase_pdf(purchase_id):
    """Generar y descargar PDF de entrada"""
    try:
        from flask import send_file
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        import qrcode
        from io import BytesIO
        from PIL import Image
        
        # Buscar la compra
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            return jsonify({'error': 'Compra no encontrada'}), 404
        
        # Obtener información del usuario y evento
        user = User.query.get(purchase.user_id)
        event = Event.query.get(purchase.event_id)
        
        if not user or not event:
            return jsonify({'error': 'Usuario o evento no encontrado'}), 404
        
        # Crear PDF en memoria
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Encabezado con color
        p.setFillColorRGB(0.388, 0.4, 0.945)  # Color indigo
        p.rect(0, height - 80, width, 80, fill=True, stroke=False)
        
        p.setFillColorRGB(1, 1, 1)  # Blanco
        p.setFont("Helvetica-Bold", 24)
        p.drawCentredString(width / 2, height - 40, "EVENTOS VIÑA")
        p.setFont("Helvetica", 14)
        p.drawCentredString(width / 2, height - 60, "ENTRADA DIGITAL")
        
        # Información del evento
        y = height - 120
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Bold", 16)
        p.drawCentredString(width / 2, y, event.title)
        
        y -= 40
        p.setFont("Helvetica", 12)
        p.drawString(72, y, f"Artista: {event.artist}")
        y -= 20
        p.drawString(72, y, f"Fecha: {event.date}")
        y -= 20
        p.drawString(72, y, f"Hora: {event.time}")
        y -= 20
        p.drawString(72, y, f"Lugar: {event.venue}")
        y -= 20
        p.drawString(72, y, f"{event.location}")
        
        # Información del comprador
        y -= 40
        p.setFont("Helvetica-Bold", 12)
        p.drawString(72, y, "DATOS DEL COMPRADOR")
        y -= 20
        p.setFont("Helvetica", 12)
        p.drawString(72, y, f"Nombre: {user.name} {getattr(user, 'last_name', '')}")
        y -= 20
        p.drawString(72, y, f"Email: {user.email}")
        y -= 20
        p.drawString(72, y, f"Cantidad de entradas: {purchase.quantity}")
        
        # Número de orden con fondo
        y -= 40
        p.setFillColorRGB(0.388, 0.4, 0.945)
        p.rect(72, y - 15, width - 144, 30, fill=True, stroke=False)
        p.setFillColorRGB(1, 1, 1)
        p.setFont("Helvetica-Bold", 12)
        p.drawCentredString(width / 2, y, f"NÚMERO DE ORDEN: {purchase.order_number}")
        
        # Generar código QR
        y -= 60
        qr_data = getattr(user, 'rut', None) or purchase.order_number
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar QR en memoria como imagen PIL
        qr_pil = qr_img.convert('RGB')  # Convertir a RGB para asegurar compatibilidad
        qr_buffer = BytesIO()
        qr_pil.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        # Cargar imagen desde buffer para ReportLab
        from reportlab.lib.utils import ImageReader
        qr_image = ImageReader(qr_buffer)
        
        # Insertar QR en PDF
        p.drawImage(qr_image, width - 180, y - 80, width=100, height=100)
        
        # Texto explicativo del QR
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica", 10)
        p.drawCentredString(width - 130, y - 100, "Presenta este código QR")
        p.drawCentredString(width - 130, y - 115, "en la entrada del evento")
        
        # Resumen de compra
        p.setFont("Helvetica-Bold", 12)
        p.drawString(72, y, "RESUMEN DE COMPRA")
        y -= 20
        p.setFont("Helvetica", 11)
        p.drawString(72, y, f"Precio unitario: ${purchase.unit_price:,.0f}")
        y -= 15
        p.drawString(72, y, f"Cantidad: {purchase.quantity}")
        y -= 15
        if purchase.service_charge > 0:
            p.drawString(72, y, f"Cargo por servicio: ${purchase.service_charge:,.0f}")
            y -= 15
        p.setFont("Helvetica-Bold", 12)
        p.drawString(72, y, f"Total pagado: ${purchase.total_price:,.0f}")
        
        # Pie de página
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(width / 2, 40, "Entrada válida solo con documento de identidad")
        fecha_compra = purchase.purchase_date.strftime('%d/%m/%Y %H:%M') if purchase.purchase_date else purchase.created_at.strftime('%d/%m/%Y %H:%M')
        p.drawCentredString(width / 2, 25, f"Fecha de compra: {fecha_compra}")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'entrada-{event.title.replace(" ", "-")}-{purchase.id}.pdf'
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Error generando PDF: {error_trace}")
        return jsonify({'error': f'Error generando PDF: {str(e)}'}), 500