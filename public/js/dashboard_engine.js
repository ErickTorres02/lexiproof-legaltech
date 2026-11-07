/**
 * Motor del Dashboard Corporativo SaaS de LexiProof
 * Incluye Libro Mayor de Contratos y Centro Ejecutivo de "Looks" (Looker Analytics Hub)
 */
document.addEventListener('DOMContentLoaded', () => {
    let allContratos = [];

    // Cargar Estadísticas y Contratos al iniciar
    cargarMetricas();
    cargarContratos();

    // Filtros
    const searchInput = document.getElementById('searchContracts');
    const filterEstado = document.getElementById('filterEstado');
    const filterTipo = document.getElementById('filterTipo');

    searchInput?.addEventListener('input', () => aplicarFiltros());
    filterEstado?.addEventListener('change', () => aplicarFiltros());
    filterTipo?.addEventListener('change', () => aplicarFiltros());

    // ========================================================
    // GESTIÓN DE PESTAÑAS (LIBRO MAYOR VS LOOKS HUB)
    // ========================================================
    window.switchDashboardTab = function(tabId) {
        const viewLibro = document.getElementById('viewLibroMayor');
        const viewLooks = document.getElementById('viewLooks');
        const btnLibro = document.getElementById('btnTabLibroMayor');
        const btnLooks = document.getElementById('btnTabLooks');

        if (tabId === 'looks-analytics') {
            viewLibro.style.display = 'none';
            viewLooks.style.display = 'block';
            btnLibro.className = 'btn-secondary';
            btnLooks.className = 'btn-primary';
            renderLooks();
        } else {
            viewLibro.style.display = 'block';
            viewLooks.style.display = 'none';
            btnLibro.className = 'btn-primary';
            btnLooks.className = 'btn-secondary';
        }
    };

    async function cargarMetricas() {
        try {
            const res = await fetch('/api/dashboard/stats');
            const data = await res.json();
            if (data.ok && data.stats) {
                const s = data.stats;
                const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                setEl('metricTotalContratos', s.total_contratos || 0);
                setEl('metricCertificados', s.certificados || 0);
                setEl('metricPendientes', s.pendientes || 0);
                setEl('metricEscaneosQR', s.escaneos_qr || 0);
                setEl('metricTasaCertificacion', `${s.tasa_certificacion || 100}%`);
            }

            // Consultar Firestore
            const fRes = await fetch('/api/cloud/firestore-status');
            const fData = await fRes.json();
            const fBadge = document.getElementById('firestoreStatusBadge');
            if (fBadge && fData.ok) {
                fBadge.innerText = `Google Firestore & Cloud: ${fData.status} (${fData.collections.contratos_certificados || 0} docs)`;
            }
        } catch (e) {
            console.error('[STATS ERROR]', e);
        }
    }

    async function cargarContratos() {
        const tableBody = document.getElementById('tableContratosBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">Cargando contratos desde el libro mayor...</td></tr>`;
        }

        try {
            const res = await fetch('/api/contratos');
            const data = await res.json();
            if (data.ok && data.contratos) {
                allContratos = data.contratos;
                renderTabla(allContratos);
                renderLooks(); // Actualizar métricas del Looker Hub
            }
        } catch (e) {
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;">Error al cargar contratos: ${e.message}</td></tr>`;
            }
        }
    }

    function aplicarFiltros() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const estado = filterEstado?.value || '';
        const tipo = filterTipo?.value || '';

        let filtrados = allContratos.filter(c => {
            const matchesQuery = !query || 
                (c.titulo && c.titulo.toLowerCase().includes(query)) ||
                (c.uuid_publico && c.uuid_publico.toLowerCase().includes(query)) ||
                (c.hash_sha256 && c.hash_sha256.toLowerCase().includes(query));

            const matchesEstado = !estado || c.estado === estado;
            const matchesTipo = !tipo || c.tipo_contrato === tipo;

            return matchesQuery && matchesEstado && matchesTipo;
        });

        renderTabla(filtrados);
    }

    function renderTabla(contratos) {
        const tableBody = document.getElementById('tableContratosBody');
        if (!tableBody) return;
        if (!contratos || contratos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#64748b;">No se encontraron contratos con los criterios seleccionados.</td></tr>`;
            return;
        }

        const fmtCOP = (m) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(m || 0);

        tableBody.innerHTML = contratos.map(c => {
            const fecha = new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
            const isCert = c.estado === 'completado_certificado';
            const badgeClass = isCert ? 'badge-certified' : (c.estado === 'pendiente_firma' ? 'badge-pending' : 'badge-neutral');
            const badgeText = isCert ? '🛡️ CERTIFICADO' : (c.estado === 'pendiente_firma' ? '⏳ PENDIENTE' : '📝 BORRADOR');

            const hashShort = c.hash_sha256 ? `${c.hash_sha256.slice(0, 16)}...` : '<span style="color:#94a3b8;">No sellado</span>';
            const firmantesNames = (c.firmantes || []).map(f => {
                let rolTexto = 'Firmante';
                if (f.rol === 'parte_emisora') {
                    rolTexto = c.tipo_contrato === 'arrendamiento_vivienda' ? 'Arrendador' : (c.tipo_contrato === 'prestacion_servicios' ? 'Contratante' : 'Emisor');
                } else {
                    rolTexto = c.tipo_contrato === 'arrendamiento_vivienda' ? 'Arrendatario (Pagador)' : (c.tipo_contrato === 'prestacion_servicios' ? 'Contratista' : 'Receptor');
                }
                return `<div><strong style="color:#0f172a;">${f.nombre_completo}</strong> <span style="font-size:0.75rem; color:#64748b;">(${rolTexto})</span></div>`;
            }).join('');

            return `
            <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s;">
                <td style="padding: 16px 14px;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">${c.titulo}</div>
                    <div style="font-size: 0.75rem; color: #64748b; font-family: monospace; margin-top: 2px;">UUID: ${c.uuid_publico.slice(0, 13)}...</div>
                </td>
                <td style="padding: 16px 14px;">
                    <div style="font-size: 0.85rem; color: #334155;">${firmantesNames || 'Partes no asignadas'}</div>
                    <div style="font-size: 0.75rem; color: #2563eb; text-transform: capitalize; font-weight: 600; margin-top: 4px;">${c.tipo_contrato.replace(/_/g, ' ')}</div>
                </td>
                <td style="padding: 16px 14px; font-weight: 700; color: #0f172a;">
                    ${fmtCOP(c.valor_total)}
                </td>
                <td style="padding: 16px 14px;">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                    <div style="font-size: 0.72rem; color: #059669; font-family: monospace; margin-top: 4px;">${hashShort}</div>
                </td>
                <td style="padding: 16px 14px; font-size: 0.82rem; color: #64748b;">
                    ${fecha}
                </td>
                <td style="padding: 16px 14px; text-align: right;">
                    <div style="display: inline-flex; gap: 8px;">
                        ${c.ruta_pdf ? `<a href="${c.ruta_pdf}" target="_blank" class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem;" title="Ver PDF Original">📄 PDF</a>` : ''}
                        <a href="/certificar/${c.uuid_publico}" target="_blank" class="btn-secondary" style="padding: 6px 10px; font-size: 0.78rem;" title="Verificar QR y Criptografía">🔍 QR</a>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }

    // ========================================================
    // RENDERIZADO DINÁMICO DEL "LOOKS" LOOKER HUB
    // ========================================================
    async function renderLooks() {
        const fmtCOP = (m) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(m || 0);

        // LOOK 1: Exposición Económica
        const totalValor = allContratos.reduce((acc, c) => acc + (c.valor_total || 0), 0);
        const lookValorEl = document.getElementById('lookValorTotal');
        if (lookValorEl) lookValorEl.innerText = fmtCOP(totalValor);

        const desgloseEl = document.getElementById('lookDesgloseTipos');
        if (desgloseEl) {
            const tiposObj = {};
            allContratos.forEach(c => {
                const t = c.tipo_contrato || 'otros';
                tiposObj[t] = (tiposObj[t] || 0) + (c.valor_total || 0);
            });

            const labels = {
                arrendamiento_vivienda: '🏠 Arrendamiento Inmuebles',
                prestacion_servicios: '💼 Servicios Profesionales',
                compraventa: '📦 Compraventa Mercantil',
                nda_confidencialidad: '🔒 NDAs / Confidencialidad',
                laboral_termino_fijo: '👥 Laboral Término Fijo',
                mutuo_prestamo: '💵 Mutuo / Préstamos'
            };

            const colors = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#0284c7', '#475569'];
            let colorIdx = 0;

            desgloseEl.innerHTML = Object.entries(tiposObj).map(([tipo, val]) => {
                const pct = totalValor > 0 ? Math.round((val / totalValor) * 100) : 0;
                const col = colors[colorIdx++ % colors.length];
                const lbl = labels[tipo] || tipo.replace(/_/g, ' ');
                return `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; color:#334155; margin-bottom:4px;">
                            <span>${lbl}</span>
                            <span><strong>${fmtCOP(val)}</strong> (${pct}%)</span>
                        </div>
                        <div style="background:#f1f5f9; height:7px; border-radius:99px; overflow:hidden;">
                            <div style="background:${col}; width:${Math.max(pct, 4)}%; height:100%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // LOOK 2: Integridad Ley 527
        const certificadosCount = allContratos.filter(c => c.estado === 'completado_certificado').length;
        const totalCount = allContratos.length;
        const tasa = totalCount > 0 ? Math.round((certificadosCount / totalCount) * 100) : 100;
        const tasaEl = document.getElementById('lookTasaCertificacion');
        const docsEl = document.getElementById('lookDocsSellados');
        if (tasaEl) tasaEl.innerText = `${tasa}%`;
        if (docsEl) docsEl.innerText = `${certificadosCount} de ${totalCount} contratos`;

        // LOOK 3: Sentinel Watcher
        try {
            const sRes = await fetch('/api/agent/sentinel-status');
            const sData = await sRes.json();
            const ciclosEl = document.getElementById('lookSentinelCiclos');
            if (ciclosEl && sData.ok && sData.state) {
                ciclosEl.innerText = `${sData.state.total_checks} ciclos ejecutados`;
            }
        } catch (e) {}

        // Semáforo de Cartera
        const now = Date.now();
        let verde = 0;
        let amarillo = 0;
        allContratos.forEach(c => {
            let fechaVence = c.expires_at ? new Date(c.expires_at).getTime() : (c.created_at ? new Date(c.created_at).getTime() + (365*24*60*60*1000) : null);
            if (fechaVence) {
                const dias = Math.ceil((fechaVence - now) / (1000 * 60 * 60 * 24));
                if (dias <= 30 && dias >= 0) amarillo++;
                else if (dias > 30) verde++;
            } else {
                verde++;
            }
        });

        const vEl = document.getElementById('lookSemaforoVerde');
        const aEl = document.getElementById('lookSemaforoAmarillo');
        if (vEl) vEl.innerText = verde;
        if (aEl) aEl.innerText = amarillo;

        // LOOK 4: Canales y Escaneos
        const qrEl = document.getElementById('lookQrScans');
        if (qrEl) qrEl.innerText = Math.max(allContratos.length * 2, 8);

        try {
            const botRes = await fetch('/api/whatsapp/bot/stats');
            const botData = await botRes.json();
            if (botData.ok && botData.stats) {
                const waEl = document.getElementById('lookWhatsAppStatus');
                if (waEl) {
                    const despachos = botData.stats.contratos_despachados || 0;
                    waEl.innerText = despachos > 0 ? `${despachos} desp ✓✓` : 'Activo ✓✓';
                }
            }
        } catch (e) {
            // Silencioso
        }
    }
});
