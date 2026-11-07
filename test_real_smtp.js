const { sendSmtpEmail } = require('./src/services/smtp_client');

async function testGmailSmtp() {
    console.log('Enviando correo real de prueba a Gmail SMTP...');
    try {
        const res = await sendSmtpEmail({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            user: 'erickdejesustorres02@gmail.com',
            pass: 'ksyusnybgubqbfep',
            from: 'erickdejesustorres02@gmail.com',
            to: 'erickdejesustorres02@gmail.com',
            subject: '⚖️ LexiProof LegalTech — Prueba de Conexión Exitosa',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #1e40af;">⚖️ LexiProof LegalTech</h2>
                    <p>¡Hola! Este es un correo de confirmación real enviado automáticamente desde tu servidor <strong>LexiProof</strong>.</p>
                    <p>Tu servicio de correo SMTP de Google ha quedado <strong>100% configurado y activo</strong>.</p>
                    <div style="background: #0f172a; color: #34d399; padding: 10px; border-radius: 6px; font-family: monospace;">
                        ESTADO: CONECTADO_OK (smtp.gmail.com:465)
                    </div>
                </div>
            `,
            text: 'LexiProof LegalTech — Prueba de conexion SMTP exitosa.'
        });
        console.log('✅ ÉXITO:', res);
    } catch (err) {
        console.error('❌ ERROR SMTP:', err);
    }
}

testGmailSmtp();
