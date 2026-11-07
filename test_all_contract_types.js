const http = require('http');

function testRedact(tipo, titulo, parte1, id1, parte2, id2) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            tipo_contrato: tipo,
            titulo: titulo,
            parte_emisora_nombre: parte1,
            parte_emisora_id: id1,
            parte_receptora_nombre: parte2,
            parte_receptora_id: id2,
            monto_valor: '$20.000.000 COP',
            duracion_plazo: '24 meses',
            ciudad: 'Cali, Colombia'
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
            res.on('data', d => buffer += d.toString());
            res.on('end', () => {
                const chunks = buffer.split('\n\n').filter(l => l.startsWith('data: ')).map(l => {
                    try { return JSON.parse(l.substring(6)).text || ''; } catch(e) { return ''; }
                }).join('');
                console.log(`\n======================================================`);
                console.log(`TIPO TEST: ${tipo}`);
                console.log(`TITULO GENERADO (primeras 200 letras):`);
                console.log(chunks.slice(0, 200));
                console.log(`======================================================`);
                resolve(chunks);
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    await testRedact('nda_confidencialidad', 'Acuerdo de Confidencialidad NDA', 'Grupo Andino S.A.S.', '900.789.654-1', 'Sofia Ramirez', '1.032.654.987');
    await testRedact('compraventa', 'Compraventa de Equipos', 'Vendedora Caribe S.A.S.', '901.333.444-5', 'Javier Paternina', '1.047.889.001');
    await testRedact('prestacion_servicios', 'Consultoria Software', 'NovaTech S.A.S.', '901.450.880-2', 'Carlos Morales', '1.045.789.234');
    await testRedact('arrendamiento_vivienda', 'Arrendamiento Apto 402', 'Maria Gomez', '52.890.123', 'Andres Valencia', '1.018.456.789');
}

runTests().catch(console.error);
