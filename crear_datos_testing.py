from app_reportes import app, db, EventoReporte, SectorReporte, VentaReporte
from datetime import datetime, timedelta
import random

def crear_datos_completos():
    with app.app_context():
        # Limpiar y recrear
        db.drop_all()
        db.create_all()
        
        print("🎪 Creando datos completos para Historia de Usuario de Reportes...")
        
        # Crear 5 eventos como solicitas
        eventos = [
            EventoReporte(
                nombre="Festival de Rock Viña 2025",
                fecha_evento=datetime(2025, 3, 15, 20, 0),
                lugar="Anfiteatro Municipal de Viña del Mar"
            ),
            EventoReporte(
                nombre="Concierto Acústico Primavera",
                fecha_evento=datetime(2025, 2, 14, 19, 30),
                lugar="Teatro Municipal de Viña del Mar"
            ),
            EventoReporte(
                nombre="Charla Magistral: Innovación Digital",
                fecha_evento=datetime(2025, 1, 20, 14, 0),
                lugar="Centro de Convenciones Viña"
            ),
            EventoReporte(
                nombre="Espectáculo de Danza Contemporánea",
                fecha_evento=datetime(2025, 4, 10, 21, 0),
                lugar="Teatro Municipal de Viña del Mar"
            ),
            EventoReporte(
                nombre="Concierto Sinfónico de Gala",
                fecha_evento=datetime(2025, 5, 25, 20, 30),
                lugar="Quinta Vergara - Anfiteatro"
            )
        ]
        
        for evento in eventos:
            db.session.add(evento)
        db.session.commit()
        print(f"✅ Eventos creados: {len(eventos)}")
        
        # Crear sectores para cada evento
        sectores = [
            # Festival de Rock (Evento 1)
            SectorReporte(evento_id=1, nombre="VIP", precio=150000),
            SectorReporte(evento_id=1, nombre="Platea Premium", precio=95000),
            SectorReporte(evento_id=1, nombre="Platea", precio=75000),
            SectorReporte(evento_id=1, nombre="General", precio=45000),
            
            # Concierto Acústico (Evento 2)
            SectorReporte(evento_id=2, nombre="Palco Exclusivo", precio=120000),
            SectorReporte(evento_id=2, nombre="Platea Premium", precio=80000),
            SectorReporte(evento_id=2, nombre="Balcón", precio=50000),
            
            # Charla Magistral (Evento 3)
            SectorReporte(evento_id=3, nombre="Empresarial VIP", precio=180000),
            SectorReporte(evento_id=3, nombre="Profesional", precio=90000),
            SectorReporte(evento_id=3, nombre="Estudiante", precio=25000),
            
            # Danza Contemporánea (Evento 4)
            SectorReporte(evento_id=4, nombre="Platea Premium", precio=70000),
            SectorReporte(evento_id=4, nombre="Platea", precio=50000),
            SectorReporte(evento_id=4, nombre="Balcón", precio=30000),
            
            # Concierto Sinfónico (Evento 5)
            SectorReporte(evento_id=5, nombre="Palco VIP", precio=200000),
            SectorReporte(evento_id=5, nombre="Platea Dorada", precio=140000),
            SectorReporte(evento_id=5, nombre="Platea", precio=90000),
            SectorReporte(evento_id=5, nombre="Anfiteatro", precio=55000)
        ]
        
        for sector in sectores:
            db.session.add(sector)
        db.session.commit()
        print(f"✅ Sectores creados: {len(sectores)}")
        
        # Crear usuarios realistas que han comprado entradas
        usuarios = [
            {"nombre": "Juan Carlos Pérez", "rut": "12345678-9"},
            {"nombre": "María Elena González", "rut": "98765432-1"},
            {"nombre": "Carlos Eduardo López", "rut": "11222333-4"},
            {"nombre": "Ana Patricia Martínez", "rut": "55666777-8"},
            {"nombre": "Diego Alejandro Silva", "rut": "99888777-6"},
            {"nombre": "Carmen Rosa Rodríguez", "rut": "33444555-6"},
            {"nombre": "Luis Fernando Morales", "rut": "77888999-0"},
            {"nombre": "Patricia Isabel Herrera", "rut": "22333444-5"},
            {"nombre": "Roberto Antonio Castro", "rut": "66777888-9"},
            {"nombre": "Elena Victoria Vargas", "rut": "44555666-7"},
            {"nombre": "Fernando José Ruiz", "rut": "88999000-1"},
            {"nombre": "Claudia Beatriz Torres", "rut": "00111222-3"},
            {"nombre": "Andrés Miguel Campos", "rut": "55444333-2"},
            {"nombre": "Valeria Sofía Muñoz", "rut": "77666555-4"},
            {"nombre": "Sebastián Ignacio Vega", "rut": "99000111-6"}
        ]
        
        metodos_pago = ["webpay", "transferencia", "tarjeta_credito", "efectivo"]
        
        # Generar ventas distribuidas en los últimos 45 días
        ventas_creadas = []
        
        for evento in eventos:
            sectores_evento = [s for s in sectores if s.evento_id == evento.id]
            
            # Diferentes patrones de venta por tipo de evento
            if "Rock" in evento.nombre:
                num_ventas = random.randint(80, 120)  # Evento popular
            elif "Sinfónico" in evento.nombre:
                num_ventas = random.randint(40, 60)   # Evento de nicho
            elif "Charla" in evento.nombre:
                num_ventas = random.randint(30, 50)   # Evento corporativo
            else:
                num_ventas = random.randint(50, 80)   # Eventos medios
            
            for _ in range(num_ventas):
                sector = random.choice(sectores_evento)
                usuario = random.choice(usuarios)
                cantidad = random.randint(1, 4)  # 1-4 entradas por compra
                precio_unitario = sector.precio
                total = cantidad * precio_unitario
                
                # Distribución temporal más realista
                if "Rock" in evento.nombre:
                    dias_atras = random.randint(1, 45)  # Ventas distribuidas
                else:
                    dias_atras = random.randint(5, 30)  # Ventas más recientes
                
                fecha_venta = datetime.now() - timedelta(days=dias_atras)
                
                venta = VentaReporte(
                    evento_id=evento.id,
                    sector_id=sector.id,
                    fecha_venta=fecha_venta,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    total=total,
                    cliente_nombre=usuario["nombre"],
                    cliente_rut=usuario["rut"],
                    metodo_pago=random.choice(metodos_pago)
                )
                ventas_creadas.append(venta)
                db.session.add(venta)
        
        db.session.commit()
        print(f"✅ Ventas creadas: {len(ventas_creadas)}")
        
        # Estadísticas finales
        total_ventas = sum(v.total for v in ventas_creadas)
        total_entradas = sum(v.cantidad for v in ventas_creadas)
        
        print("\n" + "="*80)
        print("✅ HISTORIA DE USUARIO LISTA PARA TESTING MANUAL")
        print("="*80)
        print(f"💰 Total vendido: ${total_ventas:,.0f}")
        print(f"🎟️  Total entradas: {total_entradas:,}")
        print(f"📊 Total transacciones: {len(ventas_creadas):,}")
        
        print("\n🎪 EVENTOS CREADOS PARA TESTING:")
        for i, evento in enumerate(eventos, 1):
            ventas_evento = [v for v in ventas_creadas if v.evento_id == evento.id]
            total_evento = sum(v.total for v in ventas_evento)
            entradas_evento = sum(v.cantidad for v in ventas_evento)
            print(f"  {i}. {evento.nombre}")
            print(f"     📅 {evento.fecha_evento.strftime('%Y-%m-%d %H:%M')} | 📍 {evento.lugar}")
            print(f"     💰 ${total_evento:,.0f} | 🎟️ {entradas_evento} entradas | 📊 {len(ventas_evento)} ventas")
        
        print("\n🏟️ SECTORES CON MAYOR VENTA:")
        sectores_stats = {}
        for venta in ventas_creadas:
            sector = next(s for s in sectores if s.id == venta.sector_id)
            key = f"{sector.nombre} (${sector.precio:,.0f})"
            if key not in sectores_stats:
                sectores_stats[key] = {'entradas': 0, 'total': 0}
            sectores_stats[key]['entradas'] += venta.cantidad
            sectores_stats[key]['total'] += venta.total
        
        for sector, stats in sorted(sectores_stats.items(), key=lambda x: x[1]['total'], reverse=True)[:10]:
            print(f"  • {sector}: {stats['entradas']} entradas - ${stats['total']:,.0f}")
        
        print("\n🧪 URLS PARA TESTING MANUAL EN SWAGGER:")
        print("  📋 Swagger UI: http://localhost:5001/docs/")
        print("  ✅ Health Check: http://localhost:5001/hello")
        
        print("\n📊 EJEMPLOS DE REPORTES PARA PROBAR:")
        print("  1. Reporte general JSON:")
        print("     GET /reportes/ventas?formato=json")
        print("  2. Reporte PDF del Festival Rock:")
        print("     GET /reportes/ventas?evento_id=1&formato=pdf")
        print("  3. Reporte Excel por sector VIP:")
        print("     GET /reportes/ventas?sector_id=1&formato=excel")
        print("  4. Reporte por fechas específicas:")
        print("     GET /reportes/ventas?fecha_inicio=2024-12-01&fecha_fin=2024-12-31&formato=pdf")
        print("  5. Reporte completo de evento Sinfónico:")
        print("     GET /reportes/ventas?evento_id=5&formato=pdf")
        
        print("\n🔍 FILTROS DISPONIBLES PARA TESTING:")
        print("  • evento_id: 1,2,3,4,5 (IDs de eventos)")
        print("  • sector_id: 1-17 (IDs de sectores)")
        print("  • fecha_inicio: YYYY-MM-DD")
        print("  • fecha_fin: YYYY-MM-DD")
        print("  • formato: json, pdf, excel")
        
        print("\n📋 DATOS LISTOS PARA VALIDACIÓN MANUAL:")
        print("  ✅ 5 eventos diferentes con características únicas")
        print("  ✅ 17 sectores con precios variados")
        print("  ✅ 15 usuarios únicos con RUTs válidos")
        print("  ✅ Ventas distribuidas en últimos 45 días")
        print("  ✅ Múltiples métodos de pago")
        print("  ✅ Análisis estratégico por sector y evento")

if __name__ == "__main__":
    crear_datos_completos()