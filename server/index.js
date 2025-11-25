// Simple Express backend for sending emails with SendGrid
// Keep secrets on the server side only
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 4000;

// Configure SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (!SENDGRID_API_KEY) {
  console.warn('[server] WARNING: SENDGRID_API_KEY is not set. Emails will fail until it is configured.');
}
sgMail.setApiKey(SENDGRID_API_KEY);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' })); // allow base64 PDF payloads

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Send purchase confirmation with optional PDF attachment
// Expects: { toEmail, toName, subject, html, pdfBase64?, pdfFilename? }
app.post('/api/send-confirmation', async (req, res) => {
  try {
    console.log('[server] 📨 Recibida petición de envío de email');
    const { toEmail, toName, subject, html, pdfBase64, pdfFilename } = req.body || {};
    
    console.log('[server] 📧 Destinatario:', toEmail);
    console.log('[server] 📧 Asunto:', subject);
    console.log('[server] 📧 Tiene PDF adjunto:', !!pdfBase64);

    if (!toEmail || !subject || !html) {
      console.error('[server] ❌ Faltan campos requeridos');
      return res.status(400).json({ ok: false, message: 'Missing required fields: toEmail, subject, html' });
    }

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM || 'no-reply@example.com',
      subject,
      html,
    };

    if (pdfBase64 && pdfFilename) {
      msg.attachments = [
        {
          content: pdfBase64,
          filename: pdfFilename,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];
    }

    console.log('[server] 📤 Enviando email vía SendGrid...');
    const sgRes = await sgMail.send(msg);
    console.log('[server] ✅ Email enviado exitosamente. Message ID:', sgRes?.[0]?.headers?.['x-message-id']);
    return res.json({ ok: true, messageId: sgRes?.[0]?.headers?.['x-message-id'] || null });
  } catch (err) {
    console.error('[server] ❌ Error sending email:', err?.response?.body || err);
    return res.status(500).json({ ok: false, message: 'Failed to send email', error: err?.message || String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] SendGrid email server running on http://localhost:${PORT}`);
});
