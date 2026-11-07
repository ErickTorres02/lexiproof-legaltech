const http = require('http');

async function testRedaction() {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            tipo_contrato: 'arrendamiento_vivienda',
            arrendador_nombre: 'Dr. Fernando Restrepo',
            arrendador_cedula: '79845123',
            arrendatario_nombre: 'Dra. Carolina Villegas',
            arrendatario_cedula: '52896321',
            inmueble_direccion: 'Carrera 15 # 93-40 Oficina 601, Bogotá D.C.',
            canon_mensual: '4500000',
            duracion_meses: '12',
            fecha_inicio: '2026-11-01',
            clausulas_adicionales: 'El arrendatario destinará el inmueble exclusivamente a consultoría jurídica.'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3500,
            path: '/api/ia/redactar-contrato',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let buffer = '';
            res.on('data', d => {
                buffer += d.toString();
            });
            res.on('end', () => {
                console.log('HTTP Status:', res.statusCode);
                console.log('Total Response Bytes:', buffer.length);
                const sample = buffer.slice(0, 500);
                console.log('Preview Response:\n', sample);
                resolve(buffer);
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

testRedaction().then(() => console.log('✅ TEST COMPLETED SUCCESSFULLY')).catch(console.error);
