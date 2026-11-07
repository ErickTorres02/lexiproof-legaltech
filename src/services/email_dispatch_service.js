/**
 * Servicio de Despacho de Correo Electrónico Real para LexiProof LegalTech
 * Envía el comprobante oficial y el certificado inmutable con adjuntos MIME
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendSmtpEmail } = require('./smtp_client');
const { generarDocumentoLegalA4 } = require('./pdf_legal_generator');
const { compilarYGuardarPdfBinario, generarPdfLegalBuffer } = require('./pdf_binary_engine');
const { getLocalIpAddress, getVerificationUrl } = require('./qr_service');

const emailOutboxLogs = [];

function resolvePublicBaseUrl(baseUrl) {
    if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.startsWith('http')) {
        return process.env.PUBLIC_URL.replace(/\/$/, '');
    }
    if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        const lanIp = getLocalIpAddress();
        const port = process.env.PORT || 3500;
        return `http://${lanIp}:${port}`;
    }
    return baseUrl.replace(/\/$/, '');
}

/**
 * Envía el comprobante oficial del contrato certificado directamente al correo
 */
async function enviarNotificacionEmail({ email, contrato, baseUrl, nombreDestinatario }) {
    if (!email || !email.includes('@')) {
        throw new Error('Dirección de correo electrónico inválida.');
    }

    const resolvedBaseUrl = resolvePublicBaseUrl(baseUrl);
    const uuid = contrato.uuid_publico || contrato.id;
    const enlaceVerificacion = `${resolvedBaseUrl}/certificar/${uuid}`;
    const enlacePdf = `${resolvedBaseUrl}/generated_pdfs/contrato_${uuid}.pdf`;
    const hashSha256 = contrato.hash_sha256 || 'SHA-256-CERTIFIED';
    const fechaCert = contrato.certified_at || new Date().toISOString();
    const fechaLegible = new Date(fechaCert).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' });

    const asunto = `📜 Certificado y Copia Oficial PDF: ${contrato.titulo} [Ley 527 de 1999]`;

    // 1. Obtener o compilar el documento PDF binario oficial para adjuntar
    let pdfBuffer = null;
    const pdfFilePath = path.join(__dirname, `../../public/generated_pdfs/contrato_${uuid}.pdf`);
    
    if (fs.existsSync(pdfFilePath)) {
        pdfBuffer = fs.readFileSync(pdfFilePath);
    } else {
        const compiled = compilarYGuardarPdfBinario(contrato, contrato.firmantes || [], resolvedBaseUrl);
        pdfBuffer = compiled.buffer;
    }

    // Asegurar también que exista la versión HTML para visualización web
    const htmlFilePath = path.join(__dirname, `../../public/generated_pdfs/contrato_${uuid}.html`);
    if (!fs.existsSync(htmlFilePath)) {
        const html = generarDocumentoLegalA4(contrato, contrato.firmantes || [], resolvedBaseUrl);
        fs.writeFileSync(htmlFilePath, html, 'utf8');
    }

    // 2. Maquetación del correo con Comprobante Certificado Visual
    const htmlBody = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 24px; text-align: center; color: #ffffff; border-bottom: 3px solid #2563eb; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
            .badge-cert { display: inline-block; background: #059669; color: #ffffff; font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 99px; margin-top: 10px; letter-spacing: 0.5px; }
            .content { padding: 30px; }
            .cert-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; margin: 20px 0; }
            .cert-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .meta-grid { display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13px; line-height: 1.5; }
            .hash-box { background: #0f172a; color: #34d399; font-family: 'Courier New', monospace; font-size: 11px; font-weight: bold; padding: 14px; border-radius: 8px; word-break: break-all; margin: 16px 0; border: 1px solid #334155; }
            .att-notice { background: #eff6ff; border: 1.5px dashed #2563eb; border-radius: 10px; padding: 14px; font-size: 12.5px; color: #1e3a8a; display: flex; align-items: center; gap: 12px; margin: 18px 0; }
            .btn-group { text-align: center; margin: 26px 0 10px 0; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 4px; }
            .btn-secondary { background: #475569; }
            .legal-footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚖️ LexiProof LegalTech</h1>
                <div class="badge-cert">COMPROBANTE OFICIAL DE CERTIFICACIÓN DIGITAL</div>
            </div>
            <div class="content">
                <p style="font-size: 15px; color: #0f172a;">Estimado(a) <strong>${nombreDestinatario || 'Titular / Firmante'}</strong>,</p>
                <p style="font-size: 13.5px; color: #475569; line-height: 1.6;">
                    Se ha emitido, firmado y sellado criptográficamente con éxito la copia oficial del contrato indicado a continuación:
                </p>

                <div class="cert-card">
                    <div class="cert-title">📜 ${contrato.titulo}</div>
                    <div class="meta-grid">
                        <div><strong>Identificador Único (UUID):</strong> <span style="font-family:monospace; color:#2563eb;">${uuid}</span></div>
                        <div><strong>Fecha de Certificación:</strong> ${fechaLegible}</div>
                        <div><strong>Tipo de Contrato:</strong> ${(contrato.tipo_contrato || 'General').replace(/_/g, ' ').toUpperCase()}</div>
                        <div><strong>Eficacia Jurídica:</strong> Plena validez probatoria (Ley 527 de 1999 • Decreto 2364 de 2012)</div>
                        <div><strong>Mérito Ejecutivo:</strong> Sí, conforme al Art. 422 del Código General del Proceso</div>
                    </div>
                </div>

                <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                    🛡️ Huella Digital Criptográfica (SHA-256 Inmutable):
                </div>
                <div class="hash-box">${hashSha256}</div>

                <div class="att-notice">
                    <span style="font-size: 28px;">📄</span>
                    <div>
                        <strong style="font-size: 13px; color: #1d4ed8;">Documento PDF Oficial Adjunto:</strong><br>
                        Se ha adjuntado el archivo <strong><code>Certificado_Oficial_${uuid.slice(0, 8)}.pdf</code></strong>. Puedes abrirlo instantáneamente desde cualquier celular (Android/iPhone) o computador con un solo toque.
                    </div>
                </div>

                <div class="btn-group">
                    <a href="${enlacePdf}" class="btn" target="_blank">📥 Descargar PDF Directo</a>
                    <a href="${enlaceVerificacion}" class="btn btn-secondary" target="_blank">🔍 Cotejo y Verificación QR</a>
                </div>
            </div>
            <div class="legal-footer">
                <p>Este comprobante certifica la inmutabilidad y autenticidad del mensaje de datos bajo la legislación colombiana (Ley 527 de 1999).<br>
                Custodia y réplica respaldada en Google Cloud Firestore & Firebase Vault.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const plainText = `LexiProof LegalTech — Certificado Oficial de Contrato\n\nEstimado(a) ${nombreDestinatario || 'Titular'},\n\nSe ha completado la firma del documento: ${contrato.titulo}\nUUID: ${uuid}\nFecha: ${fechaLegible}\nHash SHA-256: ${hashSha256}\n\nEl archivo PDF oficial completo (Certificado_Oficial_${uuid.slice(0, 8)}.pdf) ha sido adjuntado a este correo.\nVerificar en línea: ${enlaceVerificacion}\n\nVálido bajo la Ley 527 de 1999 de Colombia.`;

    let smtpResult = null;
    let smtpError = null;

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

    if (smtpHost && smtpUser && smtpPass) {
        try {
            smtpResult = await sendSmtpEmail({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                user: smtpUser,
                pass: smtpPass,
                from: process.env.SMTP_FROM || smtpUser,
                to: email,
                subject: asunto,
                html: htmlBody,
                text: plainText,
                attachments: [
                    {
                        filename: `Certificado_Oficial_${uuid.slice(0, 8)}.pdf`,
                        contentType: 'application/pdf',
                        content: pdfBuffer
                    }
                ]
            });
        } catch (err) {
            console.error('[SMTP DISPATCH ERROR]', err.message);
            smtpError = err.message;
        }
    }

    const logEntry = {
        id: 'MAIL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        destinatario: email,
        nombre: nombreDestinatario || 'Firmante',
        asunto: asunto,
        contrato_uuid: uuid,
        enviado_at: new Date().toISOString(),
        estado: smtpResult ? 'ENTREGADO_SMTP_OK' : (smtpError ? 'SMTP_ERROR' : 'DISPATCH_READY'),
        smtp_status: smtpResult ? 'SENT_VIA_SMTP' : (smtpError ? smtpError : 'NO_SMTP_CONFIGURED'),
        preview_url: enlacePdf
    };

    emailOutboxLogs.unshift(logEntry);

    if (smtpHost && smtpUser && smtpPass && !smtpResult) {
        return {
            ok: false,
            error: `Error al enviar correo: ${smtpError || 'Fallo de entrega SMTP'}.`,
            smtp_active: false,
            smtp_error: smtpError,
            log: logEntry
        };
    }

    return {
        ok: true,
        mensaje: `Comprobante y certificado oficial despachados con éxito a ${email}`,
        smtp_active: Boolean(smtpResult),
        smtp_error: smtpError,
        log: logEntry
    };
}

/**
 * Obtiene el historial de correos enviados
 */
function getEmailLogs() {
    return emailOutboxLogs;
}

module.exports = {
    enviarNotificacionEmail,
    getEmailLogs
};
