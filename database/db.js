const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'lexiproof_db.json');

// Semilla inicial con datos de demostración
const INITIAL_DATA = {
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
    contratos: [],
    firmantes: [],
    auditoria_accesos_qr: []
};

// Cargar o inicializar base de datos local
function loadDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
            return INITIAL_DATA;
        }
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
    } catch (e) {
        console.error('[DB ERROR] Error al cargar base de datos:', e.message);
        return INITIAL_DATA;
    }
}

// Guardar base de datos con atomicidad
function saveDatabase(data) {
    try {
        const tempPath = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, DB_FILE);
        return true;
    } catch (e) {
        console.error('[DB ERROR] Error al guardar base de datos:', e.message);
        return false;
    }
}

const db = {
    // 1. Organizaciones / Comercio
    getComercioDefault() {
        const data = loadDatabase();
        return data.usuarios_comercio[0];
    },

    // 2. Contratos
    getContratos(filters = {}) {
        const data = loadDatabase();
        let list = [...data.contratos];

        if (filters.estado) {
            list = list.filter(c => c.estado === filters.estado);
        }
        if (filters.tipo_contrato) {
            list = list.filter(c => c.tipo_contrato === filters.tipo_contrato);
        }
        if (filters.busqueda) {
            const q = filters.busqueda.toLowerCase();
            list = list.filter(c => 
                (c.titulo && c.titulo.toLowerCase().includes(q)) ||
                (c.uuid_publico && c.uuid_publico.toLowerCase().includes(q)) ||
                (c.hash_sha256 && c.hash_sha256.toLowerCase().includes(q))
            );
        }

        // Enlazar firmantes
        list = list.map(c => {
            const firmantes = data.firmantes.filter(f => f.contrato_id === c.id);
            return { ...c, firmantes };
        });

        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    getContratoById(id) {
        const data = loadDatabase();
        const contrato = data.contratos.find(c => c.id === id);
        if (!contrato) return null;
        const firmantes = data.firmantes.filter(f => f.contrato_id === id);
        const auditoria = data.auditoria_accesos_qr.filter(a => a.contrato_id === id);
        return { ...contrato, firmantes, auditoria };
    },

    getContratoByUuidPublico(uuid_publico) {
        const data = loadDatabase();
        const contrato = data.contratos.find(c => c.uuid_publico === uuid_publico);
        if (!contrato) return null;
        const firmantes = data.firmantes.filter(f => f.contrato_id === contrato.id);
        const auditoria = data.auditoria_accesos_qr.filter(a => a.contrato_id === contrato.id);
        return { ...contrato, firmantes, auditoria };
    },

    crearContrato(payload) {
        const data = loadDatabase();
        const nuevoContrato = {
            id: payload.id || crypto.randomUUID(),
            uuid_publico: payload.uuid_publico || crypto.randomUUID(),
            comercio_id: payload.comercio_id || data.usuarios_comercio[0].id,
            tipo_contrato: payload.tipo_contrato,
            titulo: payload.titulo,
            valor_total: payload.valor_total || 0,
            moneda: payload.moneda || 'COP',
            contenido_markdown: payload.contenido_markdown,
            contenido_html_final: payload.contenido_html_final || '',
            resumen_ejecutivo_ia: payload.resumen_ejecutivo_ia || null,
            estado: payload.estado || 'borrador',
            hash_sha256: payload.hash_sha256 || null,
            tamano_bytes: payload.tamano_bytes || (payload.contenido_markdown ? Buffer.byteLength(payload.contenido_markdown, 'utf8') : 0),
            ruta_pdf: payload.ruta_pdf || null,
            datos_matriz_evidencia: payload.datos_matriz_evidencia || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            certified_at: payload.certified_at || null
        };

        data.contratos.push(nuevoContrato);

        if (payload.firmantes && Array.isArray(payload.firmantes)) {
            payload.firmantes.forEach(f => {
                const nuevoFirmante = {
                    id: f.id || crypto.randomUUID(),
                    contrato_id: nuevoContrato.id,
                    rol: f.rol,
                    nombre_completo: f.nombre_completo,
                    tipo_identificacion: f.tipo_identificacion || 'CC',
                    identificacion: f.identificacion,
                    email: f.email || '',
                    telefono: f.telefono || '',
                    firma_imagen_url: f.firma_imagen_url || null,
                    firma_hash_sha256: f.firma_hash_sha256 || null,
                    direccion_ip: f.direccion_ip || '127.0.0.1',
                    user_agent: f.user_agent || 'LexiProof Web Client',
                    fecha_firma: f.fecha_firma || null,
                    dispositivo_metadatos: f.dispositivo_metadatos || null,
                    created_at: new Date().toISOString()
                };
                data.firmantes.push(nuevoFirmante);
            });
        }

        saveDatabase(data);
        return this.getContratoById(nuevoContrato.id);
    },

    actualizarContrato(id, payload) {
        const data = loadDatabase();
        const index = data.contratos.findIndex(c => c.id === id);
        if (index === -1) return null;

        data.contratos[index] = {
            ...data.contratos[index],
            ...payload,
            updated_at: new Date().toISOString()
        };

        if (payload.firmantes && Array.isArray(payload.firmantes)) {
            data.firmantes = data.firmantes.filter(f => f.contrato_id !== id);
            payload.firmantes.forEach(f => {
                data.firmantes.push({
                    id: f.id || crypto.randomUUID(),
                    contrato_id: id,
                    rol: f.rol,
                    nombre_completo: f.nombre_completo,
                    tipo_identificacion: f.tipo_identificacion || 'CC',
                    identificacion: f.identificacion,
                    email: f.email || '',
                    telefono: f.telefono || '',
                    firma_imagen_url: f.firma_imagen_url || null,
                    firma_hash_sha256: f.firma_hash_sha256 || null,
                    direccion_ip: f.direccion_ip || '127.0.0.1',
                    user_agent: f.user_agent || 'LexiProof Web Client',
                    fecha_firma: f.fecha_firma || null,
                    dispositivo_metadatos: f.dispositivo_metadatos || null,
                    created_at: new Date().toISOString()
                });
            });
        }

        saveDatabase(data);
        return this.getContratoById(id);
    },

    // 3. Auditoría de accesos QR
    registrarAuditoriaQR(contratoId, uuidPublico, ip, userAgent, estado = 'VALIDO', detalles = {}) {
        const data = loadDatabase();
        const registro = {
            id: crypto.randomUUID(),
            contrato_id: contratoId,
            uuid_publico: uuidPublico,
            ip_consulta: ip || '127.0.0.1',
            user_agent: userAgent || 'Navegador Web / Escáner QR',
            fecha_consulta: new Date().toISOString(),
            metodo: 'QR_SCAN',
            estado_verificacion: estado,
            detalles_consulta: detalles
        };

        data.auditoria_accesos_qr.push(registro);
        saveDatabase(data);
        return registro;
    },

    // 4. Métricas SaaS
    getMetricasDashboard() {
        const data = loadDatabase();
        const total = data.contratos.length;
        const certificados = data.contratos.filter(c => c.estado === 'completado_certificado').length;
        const pendientes = data.contratos.filter(c => c.estado === 'pendiente_firma' || c.estado === 'borrador').length;
        const escaneos = data.auditoria_accesos_qr.length;

        const valorTotalCertificado = data.contratos
            .filter(c => c.estado === 'completado_certificado')
            .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

        return {
            total_contratos: total,
            certificados,
            pendientes,
            escaneos_qr: escaneos,
            valor_total_certificado: valorTotalCertificado,
            tasa_certificacion: total > 0 ? Math.round((certificados / total) * 100) : 100
        };
    }
};

module.exports = db;
