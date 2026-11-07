const fs = require('fs');
const path = require('path');
const db = require('./db');
const { compilarYGuardarPDF } = require('../src/services/pdf_legal_generator');
const { generarMatrizEvidencia } = require('../src/services/crypto_certifier');

const DB_FILE = path.join(__dirname, 'lexiproof_db.json');

const data = {
    usuarios_comercio: [
        {
            id: "a1b2c3d4-0001-4000-8000-000000000001",
            nombre_razon_social: "LexiProof LegalTech Colombia S.A.S.",
            nit_o_cc: "901.789.456-3",
            email: "contacto@lexiproof.co",
            telefono: "+57 (601) 745-8900",
            representante_legal: "Dr. Alejandro Restrepo Morales",
            direccion_fiscal: "Cra 7 # 71-21, Torre Empresarial, Bogotá D.C.",
            api_key: "lexi_live_secret_998877665544332211",
            created_at: "2026-09-01T08:00:00.000Z",
            updated_at: "2026-09-01T08:00:00.000Z"
        }
    ],
    contratos: [
        {
            id: "c1000000-1111-4000-8000-000000000001",
            uuid_publico: "550e8400-e29b-41d4-a716-446655440000",
            comercio_id: "a1b2c3d4-0001-4000-8000-000000000001",
            tipo_contrato: "arrendamiento_vivienda",
            titulo: "Contrato de Arrendamiento de Apartamento 502 - Edificio Altos de Chapinero",
            valor_total: 2800000,
            moneda: "COP",
            contenido_markdown: `# CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA

Entre los suscritos a saber: **INMOBILIARIA LEXIPROOF S.A.S.**, identificada con NIT N° **901.789.456-3**, quien en adelante se denominará **EL ARRENDADOR**; y por la otra parte, **DR. SANTIAGO JARAMILLO OROZCO**, mayor de edad, identificado con Cédula de Ciudadanía N° **1.018.456.789**, quien en adelante se denominará **EL ARRENDATARIO**, hemos convenido celebrar el presente contrato de arrendamiento conforme a la **Ley 820 de 2003**:

### CLÁUSULA PRIMERA. — OBJETO DEL CONTRATO
**EL ARRENDADOR** concede a título de arrendamiento a **EL ARRENDATARIO** el goce del inmueble identificado como Apartamento 502, ubicado en la Carrera 7 # 71-21 de la ciudad de Bogotá D.C.

### CLÁUSULA SEGUNDA. — CANON DE ARRENDAMIENTO
El precio mensual del arrendamiento es la suma de **DOS MILLONES OCHOCIENTOS MIL PESOS M/CTE ($2.800.000 COP)**, pagaderos dentro de los primeros cinco (5) días calendario de cada mes.

### CLÁUSULA TERCERA. — VIGENCIA Y PRÓRROGA
El término de duración será de **doce (12) meses**, contados a partir del 1 de Septiembre de 2026.

### CLÁUSULA CUARTA. — CLÁUSULA PENAL PECUNIARIA
El incumplimiento de cualquiera de las obligaciones generará a cargo de la parte incumplida una pena equivalente a **dos (2) cánones mensuales de arrendamiento ($5.600.000 COP)**.

### CLÁUSULA QUINTA. — MÉRITO EJECUTIVO Y RENUNCIA A REQUERIMIENTOS
El presente contrato presta **MÉRITO EJECUTIVO** en los términos del Artículo 422 del Código General del Proceso (Ley 1564 de 2012). **EL ARRENDATARIO** renuncia expresamente a requerimientos privados o judiciales para ser constituido en mora.

### CLÁUSULA SEXTA. — FIRMA ELECTRÓNICA Y VALIDEZ PROBATORIA (LEY 527 DE 1999)
Las partes suscriben este mensaje de datos con firma electrónica y sellado criptográfico SHA-256 reconociendo su plena validez probatoria de conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
            estado: "completado_certificado",
            certified_at: "2026-09-01T15:15:00.000Z",
            created_at: "2026-09-01T14:00:00.000Z",
            firmantes: [
                {
                    id: "f1000000-1111-4000-8000-000000000001",
                    contrato_id: "c1000000-1111-4000-8000-000000000001",
                    rol: "arrendador",
                    nombre_completo: "Inmobiliaria LexiProof S.A.S.",
                    tipo_identificacion: "NIT",
                    identificacion: "901.789.456-3",
                    email: "arriendos@lexiproof.co",
                    direccion_ip: "190.85.122.45",
                    fecha_firma: "2026-09-01T14:30:00.000Z"
                },
                {
                    id: "f1000000-1111-4000-8000-000000000002",
                    contrato_id: "c1000000-1111-4000-8000-000000000001",
                    rol: "arrendatario",
                    nombre_completo: "Santiago Jaramillo Orozco",
                    tipo_identificacion: "CC",
                    identificacion: "1.018.456.789",
                    email: "santiago.jaramillo@outlook.com",
                    direccion_ip: "186.84.90.12",
                    fecha_firma: "2026-09-01T15:10:00.000Z"
                }
            ]
        },
        {
            id: "c2000000-2222-4000-8000-000000000002",
            uuid_publico: "54eae53e-0d6c-4292-b728-05bd22758082",
            comercio_id: "a1b2c3d4-0001-4000-8000-000000000001",
            tipo_contrato: "prestacion_servicios",
            titulo: "Contrato de Prestación de Servicios de Consultoría en Ciberseguridad e IA",
            valor_total: 6500000,
            moneda: "COP",
            contenido_markdown: `# CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

Entre los suscritos a saber: **LEXIPROOF LEGALTECH S.A.S.**, identificada con NIT N° **901.789.456-3**, quien en adelante se denominará **EL CONTRATANTE**; y por la otra parte, **CARLOS EDUARDO MORALES BENÍTEZ**, mayor de edad, identificado con Cédula de Ciudadanía N° **1.045.789.234**, quien en adelante se denominará **EL CONTRATISTA**, hemos convenido celebrar el presente contrato de prestación de servicios:

### CLÁUSULA PRIMERA. — OBJETO DEL CONTRATO
**EL CONTRATISTA** se compromete para con **EL CONTRATANTE** a prestar sus servicios profesionales independientes consistentes en: Consultoría Especializada en Ciberseguridad, Auditoría Forense y Modelos de Inteligencia Artificial para LegalTech.

### CLÁUSULA SEGUNDA. — HONORARIOS Y FORMA DE PAGO
Como contraprestación, **EL CONTRATANTE** pagará a **EL CONTRATISTA** la suma de **SEIS MILLONES QUINIENTOS MIL PESOS M/CTE ($6.500.000 COP)**, pagaderos según los entregables acordados a satisfacción.

### CLÁUSULA TERCERA. — VIGENCIA Y AUTONOMÍA
El plazo de ejecución será de **seis (6) meses**. Las partes declaran que el presente acuerdo no genera vínculo laboral de conformidad con el Artículo 34 del Código Sustantivo del Trabajo.

### CLÁUSULA CUARTA. — MÉRITO EJECUTIVO Y RENUNCIA A REQUERIMIENTOS
El presente contrato presta **MÉRITO EJECUTIVO** de acuerdo con el Artículo 422 del Código General del Proceso (Ley 1564 de 2012).

### CLÁUSULA QUINTA. — MENSAJES DE DATOS Y CERTIFICACIÓN DIGITAL (LEY 527 DE 1999)
Este contrato se suscribe en forma de mensaje de datos, reconociendo la plena eficacia probatoria, autenticidad, integridad y no repudio del Hash SHA-256 generado bajo la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
            estado: "completado_certificado",
            certified_at: "2026-09-17T19:44:20.658Z",
            created_at: "2026-09-17T19:00:00.000Z",
            firmantes: [
                {
                    id: "f2000000-2222-4000-8000-000000000001",
                    contrato_id: "c2000000-2222-4000-8000-000000000002",
                    rol: "contratante",
                    nombre_completo: "LexiProof LegalTech S.A.S.",
                    tipo_identificacion: "NIT",
                    identificacion: "901.789.456-3",
                    email: "legal@lexiproof.co",
                    direccion_ip: "190.85.122.45",
                    fecha_firma: "2026-09-17T19:30:00.000Z"
                },
                {
                    id: "f2000000-2222-4000-8000-000000000002",
                    contrato_id: "c2000000-2222-4000-8000-000000000002",
                    rol: "contratista",
                    nombre_completo: "Carlos Eduardo Morales Benítez",
                    tipo_identificacion: "CC",
                    identificacion: "1.045.789.234",
                    email: "carlos.morales@tech.co",
                    direccion_ip: "186.84.90.12",
                    fecha_firma: "2026-09-17T19:44:00.000Z"
                }
            ]
        }
    ],
    firmantes: [],
    auditoria_accesos_qr: []
};

// Compilar PDFs para ambos contratos
data.contratos.forEach(c => {
    const firmantes = c.firmantes;
    const matriz = generarMatrizEvidencia(c, firmantes, { ip: "127.0.0.1", userAgent: "LexiProof Notary Engine" });
    c.hash_sha256 = matriz.hash_sha256;
    c.datos_matriz_evidencia = matriz.matriz_evidencia;
    
    const { rutaRelativa } = compilarYGuardarPDF(c, firmantes, "http://localhost:3500");
    c.ruta_pdf = rutaRelativa;

    firmantes.forEach(f => data.firmantes.push(f));
});

fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('✨ Base de datos y contratos PDF generados con tipografía notarial impecable y 100% UTF-8.');
