"""
Script para probar la conexión entre Flask y Node.js
"""
import requests
import json

print("=" * 80)
print("PRUEBA DE CONEXIÓN: Flask → Node.js → SendGrid")
print("=" * 80)

# 1. Verificar que Flask está corriendo
print("\n1️⃣ Verificando Flask (puerto 5001)...")
try:
    response = requests.get('http://localhost:5001/api/events', timeout=5)
    if response.ok:
        print("   ✅ Flask está corriendo")
    else:
        print(f"   ⚠️ Flask responde pero con error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Flask NO está corriendo: {e}")
    print("   💡 Ejecuta: cd c:\\Users\\gonza\\Desktop\\IngSoft1V1-main\\IngSoft1V1-main && .\\venv\\Scripts\\python.exe -m flask --app api.app run --port 5001 --debug")
    exit(1)

# 2. Verificar que Node.js está corriendo
print("\n2️⃣ Verificando Node.js (puerto 4000)...")
try:
    response = requests.get('http://localhost:4000/api/health', timeout=5)
    if response.ok:
        print("   ✅ Node.js está corriendo")
    else:
        print(f"   ⚠️ Node.js responde pero con error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Node.js NO está corriendo: {e}")
    print("   💡 Ejecuta: cd c:\\Users\\gonza\\Desktop\\IngSoft1V1-main\\IngSoft1V1-main && npm run server")
    exit(1)

# 3. Probar el endpoint de email en Flask (proxy)
print("\n3️⃣ Probando endpoint Flask → Node.js...")
try:
    test_payload = {
        "toEmail": "test@example.com",
        "toName": "Usuario Test",
        "subject": "Test de conexión",
        "html": "<h1>Este es un test</h1><p>Si ves esto, la conexión funciona</p>"
    }
    
    response = requests.post(
        'http://localhost:5001/api/send-confirmation',
        json=test_payload,
        timeout=30
    )
    
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.ok:
        result = response.json()
        if result.get('success'):
            print("   ✅ Conexión Flask → Node.js funcionando")
            print(f"   📧 Message ID: {result.get('messageId', 'N/A')}")
        else:
            print(f"   ⚠️ Error en la respuesta: {result.get('error')}")
    else:
        print(f"   ❌ Error HTTP: {response.status_code}")
        
except Exception as e:
    print(f"   ❌ Error en la prueba: {e}")

print("\n" + "=" * 80)
print("✅ PRUEBA COMPLETADA")
print("=" * 80)
print("\n💡 Si todo funciona, las compras deberían guardarse correctamente")
print("   Prueba haciendo una compra desde el frontend")
