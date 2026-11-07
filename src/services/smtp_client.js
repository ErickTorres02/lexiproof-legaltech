const tls = require('tls');
const net = require('net');

/**
 * Cliente SMTP nativo en Node.js con soporte TLS y adjuntos MIME multipart/mixed
 */
function sendSmtpEmail({ host, port = 465, secure = true, user, pass, from, to, subject, html, text, attachments = [] }) {
    return new Promise((resolve, reject) => {
        let socket;
        let step = 0;
        let responseBuffer = '';

        const connectOptions = {
            host: host,
            port: port,
            rejectUnauthorized: false
        };

        const handleData = (chunk) => {
            const dataStr = chunk.toString();
            responseBuffer += dataStr;
            const lines = responseBuffer.split('\r\n').filter(l => l.trim().length > 0);
            const lastLine = lines[lines.length - 1];

            if (!/^\d{3}\s/.test(lastLine)) {
                return; // Esperar línea final de respuesta SMTP
            }

            const code = parseInt(lastLine.substring(0, 3), 10);
            responseBuffer = '';

            if (code >= 400) {
                socket.end();
                return reject(new Error(`SMTP Error [${code}]: ${lastLine}`));
            }

            if (step === 0) {
                // 220 Saludo de bienvenida
                step = 1;
                socket.write(`EHLO ${socket.localAddress || 'localhost'}\r\n`);
            } else if (step === 1) {
                // EHLO respuesta
                if (user && pass) {
                    step = 2;
                    socket.write('AUTH LOGIN\r\n');
                } else {
                    step = 4;
                    socket.write(`MAIL FROM:<${from || user}>\r\n`);
                }
            } else if (step === 2) {
                // 334 Username
                step = 3;
                socket.write(Buffer.from(user.trim()).toString('base64') + '\r\n');
            } else if (step === 3) {
                // 334 Password
                step = 4;
                socket.write(Buffer.from(pass.replace(/\s+/g, '').trim()).toString('base64') + '\r\n');
            } else if (step === 4) {
                // 235 Autenticado
                step = 5;
                socket.write(`MAIL FROM:<${from || user}>\r\n`);
            } else if (step === 5) {
                // 250 Remitente OK
                step = 6;
                socket.write(`RCPT TO:<${to.trim()}>\r\n`);
            } else if (step === 6) {
                // 250 Destinatario OK
                step = 7;
                socket.write('DATA\r\n');
            } else if (step === 7) {
                // 354 Escribir mensaje
                step = 8;
                const dateHeader = new Date().toUTCString();
                const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

                let rawMail = '';
                
                if (attachments && attachments.length > 0) {
                    // Mensaje Multipart con Adjuntos
                    rawMail += `From: "LexiProof LegalTech" <${from || user}>\r\n`;
                    rawMail += `To: <${to.trim()}>\r\n`;
                    rawMail += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
                    rawMail += `Date: ${dateHeader}\r\n`;
                    rawMail += `MIME-Version: 1.0\r\n`;
                    rawMail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

                    // Cuerpo HTML
                    rawMail += `--${boundary}\r\n`;
                    rawMail += `Content-Type: text/html; charset=UTF-8\r\n`;
                    rawMail += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                    rawMail += `${html || text || ''}\r\n\r\n`;

                    // Archivos Adjuntos
                    for (const att of attachments) {
                        const filename = att.filename || 'documento_certificado.html';
                        const contentType = att.contentType || 'text/html; charset=UTF-8';
                        const contentBase64 = Buffer.isBuffer(att.content) 
                            ? att.content.toString('base64') 
                            : Buffer.from(att.content, 'utf8').toString('base64');

                        rawMail += `--${boundary}\r\n`;
                        rawMail += `Content-Type: ${contentType}; name="${filename}"\r\n`;
                        rawMail += `Content-Disposition: attachment; filename="${filename}"\r\n`;
                        rawMail += `Content-Transfer-Encoding: base64\r\n\r\n`;
                        
                        // Envolver base64 cada 76 caracteres
                        const chunks = contentBase64.match(/.{1,76}/g) || [contentBase64];
                        rawMail += chunks.join('\r\n') + '\r\n\r\n';
                    }

                    rawMail += `--${boundary}--\r\n.\r\n`;
                } else {
                    // Mensaje simple HTML
                    rawMail += `From: "LexiProof LegalTech" <${from || user}>\r\n`;
                    rawMail += `To: <${to.trim()}>\r\n`;
                    rawMail += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
                    rawMail += `Date: ${dateHeader}\r\n`;
                    rawMail += `MIME-Version: 1.0\r\n`;
                    rawMail += `Content-Type: text/html; charset=UTF-8\r\n`;
                    rawMail += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
                    rawMail += `${html || text || ''}\r\n.\r\n`;
                }

                socket.write(rawMail);
            } else if (step === 8) {
                // 250 Mensaje aceptado
                step = 9;
                socket.write('QUIT\r\n');
                resolve({ ok: true, message: 'Correo con comprobante adjunto entregado exitosamente al servidor SMTP.', smtpResponse: lastLine });
            }
        };

        if (secure || port === 465) {
            socket = tls.connect(connectOptions, () => {
                socket.on('data', handleData);
            });
        } else {
            socket = net.connect(connectOptions, () => {
                socket.on('data', handleData);
            });
        }

        socket.on('error', (err) => {
            reject(new Error(`Error de conexión SMTP (${host}:${port}): ${err.message}`));
        });

        socket.setTimeout(20000, () => {
            socket.destroy();
            reject(new Error(`Tiempo de espera agotado al conectar al servidor SMTP (${host}:${port})`));
        });
    });
}

module.exports = {
    sendSmtpEmail
};
