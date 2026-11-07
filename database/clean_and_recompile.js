const fs = require('fs');
const path = require('path');
const db = require('./db');
const { compilarYGuardarPDF, limpiarTextoLegal } = require('../src/services/pdf_legal_generator');
const { generarMatrizEvidencia } = require('../src/services/crypto_certifier');

console.log('[CLEAN] Limpiando y re-compilando todos los contratos con codificación UTF-8 pura...');

const DB_FILE = path.join(__dirname, 'lexiproof_db.json');
const raw = fs.readFileSync(DB_FILE, 'utf8');
const data = JSON.parse(raw);

// Limpiar contratos
data.contratos.forEach(c => {
    c.titulo = limpiarTextoLegal(c.titulo);
    c.contenido_markdown = limpiarTextoLegal(c.contenido_markdown);
    if (c.tipo_contrato) c.tipo_contrato = limpiarTextoLegal(c.tipo_contrato);

    const firmantes = data.firmantes.filter(f => f.contrato_id === c.id);
    firmantes.forEach(f => {
        f.nombre_completo = limpiarTextoLegal(f.nombre_completo);
    });

    const matriz = generarMatrizEvidencia(c, firmantes, { ip: "127.0.0.1", userAgent: "LexiProof Clean Engine" });
    c.hash_sha256 = matriz.hash_sha256;
    c.datos_matriz_evidencia = matriz.matriz_evidencia;

    const { rutaRelativa } = compilarYGuardarPDF(c, firmantes, "http://localhost:3500");
    c.ruta_pdf = rutaRelativa;
    console.log(`✅ Re-compilado: ${c.titulo} -> ${rutaRelativa}`);
});

fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('[CLEAN] Base de datos y PDFs 100% limpios y normalizados.');
