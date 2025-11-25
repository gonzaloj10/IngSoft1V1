"""Script para verificar las compras del usuario en la base de datos"""
import sqlite3
from datetime import datetime

# Conectar a la base de datos
db_path = 'instance/entradas.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("VERIFICANDO COMPRAS EN LA BASE DE DATOS")
    print("=" * 80)
    
    # Verificar usuarios
    cursor.execute("SELECT id, email, name, last_name FROM users")
    users = cursor.fetchall()
    print(f"\n📊 USUARIOS EN LA BASE DE DATOS: {len(users)}")
    for user in users:
        print(f"  - ID: {user[0]} | Email: {user[1]} | Nombre: {user[2]} {user[3]}")
    
    # Verificar compras
    cursor.execute("""
        SELECT 
            p.id, 
            p.order_number, 
            p.user_id, 
            p.event_id, 
            p.quantity, 
            p.total_price, 
            p.status,
            p.purchase_date,
            u.email,
            u.name,
            e.title
        FROM purchases p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN events e ON p.event_id = e.id
        ORDER BY p.purchase_date DESC
    """)
    purchases = cursor.fetchall()
    
    print(f"\n🛒 COMPRAS EN LA BASE DE DATOS: {len(purchases)}")
    print("-" * 80)
    
    if len(purchases) == 0:
        print("⚠️  NO HAY COMPRAS REGISTRADAS")
    else:
        for purchase in purchases:
            print(f"\n📦 COMPRA #{purchase[0]}")
            print(f"  - Orden: {purchase[1]}")
            print(f"  - User ID: {purchase[2]} ({purchase[8]} - {purchase[9]})")
            print(f"  - Evento ID: {purchase[3]} ({purchase[10]})")
            print(f"  - Cantidad: {purchase[4]}")
            print(f"  - Total: ${purchase[5]:,.0f}")
            print(f"  - Estado: {purchase[6]}")
            print(f"  - Fecha: {purchase[7]}")
    
    # Verificar eventos
    cursor.execute("SELECT id, title, available_tickets, total_tickets FROM events")
    events = cursor.fetchall()
    print(f"\n🎫 EVENTOS EN LA BASE DE DATOS: {len(events)}")
    for event in events:
        print(f"  - {event[0]}: {event[1]} | Disponibles: {event[2]}/{event[3]}")
    
    conn.close()
    
    print("\n" + "=" * 80)
    print("✅ VERIFICACIÓN COMPLETADA")
    print("=" * 80)
    
except Exception as e:
    print(f"❌ ERROR: {e}")
