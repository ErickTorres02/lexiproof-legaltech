const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { generarMatrizEvidencia } = require('../src/services/crypto_certifier');
const { compilarYGuardarPDF } = require('../src/services/pdf_legal_generator');

console.log('[SEED] Generando contratos semilla con certificación SHA-256...');

const contrato1 = {
    id: "c1000000-1111-4000-8000-000000000001",
    uuid_publico: "550e8400-e29b-41d4-a716-446655440000",
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

### CLÁUSULA TERCERA. — VIGENCIA
El término de duración será de **doce (12) meses**, contados a partir del 1 de Septiembre de 2026.

### CLÁUSULA CUARTA. — CLÁUSULA PENAL PECUNIARIA
El incumplimiento de cualquiera de las obligaciones generará a cargo de la parte incumplida una pena equivalente a **dos (2) cánones mensuales de arrendamiento ($5.600.000 COP)**.

### CLÁUSULA QUINTA. — MÉRITO EJECUTIVO Y RENUNCIA A REQUERIMIENTOS
El presente contrato presta **MÉRITO EJECUTIVO** en los términos del Artículo 422 del Código General del Proceso. **EL ARRENDATARIO** renuncia expresamente a requerimientos privados o judiciales para ser constituido en mora.

### CLÁUSULA SEXTA. — FIRMA ELECTRÓNICA (LEY 527 DE 1999)
Las partes suscriben este mensaje de datos con firma electrónica y sellado criptográfico SHA-256 reconociendo su plena validez probatoria.`,
    resumen_ejecutivo_ia: {
        puntuacion_seguridad_juridica: 98,
        nivel_riesgo: "BAJO",
        resumen_ciudadano: {
            compromisos_economicos: [
                "Canon mensual de $2.800.000 COP pagadero los primeros 5 días del mes.",
                "Cláusula penal pecuniaria de $5.600.000 COP por incumplimiento."
            ],
            riesgos_incumplimiento: [
                "Mérito ejecutivo inmediato sin necesidad de requerimientos judiciales previos.",
                "Restitución inmediata del inmueble y cobro de intereses moratorios máximos legales."
            ]
        }
    },
    firmantes: [
        {
            id: "f1000000-1111-4000-8000-000000000001",
            rol: "arrendador",
            nombre_completo: "Inmobiliaria LexiProof S.A.S.",
            tipo_identificacion: "NIT",
            identificacion: "901.789.456-3",
            email: "arriendos@lexiproof.co",
            telefono: "+57 (601) 745-8900",
            firma_imagen_url: null,
            direccion_ip: "190.85.122.45",
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
            fecha_firma: "2026-09-01T14:30:00.000Z"
        },
        {
            id: "f1000000-1111-4000-8000-000000000002",
            rol: "arrendatario",
            nombre_completo: "Santiago Jaramillo Orozco",
            tipo_identificacion: "CC",
            identificacion: "1.018.456.789",
            email: "santiago.jaramillo@outlook.com",
            telefono: "+57 310 456 7890",
            firma_imagen_url: null,
            direccion_ip: "186.84.90.12",
            user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6) Safari/604.1",
            fecha_firma: "2026-09-01T15:10:00.000Z"
        }
    ]
};

// Generar Hash y PDF para el contrato 1
const matriz1 = generarMatrizEvidencia(contrato1, contrato1.firmantes, { ip: "190.85.122.45", userAgent: "LexiProof Node Engine" });
contrato1.hash_sha256 = matriz1.hash_sha256;
contrato1.datos_matriz_evidencia = matriz1.matriz_evidencia;
contrato1.estado = "completado_certificado";
contrato1.certified_at = "2026-09-01T15:15:00.000Z";

const { rutaRelativa } = compilarYGuardarPDF(contrato1, contrato1.firmantes, "http://localhost:3500");
contrato1.ruta_pdf = rutaRelativa;

db.crearContrato(contrato1);

console.log('✅ Contrato 1 certificado y guardado con UUID:', contrato1.uuid_publico);
console.log('🔒 Hash SHA-256:', contrato1.hash_sha256);
console.log('📄 PDF generado:', rutaRelativa);
