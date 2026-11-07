const { sendSmtpEmail } = require('./src/services/smtp_client');

async function testSender() {
    console.log('Probando autenticación con gestionhotel.pro@gmail.com...');
    try {
        const res = await sendSmtpEmail({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            user: 'gestionhotel.pro@gmail.com',
            pass: 'ksyusnybgubqbfep',
            from: 'gestionhotel.pro@gmail.com',
            to: 'erickdejesustorres02@gmail.com',
            subject: '⚖️ LexiProof LegalTech — Contrato Certificado y Prueba de Entrega',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e40af; margin-top: 0;">⚖️ LexiProof LegalTech</h2>
                    <div style="background: #059669; color: #ffffff; padding: 6px 12px; border-radius: 99px; font-size: 12px; display: inline-block; font-weight: bold; margin-bottom: 15px;">
                        CONTRATO DIGITAL CERTIFICADO — LEY 527 DE 1999
                    </div>
                    <p>Hola <strong>Erick</strong>,</p>
                    <p>Este correo confirma que el motor de despacho automático de <strong>LexiProof LegalTech</strong> está 100% operativo y conectado a la nube.</p>
                    <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0;">
                        <p style="margin: 3px 0;"><strong>Emisor:</strong> gestionhotel.pro@gmail.com</p>
                        <p style="margin: 3px 0;"><strong>Destinatario:</strong> erickdejesustorres02@gmail.com</p>
                        <p style="margin: 3px 0;"><strong>Sello Criptográfico:</strong> SHA-256 Inmutable</p>
                        <p style="margin: 3px 0;"><strong>Custodia:</strong> Google Cloud Firestore NoSQL</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">Despacho formal bajo el marco de la Ley 527 de 1999 de Colombia.</p>
                </div>
            `,
            text: 'LexiProof LegalTech — Prueba de entrega automatica exitosa a tu correo erickdejesustorres02@gmail.com'
        });
        console.log('🎉 RESULTADO ÉXITO:', res);
    } catch (err) {
        console.error('❌ ERROR AL ENVIAR:', err.message);
    }
}

testSender();
