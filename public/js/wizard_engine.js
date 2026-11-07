/**
 * Motor del Wizard de Creación, Streaming y Certificación de Contratos
 */
document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    let currentContractId = null;
    let draftMarkdown = '';
    let aiAuditData = null;
    let padEmisor = null;
    let padReceptor = null;

    // Elementos DOM
    const stepItems = document.querySelectorAll('.step-item');
    const stepContents = document.querySelectorAll('.step-content');
    const stepperProgress = document.getElementById('stepperProgress');

    // Inicializar Pads de Firma
    const canvas1 = document.getElementById('canvasEmisor');
    const canvas2 = document.getElementById('canvasReceptor');
    if (canvas1) padEmisor = new SignaturePad(canvas1);
    if (canvas2) padReceptor = new SignaturePad(canvas2);

    // Botones de Limpieza de Firma
    document.getElementById('btnClearEmisor')?.addEventListener('click', () => padEmisor?.clear());
    document.getElementById('btnClearReceptor')?.addEventListener('click', () => padReceptor?.clear());

    // Subida de Archivos de Firma (PNG / JPG)
    const fileInputEmisor = document.getElementById('fileUploadFirmaEmisor');
    const btnUploadEmisor = document.getElementById('btnUploadFirmaEmisor');
    btnUploadEmisor?.addEventListener('click', () => fileInputEmisor?.click());

    fileInputEmisor?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                padEmisor?.loadImage(evt.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    const fileInputReceptor = document.getElementById('fileUploadFirmaReceptor');
    const btnUploadReceptor = document.getElementById('btnUploadFirmaReceptor');
    btnUploadReceptor?.addEventListener('click', () => fileInputReceptor?.click());

    fileInputReceptor?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                padReceptor?.loadImage(evt.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // ========================================================
    // CAMBIO DINÁMICO DE TIPO DE CONTRATO (PRESETS & LABELS)
    // ========================================================
    const tipoContratoSelect = document.getElementById('tipoContrato');
    tipoContratoSelect?.addEventListener('change', () => {
        const tipo = tipoContratoSelect.value;
        const tituloInput = document.getElementById('tituloContrato');
        const emisorNombre = document.getElementById('emisorNombre');
        const emisorId = document.getElementById('emisorId');
        const receptorNombre = document.getElementById('receptorNombre');
        const receptorId = document.getElementById('receptorId');
        const montoInput = document.getElementById('montoValor');
        const plazoInput = document.getElementById('duracionPlazo');
        const ciudadInput = document.getElementById('ciudadContrato');

        if (tipo === 'nda_confidencialidad') {
            if (tituloInput) tituloInput.value = 'Acuerdo de Confidencialidad para Evaluación de Modelo de Negocio SaaS';
            if (emisorNombre) emisorNombre.value = 'Grupo Empresarial Andino S.A.S.';
            if (emisorId) emisorId.value = '900.789.654-1';
            if (receptorNombre) receptorNombre.value = 'Sofía Ramírez Osorio';
            if (receptorId) receptorId.value = '1.032.654.987';
            if (montoInput) montoInput.value = '$20.000.000 COP (Cláusula Penal)';
            if (plazoInput) plazoInput.value = '24 meses';
            if (ciudadInput) ciudadInput.value = 'Cali, Colombia';
        } else if (tipo === 'compraventa') {
            if (tituloInput) tituloInput.value = 'Contrato de Compraventa Mercantil de Bienes y Equipos';
            if (emisorNombre) emisorNombre.value = 'Distribuciones Comerciales del Caribe S.A.S.';
            if (emisorId) emisorId.value = '901.333.444-5';
            if (receptorNombre) receptorNombre.value = 'Javier Enrique Paternina Silva';
            if (receptorId) receptorId.value = '1.047.889.001';
            if (montoInput) montoInput.value = '$15.000.000 COP';
            if (plazoInput) plazoInput.value = '30 días calendario';
            if (ciudadInput) ciudadInput.value = 'Barranquilla, Colombia';
        } else if (tipo === 'prestacion_servicios') {
            if (tituloInput) tituloInput.value = 'Desarrollo de Plataforma Web & Automatización con Inteligencia Artificial';
            if (emisorNombre) emisorNombre.value = 'Inversiones & Tecnología NovaTech S.A.S.';
            if (emisorId) emisorId.value = '901.450.880-2';
            if (receptorNombre) receptorNombre.value = 'Carlos Eduardo Morales Benítez';
            if (receptorId) receptorId.value = '1.045.789.234';
            if (montoInput) montoInput.value = '$6.500.000 COP';
            if (plazoInput) plazoInput.value = '3 meses';
            if (ciudadInput) ciudadInput.value = 'Medellín, Colombia';
        } else if (tipo === 'arrendamiento_vivienda') {
            if (tituloInput) tituloInput.value = 'Contrato de Arrendamiento Apartamento 402 - Edificio Los Rosales';
            if (emisorNombre) emisorNombre.value = 'María Fernanda Gómez Restrepo';
            if (emisorId) emisorId.value = '52.890.123';
            if (receptorNombre) receptorNombre.value = 'Andrés Felipe Valencia Castro';
            if (receptorId) receptorId.value = '1.018.456.789';
            if (montoInput) montoInput.value = '$2.300.000 COP';
            if (plazoInput) plazoInput.value = '12 meses';
            if (ciudadInput) ciudadInput.value = 'Bogotá D.C., Colombia';
        } else if (tipo === 'laboral_termino_fijo') {
            if (tituloInput) tituloInput.value = 'Contrato de Trabajo a Término Fijo - Cargo Líder de Operaciones & IT';
            if (emisorNombre) emisorNombre.value = 'Soluciones Digitales de Colombia S.A.S.';
            if (emisorId) emisorId.value = '901.555.666-7';
            if (receptorNombre) receptorNombre.value = 'Valentina Duque Jaramillo';
            if (receptorId) receptorId.value = '1.098.765.432';
            if (montoInput) montoInput.value = '$3.800.000 COP (Salario Mensual)';
            if (plazoInput) plazoInput.value = '12 meses prorrogables';
            if (ciudadInput) ciudadInput.value = 'Bogotá D.C., Colombia';
        } else if (tipo === 'mutuo_prestamo') {
            if (tituloInput) tituloInput.value = 'Contrato de Mutuo / Préstamo de Dinero con Pagaré y Tasa de Interés';
            if (emisorNombre) emisorNombre.value = 'Inversiones y Créditos Andinos S.A.S.';
            if (emisorId) emisorId.value = '900.888.999-0';
            if (receptorNombre) receptorNombre.value = 'Mauricio Alberto Salazar Echeverri';
            if (receptorId) receptorId.value = '1.015.432.876';
            if (montoInput) montoInput.value = '$12.000.000 COP (Capital)';
            if (plazoInput) plazoInput.value = '12 meses en cuotas mensuales';
            if (ciudadInput) ciudadInput.value = 'Medellín, Colombia';
        }
    });

    // ========================================================
    // INTEGRACIÓN DIRECTA CON EL COPILOTO LEGAL (AUTO-FILL)
    // ========================================================
    function aplicarAutocompletadoCopiloto(texto) {
        if (!texto) return;
        const lower = texto.toLowerCase();
        const tipoSelect = document.getElementById('tipoContrato');
        const tituloInput = document.getElementById('tituloContrato');
        const emisorNombre = document.getElementById('emisorNombre');
        const receptorNombre = document.getElementById('receptorNombre');
        const montoInput = document.getElementById('montoValor');

        // Detectar Tipo
        if (lower.includes('nda') || lower.includes('confidencial')) {
            if (tipoSelect) tipoSelect.value = 'nda_confidencialidad';
            if (tituloInput) tituloInput.value = 'Acuerdo de Confidencialidad y No Divulgación (NDA)';
        } else if (lower.includes('servicio') || lower.includes('software') || lower.includes('consultor')) {
            if (tipoSelect) tipoSelect.value = 'prestacion_servicios';
            if (tituloInput) tituloInput.value = 'Contrato de Prestación de Servicios Profesionales';
        } else if (lower.includes('compra') || lower.includes('venta')) {
            if (tipoSelect) tipoSelect.value = 'compraventa';
            if (tituloInput) tituloInput.value = 'Contrato de Compraventa Mercantil';
        } else if (lower.includes('laboral') || lower.includes('trabajo')) {
            if (tipoSelect) tipoSelect.value = 'laboral_termino_fijo';
            if (tituloInput) tituloInput.value = 'Contrato Individual de Trabajo a Término Fijo';
        } else {
            // Por defecto Arrendamiento
            if (tipoSelect) tipoSelect.value = 'arrendamiento_vivienda';
            if (tituloInput) tituloInput.value = 'Contrato de Arrendamiento Inmueble';
        }

        // Extraer Monto
        const matchMonto = texto.match(/(\d+(?:[\.,]\d+)?)\s*(millon(?:es)?|pesos|cop)?/i);
        if (matchMonto) {
            let numStr = matchMonto[1].replace(',', '.');
            let val = parseFloat(numStr);
            const isMillion = matchMonto[2] && matchMonto[2].toLowerCase().includes('millon');
            const monto = isMillion ? Math.round(val * 1000000) : Math.round(val);
            if (montoInput) montoInput.value = `$${monto.toLocaleString('es-CO')} COP`;
        }

        // Extraer Partes
        const clean = texto
            .replace(/contrato\s+de\s+(arriendo|arrendamiento|servicios|compraventa|trabajo)\s*/gi, '')
            .replace(/por\s+\$?\d+.*$/i, '')
            .trim();

        const matchDeA = clean.match(/de\s+([A-ZÁÉÍÓÚa-záéíóú\s]+?)\s+(?:a|para)\s+([A-ZÁÉÍÓÚa-záéíóú\s]+)/i);
        const matchEntre = clean.match(/entre\s+([A-ZÁÉÍÓÚa-záéíóú\s]+?)\s+y\s+([A-ZÁÉÍÓÚa-záéíóú\s]+)/i);

        if (matchDeA) {
            if (emisorNombre) emisorNombre.value = matchDeA[1].replace(/\b(arrendador|propietario|el|la)\b/gi, '').trim();
            if (receptorNombre) receptorNombre.value = matchDeA[2].replace(/\b(arrendatario|inquilino|el|la)\b/gi, '').trim();
        } else if (matchEntre) {
            if (emisorNombre) emisorNombre.value = matchEntre[1].trim();
            if (receptorNombre) receptorNombre.value = matchEntre[2].trim();
        } else {
            const matchSolo = clean.match(/(?:para|con|arrendatario|inquilino)\s+([A-ZÁÉÍÓÚa-záéíóú\s]+)/i);
            if (matchSolo && receptorNombre) {
                receptorNombre.value = matchSolo[1].trim();
            }
        }

        // Extraer Cédulas / NITs y Ciudad si vienen en el texto
        const idMatches = Array.from(texto.matchAll(/(?:NIT|CC|C\.C\.|C[eé]dula|documento)?\s*[:.]?\s*([\d\.\-]+)/gi))
            .map(m => m[1].replace(/[^\d\.\-]/g, ''))
            .filter(num => num.replace(/\D/g, '').length >= 6);

        const emisorId = document.getElementById('emisorId');
        const receptorId = document.getElementById('receptorId');
        const ciudadInput = document.getElementById('ciudadContrato');

        if (idMatches.length >= 2) {
            if (emisorId) emisorId.value = idMatches[0];
            if (receptorId) receptorId.value = idMatches[1];
        } else if (idMatches.length === 1 && receptorId) {
            receptorId.value = idMatches[0];
        }

        const matchCiudad = texto.match(/\ben\s+(Bogot[aá]|Medell[ií]n|Cali|Barranquilla|Cartagena|Bucaramanga|Pereira|Manizales)\b/i);
        if (matchCiudad && ciudadInput) {
            ciudadInput.value = matchCiudad[1].charAt(0).toUpperCase() + matchCiudad[1].slice(1).toLowerCase() + ', Colombia';
        }

        // Resaltar visualmente los campos modificados
        [tipoSelect, tituloInput, emisorNombre, receptorNombre, montoInput, emisorId, receptorId, ciudadInput].forEach(el => {
            if (el) {
                el.style.transition = 'background-color 0.4s ease';
                el.style.backgroundColor = '#ecfdf5';
                setTimeout(() => { el.style.backgroundColor = ''; }, 1200);
            }
        });
    }

    const copilotWizardInput = document.getElementById('copilotWizardInput');
    const btnCopilotWizardFill = document.getElementById('btnCopilotWizardFill');

    btnCopilotWizardFill?.addEventListener('click', () => {
        const val = copilotWizardInput?.value.trim();
        if (val) aplicarAutocompletadoCopiloto(val);
    });

    copilotWizardInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = copilotWizardInput.value.trim();
            if (val) aplicarAutocompletadoCopiloto(val);
        }
    });

    document.querySelectorAll('.copilot-wizard-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const ex = chip.getAttribute('data-example');
            if (copilotWizardInput) copilotWizardInput.value = ex;
            aplicarAutocompletadoCopiloto(ex);
        });
    });

    function goToStep(step) {
        currentStep = step;
        
        // Actualizar Stepper UI
        stepItems.forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.remove('active', 'completed');
            if (stepNum === currentStep) item.classList.add('active');
            else if (stepNum < currentStep) item.classList.add('completed');
        });

        const progressPercent = ((currentStep - 1) / 3) * 100;
        if (stepperProgress) stepperProgress.style.width = `${progressPercent}%`;

        // Mostrar Contenido Activo
        stepContents.forEach((content, index) => {
            content.style.display = (index + 1 === currentStep) ? 'block' : 'none';
        });

        // Redimensionar canvas al llegar al paso 4
        if (currentStep === 4) {
            setTimeout(() => {
                padEmisor?.resizeCanvas();
                padReceptor?.resizeCanvas();
            }, 100);

            const w1 = document.getElementById('whatsappEmisorInput');
            const w2 = document.getElementById('whatsappReceptorInput');
            if (w1 && !w1.value) w1.value = '+57 312 890 4567';
            if (w2 && !w2.value) w2.value = '+57 320 456 7890';
        }
    }

    // ========================================================
    // PASO 1 -> PASO 2: INICIAR GENERACIÓN Y STREAMING CON GEMINI
    // ========================================================
    document.getElementById('formParametros')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const params = {
            tipo_contrato: document.getElementById('tipoContrato').value,
            titulo: document.getElementById('tituloContrato').value,
            parte_emisora_nombre: document.getElementById('emisorNombre').value,
            parte_emisora_id: document.getElementById('emisorId').value,
            parte_receptora_nombre: document.getElementById('receptorNombre').value,
            parte_receptora_id: document.getElementById('receptorId').value,
            monto_valor: document.getElementById('montoValor').value,
            duracion_plazo: document.getElementById('duracionPlazo').value,
            ciudad: document.getElementById('ciudadContrato').value,
            condiciones_especiales: document.getElementById('condicionesEspeciales').value
        };

        // Copiar nombres a paso 4
        const lbl1 = document.getElementById('labelFirmaEmisor');
        if (lbl1) lbl1.innerText = `Firma de ${params.parte_emisora_nombre} (Doc: ${params.parte_emisora_id})`;
        const lbl2 = document.getElementById('labelFirmaReceptor');
        if (lbl2) lbl2.innerText = `Firma de ${params.parte_receptora_nombre} (Doc: ${params.parte_receptora_id})`;

        goToStep(2);

        const editorTextarea = document.getElementById('editorTextarea');
        const streamingStatus = document.getElementById('streamingStatus');
        const btnContinuarPaso3 = document.getElementById('btnContinuarPaso3');

        editorTextarea.value = '';
        draftMarkdown = '';
        if (streamingStatus) streamingStatus.style.display = 'inline-flex';
        if (btnContinuarPaso3) btnContinuarPaso3.disabled = true;

        try {
            const response = await fetch('/api/ia/redactar-contrato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const jsonStr = trimmed.substring(6);
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.type === 'chunk') {
                                draftMarkdown += data.text;
                                editorTextarea.value = draftMarkdown;
                                editorTextarea.scrollTop = editorTextarea.scrollHeight;
                            } else if (data.type === 'done') {
                                draftMarkdown = data.text || draftMarkdown;
                                editorTextarea.value = draftMarkdown;
                                if (streamingStatus) streamingStatus.style.display = 'none';
                                if (btnContinuarPaso3) btnContinuarPaso3.disabled = false;
                            }
                        } catch (err) {}
                    }
                }
            }

            if (streamingStatus) streamingStatus.style.display = 'none';
            if (btnContinuarPaso3) btnContinuarPaso3.disabled = false;

        } catch (err) {
            console.error('[STREAM ERROR]', err);
            if (streamingStatus) streamingStatus.innerHTML = `⚠️ Error en streaming: ${err.message}`;
            if (btnContinuarPaso3) btnContinuarPaso3.disabled = false;
        }
    });

    // ========================================================
    // PASO 2 -> PASO 3: AUDITORÍA LEGAL PREVENTIVA CON IA
    // ========================================================
    document.getElementById('btnContinuarPaso3')?.addEventListener('click', async () => {
        const editorTextarea = document.getElementById('editorTextarea');
        draftMarkdown = editorTextarea.value.trim();

        if (!draftMarkdown) {
            alert('El contrato no puede estar vacío.');
            return;
        }

        goToStep(3);

        const auditLoader = document.getElementById('auditLoader');
        const auditResults = document.getElementById('auditResults');
        if (auditLoader) auditLoader.style.display = 'block';
        if (auditResults) auditResults.style.display = 'none';

        try {
            const tipoContrato = document.getElementById('tipoContrato').value;
            const res = await fetch('/api/ia/auditar-contrato', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contenido_markdown: draftMarkdown,
                    tipo_contrato: tipoContrato
                })
            });

            const data = await res.json();
            if (data.ok && data.auditoria) {
                aiAuditData = data.auditoria;
                renderAuditUI(data.auditoria);
            }
        } catch (e) {
            console.error('[AUDIT UI ERROR]', e);
        } finally {
            if (auditLoader) auditLoader.style.display = 'none';
            if (auditResults) auditResults.style.display = 'block';
        }
    });

    function renderAuditUI(audit) {
        const scoreEl = document.getElementById('auditScore');
        if (scoreEl) scoreEl.innerText = `${audit.puntuacion_seguridad_juridica || 95}/100`;
        const riskEl = document.getElementById('auditRiskLevel');
        if (riskEl) riskEl.innerText = `RIESGO ${audit.nivel_riesgo || 'BAJO'}`;

        const vaciosList = document.getElementById('auditVaciosList');
        if (vaciosList) {
            vaciosList.innerHTML = (audit.vacios_criticos || ['Ningún vacío crítico detectado']).map(v => `<li>${v}</li>`).join('');
        }

        const compromisosList = document.getElementById('auditCompromisosList');
        const riesgosList = document.getElementById('auditRiesgosList');

        if (compromisosList) {
            compromisosList.innerHTML = (audit.resumen_ciudadano?.compromisos_economicos || []).map(c => `<li>${c}</li>`).join('');
        }
        if (riesgosList) {
            riesgosList.innerHTML = (audit.resumen_ciudadano?.riesgos_incumplimiento || []).map(r => `<li>${r}</li>`).join('');
        }

        const leyEl = document.getElementById('auditLey527');
        if (leyEl) leyEl.innerText = audit.conformidad_ley_527 || 'Plena validez probatoria bajo Ley 527 de 1999.';
    }

    // Volver a editar desde paso 3
    document.getElementById('btnVolverEditar')?.addEventListener('click', () => goToStep(2));
    document.getElementById('btnContinuarPaso4')?.addEventListener('click', () => goToStep(4));
    document.getElementById('btnVolverPaso3')?.addEventListener('click', () => goToStep(3));

    // ========================================================
    // PASO 4: FIRMA DIGITAL Y CERTIFICACIÓN CRIPTOGRÁFICA SHA-256
    // ========================================================
    document.getElementById('btnCertificarContrato')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnCertificarContrato');
        
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Sellando Criptográficamente (SHA-256 & Google Firestore)...</span>`;

        const firma1Data = padEmisor?.toDataURL() || null;
        const firma2Data = padReceptor?.toDataURL() || null;

        const emisorNombre = document.getElementById('emisorNombre')?.value || 'Parte Emisora';
        const emisorId = document.getElementById('emisorId')?.value || '1020304050';

        const receptorNombre = document.getElementById('receptorNombre')?.value || 'Parte Receptora';
        const receptorId = document.getElementById('receptorId')?.value || '987654321';

        const titulo = document.getElementById('tituloContrato')?.value || 'Contrato Legal Certificado';
        const tipoContrato = document.getElementById('tipoContrato')?.value || 'arrendamiento_vivienda';
        const montoValorStr = (document.getElementById('montoValor')?.value || '0').replace(/\D/g, '');

        const payload = {
            contrato_id: currentContractId || undefined,
            titulo: titulo,
            tipo_contrato: tipoContrato,
            valor_total: Number(montoValorStr) || 0,
            contenido_markdown: draftMarkdown,
            resumen_ejecutivo_ia: aiAuditData,
            firmantes: [
                {
                    rol: 'parte_emisora',
                    nombre_completo: emisorNombre,
                    tipo_identificacion: 'CC',
                    identificacion: emisorId,
                    firma_imagen_url: firma1Data,
                    fecha_firma: new Date().toISOString()
                },
                {
                    rol: 'parte_receptora',
                    nombre_completo: receptorNombre,
                    tipo_identificacion: 'CC',
                    identificacion: receptorId,
                    firma_imagen_url: firma2Data,
                    fecha_firma: new Date().toISOString()
                }
            ]
        };

        try {
            const res = await fetch('/api/contratos/certificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.ok) {
                mostrarModalExito(data);
            } else {
                alert(`Error al certificar: ${data.error}`);
                btn.disabled = false;
                btn.innerHTML = `<span>🛡️ Certificar y Sellar con SHA-256</span>`;
            }
        } catch (e) {
            alert(`Error de conexión: ${e.message}`);
            btn.disabled = false;
            btn.innerHTML = `<span>🛡️ Certificar y Sellar con SHA-256</span>`;
        }
    });

    function mostrarModalExito(resData) {
        const modal = document.getElementById('modalCertificadoExito');
        const hashEl = document.getElementById('resHashSha256');
        if (hashEl) hashEl.innerText = resData.hash_sha256;
        const uuidEl = document.getElementById('resUuidPublico');
        if (uuidEl) uuidEl.innerText = resData.uuid_publico;
        const btnPdf = document.getElementById('btnDescargarPdfModal');
        if (btnPdf) btnPdf.href = resData.ruta_pdf;
        const btnVerificar = document.getElementById('btnVerificarPublicoModal');
        if (btnVerificar) btnVerificar.href = resData.enlace_verificacion;

        // Configurar Enlace de Firma / Compartir por WhatsApp (Idea 1)
        const btnWa = document.getElementById('btnCompartirWhatsAppModal');
        if (btnWa) {
            const verifUrl = resData.enlace_verificacion || `${window.location.origin}/certificar/${resData.uuid_publico}`;
            const msgWa = `🏛️ *LexiProof LegalTech — Contrato Oficial Certificado*\n\nHola, se ha completado la firma del contrato con Hash SHA-256:\n👉 ${verifUrl}\n\n_Documento vinculante con mérito ejecutivo bajo la Ley 527 de 1999 de Colombia._`;
            btnWa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msgWa)}`;
        }

        // Configurar envío por Correo Automático
        const btnMail = document.getElementById('btnEnviarEmailModal');
        const inputMail = document.getElementById('inputEnviarEmail');
        const feedbackMail = document.getElementById('emailFeedbackMsg');

        const emisorNombre = document.getElementById('emisorNombre')?.value || 'Firmante';

        if (btnMail) {
            btnMail.onclick = async () => {
                const targetEmail = inputMail?.value.trim();
                if (!targetEmail || !targetEmail.includes('@')) {
                    alert('Por favor escribe un correo electrónico válido (ej: cliente@gmail.com).');
                    return;
                }

                btnMail.disabled = true;
                btnMail.innerText = 'Enviando...';
                if (feedbackMail) feedbackMail.style.display = 'none';

                try {
                    const mailRes = await fetch('/api/notificaciones/enviar-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: targetEmail,
                            uuid_publico: resData.uuid_publico,
                            nombre_destinatario: emisorNombre
                        })
                    });
                    const mailData = await mailRes.json();
                    if (mailData.ok) {
                        if (feedbackMail) {
                            feedbackMail.style.display = 'block';
                            feedbackMail.style.color = '#059669';
                            feedbackMail.innerHTML = `✅ <strong>¡Copia certificada despachada con éxito a ${targetEmail}!</strong> El documento y su sello SHA-256 han sido emitidos.`;
                        }
                    } else {
                        alert('Error al enviar correo: ' + mailData.error);
                    }
                } catch (e) {
                    alert('Error de conexión al enviar correo: ' + e.message);
                } finally {
                    btnMail.disabled = false;
                    btnMail.innerText = '📧 Enviar al Correo';
                }
            };
        }

        if (modal) modal.style.display = 'flex';

        const btn = document.getElementById('btnCertificarContrato');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>🛡️ Certificar y Sellar con SHA-256</span>`;
        }
    }

    window.despacharBotDesdeModal = async function() {
        const uuid = document.getElementById('resUuidPublico')?.innerText;
        const nombreDest = document.getElementById('receptorNombre')?.value || 'Firmante';
        const telefono = prompt('Ingresa el número de WhatsApp celular (ej: 3001234567):', '3001234567');
        if (!telefono) return;

        try {
            const res = await fetch('/api/whatsapp/bot/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telefono: telefono,
                    uuid_publico: uuid,
                    nombre: nombreDest
                })
            });
            const data = await res.json();
            if (data.ok) {
                alert(`✅ ¡El Bot de WhatsApp ha despachado el contrato automáticamente a +${data.telefono}!\n\nPuedes ver la conversación en vivo en la Consola del Bot.`);
                window.open('/whatsapp-bot', '_blank');
            } else {
                alert('Error al despachar: ' + (data.error || 'Error desconocido'));
            }
        } catch (e) {
            alert('Error de red: ' + e.message);
        }
    };
});
