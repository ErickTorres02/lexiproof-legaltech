const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { streamRedactarContrato, auditarBorradorContrato } = require('../services/gemini_legal_engine');
const { generarMatrizEvidencia, verificarHashContrato, enmascararIdentificacion } = require('../services/crypto_certifier');
const { compilarYGuardarPDF } = require('../services/pdf_legal_generator');
const { TIPOS_CONTRATO, LEGAL_FRAMEWORK } = require('../config/legal_constants');

// 1. Tipos de Contrato y Normativa
router.get('/tipos-contrato', (req, res) => {
    res.json({
        tipos: TIPOS_CONTRATO,
        marco_legal: LEGAL_FRAMEWORK
    });
});

// 2. Redactor de Contratos por IA con Streaming SSE
router.post('/ia/redactar-contrato', async (req, res) => {
    const params = req.body || {};

    // Configurar encabezados SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
        await streamRedactarContrato(
            params,
            (chunk) => {
                res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
            },
            (fullText) => {
                res.write(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`);
                res.end();
            },
            (err) => {
                res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
                res.end();
            }
        );
    } catch (e) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
        res.end();
    }
});

// 3. Auditor Legal Preventivo con IA
router.post('/ia/auditar-contrato', async (req, res) => {
    try {
        const { contenido_markdown, tipo_contrato } = req.body;
        if (!contenido_markdown) {
            return res.status(400).json({ error: 'El contenido del contrato es obligatorio para auditar.' });
        }

        const auditoria = await auditarBorradorContrato(contenido_markdown, tipo_contrato);
        res.json({
            ok: true,
            auditoria
        });
    } catch (e) {
        console.error('[AUDITORIA ERROR]', e);
        res.status(500).json({ error: 'Error al realizar auditoría legal: ' + e.message });
    }
});

// 4. Crear Contrato (Borrador o Listo para Firma)
router.post('/contratos/crear', (req, res) => {
    try {
        const payload = req.body;
        if (!payload.titulo || !payload.contenido_markdown) {
            return res.status(400).json({ error: 'Título y contenido son obligatorios.' });
        }

        const nuevo = db.crearContrato(payload);
        res.status(201).json({
            ok: true,
            contrato: nuevo
        });
    } catch (e) {
        res.status(500).json({ error: 'Error al crear contrato: ' + e.message });
    }
});

// 5. Certificar y Sellar Criptográficamente un Contrato
router.post('/contratos/certificar', (req, res) => {
    try {
        const { contrato_id, firmantes, contenido_markdown, titulo, resumen_ejecutivo_ia } = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'LexiProof Web Client';

        const contratoExistente = db.getContratoById(contrato_id);
        if (!contratoExistente) {
            return res.status(404).json({ error: 'Contrato no encontrado.' });
        }

        const contratoDataActualizada = {
            ...contratoExistente,
            contenido_markdown: contenido_markdown || contratoExistente.contenido_markdown,
            titulo: titulo || contratoExistente.titulo,
            resumen_ejecutivo_ia: resumen_ejecutivo_ia || contratoExistente.resumen_ejecutivo_ia
        };

        // Generar Matriz de Evidencia Digital Inmutable
        const matriz = generarMatrizEvidencia(contratoDataActualizada, firmantes, {
            ip: clientIp,
            userAgent: userAgent
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Compilar Documento Legal Formal
        const contratoCertificadoData = {
            ...contratoDataActualizada,
            hash_sha256: matriz.hash_sha256,
            datos_matriz_evidencia: matriz.matriz_evidencia,
            estado: 'completado_certificado',
            certified_at: matriz.timestamp_certificado_utc,
            tamano_bytes: matriz.tamano_bytes
        };

        const { rutaRelativa } = compilarYGuardarPDF(contratoCertificadoData, firmantes, baseUrl);
        contratoCertificadoData.ruta_pdf = rutaRelativa;

        const guardado = db.actualizarContrato(contrato_id, {
            ...contratoCertificadoData,
            firmantes: firmantes
        });

        res.json({
            ok: true,
            mensaje: 'Contrato certificado y sellado criptográficamente con éxito bajo la Ley 527 de 1999.',
            contrato: guardado,
            hash_sha256: matriz.hash_sha256,
            uuid_publico: guardado.uuid_publico,
            ruta_pdf: rutaRelativa,
            enlace_verificacion: `${baseUrl}/certificar/${guardado.uuid_publico}`
        });

    } catch (e) {
        console.error('[CERTIFICAR ERROR]', e);
        res.status(500).json({ error: 'Error al certificar contrato: ' + e.message });
    }
});

// 6. Listado de Contratos para Dashboard
router.get('/contratos', (req, res) => {
    try {
        const { estado, tipo_contrato, busqueda } = req.query;
        const contratos = db.getContratos({ estado, tipo_contrato, busqueda });
        res.json({
            ok: true,
            total: contratos.length,
            contratos
        });
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener contratos: ' + e.message });
    }
});

// 7. Detalle de Contrato por ID
router.get('/contratos/:id', (req, res) => {
    try {
        const contrato = db.getContratoById(req.params.id);
        if (!contrato) {
            return res.status(404).json({ error: 'Contrato no encontrado.' });
        }
        res.json({
            ok: true,
            contrato
        });
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener contrato: ' + e.message });
    }
});

// 8. Consulta Pública de Verificación Criptográfica (Destino del QR)
router.get('/certificar/:uuid_publico', (req, res) => {
    try {
        const uuidPublico = req.params.uuid_publico;
        const contrato = db.getContratoByUuidPublico(uuidPublico);

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Escáner QR / Navegador';

        if (!contrato) {
            return res.status(404).json({
                ok: false,
                autentico: false,
                mensaje: 'DOCUMENTO NO VÁLIDO, INEXISTENTE O MANIPULADO',
                detalles: 'El identificador único consultado no se encuentra en el libro mayor de certificaciones de LexiProof.'
            });
        }

        // Registrar acceso en auditoría
        db.registrarAuditoriaQR(contrato.id, uuidPublico, clientIp, userAgent, 'VALIDO', {
            origen: 'Escaneo QR / Consulta Externa'
        });

        // Enmascarar datos sensibles de firmantes para la vista pública
        const firmantesEnmascarados = (contrato.firmantes || []).map(f => ({
            rol: f.rol,
            nombre_completo: f.nombre_completo,
            identificacion_enmascarada: enmascararIdentificacion(f.identificacion),
            fecha_firma: f.fecha_firma,
            ip_enmascarada: f.direccion_ip ? f.direccion_ip.replace(/\.\d+$/, '.***') : '127.0.0.***',
            firma_registrada: Boolean(f.firma_imagen_url)
        }));

        res.json({
            ok: true,
            autentico: true,
            estado: contrato.estado,
            uuid_publico: contrato.uuid_publico,
            titulo: contrato.titulo,
            tipo_contrato: contrato.tipo_contrato,
            hash_sha256: contrato.hash_sha256,
            certified_at: contrato.certified_at,
            created_at: contrato.created_at,
            ruta_pdf: contrato.ruta_pdf,
            firmantes: firmantesEnmascarados,
            resumen_ejecutivo_ia: contrato.resumen_ejecutivo_ia,
            marco_legal: {
                ley: "Ley 527 de 1999 (Colombia)",
                equivalente_funcional: "Mensaje de Datos con plena eficacia probatoria y no repudio.",
                decreto: "Decreto 2364 de 2012 (Firma Electrónica)"
            }
        });

    } catch (e) {
        res.status(500).json({ error: 'Error en verificación: ' + e.message });
    }
});

// 9. Métricas SaaS
router.get('/dashboard/stats', (req, res) => {
    try {
        const stats = db.getMetricasDashboard();
        const comercio = db.getComercioDefault();
        res.json({
            ok: true,
            stats,
            comercio
        });
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener estadísticas: ' + e.message });
    }
});

module.exports = router;
