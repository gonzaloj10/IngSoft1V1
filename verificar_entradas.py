"""
Script para verificar que las entradas se descuentan correctamente al comprar
"""
from api.models import db, Event, Purchase, User
from api.app import create_app
from datetime import datetime

def verificar_descuento_entradas():
    app = create_app()
    
    with app.app_context():
        print("=" * 80)
        print("🎫 VERIFICACIÓN DE DESCUENTO DE ENTRADAS")
        print("=" * 80)
        
        # Obtener todos los eventos
        events = Event.query.all()
        
        if not events:
            print("\n⚠️  No hay eventos en la base de datos.")
            return
        
        print(f"\n📊 Total de eventos: {len(events)}\n")
        
        for event in events:
            # Contar compras completadas para este evento
            compras = Purchase.query.filter_by(
                event_id=event.id,
                status='completed'
            ).all()
            
            # Calcular entradas vendidas
            entradas_vendidas = sum(p.quantity for p in compras)
            entradas_esperadas = event.total_tickets - entradas_vendidas
            
            # Verificar si coincide
            coincide = event.available_tickets == entradas_esperadas
            icono = "✅" if coincide else "❌"
            
            print(f"{icono} Evento: {event.title}")
            print(f"   ID: {event.id}")
            print(f"   Total de tickets: {event.total_tickets}")
            print(f"   Tickets disponibles (actual): {event.available_tickets}")
            print(f"   Compras completadas: {len(compras)}")
            print(f"   Entradas vendidas: {entradas_vendidas}")
            print(f"   Entradas esperadas disponibles: {entradas_esperadas}")
            
            if not coincide:
                diferencia = event.available_tickets - entradas_esperadas
                print(f"   ⚠️  DIFERENCIA: {diferencia:+d} entradas")
                print(f"   💡 Posible causa: Compras en estado 'pending' o no contabilizadas")
            
            # Mostrar detalles de compras
            if compras:
                print(f"   📋 Detalle de compras:")
                for i, p in enumerate(compras[:5], 1):  # Mostrar max 5
                    fecha = p.purchase_date.strftime('%d/%m/%Y %H:%M') if p.purchase_date else 'N/A'
                    print(f"      {i}. {p.order_number} - {p.quantity} entradas - {fecha}")
                if len(compras) > 5:
                    print(f"      ... y {len(compras) - 5} compras más")
            
            print()
        
        # Estadísticas generales
        print("=" * 80)
        print("📈 ESTADÍSTICAS GENERALES:")
        print("=" * 80)
        
        total_entradas = sum(e.total_tickets for e in events)
        total_disponibles = sum(e.available_tickets for e in events)
        total_vendidas = total_entradas - total_disponibles
        
        print(f"Total de entradas en sistema: {total_entradas}")
        print(f"Total de entradas disponibles: {total_disponibles}")
        print(f"Total de entradas vendidas: {total_vendidas}")
        print(f"Porcentaje vendido: {(total_vendidas / total_entradas * 100):.2f}%")
        
        # Verificar compras pendientes
        compras_pending = Purchase.query.filter_by(status='pending').all()
        if compras_pending:
            print(f"\n⚠️  Hay {len(compras_pending)} compras en estado 'pending'")
            print("   Estas compras YA descontaron entradas pero aún no están confirmadas")
        
        # Verificar compras canceladas
        compras_cancelled = Purchase.query.filter_by(status='cancelled').all()
        if compras_cancelled:
            print(f"\n✅ Hay {len(compras_cancelled)} compras canceladas")
            print("   Las entradas de estas compras fueron devueltas al inventario")
        
        print("\n" + "=" * 80)

if __name__ == '__main__':
    verificar_descuento_entradas()
