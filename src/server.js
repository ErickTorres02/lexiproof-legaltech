const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

// Cargar variables de entorno desde .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [k, ...v] = trimmed.split('=');
            if (k && v) {
                process.env[k.trim()] = v.join('=').trim();
            }
        }
    });
}

const db = require('../database/db');
const { streamRedactarContrato, auditarBorradorContrato } = require('./services/gemini_legal_engine');
const { generarMatrizEvidencia, enmascararIdentificacion } = require('./services/crypto_certifier');
const { compilarYGuardarPDF } = require('./services/pdf_legal_generator');
const { compilarYGuardarPdfBinario } = require('./services/pdf_binary_engine');
const { generateQrSvg, getVerificationUrl } = require('./services/qr_service');
const { generarCodigoOtp, validarCodigoOtp, generarEnlaceWhatsAppContrato } = require('./services/whatsapp_otp_service');
const { syncContratoToFirestore, getFirestoreStatus } = require('./services/google_firestore_service');
const { enviarNotificacionEmail, getEmailLogs } = require('./services/email_dispatch_service');
const { TIPOS_CONTRATO, LEGAL_FRAMEWORK } = require('./config/legal_constants');
const sentinelWatcher = require('./agent/sentinel_watcher');
const copilotEngine = require('./agent/copilot_engine');
const whatsappBotService = require('./services/whatsapp_bot_service');

const PORT = process.env.PORT || 3500;

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254') && !iface.address.startsWith('192.168.56')) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// Helper: Servir archivo estático
function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Recurso No Encontrado');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Helper: Parsear cuerpo JSON
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('JSON no válido'));
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'LexiProof Client';
    
    const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || ('localhost:' + PORT);
    const lanIp = getLocalIpAddress();
    const baseUrl = process.env.PUBLIC_URL || `${proto}://${hostHeader}`;
    const publicReachableUrl = process.env.PUBLIC_URL || (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? `http://${lanIp}:${PORT}` : baseUrl);

    // ==========================================
    // 1. RUTAS DE VISTAS (HTML FRONTEND)
    // ==========================================
    if (req.method === 'GET') {
        if (pathname === '/' || pathname === '/index.html') {
            return serveStaticFile(path.join(__dirname, '../public/index.html'), res);
        }
        if (pathname === '/crear' || pathname === '/crear.html') {
            return serveStaticFile(path.join(__dirname, '../public/crear.html'), res);
        }
        if (pathname === '/dashboard' || pathname === '/dashboard.html') {
            return serveStaticFile(path.join(__dirname, '../public/dashboard.html'), res);
        }
        if (pathname === '/whatsapp-bot' || pathname === '/whatsapp-bot.html') {
            return serveStaticFile(path.join(__dirname, '../public/whatsapp-bot.html'), res);
        }
        if (pathname.startsWith('/certificar/') && !pathname.startsWith('/api/')) {
            return serveStaticFile(path.join(__dirname, '../public/certificar.html'), res);
        }
        if (pathname.startsWith('/generated_pdfs/')) {
            const filename = path.basename(pathname);
            const filePath = path.join(__dirname, '../public/generated_pdfs', filename);
            return serveStaticFile(filePath, res);
        }
        if (pathname.startsWith('/contrato_')) {
            const filename = path.basename(pathname);
            const filePath = path.join(__dirname, '../public/generated_pdfs', filename);
            if (fs.existsSync(filePath)) {
                return serveStaticFile(filePath, res);
            }
            // Si no existe el archivo generado estático, abrir en portal de certificación
            return serveStaticFile(path.join(__dirname, '../public/certificar.html'), res);
        }
        if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/')) {
            const filePath = path.join(__dirname, '../public', pathname);
            return serveStaticFile(filePath, res);
        }
    }

    // ==========================================
    // 2. RUTAS API RESTFUL & SSE STREAMING
    // ==========================================

    // GET /api/tipos-contrato
    if (req.method === 'GET' && pathname === '/api/tipos-contrato') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ tipos: TIPOS_CONTRATO, marco_legal: LEGAL_FRAMEWORK }));
    }

    // POST /api/ia/redactar-contrato (SSE STREAMING)
    if (req.method === 'POST' && pathname === '/api/ia/redactar-contrato') {
        try {
            const body = await parseJsonBody(req);
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            });

            await streamRedactarContrato(
                body,
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
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // POST /api/ia/auditar-contrato
    if (req.method === 'POST' && pathname === '/api/ia/auditar-contrato') {
        try {
            const body = await parseJsonBody(req);
            if (!body.contenido_markdown) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'El contenido_markdown es obligatorio.' }));
            }
            const auditoria = await auditarBorradorContrato(body.contenido_markdown, body.tipo_contrato);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, auditoria }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/contratos/crear
    if (req.method === 'POST' && pathname === '/api/contratos/crear') {
        try {
            const body = await parseJsonBody(req);
            if (!body.titulo || !body.contenido_markdown) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Título y contenido son obligatorios.' }));
            }
            const contrato = db.crearContrato(body);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, contrato }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/contratos/certificar
    if (req.method === 'POST' && pathname === '/api/contratos/certificar') {
        try {
            const body = await parseJsonBody(req);
            const { contrato_id, firmantes, contenido_markdown, titulo, resumen_ejecutivo_ia } = body;

            let contratoExistente = db.getContratoById(contrato_id);
            if (!contratoExistente) {
                // Si viene nuevo, crearlo primero
                contratoExistente = db.crearContrato({
                    id: contrato_id,
                    titulo: titulo || 'Contrato Legal Certificado',
                    contenido_markdown: contenido_markdown,
                    tipo_contrato: body.tipo_contrato || 'arrendamiento_vivienda',
                    valor_total: body.valor_total || 0,
                    firmantes: firmantes || []
                });
            }

            const contratoDataActualizada = {
                ...contratoExistente,
                contenido_markdown: contenido_markdown || contratoExistente.contenido_markdown,
                titulo: titulo || contratoExistente.titulo,
                resumen_ejecutivo_ia: resumen_ejecutivo_ia || contratoExistente.resumen_ejecutivo_ia
            };

            // Matriz Criptográfica de Evidencia
            const matriz = generarMatrizEvidencia(contratoDataActualizada, firmantes, {
                ip: clientIp,
                userAgent: userAgent
            });

            const contratoCertificadoData = {
                ...contratoDataActualizada,
                hash_sha256: matriz.hash_sha256,
                datos_matriz_evidencia: matriz.matriz_evidencia,
                estado: 'completado_certificado',
                certified_at: matriz.timestamp_certificado_utc,
                tamano_bytes: matriz.tamano_bytes
            };

            // Compilar versión HTML y versión binaria PDF estándar
            compilarYGuardarPDF(contratoCertificadoData, firmantes, publicReachableUrl);
            const { rutaRelativa } = compilarYGuardarPdfBinario(contratoCertificadoData, firmantes, publicReachableUrl);
            contratoCertificadoData.ruta_pdf = rutaRelativa;

            const guardado = db.actualizarContrato(contratoExistente.id, {
                ...contratoCertificadoData,
                firmantes: firmantes
            });

            // Sincronizar en Google Cloud Firestore & Firebase Storage
            const firestoreSyncResult = await syncContratoToFirestore(guardado, firmantes);

            const enlaceVerificacion = getVerificationUrl(guardado.uuid_publico, publicReachableUrl);
            const qrSvg = generateQrSvg(enlaceVerificacion, 130);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                ok: true,
                mensaje: 'Contrato certificado y sellado criptográficamente con éxito bajo la Ley 527 de 1999.',
                contrato: guardado,
                hash_sha256: matriz.hash_sha256,
                uuid_publico: guardado.uuid_publico,
                ruta_pdf: rutaRelativa,
                enlace_verificacion: enlaceVerificacion,
                qr_svg: qrSvg,
                firestore_sync: firestoreSyncResult
            }));

        } catch (e) {
            console.error('[CERTIFICAR ERROR]', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/cloud/firestore-status
    if (req.method === 'GET' && pathname === '/api/cloud/firestore-status') {
        try {
            const status = getFirestoreStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(status));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // POST /api/otp/solicitar
    if (req.method === 'POST' && pathname === '/api/otp/solicitar') {
        try {
            const body = await parseJsonBody(req);
            const { telefono, nombre, rol, titulo_contrato } = body;
            if (!telefono) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'El número de WhatsApp es requerido.' }));
            }
            const resOtp = generarCodigoOtp(telefono, nombre, rol, titulo_contrato);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resOtp));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // POST /api/otp/validar
    if (req.method === 'POST' && pathname === '/api/otp/validar') {
        try {
            const body = await parseJsonBody(req);
            const { telefono, codigo } = body;
            if (!telefono || !codigo) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'Teléfono y código son requeridos.' }));
            }
            const resValidacion = validarCodigoOtp(telefono, codigo);
            res.writeHead(resValidacion.ok ? 200 : 400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resValidacion));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // POST /api/notificaciones/enviar-email
    if (req.method === 'POST' && pathname === '/api/notificaciones/enviar-email') {
        try {
            const body = await parseJsonBody(req);
            const { email, contrato_id, uuid_publico, nombre_destinatario } = body;
            
            let contrato = null;
            if (uuid_publico) {
                contrato = db.getContratoByUuidPublico(uuid_publico);
            } else if (contrato_id) {
                contrato = db.getContratoById(contrato_id);
            }

            if (!contrato) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'Contrato no encontrado para despacho de correo.' }));
            }

            const resultadoEnvio = await enviarNotificacionEmail({
                email,
                contrato,
                baseUrl: publicReachableUrl,
                nombreDestinatario: nombre_destinatario
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resultadoEnvio));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // GET /api/notificaciones/email-logs
    if (req.method === 'GET' && pathname === '/api/notificaciones/email-logs') {
        try {
            const logs = getEmailLogs();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, logs }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // POST /api/notificaciones/whatsapp-contrato
    if (req.method === 'POST' && pathname === '/api/notificaciones/whatsapp-contrato') {
        try {
            const body = await parseJsonBody(req);
            const { telefono, uuid_publico, contrato_id } = body;

            let contrato = null;
            if (uuid_publico) {
                contrato = db.getContratoByUuidPublico(uuid_publico);
            } else if (contrato_id) {
                contrato = db.getContratoById(contrato_id);
            }

            if (!contrato) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'Contrato no encontrado.' }));
            }

            const resWa = generarEnlaceWhatsAppContrato(telefono, contrato, publicReachableUrl);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resWa));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // ==========================================
    // 2.B RUTAS DEL BOT AUTÓNOMO DE WHATSAPP
    // ==========================================

    // POST /api/whatsapp/bot/send
    if (req.method === 'POST' && pathname === '/api/whatsapp/bot/send') {
        try {
            const body = await parseJsonBody(req);
            const { telefono, contrato_id, uuid_publico, nombre } = body;

            let contrato = null;
            if (uuid_publico) {
                contrato = db.getContratoByUuidPublico(uuid_publico);
            } else if (contrato_id) {
                contrato = db.getContratoById(contrato_id);
            } else {
                const todos = db.getContratos();
                contrato = todos.length > 0 ? todos[0] : null;
            }

            if (!contrato) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'No se encontró el contrato especificado.' }));
            }

            const receptor = (contrato.firmantes || []).find(f => f.rol === 'parte_receptora') || {};
            const nombreDest = nombre || receptor.nombre_completo || 'Estimado(a) Firmante';

            const resultado = await whatsappBotService.enviarContratoPorBot({
                telefono: telefono || '573001234567',
                nombreDestinatario: nombreDest,
                contrato,
                baseUrl: publicReachableUrl
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resultado));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // GET /api/whatsapp/bot/contacts
    if (req.method === 'GET' && pathname === '/api/whatsapp/bot/contacts') {
        try {
            const contacts = whatsappBotService.getListaContactos();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, total: contacts.length, contacts }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // GET /api/whatsapp/bot/messages
    if (req.method === 'GET' && pathname === '/api/whatsapp/bot/messages') {
        try {
            const { telefono } = parsedUrl.query;
            const messages = whatsappBotService.getHistorialMensajes(telefono);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, total: messages.length, messages }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // POST /api/whatsapp/bot/incoming (Simulación o Webhook oficial)
    if (req.method === 'POST' && pathname === '/api/whatsapp/bot/incoming') {
        try {
            const body = await parseJsonBody(req);
            const { from, text, pushName } = body;

            if (!text || !text.trim()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, error: 'Texto del mensaje requerido' }));
            }

            const resultado = await whatsappBotService.procesarMensajeEntrante({
                from: from || '573001234567',
                text: text.trim(),
                pushName: pushName || 'Laura Mendoza'
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resultado));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // GET /api/whatsapp/bot/stats
    if (req.method === 'GET' && pathname === '/api/whatsapp/bot/stats') {
        try {
            const stats = whatsappBotService.getMetricasBot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, stats }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    // GET /api/contratos
    if (req.method === 'GET' && pathname === '/api/contratos') {
        try {
            const { estado, tipo_contrato, busqueda } = parsedUrl.query;
            const contratos = db.getContratos({ estado, tipo_contrato, busqueda });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, total: contratos.length, contratos }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/contratos/:id
    if (req.method === 'GET' && pathname.startsWith('/api/contratos/')) {
        try {
            const id = pathname.replace('/api/contratos/', '');
            const contrato = db.getContratoById(id);
            if (!contrato) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Contrato no encontrado.' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, contrato }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/certificar/:uuid_publico
    if (req.method === 'GET' && pathname.startsWith('/api/certificar/')) {
        try {
            const uuidPublico = pathname.replace('/api/certificar/', '');
            const contrato = db.getContratoByUuidPublico(uuidPublico);

            if (!contrato) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    ok: false,
                    autentico: false,
                    mensaje: 'DOCUMENTO NO VÁLIDO O MANIPULADO',
                    detalles: 'El identificador único no se encuentra registrado en el libro mayor de certificaciones.'
                }));
            }

            db.registrarAuditoriaQR(contrato.id, uuidPublico, clientIp, userAgent, 'VALIDO', {
                origen: 'Escaneo QR / API'
            });

            const firmantesEnmascarados = (contrato.firmantes || []).map(f => ({
                rol: f.rol,
                nombre_completo: f.nombre_completo,
                identificacion_enmascarada: enmascararIdentificacion(f.identificacion),
                fecha_firma: f.fecha_firma,
                ip_enmascarada: f.direccion_ip ? f.direccion_ip.replace(/\.\d+$/, '.***') : '127.0.0.***',
                firma_registrada: Boolean(f.firma_imagen_url)
            }));

            const verificationUrl = getVerificationUrl(contrato.uuid_publico, publicReachableUrl);
            const qrSvg = generateQrSvg(verificationUrl, 130);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
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
                qr_svg: qrSvg,
                enlace_verificacion: verificationUrl,
                marco_legal: {
                    ley: "Ley 527 de 1999 (Colombia)",
                    equivalente_funcional: "Mensaje de Datos con plena eficacia probatoria y no repudio.",
                    decreto: "Decreto 2364 de 2012 (Firma Electrónica)"
                }
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/dashboard/stats
    if (req.method === 'GET' && pathname === '/api/dashboard/stats') {
        try {
            const stats = db.getMetricasDashboard();
            const comercio = db.getComercioDefault();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, stats, comercio }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/agent/chat
    if (req.method === 'POST' && pathname === '/api/agent/chat') {
        try {
            const body = await parseJsonBody(req);
            const userMsg = body.message || '';
            if (!userMsg.trim()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Mensaje requerido' }));
            }
            const reply = await copilotEngine.processUserMessage(userMsg, body.context || {});
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, ...reply }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/agent/sentinel-status
    if (req.method === 'GET' && pathname === '/api/agent/sentinel-status') {
        try {
            const status = sentinelWatcher.getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, ...status }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // Ruta no encontrada
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 No Encontrado');
});

server.listen(PORT, () => {
    const localIp = getLocalIpAddress();
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    console.log(`\n======================================================`);
    console.log(`⚖️  LEXIPROOF LEGALTECH — SERVIDOR ACTIVO`);
    console.log(`📍 Local:   http://localhost:${PORT}`);
    console.log(`🌐 Red:     http://${localIp}:${PORT}`);
    console.log(`📜 Ley:     Ley 527 de 1999 • Firma Electrónica & SHA-256`);
    console.log(`======================================================\n`);

    // Iniciar Vigilante Contractual Persistente
    sentinelWatcher.start(publicUrl);
});
