from flask import Blueprint, request, jsonify
import requests
import os

email_bp = Blueprint('email', __name__)

# URL del servidor Node.js
NODE_SERVER_URL = os.getenv('NODE_SERVER_URL', 'http://localhost:4000')

@email_bp.route('/send-confirmation', methods=['POST'])
def send_confirmation_email():
    """
    Proxy endpoint que reenvía la petición al servidor Node.js
    Esto evita problemas de CORS desde el frontend
    """
    try:
        # Obtener datos del request
        data = request.get_json()
        
        print('📧 [Flask Proxy] Recibida petición de envío de email')
        print(f'📧 [Flask Proxy] Destinatario: {data.get("toEmail")}')
        
        # Reenviar al servidor Node.js
        node_url = f'{NODE_SERVER_URL}/api/send-confirmation'
        print(f'📤 [Flask Proxy] Reenviando a: {node_url}')
        
        response = requests.post(
            node_url,
            json=data,
            timeout=30  # 30 segundos timeout
        )
        
        if response.ok:
            result = response.json()
            print(f'✅ [Flask Proxy] Email enviado exitosamente. Message ID: {result.get("messageId")}')
            return jsonify({
                'success': True,
                'messageId': result.get('messageId'),
                'message': 'Email enviado exitosamente'
            })
        else:
            print(f'❌ [Flask Proxy] Error del servidor Node.js: {response.status_code}')
            return jsonify({
                'success': False,
                'error': 'Error enviando email desde el servidor'
            }), response.status_code
            
    except requests.exceptions.Timeout:
        print('❌ [Flask Proxy] Timeout conectando con servidor Node.js')
        return jsonify({
            'success': False,
            'error': 'Timeout conectando con el servidor de emails'
        }), 504
    except requests.exceptions.ConnectionError:
        print('❌ [Flask Proxy] No se pudo conectar con el servidor Node.js')
        return jsonify({
            'success': False,
            'error': 'Servidor de emails no disponible. Asegúrate de que esté corriendo en puerto 4000'
        }), 503
    except Exception as e:
        print(f'❌ [Flask Proxy] Error: {e}')
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500
