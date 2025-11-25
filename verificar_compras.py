"""
Script para verificar las compras en la base de datos
"""
from api.models import db, Purchase, User, Event
from api.app import create_app

def verificar_compras():
    app = create_app()
    
    with app.app_context():
        # Obtener todas las compras
        purchases = Purchase.query.all()
        
        print("=" * 80)
        print(f"📊 VERIFICACIÓN DE COMPRAS EN LA BASE DE DATOS")
        print("=" * 80)
        print(f"\n✅ Total de compras en BD: {len(purchases)}\n")
        
        if not purchases:
            print("⚠️  No hay compras registradas en la base de datos.")
            print("\nPosibles causas:")
            print("1. No se han realizado compras desde el frontend")
            print("2. Las compras están usando localStorage (modo offline)")
            print("3. Hay un error de conexión con la API\n")
            return
        
        # Mostrar detalles de cada compra
        print("📋 DETALLES DE LAS COMPRAS:\n")
        
        for i, p in enumerate(purchases[:20], 1):  # Mostrar máximo 20
            print(f"{i}. Compra ID: {p.id}")
            print(f"   • Número de orden: {p.order_number}")
            print(f"   • Usuario: {p.user.name} {p.user.last_name} ({p.user.email})")
            print(f"   • Evento: {p.event.title if p.event else 'Evento no encontrado'}")
            print(f"   • Cantidad: {p.quantity} entrada(s)")
            print(f"   • Precio total: ${p.total_price:,.0f} CLP")
            print(f"   • Fecha de compra: {p.purchase_date.strftime('%d/%m/%Y %H:%M:%S')}")
            print(f"   • Estado: {p.status}")
            print(f"   • Email enviado: {'Sí' if p.email_sent else 'No'}")
            print()
        
        if len(purchases) > 20:
            print(f"... y {len(purchases) - 20} compras más\n")
        
        # Estadísticas
        print("=" * 80)
        print("📈 ESTADÍSTICAS:")
        print("=" * 80)
        
        total_ventas = sum(p.total_price for p in purchases)
        total_entradas = sum(p.quantity for p in purchases)
        
        print(f"💰 Total de ventas: ${total_ventas:,.0f} CLP")
        print(f"🎫 Total de entradas vendidas: {total_entradas}")
        print(f"📧 Emails enviados: {sum(1 for p in purchases if p.email_sent)}")
        print(f"⏳ Compras pendientes: {sum(1 for p in purchases if p.status == 'pending')}")
        print(f"✅ Compras completadas: {sum(1 for p in purchases if p.status == 'completed')}")
        print()
        
        # Ventas por evento
        ventas_por_evento = {}
        for p in purchases:
            evento_nombre = p.event.title if p.event else f'Evento {p.event_id}'
            if evento_nombre not in ventas_por_evento:
                ventas_por_evento[evento_nombre] = {'cantidad': 0, 'total': 0}
            ventas_por_evento[evento_nombre]['cantidad'] += p.quantity
            ventas_por_evento[evento_nombre]['total'] += p.total_price
        
        print("🎭 VENTAS POR EVENTO:")
        print("-" * 80)
        for evento, data in sorted(ventas_por_evento.items(), key=lambda x: x[1]['total'], reverse=True):
            print(f"   • {evento}")
            print(f"     - Entradas: {data['cantidad']}")
            print(f"     - Ingresos: ${data['total']:,.0f} CLP")
        
        print("\n" + "=" * 80)

if __name__ == '__main__':
    verificar_compras()
