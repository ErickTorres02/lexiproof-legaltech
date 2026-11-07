const http = require('http');

function postJson(path, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: 3500,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let buffer = '';
            res.on('data', d => buffer += d.toString());
            res.on('end', () => {
                try {
                    resolve(JSON.parse(buffer));
                } catch (e) {
                    resolve(buffer);
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runTest() {
    console.log('1. Solicitando OTP WhatsApp...');
    const otpRes = await postJson('/api/otp/solicitar', {
        telefono: '+573001234567',
        nombre: 'Dr. Roberto Mejia',
        rol: 'Arrendador',
        titulo_contrato: 'Contrato de Arrendamiento Comercial'
    });
    console.log('OTP Solicitado:', otpRes);

    console.log('\n2. Validando Código OTP...');
    const valRes = await postJson('/api/otp/validar', {
        telefono: '+573001234567',
        codigo: otpRes.codigo_otp
    });
    console.log('OTP Validación:', valRes);

    console.log('\n3. Certificando Contrato con Matriz SHA-256 y Google Firestore...');
    const certRes = await postJson('/api/contratos/certificar', {
        titulo: 'Contrato de Arrendamiento Comercial Corporativo',
        tipo_contrato: 'arrendamiento_vivienda',
        valor_total: 4500000,
        contenido_markdown: '# CONTRATO DE ARRENDAMIENTO COMERCIAL\n\nCláusula 1: Objeto...\nCláusula 2: Canon...',
        firmantes: [
            {
                rol: 'Arrendador',
                nombre_completo: 'Dr. Roberto Mejia',
                identificacion: '79845123',
                telefono: '+573001234567',
                otp_verified: true,
                otp_token: valRes.token_2fa,
                firma_imagen_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
        ]
    });
    console.log('\nCertificación Resultado:');
    console.log('OK:', certRes.ok);
    console.log('UUID Público:', certRes.uuid_publico);
    console.log('Hash SHA-256:', certRes.hash_sha256);
    console.log('Ruta PDF:', certRes.ruta_pdf);
    console.log('Google Cloud Firestore Sync:', certRes.firestore_sync);
}

runTest().catch(console.error);
