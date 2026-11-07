/**
 * Motor de Verificación Criptográfica Pública (Destino de Escaneo QR)
 */
async function verificarUUID(uuidPublico) {
    const loadingEl = document.getElementById('certLoading');
    const validCard = document.getElementById('certValidCard');
    const invalidCard = document.getElementById('certInvalidCard');

    if (!uuidPublico || uuidPublico === 'certificar' || uuidPublico === 'certificar.html') {
        // Cargar el contrato más reciente por defecto si está en el tab
        try {
            const listRes = await fetch('/api/contratos');
            const listData = await listRes.json();
            if (listData.ok && listData.contratos?.length > 0) {
                const cert = listData.contratos.find(c => c.estado === 'completado_certificado') || listData.contratos[0];
                return verificarUUID(cert.uuid_publico);
            }
        } catch(e) {}

        if (loadingEl) loadingEl.style.display = 'none';
        if (invalidCard) {
            invalidCard.style.display = 'block';
            document.getElementById('invalidReason').innerText = 'Por favor ingresa o escanea un UUID de contrato válido.';
        }
        return;
    }

    if (loadingEl) loadingEl.style.display = 'block';
    if (validCard) validCard.style.display = 'none';
    if (invalidCard) invalidCard.style.display = 'none';

    try {
        const res = await fetch(`/api/certificar/${uuidPublico}`);
        const data = await res.json();

        if (loadingEl) loadingEl.style.display = 'none';

        if (data.ok && data.autentico) {
            renderValidCert(data);
            if (validCard) validCard.style.display = 'block';
        } else {
            if (invalidCard) invalidCard.style.display = 'block';
            document.getElementById('invalidReason').innerText = data.detalles || 'El código QR o identificador presentado no coincide con ningún documento registrado.';
        }
    } catch (e) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (invalidCard) invalidCard.style.display = 'block';
        document.getElementById('invalidReason').innerText = `Error de conexión: ${e.message}`;
    }

    function renderValidCert(c) {
        const titEl = document.getElementById('certTitulo');
        if (titEl) titEl.innerText = c.titulo;
        const uuidEl = document.getElementById('certUuid');
        if (uuidEl) uuidEl.innerText = c.uuid_publico;
        const hashEl = document.getElementById('certHashSha256');
        if (hashEl) hashEl.innerText = c.hash_sha256;
        
        const fecha = new Date(c.certified_at || c.created_at).toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            dateStyle: 'full',
            timeStyle: 'medium'
        });
        const fechaEl = document.getElementById('certFechaUtc');
        if (fechaEl) fechaEl.innerText = fecha;

        // Botón Descargar PDF
        const btnPdf = document.getElementById('btnDescargarOriginalPdf');
        if (c.ruta_pdf && btnPdf) {
            btnPdf.href = c.ruta_pdf;
            btnPdf.style.display = 'inline-flex';
        }

        // Renderizar QR en la vista de verificación si existe el contenedor
        const qrContainer = document.getElementById('certQrBox');
        if (qrContainer && c.qr_svg) {
            qrContainer.innerHTML = c.qr_svg;
        }

        // Firmantes
        const firmantesList = document.getElementById('certFirmantesList');
        if (firmantesList && c.firmantes) {
            firmantesList.innerHTML = c.firmantes.map(f => {
                const fechaFirma = f.fecha_firma ? new Date(f.fecha_firma).toLocaleString('es-CO') : 'Fecha certificada';
                return `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#0f172a; font-size:0.95rem;">${f.nombre_completo}</span>
                        <span class="badge badge-certified">✍️ FIRMA VÁLIDA</span>
                    </div>
                    <div style="font-size:0.8rem; color:#475569; margin-top:4px;">
                        <span><strong>Doc:</strong> ${f.identificacion_enmascarada}</span> • 
                        <span><strong>Rol:</strong> ${f.rol.toUpperCase()}</span> • 
                        <span><strong>IP:</strong> ${f.ip_enmascarada}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:4px; font-family:monospace;">
                        Estampa: ${fechaFirma}
                    </div>
                </div>
                `;
            }).join('');
        }

        // Resumen Ejecutivo IA
        if (c.resumen_ejecutivo_ia) {
            const sum = c.resumen_ejecutivo_ia;
            const compromisosEl = document.getElementById('certCompromisos');
            const riesgosEl = document.getElementById('certRiesgos');

            if (compromisosEl && sum.resumen_ciudadano?.compromisos_economicos) {
                compromisosEl.innerHTML = sum.resumen_ciudadano.compromisos_economicos.map(x => `<li>${x}</li>`).join('');
            }
            if (riesgosEl && sum.resumen_ciudadano?.riesgos_incumplimiento) {
                riesgosEl.innerHTML = sum.resumen_ciudadano.riesgos_incumplimiento.map(x => `<li>${x}</li>`).join('');
            }
        }
    }
}

window.verificarUUID = verificarUUID;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryUuid = urlParams.get('uuid');

    const pathParts = window.location.pathname.split('/');
    const pathUuid = pathParts[pathParts.length - 1];

    const targetUuid = queryUuid || (pathUuid !== 'certificar' && pathUuid !== 'certificar.html' ? pathUuid : null);

    if (targetUuid && targetUuid !== '') {
        verificarUUID(targetUuid);
    } else if (window.location.pathname.includes('/certificar')) {
        verificarUUID(null);
    }
});
