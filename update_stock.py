"""
Script para actualizar algunos eventos con stock bajo
Esto permite probar la funcionalidad de indicadores de stock
"""

import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import db, Event
from api.app import create_app

def update_stock():
    """Actualizar stock de algunos eventos para testing"""
    app = create_app()
    
    with app.app_context():
        # Evento 1: Stock muy bajo (5 entradas) - Debe mostrar badge amarillo
        event1 = Event.query.get('1')
        if event1:
            event1.available_tickets = 5
            print(f"✅ {event1.title}: {event1.available_tickets} entradas (BADGE AMARILLO)")
        
        # Evento 2: Stock agotado (0 entradas) - Debe mostrar badge rojo
        event2 = Event.query.get('2')
        if event2:
            event2.available_tickets = 0
            print(f"✅ {event2.title}: {event2.available_tickets} entradas (BADGE ROJO - AGOTADO)")
        
        # Evento 3: Stock bajo (15 entradas) - Debe mostrar badge amarillo
        event3 = Event.query.get('3')
        if event3:
            event3.available_tickets = 15
            print(f"✅ {event3.title}: {event3.available_tickets} entradas (BADGE AMARILLO)")
        
        # Evento 4: Stock crítico (2 entradas) - Debe mostrar badge amarillo
        event4 = Event.query.get('4')
        if event4:
            event4.available_tickets = 2
            print(f"✅ {event4.title}: {event4.available_tickets} entradas (BADGE AMARILLO)")
        
        # Evento 5: Stock normal (250 entradas) - Sin badge
        event5 = Event.query.get('5')
        if event5:
            event5.available_tickets = 250
            print(f"✅ {event5.title}: {event5.available_tickets} entradas (SIN BADGE)")
        
        # Evento 6: Stock medio (19 entradas) - Límite para badge amarillo
        event6 = Event.query.get('6')
        if event6:
            event6.available_tickets = 19
            print(f"✅ {event6.title}: {event6.available_tickets} entradas (BADGE AMARILLO)")
        
        db.session.commit()
        print("\n✅ Stock actualizado correctamente")
        print("\nRECARGA LA PÁGINA para ver los badges de stock:")
        print("- AMARILLO ⚠️: Quedan menos de 20 entradas")
        print("- ROJO 🔴: Evento agotado (0 entradas)")

if __name__ == '__main__':
    update_stock()
