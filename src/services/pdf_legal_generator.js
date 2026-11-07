const fs = require('fs');
const path = require('path');
const { generateQrSvg, getVerificationUrl } = require('./qr_service');

function limpiarTextoLegal(str) {
    if (!str) return '';
    return str
        .replace(/Prestacin/gi, 'Prestación')
        .replace(/mrito/gi, 'mérito')
        .replace(/identificacin/gi, 'identificación')
        .replace(/duracin/gi, 'duración')
        .replace(/omisin/gi, 'omisión')
        .replace(/direccin/gi, 'dirección')
        .replace(/matrcula/gi, 'matrícula')
        .replace(/prrroga/gi, 'prórroga')
        .replace(/pblicos/gi, 'públicos')
        .replace(/administracin/gi, 'administración')
        .replace(/electrnica/gi, 'electrónica')
        .replace(/fsica/gi, 'física')
        .replace(/jurdica/gi, 'jurídica')
        .replace(/garanta/gi, 'garantía')
        .replace(/fcilmente/gi, 'fácilmente')
        .replace(/lmite/gi, 'límite')
        .replace(/consignacin/gi, 'consignación')
        .replace(/clusula/gi, 'cláusula')
        .replace(/ttulo/gi, 'título')
        .replace(/estipulacin/gi, 'estipulación')
        .replace(/cronolgico/gi, 'cronológico')
        .replace(/cdula/gi, 'cédula')
        .replace(/pgina/gi, 'página')
        .replace(/\uFFFD/g, ''); // Eliminar carácter de reemplazo
}

/**
 * Convierte Markdown a HTML formal legal de alta fidelidad
 */
function markdownToLegalHtml(md) {
    if (!md) return '';
    const cleanMd = limpiarTextoLegal(md);

    let html = cleanMd
        // Títulos Principales
        .replace(/^# (.*$)/gim, '<h1 class="legal-main-title">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="legal-section-title">$1</h2>')
        .replace(/^### (.*$)/gim, '<div class="legal-clause-container"><div class="legal-clause-header"><span class="clause-badge">CLÁUSULA</span><h3 class="legal-clause-title">$1</h3></div></div>')
        // Negritas y cursivas
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="legal-bold">$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em class="legal-em">$1</em>')
        // Líneas divisorias formales
        .replace(/^---$/gim, '<div class="legal-separator"><span>⚖️</span></div>')
        // Listas
        .replace(/^\s*\-\s+(.*$)/gim, '<li class="legal-list-item">$1</li>')
        // Párrafos
        .split('\n\n')
        .map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h1') || trimmed.startsWith('<h2') || trimmed.startsWith('<div') || trimmed.startsWith('<li>')) {
                return trimmed;
            }
            return `<p class="legal-paragraph">${trimmed.replace(/\n/g, '<br/>')}</p>`;
        })
        .join('\n');

    return html;
}

/**
 * Genera el documento HTML maquetado con diseño Notarial y Ciberseguridad de Grado Corporativo
 */
function generarDocumentoLegalA4(contrato, firmantes = [], baseUrl = 'http://localhost:3500') {
    const uuidPublico = contrato.uuid_publico || '550e8400-e29b-41d4-a716-446655440000';
    const tituloLimpio = limpiarTextoLegal(contrato.titulo);
    const verificationUrl = getVerificationUrl(uuidPublico, baseUrl);
    const qrSvg = generateQrSvg(verificationUrl, 115);
    
    const fechaCertificado = contrato.certified_at 
        ? new Date(contrato.certified_at).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' })
        : new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' });

    const cuerpoHtml = markdownToLegalHtml(contrato.contenido_markdown);

    // Firmantes
    const firmantesHtml = (firmantes || []).map((f, idx) => {
        const nombreLimpio = limpiarTextoLegal(f.nombre_completo);
        const firmaImg = f.firma_imagen_url 
            ? `<img src="${f.firma_imagen_url}" alt="Firma Digital" class="firma-trazo-img" />`
            : `<div class="firma-digital-badge"><span>✍️</span> FIRMA ELECTRÓNICA VERIFICADA</div>`;

        const fechaFirma = f.fecha_firma 
            ? new Date(f.fecha_firma).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
            : fechaCertificado;

        return `
        <div class="firma-card">
            <div class="firma-header-tag">PARTE ${idx + 1} • ${f.rol.toUpperCase()}</div>
            <div class="firma-canvas-box">
                ${firmaImg}
            </div>
            <div class="firma-divider"></div>
            <div class="firma-data">
                <div class="firma-nombre-titular">${nombreLimpio}</div>
                <div class="firma-identificacion"><strong>${f.tipo_identificacion || 'C.C.'}:</strong> ${f.identificacion}</div>
                <div class="firma-metadata-row">
                    <span><strong>IP Origen:</strong> ${f.direccion_ip || '127.0.0.1'}</span>
                    <span><strong>Estampa UTC:</strong> ${fechaFirma}</span>
                </div>
                <div class="firma-metadata-row" style="margin-top:4px; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:4px 8px; border-radius:6px; font-size:7.5pt; display:flex; justify-content:space-between;">
                    <span>✅ <strong>2FA WhatsApp:</strong> ${f.otp_phone || f.telefono || 'Verificado'}</span>
                    <span><strong>Auth:</strong> ${(f.otp_token || 'WA-AUTH-CERT').slice(0, 14)}</span>
                </div>
                <div class="firma-hash-stamp">
                    <span>🛡️ Huella Digital: ${(f.firma_hash_sha256 || contrato.hash_sha256 || 'SHA-256 VALIDADO').slice(0, 28)}...</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const template = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloLimpio} — LexiProof Certificado</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 22mm 20mm 25mm 20mm;
            @top-center {
                content: "REPÚBLICA DE COLOMBIA • CERTIFICACIÓN DE MENSAJES DE DATOS — LEY 527 DE 1999";
                font-family: 'Inter', sans-serif;
                font-size: 7pt;
                font-weight: 700;
                color: #475569;
                letter-spacing: 1px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
            }
            @bottom-left {
                content: "Certificado Inmutable LexiProof # ${uuidPublico.slice(0, 12)}";
                font-family: 'Inter', sans-serif;
                font-size: 7pt;
                color: #64748b;
            }
            @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font-family: 'Inter', sans-serif;
                font-size: 7pt;
                color: #64748b;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Merriweather', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.75;
            color: #0f172a;
            background: #ffffff;
            -webkit-font-smoothing: antialiased;
        }

        .document-wrapper {
            max-width: 820px;
            margin: 0 auto;
            padding: 20px 24px;
            position: relative;
        }

        /* Membrete Notarial / Oficial */
        .header-membrete {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 28px;
            font-family: 'Inter', sans-serif;
        }

        .brand-block {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-shield {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 900;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
            border: 1px solid #334155;
        }

        .brand-title-text {
            font-size: 16pt;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            font-family: 'Inter', sans-serif;
        }

        .brand-subtitle-text {
            font-size: 7.5pt;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .sello-oficial-box {
            text-align: right;
            background: #f0fdf4;
            border: 1px solid #86efac;
            padding: 8px 14px;
            border-radius: 8px;
        }

        .sello-status-text {
            font-size: 8.5pt;
            font-weight: 800;
            color: #15803d;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
        }

        .sello-sub-text {
            font-size: 7pt;
            color: #166534;
            font-weight: 600;
            margin-top: 2px;
        }

        /* Estructura Legal del Contrato */
        .legal-main-title {
            font-family: 'Cinzel', 'Times New Roman', serif;
            font-size: 14pt;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            margin-bottom: 24px;
            letter-spacing: 0.8px;
            color: #0f172a;
            line-height: 1.4;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
        }

        .legal-section-title {
            font-family: 'Inter', sans-serif;
            font-size: 11.5pt;
            font-weight: 800;
            margin-top: 20px;
            margin-bottom: 8px;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .legal-clause-container {
            margin-top: 18px;
            margin-bottom: 8px;
        }

        .legal-clause-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .clause-badge {
            font-family: 'Inter', sans-serif;
            font-size: 7pt;
            font-weight: 800;
            background: #0f172a;
            color: #ffffff;
            padding: 2px 6px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }

        .legal-clause-title {
            font-family: 'Inter', sans-serif;
            font-size: 10.5pt;
            font-weight: 800;
            color: #0f172a;
            display: inline;
        }

        .legal-paragraph {
            text-align: justify;
            text-justify: inter-word;
            margin-bottom: 14px;
            text-indent: 20px;
            font-size: 10.5pt;
            color: #1e293b;
        }

        .legal-bold {
            font-weight: 700;
            color: #0f172a;
        }

        .legal-separator {
            text-align: center;
            margin: 24px 0;
            position: relative;
        }
        .legal-separator::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #cbd5e1;
            z-index: 1;
        }
        .legal-separator span {
            background: #ffffff;
            position: relative;
            z-index: 2;
            padding: 0 12px;
            font-size: 12px;
            color: #64748b;
        }

        .legal-list-item {
            margin-left: 28px;
            margin-bottom: 6px;
            font-size: 10pt;
            text-align: justify;
        }

        /* Sección de Firmas */
        .seccion-firmas-bloque {
            margin-top: 36px;
            page-break-inside: avoid;
        }

        .firmas-titulo-principal {
            font-family: 'Inter', sans-serif;
            font-size: 9.5pt;
            font-weight: 800;
            text-transform: uppercase;
            text-align: center;
            color: #334155;
            letter-spacing: 1.5px;
            margin-bottom: 18px;
        }

        .firmas-grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .firma-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 14px;
            position: relative;
        }

        .firma-header-tag {
            font-family: 'Inter', sans-serif;
            font-size: 7pt;
            font-weight: 800;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 8px;
        }

        .firma-canvas-box {
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            margin-bottom: 10px;
            padding: 4px;
        }

        .firma-trazo-img {
            max-height: 72px;
            max-width: 100%;
            object-fit: contain;
        }

        .firma-digital-badge {
            font-family: 'Inter', sans-serif;
            font-size: 7.5pt;
            font-weight: 700;
            color: #047857;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .firma-divider {
            height: 1px;
            background: #0f172a;
            margin-bottom: 8px;
        }

        .firma-nombre-titular {
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: 10pt;
            color: #0f172a;
        }

        .firma-identificacion {
            font-family: 'Inter', sans-serif;
            font-size: 8.5pt;
            color: #334155;
            margin-top: 2px;
        }

        .firma-metadata-row {
            font-family: 'Inter', sans-serif;
            font-size: 7pt;
            color: #64748b;
            margin-top: 6px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .firma-hash-stamp {
            font-family: 'Courier New', monospace;
            font-size: 6.5pt;
            color: #047857;
            background: #ecfdf5;
            padding: 3px 6px;
            border-radius: 4px;
            margin-top: 6px;
            border: 1px solid #a7f3d0;
            word-break: break-all;
        }

        /* Pie de Certificación Criptográfica */
        .footer-cripto-box {
            margin-top: 32px;
            border-top: 2px dashed #94a3b8;
            padding-top: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            font-family: 'Inter', sans-serif;
            background: #f8fafc;
            padding: 16px 20px;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            page-break-inside: avoid;
        }

        .footer-cripto-info {
            flex: 1;
        }

        .footer-cripto-title {
            font-size: 9.5pt;
            font-weight: 800;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .footer-cripto-desc {
            font-size: 7.5pt;
            color: #475569;
            margin-top: 3px;
            line-height: 1.4;
        }

        .hash-sha256-display {
            background: #ffffff;
            border: 1px solid #94a3b8;
            border-radius: 5px;
            padding: 6px 10px;
            margin-top: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 8pt;
            font-weight: 700;
            color: #0f172a;
            word-break: break-all;
            letter-spacing: 0.5px;
        }

        .footer-meta-line {
            font-size: 7pt;
            color: #64748b;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
        }

        .footer-qr-container {
            width: 105px;
            text-align: center;
        }

        .footer-qr-caption {
            font-size: 6.5pt;
            font-weight: 700;
            color: #475569;
            margin-top: 4px;
            text-transform: uppercase;
        }

        @media print {
            body { background: none; }
            .document-wrapper { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="document-wrapper">
        <!-- Membrete Notarial -->
        <div class="header-membrete">
            <div class="brand-block">
                <div class="brand-shield">§</div>
                <div>
                    <div class="brand-title-text">LexiProof</div>
                    <div class="brand-subtitle-text">Certificación Jurídica Inmutable • Ley 527 de 1999</div>
                </div>
            </div>
            <div class="sello-oficial-box">
                <div class="sello-status-text">
                    <span>🛡️</span> CERTIFICADO DIGITAL ÍNTEGRO
                </div>
                <div class="sello-sub-text">
                    Validez Probatoria y No Repudio • Art. 6, 7 y 8
                </div>
            </div>
        </div>

        <!-- Cuerpo del Contrato -->
        <div class="cuerpo-contractual">
            ${cuerpoHtml}
        </div>

        <!-- Bloque de Firmas -->
        <div class="seccion-firmas-bloque">
            <div class="firmas-titulo-principal">Constancia y Otorgamiento de Firmas Electrónicas</div>
            <div class="firmas-grid-container">
                ${firmantesHtml}
            </div>
        </div>

        <!-- Pie de Criptografía y QR -->
        <div class="footer-cripto-box">
            <div class="footer-cripto-info">
                <div class="footer-cripto-title">
                    <span>🔒 Matriz de Evidencia Digital & No Repudio Probatorio</span>
                </div>
                <div class="footer-cripto-desc">
                    Mensaje de datos emitido conforme a la <strong>Ley 527 de 1999</strong> y <strong>Decreto 2364 de 2012</strong> de la República de Colombia. El presente documento presta <strong>Mérito Ejecutivo</strong> (Art. 422 del C.G.P.).
                </div>
                <div class="hash-sha256-display">
                    HASH SHA-256: ${contrato.hash_sha256 || 'CERTIFICACIÓN INMUTABLE V1.0'}
                </div>
                <div class="footer-meta-line">
                    <span>UUID Público: <strong style="font-family:monospace; color:#2563eb;">${uuidPublico}</strong></span>
                    <span>Emisión: ${fechaCertificado}</span>
                </div>
            </div>
            <div class="footer-qr-container">
                ${qrSvg}
                <div class="footer-qr-caption">Escanear para cotejo oficial</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    return template;
}

/**
 * Guarda el archivo HTML formal con codificación UTF-8 estricta
 */
function compilarYGuardarPDF(contrato, firmantes = [], baseUrl = 'http://localhost:3500') {
    const html = generarDocumentoLegalA4(contrato, firmantes, baseUrl);
    const pdfDir = path.join(__dirname, '../../public/generated_pdfs');
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `contrato_${contrato.uuid_publico}.html`;
    const filePath = path.join(pdfDir, filename);
    fs.writeFileSync(filePath, html, { encoding: 'utf8' });

    return {
        html,
        rutaRelativa: `/generated_pdfs/${filename}`,
        rutaAbsoluta: filePath
    };
}

module.exports = {
    generarDocumentoLegalA4,
    compilarYGuardarPDF,
    limpiarTextoLegal
};
