from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class User(db.Model):
    """Modelo para usuarios del sistema"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Para futuro sistema de auth
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    purchases = relationship('Purchase', back_populates='user', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'lastName': self.last_name,
            'isAdmin': self.is_admin,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class Event(db.Model):
    """Modelo para eventos disponibles"""
    __tablename__ = 'events'
    
    id = Column(String(50), primary_key=True)  # Para mantener compatibilidad con frontend
    title = Column(String(200), nullable=False)
    artist = Column(String(200), nullable=False)
    date = Column(String(100), nullable=False)  # Formato texto para mantener compatibilidad
    time = Column(String(50), nullable=True)
    venue = Column(String(200), nullable=False)
    location = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    image = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    available_tickets = Column(Integer, default=0)
    total_tickets = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    purchases = relationship('Purchase', back_populates='event')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'date': self.date,
            'time': self.time,
            'venue': self.venue,
            'location': self.location,
            'price': self.price,
            'image': self.image,
            'description': self.description,
            'category': self.category,
            'availableTickets': self.available_tickets,
            'totalTickets': self.total_tickets,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Event {self.title}>'


class Purchase(db.Model):
    """Modelo para compras de entradas"""
    __tablename__ = 'purchases'
    
    id = Column(Integer, primary_key=True)
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    event_id = Column(String(50), ForeignKey('events.id'), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    service_charge = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default='pending')  # pending, completed, cancelled, refunded
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    qr_code_data = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    user = relationship('User', back_populates='purchases')
    event = relationship('Event', back_populates='purchases')
    tickets = relationship('Ticket', back_populates='purchase', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'orderNumber': self.order_number,
            'userId': self.user_id,
            'eventId': self.event_id,
            'quantity': self.quantity,
            'unitPrice': self.unit_price,
            'serviceCharge': self.service_charge,
            'totalPrice': self.total_price,
            'purchaseDate': self.purchase_date.isoformat() if self.purchase_date else None,
            'status': self.status,
            'emailSent': self.email_sent,
            'emailSentAt': self.email_sent_at.isoformat() if self.email_sent_at else None,
            'qrCodeData': self.qr_code_data,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            # Datos relacionados
            'user': self.user.to_dict() if self.user else None,
            'event': self.event.to_dict() if self.event else None
        }
    
    def __repr__(self):
        return f'<Purchase {self.order_number}>'


class Ticket(db.Model):
    """Modelo para entradas individuales (cada compra puede tener múltiples tickets)"""
    __tablename__ = 'tickets'
    
    id = Column(Integer, primary_key=True)
    purchase_id = Column(Integer, ForeignKey('purchases.id'), nullable=False)
    ticket_number = Column(String(100), unique=True, nullable=False, index=True)
    qr_code_data = Column(Text, nullable=False)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    seat_info = Column(String(100), nullable=True)  # Para futuras implementaciones de asientos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    purchase = relationship('Purchase', back_populates='tickets')
    
    def to_dict(self):
        return {
            'id': self.id,
            'purchaseId': self.purchase_id,
            'ticketNumber': self.ticket_number,
            'qrCodeData': self.qr_code_data,
            'isUsed': self.is_used,
            'usedAt': self.used_at.isoformat() if self.used_at else None,
            'seatInfo': self.seat_info,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Ticket {self.ticket_number}>'


class EmailLog(db.Model):
    """Modelo para logging de emails enviados"""
    __tablename__ = 'email_logs'
    
    id = Column(Integer, primary_key=True)
    purchase_id = Column(Integer, ForeignKey('purchases.id'), nullable=False)
    email_type = Column(String(50), nullable=False)  # confirmation, reminder, refund, etc.
    recipient_email = Column(String(120), nullable=False)
    subject = Column(String(200), nullable=False)
    status = Column(String(50), nullable=False)  # sent, failed, pending
    sendgrid_message_id = Column(String(200), nullable=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'purchaseId': self.purchase_id,
            'emailType': self.email_type,
            'recipientEmail': self.recipient_email,
            'subject': self.subject,
            'status': self.status,
            'sendgridMessageId': self.sendgrid_message_id,
            'errorMessage': self.error_message,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<EmailLog {self.email_type} to {self.recipient_email}>'