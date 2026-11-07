const fs = require('fs');
const path = require('path');
const { compilarYGuardarPdfBinario, generarPdfLegalBuffer } = require('./src/services/pdf_binary_engine');

const testContrato = {
    id: 'test-123',
    uuid_publico: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    titulo: 'ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)',
    tipo_contrato: 'nda_confidencialidad',
    contenido_markdown: `# ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN

Entre las partes: **PARTE REVELADORA S.A.S.** (NIT 900.123.456-7) y **PARTE RECEPTORA** (C.C. 1.020.304.050).

### CLÁUSULA PRIMERA. — OBJETO
Regula la entrega y custodia de información técnica, comercial y software confidencial.

### CLÁUSULA SEGUNDA. — OBLIGACIONES DE RESERVA
La parte receptora se obliga a no divulgar, copiar ni transferir información a terceros sin autorización escrita.

### CLÁUSULA TERCERA. — CLÁUSULA PENAL
En caso de incumplimiento, la parte infractora pagará una penalidad de $50.000.000 COP.

### CLÁUSULA CUARTA. — FIRMA ELECTRÓNICA
Suscrito bajo la Ley 527 de 1999 de Colombia con plena validez probatoria.`,
    hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    certified_at: new Date().toISOString()
};

const firmantes = [
    {
        rol: 'parte_emisora',
        nombre_completo: 'Grupo Tecnológico S.A.S.',
        tipo_identificacion: 'NIT',
        identificacion: '900.123.456-7',
        direccion_ip: '192.168.1.7',
        fecha_firma: new Date().toISOString()
    },
    {
        rol: 'parte_receptora',
        nombre_completo: 'Carlos Restrepo Gómez',
        tipo_identificacion: 'CC',
        identificacion: '1.020.304.050',
        direccion_ip: '192.168.1.20',
        fecha_firma: new Date().toISOString()
    }
];

const res = compilarYGuardarPdfBinario(testContrato, firmantes, 'http://192.168.1.7:3500');
console.log('PDF generado exitosamente!');
console.log('Tamaño en bytes:', res.buffer.length);
console.log('Ruta:', res.rutaAbsoluta);
