const fs = require('fs');
const path = require('path');
const crearHtml = fs.readFileSync(path.join(__dirname, 'public/crear.html'), 'utf8');
const dashHtml = fs.readFileSync(path.join(__dirname, 'public/dashboard.html'), 'utf8');
const certHtml = fs.readFileSync(path.join(__dirname, 'public/certificar.html'), 'utf8');

// Extraer el contenido de <main> de cada uno
const getTagContent = (src, tag) => {
    const m = src.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? m[1] : '';
};

const mainCrear = getTagContent(crearHtml, 'main');
const mainDash = getTagContent(dashHtml, 'main');
const mainCert = getTagContent(certHtml, 'main');

const unifiedHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LexiProof LegalTech — Suite Todo-en-Uno (Contratos, IA & Criptografía)</title>
    <link rel="stylesheet" href="/css/lexi-theme.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        .tabs-nav { display: flex; gap: 6px; background: #f1f5f9; padding: 4px; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; }
        .tab-btn { padding: 8px 16px; border-radius: 8px; border: none; background: transparent; color: #64748b; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; transition: all 0.2s; }
        .tab-btn:hover { color: #0f172a; background: rgba(255,255,255,0.6); }
        .tab-btn.active { background: #ffffff; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .app-tab-panel { display: none; animation: fadeIn 0.25s ease; }
        .app-tab-panel.active { display: block; }
    </style>
</head>
<body>
    <header class="navbar">
        <div class="navbar-inner">
            <a href="/" class="brand-link">
                <div class="brand-icon-box">§</div>
                <div>
                    <div class="brand-title">LexiProof <span style="font-size:0.75rem; color:#2563eb; font-weight:700;">LegalTech Suite</span></div>
                    <div class="brand-tagline">Redacción IA • Sellado SHA-256 • Ley 527 de 1999</div>
                </div>
            </a>
            <div class="tabs-nav">
                <button class="tab-btn active" onclick="switchAppTab('tab-wizard')"><span>✍️</span> 1. Redactar Contrato (IA)</button>
                <button class="tab-btn" onclick="switchAppTab('tab-dashboard')"><span>📊</span> 2. Panel & Archivo</button>
                <button class="tab-btn" onclick="switchAppTab('tab-verifier')"><span>🔍</span> 3. Verificador Criptográfico</button>
            </div>
        </div>
    </header>

    <main class="main-container">
        <div class="app-tab-panel active" id="tab-wizard">${mainCrear}</div>
        <div class="app-tab-panel" id="tab-dashboard">${mainDash}</div>
        <div class="app-tab-panel" id="tab-verifier">${mainCert}</div>
    </main>

    <div class="modal-backdrop" id="modalCertificadoExito" style="display:none;">
        <div class="modal-content" style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:8px;">🎉</div>
            <h3 style="font-size:1.4rem; font-weight:900; color:#0f172a; margin-bottom:6px;">¡Contrato Certificado con Éxito!</h3>
            <div class="badge badge-certified" style="margin-bottom:14px;">Válido bajo Ley 527 de 1999</div>
            <p style="font-size:0.85rem; color:#475569; margin-bottom:18px;">El documento fue sellado con Hash SHA-256 inmutable y el PDF A4 está listo.</p>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:left; margin-bottom:18px; font-size:0.75rem;">
                <div><strong>UUID:</strong> <span id="resUuidPublico" style="font-family:monospace; color:#2563eb;"></span></div>
                <div style="margin-top:4px;"><strong>Hash SHA-256:</strong> <span id="resHashSha256" style="font-family:monospace; color:#047857; word-break:break-all;"></span></div>
            </div>
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                <a id="btnDescargarPdfModal" href="#" target="_blank" class="btn-primary">📄 Descargar PDF</a>
                <button class="btn-secondary" onclick="verificarContratoDesdeModal()">🔍 Ver en Verificador</button>
                <button class="btn-secondary" onclick="cerrarModalYVerDashboard()">📊 Ir al Dashboard</button>
            </div>
        </div>
    </div>

    <footer class="app-footer">
        <div class="footer-inner">
            <div><strong>LexiProof LegalTech Colombia</strong> • Suite Unificada de Criptografía & Contratos</div>
            <div>Ley 527 de 1999 • Decreto 2364 de 2012 • Ley 1581 de 2012</div>
        </div>
    </footer>

    <script src="/js/signature_canvas.js"></script>
    <script src="/js/wizard_engine.js"></script>
    <script src="/js/dashboard_engine.js"></script>
    <script src="/js/cert_verifier.js"></script>
    <script>
        function switchAppTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-tab-panel').forEach(p => p.classList.remove('active'));
            const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
            if (btn) btn.classList.add('active');
            const panel = document.getElementById(tabId);
            if (panel) panel.classList.add('active');
            if (tabId === 'tab-dashboard' && typeof cargarContratos === 'function') {
                cargarContratos();
                cargarMetricas();
            }
        }
        function verificarContratoDesdeModal() {
            const uuid = document.getElementById('resUuidPublico')?.innerText;
            document.getElementById('modalCertificadoExito').style.display = 'none';
            switchAppTab('tab-verifier');
            history.pushState(null, '', '/certificar/' + uuid);
            location.href = '/certificar/' + uuid;
        }
        function cerrarModalYVerDashboard() {
            document.getElementById('modalCertificadoExito').style.display = 'none';
            switchAppTab('tab-dashboard');
        }
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'public/index.html'), unifiedHtml, 'utf8');
console.log('✅ index.html unificado generado con éxito.');
