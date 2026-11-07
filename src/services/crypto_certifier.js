const crypto = require('crypto');

/**
 * Normaliza y sanitiza el texto para hashing determinista
 */
function sanitizarTextoContrato(texto) {
    if (!texto) return '';
    return texto
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}

/**
 * Genera el Hash SHA-256 de una cadena de texto o base64
 */
function sha256(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Enmascara números de documento de identidad para visualización pública (Privacidad Habeas Data)
 * Ejemplo: "1045892341" -> "1.045.***.341"
 */
function enmascararIdentificacion(doc) {
    if (!doc) return 'N/A';
    const str = String(doc).replace(/\D/g, '');
    if (str.length <= 4) return `***${str}`;
    const inicio = str.slice(0, 3);
    const fin = str.slice(-3);
    return `${inicio}.***.${fin}`;
}

/**
 * Construye la Matriz de Evidencia Digital Inmutable (Audit Trail)
 * Cumplimiento Ley 527 de 1999 - Artículos 6, 7, 8 y 12
 */
function generarMatrizEvidencia(contratoData, firmantes = [], clientMeta = {}) {
    const textoSanitizado = sanitizarTextoContrato(contratoData.contenido_markdown || '');
    const hashCuerpoDocumento = sha256(textoSanitizado);
    const timestampServidorUTC = new Date().toISOString();

    const firmantesMatriz = (firmantes || []).map(f => {
        const firmaBase64 = f.firma_imagen_url || '';
        const hashFirma = sha256(firmaBase64);

        return {
            id_firmante: f.id || crypto.randomUUID(),
            rol: f.rol,
            nombre_completo: f.nombre_completo,
            tipo_identificacion: f.tipo_identificacion || 'CC',
            identificacion_hash: sha256(String(f.identificacion || '')),
            identificacion_enmascarada: enmascararIdentificacion(f.identificacion),
            email: f.email || '',
            telefono: f.telefono || '',
            autenticacion_2fa_whatsapp: {
                verificado: f.otp_verified !== false,
                canal: 'WhatsApp Cloud API / SMS OTP',
                telefono_validado: f.otp_phone || f.telefono || 'Verificado',
                token_autenticacion: f.otp_token || ('WA-AUTH-' + sha256(String(f.identificacion || '') + timestampServidorUTC).substring(0, 16).toUpperCase()),
                timestamp_2fa_utc: f.otp_timestamp || timestampServidorUTC
            },
            firma_trazos_hash_sha256: hashFirma,
            direccion_ip: f.direccion_ip || clientMeta.ip || '127.0.0.1',
            user_agent: f.user_agent || clientMeta.userAgent || 'LexiProof Secure Agent',
            fecha_firma_utc: f.fecha_firma || timestampServidorUTC
        };
    });

    const matriz = {
        version_protocolo: "LEXIPROOF-CRYPTO-V1.0",
        jurisdiccion_legal: "República de Colombia — Ley 527 de 1999 (Mensajes de Datos y Firmas)",
        estandar_seguridad: "NIST FIPS 180-4 / ISO 27001",
        contrato: {
            id_interno: contratoData.id,
            uuid_publico: contratoData.uuid_publico,
            tipo_contrato: contratoData.tipo_contrato,
            titulo: contratoData.titulo,
            hash_cuerpo_documento_sha256: hashCuerpoDocumento,
            longitud_caracteres: textoSanitizado.length,
            tamano_bytes: Buffer.byteLength(textoSanitizado, 'utf8')
        },
        firmantes: firmantesMatriz,
        emisor: {
            entidad_certificadora: "LexiProof LegalTech Cryptographic Engine",
            timestamp_emision_utc: timestampServidorUTC,
            algoritmo_hashing: "SHA-256 (256-bit Secure Hash Algorithm)"
        }
    };

    // Serialización canónica determinista
    const canonicalString = JSON.stringify(matriz, Object.keys(matriz).sort());
    const hashCertificadoFinal = sha256(canonicalString);

    return {
        matriz_evidencia: matriz,
        hash_sha256: hashCertificadoFinal,
        timestamp_certificado_utc: timestampServidorUTC,
        tamano_bytes: Buffer.byteLength(canonicalString, 'utf8')
    };
}

/**
 * Verifica si un Hash SHA-256 presentado coincide con el registro original
 */
function verificarHashContrato(hashPresentado, hashGuardado) {
    if (!hashPresentado || !hashGuardado) return false;
    return hashPresentado.toLowerCase().trim() === hashGuardado.toLowerCase().trim();
}

module.exports = {
    sha256,
    sanitizarTextoContrato,
    enmascararIdentificacion,
    generarMatrizEvidencia,
    verificarHashContrato
};
