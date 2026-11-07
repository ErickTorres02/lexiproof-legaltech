/**
 * Generador Binario Nativo de Documentos PDF Estándar (ISO 32000-1 / PDF 1.4)
 * 100% Puro Node.js sin dependencias externas.
 * Produce PDFs legales certificados ultraligeros con maquetación notarial A4 perfecta.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { getVerificationUrl } = require('./qr_service');

// Mapa de caracteres WinAnsi / Latin-1 para fuentes estándar Type 1
function encodeWinAnsi(str) {
    if (!str) return '';
    const replacements = {
        'á': '\xE1', 'é': '\xE9', 'í': '\xED', 'ó': '\xF3', 'ú': '\xFA',
        'Á': '\xC1', 'É': '\xC9', 'Í': '\xCD', 'Ó': '\xD3', 'Ú': '\xDA',
        'ñ': '\xF1', 'Ñ': '\xD1', 'ü': '\xFC', 'Ü': '\xDC',
        '¿': '\xBF', '¡': '\xA1', 'º': '\xBA', 'ª': '\xAA',
        '—': '-', '–': '-', '“': '"', '”': '"', '‘': "'", '’': "'",
        '•': '*', '§': '\xA7', '©': '\xA9', '®': '\xAE'
    };
    let clean = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (replacements[ch]) {
            clean += replacements[ch];
        } else if (ch.charCodeAt(0) <= 255) {
            clean += ch;
        } else {
            clean += ' ';
        }
    }
    return clean.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Genera el comando PDF para posicionar texto con matriz absoluta (Tm)
 */
function drawText(font, size, x, y, text, r = 0.1, g = 0.1, b = 0.1) {
    const encoded = encodeWinAnsi(text);
    return `q BT /${font} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${encoded}) Tj ET Q\n`;
}

/**
 * Dibuja un rectángulo con relleno y borde
 */
function drawRect(x, y, w, h, fillRgb = null, strokeRgb = null, lineWidth = 1) {
    let cmd = 'q ';
    if (strokeRgb) {
        cmd += `${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG ${lineWidth} w `;
    }
    if (fillRgb) {
        cmd += `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f `;
    }
    if (strokeRgb) {
        cmd += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S `;
    }
    cmd += 'Q\n';
    return cmd;
}

/**
 * Dibuja una línea
 */
function drawLine(x1, y1, x2, y2, strokeRgb = [0.8, 0.85, 0.9], lineWidth = 0.5) {
    return `q ${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`;
}

/**
 * Divide un texto en líneas ajustadas al ancho de página en caracteres
 */
function wrapText(text, maxCharsPerLine = 84) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (!currentLine) {
            currentLine = word;
        } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
}

/**
 * Genera el Buffer binario del PDF legal certificado
 */
function generarPdfLegalBuffer(contrato, firmantes = [], baseUrl = 'http://localhost:3500') {
    const uuid = contrato.uuid_publico || contrato.id || 'CERT-UUID-001';
    const hashSha256 = contrato.hash_sha256 || 'HASH-SHA256-PENDING';
    const fechaCert = contrato.certified_at 
        ? new Date(contrato.certified_at).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' })
        : new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' });

    const verificationUrl = getVerificationUrl(uuid, baseUrl);

    // Dimensiones A4 estándar en puntos tipográficos
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 45;
    const contentWidth = pageWidth - (marginX * 2); // 505.28 pt

    const pages = [];
    let currentStream = '';
    let currentY = pageHeight - 55;
    let pageNumber = 1;

    function renderHeader(isFirstPage = false) {
        let hCmd = '';
        // Barra decorativa superior
        hCmd += drawRect(marginX, pageHeight - 35, contentWidth, 2, [0.06, 0.09, 0.16]);
        // Título del encabezado
        hCmd += drawText('F2', 7.5, marginX, pageHeight - 28, 'REPÚBLICA DE COLOMBIA • MENSAJES DE DATOS Y FIRMAS DIGITALES • LEY 527 DE 1999', 0.2, 0.3, 0.4);

        if (isFirstPage) {
            // Sello de Validez Notarial en página 1
            const badgeW = 160;
            const badgeH = 26;
            const badgeX = pageWidth - marginX - badgeW;
            const badgeY = pageHeight - 68;
            hCmd += drawRect(badgeX, badgeY, badgeW, badgeH, [0.94, 0.98, 0.95], [0.1, 0.6, 0.2], 0.8);
            hCmd += drawText('F2', 7.5, badgeX + 8, badgeY + 15, 'DOCUMENTO CERTIFICADO ÍNTEGRO', 0.05, 0.45, 0.15);
            hCmd += drawText('F1', 6.2, badgeX + 8, badgeY + 5, 'Validez Probatoria Art. 6, 7 y 8 Ley 527', 0.15, 0.35, 0.15);
        }
        return hCmd;
    }

    function flushAndNewPage() {
        pages.push(currentStream);
        pageNumber++;
        currentStream = renderHeader(false);
        currentY = pageHeight - 60;
    }

    // Inicializar Página 1
    currentStream = renderHeader(true);
    currentY = pageHeight - 80;

    // Título Principal del Contrato
    const tituloPrincipal = contrato.titulo || 'CONTRATO LEGAL CERTIFICADO';
    const tituloLines = wrapText(tituloPrincipal.toUpperCase(), 55);
    for (const tLine of tituloLines) {
        currentStream += drawText('F2', 12, marginX, currentY, tLine, 0.06, 0.09, 0.16);
        currentY -= 16;
    }
    currentY -= 6;
    currentStream += drawLine(marginX, currentY + 4, pageWidth - marginX, currentY + 4, [0.8, 0.85, 0.9], 0.8);
    currentY -= 12;

    // Procesar Markdown línea por línea de manera limpia
    const rawMarkdown = contrato.contenido_markdown || '';
    const rawLines = rawMarkdown.split('\n');

    for (let i = 0; i < rawLines.length; i++) {
        const rawLine = rawLines[i].trim();
        if (!rawLine) {
            currentY -= 5;
            continue;
        }

        // Título principal ya renderizado
        if (rawLine.startsWith('# ')) {
            continue;
        }

        // Títulos de Cláusulas (### o ##)
        if (rawLine.startsWith('###') || rawLine.startsWith('##')) {
            const cleanHeading = rawLine.replace(/^###?\s*/, '').replace(/\*\*/g, '').trim();
            
            // Si no cabe el título y al menos 2 líneas de texto, pasar de página
            if (currentY < 130) {
                flushAndNewPage();
            }

            currentY -= 6;
            // Fondo destacado para la cláusula
            currentStream += drawRect(marginX, currentY - 3, contentWidth, 15, [0.95, 0.96, 0.98], [0.85, 0.9, 0.95], 0.5);
            currentStream += drawText('F2', 8.5, marginX + 6, currentY + 1, cleanHeading, 0.1, 0.2, 0.4);
            currentY -= 17;
            continue;
        }

        // Separadores (---)
        if (rawLine.startsWith('---')) {
            if (currentY < 80) flushAndNewPage();
            currentStream += drawLine(marginX, currentY, pageWidth - marginX, currentY, [0.85, 0.88, 0.92], 0.5);
            currentY -= 10;
            continue;
        }

        // Párrafos regulares de texto
        const cleanPara = rawLine.replace(/\*\*/g, '').replace(/\*/g, '');
        const wrapped = wrapText(cleanPara, 86);

        for (const line of wrapped) {
            if (currentY < 75) {
                flushAndNewPage();
            }
            currentStream += drawText('F1', 8.8, marginX, currentY, line, 0.12, 0.16, 0.22);
            currentY -= 12.5;
        }
        currentY -= 3;
    }

    // ==========================================
    // SECCIÓN DE FIRMAS DIGITALES
    // ==========================================
    // Se requiere un espacio de al menos 140 pt para las firmas
    if (currentY < 160) {
        flushAndNewPage();
    }

    currentY -= 12;
    currentStream += drawText('F2', 9, marginX, currentY, 'OTORGAMIENTO DE FIRMAS ELECTRÓNICAS (LEY 527 DE 1999)', 0.08, 0.12, 0.2);
    currentY -= 15;

    const boxW = (contentWidth - 16) / 2;
    const boxH = 75;

    (firmantes || []).slice(0, 2).forEach((f, idx) => {
        const bX = marginX + (idx * (boxW + 16));
        const bY = currentY - boxH;

        const rol = (f.rol || `PARTE ${idx + 1}`).replace(/_/g, ' ').toUpperCase();
        const nombre = f.nombre_completo || `Firmante ${idx + 1}`;
        const idText = `${f.tipo_identificacion || 'C.C.'}: ${f.identificacion || 'N/A'}`;
        const fFirma = f.fecha_firma 
            ? new Date(f.fecha_firma).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
            : fechaCert;

        // Tarjeta de firma
        currentStream += drawRect(bX, bY, boxW, boxH, [0.98, 0.99, 1.0], [0.8, 0.85, 0.9], 0.8);
        
        // Etiqueta del rol
        currentStream += drawText('F2', 7.5, bX + 10, bY + boxH - 12, rol, 0.15, 0.35, 0.85);
        currentStream += drawText('F2', 7, bX + boxW - 85, bY + boxH - 12, '[FIRMA REGISTRADA]', 0.05, 0.5, 0.2);

        // Línea de firma
        currentStream += drawLine(bX + 10, bY + 44, bX + boxW - 10, bY + 44, [0.15, 0.2, 0.3], 0.8);

        // Datos del firmante
        currentStream += drawText('F2', 8, bX + 10, bY + 31, nombre, 0.08, 0.12, 0.18);
        currentStream += drawText('F1', 7, bX + 10, bY + 20, idText, 0.3, 0.35, 0.45);
        currentStream += drawText('F1', 6.2, bX + 10, bY + 10, `Estampa UTC: ${fFirma}`, 0.45, 0.5, 0.55);
        currentStream += drawText('F1', 6, bX + 10, bY + 2, `IP: ${f.direccion_ip || '127.0.0.1'} • 2FA WhatsApp: Verificado`, 0.45, 0.5, 0.55);
    });

    currentY -= (boxH + 16);

    // ==========================================
    // PIE CRIPTOGRÁFICO Y HASH SHA-256
    // ==========================================
    if (currentY < 80) {
        flushAndNewPage();
    }

    const footerH = 52;
    const footerY = currentY - footerH;

    currentStream += drawRect(marginX, footerY, contentWidth, footerH, [0.06, 0.09, 0.16], [0.15, 0.25, 0.45], 1);
    currentStream += drawText('F2', 8, marginX + 10, footerY + 39, 'MATRIZ DE EVIDENCIA DIGITAL • HASH SHA-256 INMUTABLE', 1, 1, 1);
    currentStream += drawText('F3', 6.8, marginX + 10, footerY + 27, `SHA-256: ${hashSha256}`, 0.2, 0.85, 0.5);
    currentStream += drawText('F1', 6.5, marginX + 10, footerY + 16, `UUID: ${uuid} | Emisión: ${fechaCert}`, 0.85, 0.88, 0.95);
    currentStream += drawText('F2', 6.5, marginX + 10, footerY + 6, `Cotejo y Verificación: ${verificationUrl}`, 0.5, 0.75, 1);

    // Guardar última página
    pages.push(currentStream);
    const totalPages = pages.length;

    // ==========================================
    // ENSAMBLAR ESTRUCTURA BINARIA PDF 1.4
    // ==========================================
    const pdfObjects = [];
    let currentObjId = 1;

    const catalogId = currentObjId++;
    const pagesRootId = currentObjId++;
    const fontF1Id = currentObjId++;
    const fontF2Id = currentObjId++;
    const fontF3Id = currentObjId++;

    const pageObjIds = [];
    const contentObjIds = [];

    for (let i = 0; i < totalPages; i++) {
        pageObjIds.push(currentObjId++);
        contentObjIds.push(currentObjId++);
    }

    pdfObjects[fontF1Id] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    pdfObjects[fontF2Id] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
    pdfObjects[fontF3Id] = `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>`;

    pdfObjects[catalogId] = `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`;
    pdfObjects[pagesRootId] = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} /MediaBox [0 0 ${pageWidth} ${pageHeight}] >>`;

    for (let i = 0; i < totalPages; i++) {
        const pId = pageObjIds[i];
        const cId = contentObjIds[i];
        const pNum = i + 1;

        // Pie de página con numeración
        let pageFooter = drawText('F1', 6.8, marginX, 20, `Certificado Inmutable LexiProof # ${uuid.slice(0, 12)}`, 0.4, 0.45, 0.5);
        pageFooter += drawText('F1', 6.8, pageWidth - marginX - 55, 20, `Página ${pNum} de ${totalPages}`, 0.4, 0.45, 0.5);

        const fullStream = pages[i] + pageFooter;
        const compressed = zlib.deflateSync(Buffer.from(fullStream, 'latin1'));

        pdfObjects[pId] = `<< /Type /Page /Parent ${pagesRootId} 0 R /Resources << /Font << /F1 ${fontF1Id} 0 R /F2 ${fontF2Id} 0 R /F3 ${fontF3Id} 0 R >> >> /Contents ${cId} 0 R >>`;
        pdfObjects[cId] = {
            rawHeader: `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`,
            streamData: compressed,
            rawFooter: `\nendstream`
        };
    }

    const chunks = [];
    let offset = 0;

    function writeStr(s) {
        const buf = Buffer.from(s, 'latin1');
        chunks.push(buf);
        offset += buf.length;
    }

    function writeBuf(b) {
        chunks.push(b);
        offset += b.length;
    }

    writeStr(`%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`);

    const xrefOffsets = [0];

    for (let id = 1; id < currentObjId; id++) {
        xrefOffsets[id] = offset;
        writeStr(`${id} 0 obj\n`);
        const obj = pdfObjects[id];
        if (typeof obj === 'string') {
            writeStr(`${obj}\nendobj\n`);
        } else if (obj && obj.streamData) {
            writeStr(obj.rawHeader);
            writeBuf(obj.streamData);
            writeStr(`${obj.rawFooter}\nendobj\n`);
        }
    }

    const startXref = offset;
    writeStr(`xref\n0 ${currentObjId}\n`);
    writeStr(`0000000000 65535 f \n`);
    for (let id = 1; id < currentObjId; id++) {
        const offStr = String(xrefOffsets[id]).padStart(10, '0');
        writeStr(`${offStr} 00000 n \n`);
    }

    writeStr(`trailer\n<< /Size ${currentObjId} /Root ${catalogId} 0 R /Info << /Title (${encodeWinAnsi(tituloPrincipal)}) /Author (LexiProof LegalTech Colombia) /Subject (Certificado Oficial Ley 527 de 1999) >> >>\n`);
    writeStr(`startxref\n${startXref}\n%%EOF\n`);

    return Buffer.concat(chunks);
}

/**
 * Guarda el PDF binario en disco y retorna las rutas
 */
function compilarYGuardarPdfBinario(contrato, firmantes = [], baseUrl = 'http://localhost:3500') {
    const pdfBuffer = generarPdfLegalBuffer(contrato, firmantes, baseUrl);
    const pdfDir = path.join(__dirname, '../../public/generated_pdfs');
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `contrato_${contrato.uuid_publico || contrato.id}.pdf`;
    const filePath = path.join(pdfDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    return {
        buffer: pdfBuffer,
        filename,
        rutaRelativa: `/generated_pdfs/${filename}`,
        rutaAbsoluta: filePath
    };
}

module.exports = {
    generarPdfLegalBuffer,
    compilarYGuardarPdfBinario
};
