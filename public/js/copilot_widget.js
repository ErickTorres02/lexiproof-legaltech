/**
 * LexiProof LegalTech — Copiloto Legal & Sentinel Widget
 * Inyecta interfaz flotante interactiva y conecta con los agentes autónomos de fondo.
 */
(function() {
    if (window.__LEXIPROOF_COPILOT_LOADED) return;
    window.__LEXIPROOF_COPILOT_LOADED = true;

    // Asegurar que la hoja de estilos esté cargada
    if (!document.getElementById('lexi-copilot-css')) {
        const link = document.createElement('link');
        link.id = 'lexi-copilot-css';
        link.rel = 'stylesheet';
        link.href = '/css/copilot_widget.css';
        document.head.appendChild(link);
    }

    // Plantilla del Widget
    const widgetHtml = `
        <!-- Botón Flotante -->
        <div id="lexiCopilotLauncher" class="lexi-copilot-launcher" title="Copiloto Legal Autónomo & Sentinel">
            <span class="agent-pulse"></span>
            <span>Copiloto Legal</span>
            <span class="agent-badge">24/7 ACTIVO</span>
        </div>

        <!-- Ventana de Chat -->
        <div id="lexiCopilotWindow" class="lexi-copilot-window">
            <div class="copilot-header">
                <div class="copilot-title-group">
                    <div class="copilot-avatar">⚖️</div>
                    <div class="copilot-header-info">
                        <h4>LexiProof Copilot</h4>
                        <p><span class="status-dot"></span> Sentinel Watcher Activo</p>
                    </div>
                </div>
                <button id="lexiCopilotClose" class="copilot-close-btn" title="Cerrar">&times;</button>
            </div>

            <div class="copilot-sentinel-bar" id="copilotSentinelBar">
                <span>🛡️ Auditorías Sentinel: <strong id="sentinelCount">-</strong></span>
                <span id="sentinelUptime">Monitoreo Ley 527</span>
            </div>

            <div class="copilot-messages" id="copilotMessages">
                <div class="copilot-bubble bot">
                    Hola. Soy tu <strong>Copiloto Legal Autónomo</strong> respaldado por el <strong>Sentinel Watcher</strong>.
                    <br><br>
                    Puedo redactar contratos completos con ambas partes (Arrendador y Arrendatario pagador), auditar vencimientos legales en tiempo real y despachar copias oficiales con PDF adjunto a cualquier correo.
                    <br><br>
                    <em>¿En qué te asisto hoy?</em>
                </div>
            </div>

            <div class="copilot-chips">
                <button class="copilot-chip" data-prompt="Redacta contrato de prestación de servicios entre NovaTech SAS NIT 901.450.880 (Contratante) y Laura Mendoza CC 1.045.789 (Contratista) en Medellín por 4.5 millones">💼 Servicios Laura ($4.5M)</button>
                <button class="copilot-chip" data-prompt="Envía el contrato por WhatsApp al 3001234567">🤖 Enviar con Bot WhatsApp</button>
                <button class="copilot-chip" data-prompt="¿Qué contratos se van a vencer próximamente?">🛡️ Auditar Vencimientos</button>
                <button class="copilot-chip" data-prompt="Envía el último contrato a erickdejesustorres02@gmail.com">📧 Enviar a Erick (Gmail)</button>
                <a href="/whatsapp-bot" target="_blank" class="copilot-chip" style="text-decoration:none; color:#38bdf8; border-color:#0284c7;">📱 Consola WhatsApp Bot</a>
            </div>

            <form class="copilot-input-area" id="copilotForm">
                <input type="text" id="copilotInput" placeholder="Pídele al agente redactar, auditar o enviar..." autocomplete="off">
                <button type="submit" class="copilot-send-btn" id="copilotSendBtn">Enviar</button>
            </form>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = widgetHtml;
    document.body.appendChild(container);

    const launcher = document.getElementById('lexiCopilotLauncher');
    const win = document.getElementById('lexiCopilotWindow');
    const closeBtn = document.getElementById('lexiCopilotClose');
    const form = document.getElementById('copilotForm');
    const input = document.getElementById('copilotInput');
    const messages = document.getElementById('copilotMessages');
    const sentinelCount = document.getElementById('sentinelCount');

    // Alternar ventana
    launcher.addEventListener('click', () => {
        win.classList.toggle('open');
        if (win.classList.contains('open')) {
            input.focus();
            fetchSentinelStatus();
        }
    });

    closeBtn.addEventListener('click', () => {
        win.classList.remove('open');
    });

    // Chips
    document.querySelectorAll('.copilot-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            input.value = prompt;
            handleUserSubmit();
        });
    });

    // Envío de mensaje
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserSubmit();
    });

    function formatMessageText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    function addMessage(text, sender = 'bot', actionHtml = '') {
        const bubble = document.createElement('div');
        bubble.className = `copilot-bubble ${sender}`;
        bubble.innerHTML = formatMessageText(text) + actionHtml;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
    }

    // Función global para despachar a cualquier correo directamente desde el chat
    window.__lexiDispatchMail = async function(uuid) {
        const mailInput = document.getElementById(`quickMail_${uuid}`);
        const email = (mailInput?.value || '').trim();
        if (!email || !email.includes('@')) {
            alert('Por favor escribe un correo electrónico válido (ejemplo: cliente@correo.com)');
            mailInput?.focus();
            return;
        }

        addMessage(`Envía el contrato ${uuid.slice(0, 8)} a ${email}`, 'user');
        
        // Ejecutar solicitud al Copiloto
        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Envía el contrato a ${email}` })
            });
            const data = await res.json();
            if (data.ok) {
                addMessage(data.message, 'bot');
            } else {
                addMessage(`❌ ${data.error || 'Error al enviar'}`, 'bot');
            }
        } catch (e) {
            addMessage(`❌ Error de red: ${e.message}`, 'bot');
        }
    };

    // Función global para despachar automáticamente vía Bot de WhatsApp
    window.__lexiDispatchWhatsAppBot = async function(uuid) {
        const phoneInput = document.getElementById(`quickPhone_${uuid}`);
        const phone = (phoneInput?.value || '').trim();
        if (!phone) {
            alert('Por favor escribe un número de teléfono celular (ejemplo: 3001234567)');
            phoneInput?.focus();
            return;
        }

        addMessage(`Envía el contrato ${uuid.slice(0, 8)} por WhatsApp al ${phone}`, 'user');
        
        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Envía el contrato por WhatsApp al ${phone}` })
            });
            const data = await res.json();
            if (data.ok) {
                let botLink = `
                    <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
                        ${data.enlace_web ? `
                        <a href="${data.enlace_web}" target="_blank" style="background:#16a34a; color:#fff; padding:9px 14px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:700; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(22,163,74,0.3);">
                            📲 Abrir y Enviar en WhatsApp Real (+${data.telefono || phone}) &rarr;
                        </a>` : ''}
                        <a href="/whatsapp-bot" target="_blank" style="background:#008069; color:#fff; padding:6px 12px; border-radius:5px; text-decoration:none; font-size:11px; font-weight:600; text-align:center; display:block;">
                            📱 Ver en Consola en Vivo de WhatsApp &rarr;
                        </a>
                    </div>
                `;
                addMessage(data.message, 'bot', botLink);
            } else {
                addMessage(`❌ ${data.error || 'Error al despachar por bot'}`, 'bot');
            }
        } catch (e) {
            addMessage(`❌ Error de red: ${e.message}`, 'bot');
        }
    };

    async function handleUserSubmit() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';

        const sendBtn = document.getElementById('copilotSendBtn');
        sendBtn.disabled = true;

        // Indicador temporal de carga
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'copilot-bubble bot';
        loadingBubble.id = 'copilotLoadingBubble';
        loadingBubble.innerHTML = '<em>⚡ El Agente está procesando la solicitud legal...</em>';
        messages.appendChild(loadingBubble);
        messages.scrollTop = messages.scrollHeight;

        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();

            loadingBubble.remove();

            if (data.ok) {
                let actionHtml = '';
                if (data.url_consola) {
                    actionHtml = `
                        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
                            ${data.enlace_web ? `
                            <a class="copilot-action-link" href="${data.enlace_web}" target="_blank" style="background:#16a34a; color:#fff; padding:9px 14px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(22,163,74,0.3);">
                                📲 Abrir y Enviar en WhatsApp Real (+${data.telefono || ''}) &rarr;
                            </a>` : ''}
                            <a class="copilot-action-link" href="${data.url_consola}" target="_blank" style="background:#008069; color:#fff; padding:7px 12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                                📱 Abrir Consola en Vivo del Bot de WhatsApp &rarr;
                            </a>
                        </div>
                    `;
                } else if (data.contrato && (data.contrato.uuid_publico || data.contrato.id)) {
                    const uuid = data.contrato.uuid_publico || data.contrato.id;
                    const waHref = data.url_whatsapp || `https://api.whatsapp.com/send?text=${encodeURIComponent('🏛️ LexiProof: Te comparto el contrato para tu firma: ' + window.location.origin + '/certificar/' + uuid)}`;
                    actionHtml = `
                        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
                            <a class="copilot-action-link" href="${waHref}" target="_blank" style="background:#16a34a; color:#fff; padding:7px 12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
                                📲 Compartir para Firma Remota en WhatsApp &rarr;
                            </a>
                            <a class="copilot-action-link" href="/certificar/${uuid}" target="_blank" style="background:#0f172a; color:#fff; padding:7px 12px; border-radius:6px; text-decoration:none; text-align:center; font-size:12px; font-weight:600;">
                                🛡️ Abrir Verificación & Trazabilidad &rarr;
                            </a>
                            <a class="copilot-action-link" href="/generated_pdfs/contrato_${uuid}.html" target="_blank" style="color:#2563eb; text-decoration:underline; font-size:11px;">📄 Ver Minuta Completa Formal (A4)</a>
                            <a class="copilot-action-link" href="/generated_pdfs/contrato_${uuid}.pdf" target="_blank" style="color:#2563eb; text-decoration:underline; font-size:11px;">📥 Descargar PDF Oficial (ISO 32000-1)</a>
                        </div>
                        
                        <!-- Box de Despacho Automático con Bot de WhatsApp -->
                        <div style="margin-top:10px; background:#f0fdf4; padding:8px 10px; border-radius:8px; border:1px solid #bbf7d0;">
                            <div style="font-size:11px; font-weight:700; color:#14532d; margin-bottom:4px;">🤖 Despacho Automático con Bot de WhatsApp:</div>
                            <div style="display:flex; gap:6px;">
                                <input type="tel" placeholder="Número celular (ej: 3001234567)" id="quickPhone_${uuid}" value="3001234567" style="font-size:11px; padding:5px 8px; flex:1; border:1px solid #86efac; border-radius:5px; outline:none;">
                                <button type="button" class="copilot-send-btn" style="background:#16a34a; padding:4px 10px; font-size:11px; white-space:nowrap;" onclick="window.__lexiDispatchWhatsAppBot('${uuid}')">🚀 Bot Enviar</button>
                            </div>
                            <div style="margin-top:5px; font-size:10px; color:#15803d; display:flex; justify-content:space-between; align-items:center;">
                                <span>El bot enviará el contrato sin que abras WhatsApp</span>
                                <a href="/whatsapp-bot" target="_blank" style="color:#008069; font-weight:700; text-decoration:underline;">Ver Consola &rarr;</a>
                            </div>
                        </div>

                        <!-- Box de Envío por Correo -->
                        <div style="margin-top:8px; background:#f1f5f9; padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1;">
                            <div style="font-size:11px; font-weight:700; color:#0f172a; margin-bottom:4px;">📬 Enviar copia a cualquier correo:</div>
                            <div style="display:flex; gap:6px;">
                                <input type="email" placeholder="correo_destinatario@ejemplo.com" id="quickMail_${uuid}" style="font-size:11px; padding:5px 8px; flex:1; border:1px solid #94a3b8; border-radius:5px; outline:none;">
                                <button type="button" class="copilot-send-btn" style="padding:4px 10px; font-size:11px; white-space:nowrap;" onclick="window.__lexiDispatchMail('${uuid}')">📧 Despachar</button>
                            </div>
                        </div>
                    `;
                }
                addMessage(data.message, 'bot', actionHtml);
            } else {
                addMessage(`⚠️ ${data.error || 'No se pudo procesar la solicitud.'}`, 'bot');
            }
        } catch (err) {
            loadingBubble.remove();
            addMessage(`❌ Error de conexión con el agente: ${err.message}`, 'bot');
        } finally {
            sendBtn.disabled = false;
            fetchSentinelStatus();
        }
    }

    // Actualizar estado del Sentinel
    async function fetchSentinelStatus() {
        try {
            const res = await fetch('/api/agent/sentinel-status');
            const data = await res.json();
            if (data.ok && data.state) {
                sentinelCount.textContent = `${data.state.total_checks} ciclos`;
            }
        } catch (e) {
            // Ignorar silenciosamente
        }
    }

    // Primer check de estado
    fetchSentinelStatus();
})();
