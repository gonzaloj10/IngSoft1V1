import { Event, User } from '../types';
import { PurchaseDetails } from '../types/emailTypes';
import { generateTicketPDFLocal } from './pdfService';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

// Base URL del backend (SendGrid)
const API_BASE = 'http://localhost:4000/api';

// Función auxiliar para convertir Blob a base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extraer solo la parte base64 (después de la coma)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// EmailJS eliminado. Todo el envío se realiza vía backend (SendGrid).

// Función para generar el HTML del email de confirmación
const generateConfirmationEmailHTML = (params: any): string => {
  // Leer el template HTML y reemplazar las variables
  const templateHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Compra - Eventos Viña</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 30px 20px;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .content {
            padding: 30px;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #4a5568;
        }
        
        .thank-you {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4a5568;
            line-height: 1.6;
        }
        
        .event-card {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .event-title {
            font-size: 22px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .event-details {
            display: grid;
            gap: 12px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 600;
            color: #4a5568;
            min-width: 140px;
        }
        
        .detail-value {
            color: #2d3748;
            text-align: right;
            flex: 1;
        }
        
        .order-number-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 25px 0;
            font-size: 18px;
            font-weight: 700;
        }
        
        .digital-ticket {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .digital-ticket h3 {
            color: white;
            font-size: 20px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .digital-ticket p {
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 20px;
        }
        
        .download-btn {
            background-color: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
        }
        
        .download-btn:hover {
            background-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
        
        .download-url {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 6px;
            margin-top: 15px;
            font-size: 12px;
            word-break: break-all;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .purchase-summary {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 20px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-row:last-child {
            border-bottom: 2px solid #667eea;
            font-weight: 700;
            font-size: 16px;
            color: #2d3748;
            margin-top: 10px;
            padding-top: 15px;
        }
        
        .summary-row:nth-last-child(2) {
            border-bottom: none;
            margin-bottom: 10px;
        }
        
        .instructions {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .instructions h4 {
            color: #744210;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .instructions ul {
            list-style: none;
            padding-left: 0;
        }
        
        .instructions li {
            color: #744210;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .instructions li:before {
            content: "•";
            color: #d69e2e;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            color: #718096;
            margin-bottom: 10px;
        }
        
        .contact-info {
            color: #4299e1;
            text-decoration: none;
        }
        
        .team-name {
            color: #2d3748;
            font-weight: 600;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .content {
                padding: 20px;
            }
            
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
            
            .detail-value {
                text-align: left;
            }
            
            .summary-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">Eventos Viña</div>
            <h1>¡Confirmación de Compra!</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <p class="greeting">Hola ${params.to_name},</p>
            
            <p class="thank-you">
                ¡Gracias por tu compra! Hemos recibido tu pago y confirmamos tu entrada para el siguiente evento:
            </p>

            <!-- Event Details Card -->
            <div class="event-card">
                <h2 class="event-title">${params.event_title}</h2>
                <div class="event-details">
                    <div class="detail-row">
                        <span class="detail-label">Artista:</span>
                        <span class="detail-value">${params.event_artist}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fecha:</span>
                        <span class="detail-value">${params.event_date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Hora:</span>
                        <span class="detail-value">${params.event_time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Lugar:</span>
                        <span class="detail-value">${params.event_venue}, ${params.event_location}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Cantidad de entradas:</span>
                        <span class="detail-value">${params.ticket_quantity}</span>
                    </div>
                </div>
            </div>

            <!-- Order Number -->
            <div class="order-number-section">
                Número de Orden: ${params.order_number}
            </div>

            ${params.pdf_message || ''}

            <!-- Purchase Summary -->
            <div class="purchase-summary">
                <h3 class="summary-title">Resumen de la compra:</h3>
                <div class="summary-row">
                    <span>Entradas (${params.ticket_quantity}):</span>
                    <span>$${params.unit_price} CLP</span>
                </div>
                <div class="summary-row">
                    <span>Cargo por servicio:</span>
                    <span>$${params.service_charge} CLP</span>
                </div>
                <div class="summary-row">
                    <span><strong>Total:</strong></span>
                    <span><strong>$${params.total_price} CLP</strong></span>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
                    Fecha de compra: ${params.purchase_date}
                </div>
            </div>

            <!-- Instructions -->
            <div class="instructions">
                <h4>Instrucciones importantes:</h4>
                <ul>
                    <li>Presenta tu entrada digital o impresa para validar tu entrada</li>
                    <li>Llega con al menos 30 minutos de anticipación</li>
                    <li>Recuerda traer un documento de identidad válido</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Si tienes alguna pregunta, contáctanos a <a href="mailto:soporte@eventosviña.cl" class="contact-info">soporte@eventosviña.cl</a></p>
            <p>¡Te esperamos en el evento!</p>
            <p class="team-name">Equipo Eventos Viña</p>
        </div>
    </div>
</body>
</html>
  `;
  
  return templateHTML;
};

// Función principal para enviar email con entrada PDF generada localmente
export const sendPurchaseConfirmationEmailWithPDF = async (
  purchaseDetails: PurchaseDetails,
  generatePDF: boolean = true
): Promise<{ success: boolean; message: string; pdfUrl?: string }> => {
  try {
    console.log('🎫 Iniciando proceso de envío de email con entrada PDF...');
    
    let pdfUrl: string | undefined = undefined;
    let pdfBlob: Blob | undefined = undefined;

    // Generar PDF localmente si se solicita
    if (generatePDF) {
      console.log('📄 Generando PDF localmente...');
      const pdfResult = await generateTicketPDFLocal(purchaseDetails);
      
      if (pdfResult.success && pdfResult.pdfUrl && pdfResult.pdfBlob) {
        pdfUrl = pdfResult.pdfUrl;
        pdfBlob = pdfResult.pdfBlob;
        console.log('✅ PDF generado exitosamente');
      } else {
        console.warn('⚠️ Error generando PDF:', pdfResult.message);
        // Continuar sin PDF
      }
    }

    // Preparar parámetros para el email
    const emailParams = {
      to_name: `${purchaseDetails.user.name} ${purchaseDetails.user.lastName}`,
      to_email: purchaseDetails.user.email,
      order_number: purchaseDetails.orderNumber,
      event_title: purchaseDetails.event.title,
      event_artist: purchaseDetails.event.artist,
      event_date: purchaseDetails.event.date,
      event_time: purchaseDetails.event.time || 'TBD',
      event_venue: purchaseDetails.event.venue,
      event_location: purchaseDetails.event.location || 'Santiago, Chile',
      ticket_quantity: purchaseDetails.quantity.toString(),
      unit_price: purchaseDetails.event.price.toLocaleString('es-CL'),
      service_charge: purchaseDetails.serviceCharge.toLocaleString('es-CL'),
      total_price: purchaseDetails.totalPrice.toLocaleString('es-CL'),
      purchase_date: purchaseDetails.purchaseDate,
      // NO incluir pdfUrl para evitar el link localhost
    };

    // Generar HTML del email
    let pdfMessageHtml = '';
    if (pdfBlob) {
      const pdfSizeKB = (pdfBlob.size / 1024).toFixed(1);
      pdfMessageHtml = `
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
          <h3 style="color: white; font-size: 20px; margin-bottom: 10px;">🎫 Tu Entrada Digital</h3>
          <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 10px;">Hemos adjuntado tu entrada en formato PDF a este email.</p>
          <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 12px;">
            <strong>📏 Tamaño:</strong> ${pdfSizeKB} KB — <strong>📄 Formato:</strong> PDF optimizado
          </div>
        </div>`;
    } else {
      pdfMessageHtml = `
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 10px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #92400e; font-size: 16px; margin-bottom: 15px;">📧 Confirmación Sin Adjunto</h4>
          <p style="color: #92400e;">Tu compra ha sido confirmada. Recibirás tu entrada en un correo separado.</p>
        </div>`;
    }

    const emailHtml = generateConfirmationEmailHTML({ ...emailParams, pdf_message: pdfMessageHtml });

    // Construir payload para backend
    const payload: any = {
      toEmail: purchaseDetails.user.email,
      toName: `${purchaseDetails.user.name} ${purchaseDetails.user.lastName}`,
      subject: `Tu entrada - Orden ${purchaseDetails.orderNumber}`,
      html: emailHtml
    };

    if (pdfBlob) {
      payload.pdfBase64 = await blobToBase64(pdfBlob);
      payload.pdfFilename = `Entrada_${purchaseDetails.orderNumber}.pdf`;
    }

    console.log('📧 Enviando email de confirmación vía backend...');
    const resp = await fetch(`${API_BASE}/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data?.message || 'Error al enviar email');
    }

    return {
      success: true,
      message: `Email de confirmación enviado exitosamente a ${purchaseDetails.user.email}${pdfUrl ? ' con entrada PDF' : ''}`,
      pdfUrl: pdfUrl
    };

  } catch (error) {
    console.error('❌ Error enviando email de confirmación (backend):', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido al enviar email'
    };
  }
};

// Función para generar y descargar PDF sin enviar email (MEJORADA)
export const generateAndDownloadTicketPDF = async (
  purchaseDetails: PurchaseDetails
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🎫 Generando entrada PDF para descarga directa...');
    console.log('📊 Datos de compra:', {
      orden: purchaseDetails.orderNumber,
      evento: purchaseDetails.event.title,
      usuario: purchaseDetails.user.name,
      cantidad: purchaseDetails.quantity
    });
    
    const pdfResult = await generateTicketPDFLocal(purchaseDetails);
    
    if (pdfResult.success && pdfResult.pdfUrl && pdfResult.pdfBlob) {
      console.log('✅ PDF generado exitosamente, iniciando descarga...');
      
      // Método mejorado de descarga
      try {
        const filename = `Entrada_${purchaseDetails.orderNumber}_${purchaseDetails.event.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        
        // Crear elemento de descarga
        const link = document.createElement('a');
        link.href = pdfResult.pdfUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Asegurar compatibilidad con diferentes navegadores
        document.body.appendChild(link);
        
        // Simular click para descargar
        if (link.click) {
          link.click();
        } else {
          // Fallback para navegadores antiguos
          const event = document.createEvent('MouseEvents');
          event.initEvent('click', true, false);
          link.dispatchEvent(event);
        }
        
        // Limpiar DOM
        document.body.removeChild(link);
        
        console.log('📥 Descarga iniciada:', filename);
        
        // Limpiar URL después de un tiempo
        setTimeout(() => {
          URL.revokeObjectURL(pdfResult.pdfUrl!);
          console.log('🧹 URL de blob limpiado');
        }, 2000);
        
        return {
          success: true,
          message: `Entrada descargada: ${filename} (${(pdfResult.pdfBlob.size / 1024).toFixed(1)} KB)`
        };
        
      } catch (downloadError) {
        console.error('❌ Error en la descarga:', downloadError);
        
        // Fallback: abrir en nueva ventana
        try {
          window.open(pdfResult.pdfUrl, '_blank');
          return {
            success: true,
            message: 'PDF abierto en nueva ventana para descarga manual'
          };
        } catch (openError) {
          return {
            success: false,
            message: 'Error al iniciar descarga. Inténtalo desde el navegador.'
          };
        }
      }
      
    } else {
      console.error('❌ Error generando PDF:', pdfResult.message);
      return {
        success: false,
        message: pdfResult.message || 'Error desconocido generando PDF'
      };
    }
  } catch (error) {
    console.error('❌ Error en generateAndDownloadTicketPDF:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error inesperado generando entrada'
    };
  }
};

// Función para enviar email de confirmación de compra (versión original)
export const sendPurchaseConfirmationEmail = async (
  purchaseDetails: PurchaseDetails,
  ticketPdfBlob?: Blob
): Promise<{ success: boolean; message: string }> => {
  try {
    // Preparar parámetros y HTML
    const emailParams = {
      to_name: `${purchaseDetails.user.name} ${purchaseDetails.user.lastName}`,
      to_email: purchaseDetails.user.email,
      order_number: purchaseDetails.orderNumber,
      event_title: purchaseDetails.event.title,
      event_artist: purchaseDetails.event.artist,
      event_date: purchaseDetails.event.date,
      event_time: purchaseDetails.event.time || 'TBD',
      event_venue: purchaseDetails.event.venue,
      event_location: purchaseDetails.event.location || 'Santiago, Chile',
      ticket_quantity: purchaseDetails.quantity.toString(),
      unit_price: purchaseDetails.event.price.toLocaleString('es-CL'),
      service_charge: purchaseDetails.serviceCharge.toLocaleString('es-CL'),
      total_price: purchaseDetails.totalPrice.toLocaleString('es-CL'),
      purchase_date: purchaseDetails.purchaseDate
    };

    const pdfMessageHtml = ticketPdfBlob
      ? `<div style="background: #ecfeff; border: 1px solid #22d3ee; border-radius: 10px; padding: 16px; margin: 20px 0;">
           <p style="margin:0; color:#0e7490;">Hemos adjuntado tu entrada en formato PDF a este email.</p>
         </div>`
      : '';

    const emailHtml = generateConfirmationEmailHTML({ ...emailParams, pdf_message: pdfMessageHtml });

    const payload: any = {
      toEmail: purchaseDetails.user.email,
      toName: `${purchaseDetails.user.name} ${purchaseDetails.user.lastName}`,
      subject: `Tu entrada - Orden ${purchaseDetails.orderNumber}`,
      html: emailHtml
    };

    if (ticketPdfBlob) {
      payload.pdfBase64 = await blobToBase64(ticketPdfBlob);
      payload.pdfFilename = `Entrada_${purchaseDetails.orderNumber}.pdf`;
    }

    console.log('🔍 DEBUG - Payload enviado al backend:', payload);
    
    const resp = await fetch(`${API_BASE}/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('🔍 DEBUG - Respuesta del servidor:', resp.status, resp.statusText);
    
    const data = await resp.json();
    console.log('🔍 DEBUG - Datos de respuesta:', data);
    
    if (!resp.ok || !data.ok) throw new Error(data?.message || 'Error al enviar email');

    return {
      success: true,
      message: ticketPdfBlob
        ? 'Email de confirmación con entrada adjunta enviado exitosamente'
        : 'Email de confirmación enviado exitosamente'
    };
  } catch (error) {
    console.error('Error al enviar email de confirmación (backend):', error);
    return {
      success: false,
      message: `Error al enviar el email de confirmación: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};

// Función para enviar recordatorio del evento (puede ser utilizada posteriormente)
export const sendEventReminderEmail = async (
  user: User,
  event: Event,
  orderNumber: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h2>⏰ Recordatorio de evento</h2>
        <p>Hola ${user.name} ${user.lastName}, te recordamos tu evento:</p>
        <ul>
          <li><strong>${event.title}</strong> - ${event.artist}</li>
          <li>${event.date} ${event.time || ''}</li>
          <li>${event.venue} - ${event.location || 'Santiago, Chile'}</li>
          <li>Orden: ${orderNumber}</li>
        </ul>
      </div>`;

    const resp = await fetch(`${API_BASE}/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: user.email,
        toName: `${user.name} ${user.lastName}`,
        subject: `Recordatorio: ${event.title}`,
        html
      })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data?.message || 'Error al enviar recordatorio');

    return { success: true, message: 'Recordatorio enviado exitosamente' };
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    return {
      success: false,
      message: 'Error al enviar el recordatorio'
    };
  }
};

// Función para generar número de orden único
export const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

// Función para formatear fecha de compra
export const formatPurchaseDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para generar entrada usando jsPDF y QRCode (alternativa a Google Apps Script)
export const generateTicketPDF = async (purchaseDetails: PurchaseDetails): Promise<{ success: boolean; pdfUrl?: string; message: string }> => {
  try {
    // Generar código QR único para la entrada
    // QR solo con RUT (privacidad): si no hay RUT, colocar marcador
    const normalizeRut = (s: string) => s.replace(/\.|-/g, '').toUpperCase();
    const qrCodeData = purchaseDetails.user && purchaseDetails.user.rut
      ? normalizeRut(purchaseDetails.user.rut)
      : 'RUT-NO-DISPONIBLE';

    // Crear nuevo documento PDF con compresión
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true // Habilitar compresión para reducir tamaño
    });

    // Configurar colores y fuentes
    const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
    const secondaryColor: [number, number, number] = [107, 114, 128]; // Gray

    // Header con logo/título
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, 210, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EVENTOSCHILE', 105, 20, { align: 'center' });

    pdf.setFontSize(14);
    pdf.text('ENTRADA DIGITAL', 105, 32, { align: 'center' });

    // Información del evento
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(purchaseDetails.event.title, 105, 60, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Artista: ${purchaseDetails.event.artist}`, 20, 80);
    pdf.text(`Fecha: ${purchaseDetails.event.date}`, 20, 90);
    pdf.text(`Hora: ${purchaseDetails.event.time || 'TBD'}`, 20, 100);
    pdf.text(`Lugar: ${purchaseDetails.event.venue}`, 20, 110);
    pdf.text(`${purchaseDetails.event.location || 'Santiago, Chile'}`, 20, 120);

    // Información del comprador
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL COMPRADOR', 20, 140);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nombre: ${purchaseDetails.user.name} ${purchaseDetails.user.lastName}`, 20, 150);
    pdf.text(`Email: ${purchaseDetails.user.email}`, 20, 160);
    pdf.text(`Cantidad de entradas: ${purchaseDetails.quantity}`, 20, 170);
    // Ya no imprimimos el RUT en el ticket para proteger datos personales

    // Número de orden
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const orderBlockTop = 180; // fijo, ya que no hay línea adicional de RUT
  pdf.rect(20, orderBlockTop, 170, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`NÚMERO DE ORDEN: ${purchaseDetails.orderNumber}`, 105, orderBlockTop + 10, { align: 'center' });

    // Generar y agregar código QR
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
        width: 80, // Reducido de 120 a 80 para menor tamaño
        margin: 1, // Reducido de 2 a 1
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Agregar QR al PDF (tamaño reducido)
  pdf.addImage(qrCodeDataURL, 'PNG', 150, 210, 30, 30); // Reducido de 40x40 a 30x30

      // Texto explicativo del QR
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text('Presenta este código QR', 170, 260, { align: 'center' });
      pdf.text('en la entrada del evento', 170, 265, { align: 'center' });

    } catch (qrError) {
      console.warn('Error generando QR, continuando sin él:', qrError);
      pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      pdf.setFontSize(10);
      pdf.text('Código QR no disponible', 170, 235, { align: 'center' });
    }

    // Información de compra
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DE COMPRA', 20, 210);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Entradas (${purchaseDetails.quantity}): $${purchaseDetails.event.price.toLocaleString('es-CL')} CLP`, 20, 220);
    pdf.text(`Cargo por servicio: $${purchaseDetails.serviceCharge.toLocaleString('es-CL')} CLP`, 20, 230);
    pdf.text(`Total: $${purchaseDetails.totalPrice.toLocaleString('es-CL')} CLP`, 20, 240);
    pdf.text(`Fecha de compra: ${purchaseDetails.purchaseDate}`, 20, 250);

    // Instrucciones
    pdf.setFont('helvetica', 'bold');
    pdf.text('INSTRUCCIONES IMPORTANTES', 20, 270);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('• Presenta este documento en el evento para validar tu entrada', 20, 280);
    pdf.text('• Llega con al menos 30 minutos de anticipación', 20, 285);
    pdf.text('• Recuerda traer un documento de identidad válido', 20, 290);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('Generado por EventosChile - www.eventoschile.cl', 105, 295, { align: 'center' });

    // Convertir PDF a Blob y crear URL de descarga
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      pdfUrl: pdfUrl,
      message: 'Entrada generada exitosamente'
    };

  } catch (error) {
    console.error('Error generando entrada con jsPDF:', error);
    return {
      success: false,
      message: `Error al generar la entrada: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
};
