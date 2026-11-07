-- =========================================================================
-- ESQUEMA DE BASE DE DATOS: LEXIPROOF (DOCUSIGN LOCAL) - SUPABASE / POSTGRESQL
-- Cumplimiento: Ley 527 de 1999 de Colombia (Mensajes de Datos y Firmas)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Organizaciones y Comercios Emisores
CREATE TABLE IF NOT EXISTS usuarios_comercio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_razon_social VARCHAR(255) NOT NULL,
    nit_o_cc VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(50),
    representante_legal VARCHAR(255),
    direccion_fiscal TEXT,
    api_key VARCHAR(64) DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla Principal de Contratos y Documentos Criptográficos
CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uuid_publico UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    comercio_id UUID REFERENCES usuarios_comercio(id) ON DELETE CASCADE,
    tipo_contrato VARCHAR(60) NOT NULL, -- 'arrendamiento_vivienda', 'prestacion_servicios', 'nda_confidencialidad', 'compraventa'
    titulo VARCHAR(255) NOT NULL,
    valor_total NUMERIC(15, 2) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'COP',
    contenido_markdown TEXT NOT NULL,
    contenido_html_final TEXT,
    resumen_ejecutivo_ia JSONB, -- { "compromisos_clave": [], "riesgos_incumplimiento": [], "vacios_identificados": [] }
    estado VARCHAR(30) NOT NULL DEFAULT 'borrador', -- 'borrador', 'pendiente_firma', 'completado_certificado', 'revocado'
    hash_sha256 VARCHAR(64), -- Hash inmutable del documento y firmas consolidadas
    tamano_bytes INTEGER,
    ruta_pdf TEXT,
    datos_matriz_evidencia JSONB, -- Resumen completo de la evidencia digital para no repudio
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    certified_at TIMESTAMPTZ
);

-- 3. Tabla de Firmantes y Captura de Evidencia Digital
CREATE TABLE IF NOT EXISTS firmantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    rol VARCHAR(60) NOT NULL, -- 'arrendador', 'arrendatario', 'contratante', 'contratista', 'vendedor', 'comprador', 'parte_emisora', 'parte_receptora'
    nombre_completo VARCHAR(255) NOT NULL,
    tipo_identificacion VARCHAR(20) DEFAULT 'CC', -- 'CC', 'CE', 'NIT', 'PASAPORTE'
    identificacion VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(50),
    firma_imagen_url TEXT, -- PNG en Base64 o URL de archivo
    firma_hash_sha256 VARCHAR(64), -- Hash específico de los trazos de la firma
    direccion_ip VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    fecha_firma TIMESTAMPTZ,
    dispositivo_metadatos JSONB, -- Coordenadas de trazo, resolución de pantalla, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Auditoría Inmutable de Consultas y Escaneos QR
CREATE TABLE IF NOT EXISTS auditoria_accesos_qr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    uuid_publico UUID NOT NULL,
    ip_consulta VARCHAR(45),
    user_agent TEXT,
    fecha_consulta TIMESTAMPTZ DEFAULT NOW(),
    metodo VARCHAR(30) DEFAULT 'QR_SCAN', -- 'QR_SCAN', 'URL_DIRECTA', 'API_REST'
    estado_verificacion VARCHAR(30) DEFAULT 'VALIDO', -- 'VALIDO', 'HASH_NO_COINCIDE', 'REVOCADO'
    detalles_consulta JSONB
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_contratos_uuid_publico ON contratos(uuid_publico);
CREATE INDEX IF NOT EXISTS idx_contratos_comercio_id ON contratos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_contratos_hash_sha256 ON contratos(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(estado);
CREATE INDEX IF NOT EXISTS idx_firmantes_contrato_id ON firmantes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_firmantes_identificacion ON firmantes(identificacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_contrato_id ON auditoria_accesos_qr(contrato_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_accesos_qr(fecha_consulta);

-- =========================================================================
-- POLÍTICAS RLS (Row Level Security) PARA AISLAMIENTO B2B MULTI-TENANT
-- =========================================================================
ALTER TABLE usuarios_comercio ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_accesos_qr ENABLE ROW LEVEL SECURITY;

-- Política de Consulta Pública para Verificación de QR (Solo contratos certificados)
CREATE POLICY "Permitir consulta pública por QR para contratos certificados"
    ON contratos FOR SELECT
    USING (estado = 'completado_certificado');

-- Política de Inserción de Auditoría de QR Pública
CREATE POLICY "Permitir registro público de escaneo de QR"
    ON auditoria_accesos_qr FOR INSERT
    WITH CHECK (true);
