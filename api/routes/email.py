from flask import Blueprint, request, jsonify
import requests

email_bp = Blueprint('email', __name__)

# ✅ MEJORA #3: Proxy para emails (evita problemas de CORS)
@email_bp.route('/send-confirmation', methods=['POST'])
def send_confirmation_email():
    """Proxy para enviar emails de confirmación a través del servidor Node.js"""
    try:
        data = request.get_json()
        
        # Reenviar la solicitud al servidor Node.js
        response = requests.post(
            'http://localhost:4000/api/send-confirmation',
            json=data,
            timeout=30
        )
        
        # Retornar la respuesta del servidor Node.js
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.Timeout:
        return jsonify({
            'error': 'Timeout al conectar con el servidor de emails'
        }), 504
        
    except requests.exceptions.ConnectionError:
        return jsonify({
            'error': 'No se pudo conectar con el servidor de emails. Verifica que esté ejecutándose en el puerto 4000.'
        }), 503
        
    except Exception as e:
        return jsonify({
            'error': f'Error al procesar solicitud de email: {str(e)}'
        }), 500
