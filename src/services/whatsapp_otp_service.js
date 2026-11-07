const crypto = require('crypto');

// Almacén en memoria de códigos OTP activos (expiran en 5 minutos)
const activeOtps = new Map();

/**
 * Genera un código OTP de 6 dígitos numéricos seguro
 */
function generarCodigoOtp(telefono, nombreParte, rolParte, tituloContrato) {
    const cleanPhone = (telefono || '').replace(/[^0-9]/g, '');
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos

    const otpData = {
        telefono: cleanPhone,
        telefono_original: telefono,
        nombre: nombreParte || 'Firmante',
        rol: rolParte || 'Parte',
        codigo: codigo,
        titulo_contrato: tituloContrato || 'Contrato Legal Digital',
        expires_at: expiresAt,
        verificado: false,
        created_at: new Date().toISOString()
    };

    activeOtps.set(cleanPhone, otpData);

    const mensajeWhatsApp = `🏛️ *LexiProof LegalTech — Código de Autenticación 2FA*\n\nHola *${otpData.nombre}* (${otpData.rol}), has solicitado firmar el documento:\n📜 *${otpData.titulo_contrato}*\n\nTu código OTP de verificación de identidad es:\n🔑 *${codigo}*\n\n⏱️ _Este código vence en 5 minutos. No lo compartas con nadie para garantizar la validez jurídica de tu firma bajo la Ley 527 de 1999._`;

    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensajeWhatsApp)}`;

    return {
        ok: true,
        codigo: codigo,
        telefono: cleanPhone,
        expires_at: expiresAt,
        mensaje_texto: mensajeWhatsApp,
        wa_link: waLink
    };
}

/**
 * Valida el código OTP ingresado
 */
function validarCodigoOtp(telefono, codigoIngresado) {
    const cleanPhone = (telefono || '').replace(/[^0-9]/g, '');
    const data = activeOtps.get(cleanPhone);

    if (!data) {
        return { ok: false, error: 'No se ha solicitado ningún código para este número de WhatsApp o ya expiró.' };
    }

    if (Date.now() > data.expires_at) {
        activeOtps.delete(cleanPhone);
        return { ok: false, error: 'El código OTP ha expirado (límite de 5 minutos). Solicita uno nuevo.' };
    }

    if (data.codigo.trim() !== (codigoIngresado || '').toString().trim()) {
        return { ok: false, error: 'Código OTP incorrecto. Verifica los 6 dígitos recibidos en tu WhatsApp.' };
    }

    data.verificado = true;
    data.verified_at = new Date().toISOString();

    return {
        ok: true,
        mensaje: '¡Identidad verificada exitosamente mediante WhatsApp 2FA!',
        telefono: cleanPhone,
        verified_at: data.verified_at,
        token_autenticacion: 'WA-AUTH-' + crypto.createHash('sha256').update(cleanPhone + data.codigo + data.verified_at).digest('hex').substring(0, 16).toUpperCase()
    };
}

/**
 * Genera un enlace directo para enviar el contrato certificado por WhatsApp
 */
function generarEnlaceWhatsAppContrato(telefono, contrato, baseUrl) {
    const cleanPhone = (telefono || '').replace(/[^0-9]/g, '');
    const uuid = contrato.uuid_publico || contrato.id;
    const verifUrl = `${baseUrl}/certificar/${uuid}`;
    const pdfUrl = `${baseUrl}${contrato.ruta_pdf || `/generated_pdfs/contrato_${uuid}.html`}`;
    const hashShort = contrato.hash_sha256 ? `${contrato.hash_sha256.substring(0, 16)}...` : 'SHA256';

    const msg = `🏛️ *LexiProof LegalTech — Contrato Certificado*\n\nHola, se ha completado la firma del contrato:\n📜 *${contrato.titulo}*\n\n🔒 *Hash SHA-256:* \`${hashShort}\`\n\n📄 *Descargar PDF Oficial:* ${pdfUrl}\n🔍 *Verificar Validez QR:* ${verifUrl}\n\n_Documento válido bajo la Ley 527 de 1999 de Colombia._`;

    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    return {
        ok: true,
        telefono: cleanPhone,
        wa_link: waLink,
        mensaje_texto: msg
    };
}

module.exports = {
    generarCodigoOtp,
    validarCodigoOtp,
    generarEnlaceWhatsAppContrato
};
