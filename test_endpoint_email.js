const http = require('http');

const data = JSON.stringify({
    email: 'erickdejesustorres02@gmail.com',
    uuid_publico: '550e8400-e29b-41d4-a716-446655440000',
    nombre_destinatario: 'Erick Torres'
});

const req = http.request({
    hostname: 'localhost',
    port: 3500,
    path: '/api/notificaciones/enviar-email',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, res => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => console.log('RESPONSE:', JSON.parse(raw)));
});

req.on('error', console.error);
req.write(data);
req.end();
