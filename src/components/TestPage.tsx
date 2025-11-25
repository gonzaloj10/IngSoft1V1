import React from 'react';
import EmailTestComponent from '../components/EmailTestComponent';

const TestPage: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      padding: '20px' 
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          color: '#1a202c', 
          marginBottom: '40px',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          🎫 Test del Sistema de Entradas PDF + Email
        </h1>
        
        <div style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#2d3748', marginBottom: '20px' }}>📋 Instrucciones:</h2>
          <ol style={{ color: '#4a5568', lineHeight: '1.6' }}>
            <li><strong>Configura SendGrid:</strong> Crea `.env` con `SENDGRID_API_KEY` y `SENDGRID_FROM`</li>
            <li><strong>Arranca el backend:</strong> <code>npm run server</code> (usa <code>/api/health</code> para verificar)</li>
            <li><strong>Prueba PDF:</strong> Haz clic en "Solo Generar PDF" para ver la entrada</li>
            <li><strong>Prueba Email:</strong> Haz clic en "Enviar Email + PDF" para probar todo</li>
          </ol>
        </div>

        <EmailTestComponent />
        
        <div style={{
          backgroundColor: '#e6fffa',
          border: '1px solid #38b2ac',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '30px'
        }}>
          <h3 style={{ color: '#234e52', margin: '0 0 10px 0' }}>💡 Tips para el testing:</h3>
          <ul style={{ color: '#285e61', margin: 0 }}>
            <li>Usa tu email personal para las pruebas</li>
            <li>Revisa la carpeta de spam si no llega el email</li>
            <li>El PDF se genera automáticamente y se descarga</li>
            <li>Cada orden tiene un código QR único</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestPage;