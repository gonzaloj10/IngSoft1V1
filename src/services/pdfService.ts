import { PurchaseDetails, PDFResult } from '../types/emailTypes';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

export const generateTicketPDFLocal = async (
  purchaseDetails: PurchaseDetails
): Promise<PDFResult> => {
  try {
    // Generar QR solo con RUT (privacidad). Si no hay RUT, usar marcador.
    const normalizeRut = (s: string) => s.replace(/\.|-/g, '').toUpperCase();
    const qrCodeData = purchaseDetails.user && purchaseDetails.user.rut
      ? normalizeRut(purchaseDetails.user.rut)
      : 'RUT-NO-DISPONIBLE';

    // Crear nuevo documento PDF con compresión
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
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
    pdf.text('EVENTOS VIÑA', 105, 20, { align: 'center' });

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

    // Número de orden
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(20, 180, 170, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`NÚMERO DE ORDEN: ${purchaseDetails.orderNumber}`, 105, 190, { align: 'center' });

    // Generar y agregar código QR
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Agregar QR al PDF
      pdf.addImage(qrCodeDataURL, 'PNG', 150, 210, 30, 30);

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
    
    // Convertir a base64 para envío por email
    const pdfBase64 = pdf.output('datauristring').split(',')[1]; // Obtener solo la parte base64

    return {
      success: true,
      pdfUrl: pdfUrl,
      pdfBlob: pdfBlob,
      pdfBase64: pdfBase64,
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