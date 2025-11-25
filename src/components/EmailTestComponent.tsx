import React, { useState } from 'react';
import { sendPurchaseConfirmationEmail } from '../services/emailService';
import { PurchaseDetails } from '../types/emailTypes';

const EmailTestComponent: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testEmailData: PurchaseDetails = {
    orderNumber: 'TEST-' + Date.now(),
    user: {
      id: 'test-user',
      name: 'Juan',
      lastName: 'Pérez',
      email: 'test@example.com'
    },
    event: {
      id: 'test-event',
      title: 'Concierto de Prueba',
      artist: 'Artista Test',
      date: '2024-12-31',
      time: '20:00',
      venue: 'Teatro Test',
      location: 'Santiago, Chile',
      price: 50000,
      image: '',
      description: 'Evento de prueba',
      category: 'music',
      availableTickets: 100
    },
    quantity: 2,
    serviceCharge: 5000,
    totalPrice: 105000,
    purchaseDate: new Date().toLocaleString('es-CL')
  };

  const handleTestEmail = async () => {
    setIsLoading(true);
    setStatus('Enviando email de prueba...');
    
    try {
      const result = await sendPurchaseConfirmationEmail(testEmailData);
      
      if (result.success) {
        setStatus('✅ Email enviado exitosamente!');
      } else {
        setStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setStatus(`❌ Error inesperado: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧪 Test de Email</h2>
      <p>Envía un email de prueba para verificar la configuración de SendGrid</p>
      
      <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Datos de prueba:</h3>
        <ul>
          <li><strong>Orden:</strong> {testEmailData.orderNumber}</li>
          <li><strong>Email:</strong> {testEmailData.user.email}</li>
          <li><strong>Evento:</strong> {testEmailData.event.title}</li>
          <li><strong>Total:</strong> ${testEmailData.totalPrice.toLocaleString('es-CL')} CLP</li>
        </ul>
      </div>

      <button 
        onClick={handleTestEmail}
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '5px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        {isLoading ? '⏳ Enviando...' : '📧 Enviar Email de Prueba'}
      </button>

      {status && (
        <div style={{
          padding: '10px',
          borderRadius: '5px',
          backgroundColor: status.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${status.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          color: status.includes('✅') ? '#155724' : '#721c24'
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default EmailTestComponent;