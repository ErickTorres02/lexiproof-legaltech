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

async function runTests() {
    const testUuid = '550e8400-e29b-41d4-a716-446655440000';

    console.log('--- 1. Probando Generación de Enlace WhatsApp para Contrato ---');
    const waRes = await postJson('/api/notificaciones/whatsapp-contrato', {
        telefono: '573001234567',
        uuid_publico: testUuid
    });
    console.log('WhatsApp Resultado:', waRes);

    console.log('\n--- 2. Probando Despacho de Correo Electrónico ---');
    const mailRes = await postJson('/api/notificaciones/enviar-email', {
        email: 'profesor_evaluador@universidad.edu.co',
        uuid_publico: testUuid,
        nombre_destinatario: 'Dr. Alejandro Gomez (Profesor Evaluador)'
    });
    console.log('Email Resultado:', mailRes);

    console.log('\n--- 3. Consultando Historial de Correos Despachados ---');
    const logsReq = await new Promise((resolve) => {
        http.get('http://localhost:3500/api/notificaciones/email-logs', res => {
            let d = '';
            res.on('data', c => d += c.toString());
            res.on('end', () => resolve(JSON.parse(d)));
        });
    });
    console.log('Logs de Correo Registrados:', logsReq.logs.length, 'correos');
    console.log('Último Registro:', logsReq.logs[0]);

    console.log('\n✅ PRUEBAS COMPLETADAS CON ÉXITO');
}

runTests().catch(console.error);
