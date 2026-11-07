const fs = require('fs');
const path = require('path');
const db = require('../../database/db');
const { enviarNotificacionEmail } = require('../services/email_dispatch_service');

const WATCHER_STATE_FILE = path.join(__dirname, '../../database/watcher_state.json');

class LegalSentinelWatcher {
    constructor() {
        this.intervalMs = 60 * 1000; // Revisión cada 60 segundos
        this.timer = null;
        this.isRunning = false;
        this.state = {
            last_run_at: null,
            total_checks: 0,
            alerts_triggered: 0,
            notifications_sent: []
        };
        this.loadState();
    }

    loadState() {
        if (fs.existsSync(WATCHER_STATE_FILE)) {
            try {
                this.state = JSON.parse(fs.readFileSync(WATCHER_STATE_FILE, 'utf8'));
            } catch (e) {
                this.saveState();
            }
        } else {
            this.saveState();
        }
    }

    saveState() {
        try {
            fs.writeFileSync(WATCHER_STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (e) {
            console.error('[SENTINEL WATCHER] Error guardando estado:', e.message);
        }
    }

    start(baseUrl = 'http://localhost:3500') {
        if (this.isRunning) return;
        this.isRunning = true;
        this.baseUrl = baseUrl;
        console.log('[SENTINEL WATCHER] 🛡️ Vigilante Contractual Persistente iniciado (Revisión cada 60s).');

        // Ejecutar primer chequeo a los 5 segundos del arranque
        setTimeout(() => this.runAudit(), 5000);

        // Ciclo continuo
        this.timer = setInterval(() => this.runAudit(), this.intervalMs);
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.timer) clearInterval(this.timer);
        console.log('[SENTINEL WATCHER] Vigilante detenido.');
    }

    async runAudit() {
        this.state.total_checks++;
        this.state.last_run_at = new Date().toISOString();

        try {
            const contratos = db.getContratos({});
            const now = Date.now();
            const diasAlerta = 30; // Alerta para contratos que venzan en 30 días o menos

            for (const c of contratos) {
                // Si el contrato tiene fecha de vencimiento o estimación por plazo
                let fechaVence = c.expires_at ? new Date(c.expires_at).getTime() : null;
                
                // Si no tiene fecha explícita, calcularla a partir de created_at + 12 meses
                if (!fechaVence && c.created_at) {
                    const createdDate = new Date(c.created_at);
                    createdDate.setFullYear(createdDate.getFullYear() + 1);
                    fechaVence = createdDate.getTime();
                }

                if (fechaVence) {
                    const diasRestantes = Math.ceil((fechaVence - now) / (1000 * 60 * 60 * 24));
                    const yaNotificado = this.state.notifications_sent.some(n => n.contrato_id === c.id && n.tipo === 'PREAVISO_30_DIAS');

                    if (diasRestantes <= diasAlerta && diasRestantes >= 0 && !yaNotificado) {
                        console.log(`[SENTINEL ALERTA] ⚠️ Contrato "${c.titulo}" vence en ${diasRestantes} días. Generando preaviso.`);

                        // Buscar correos de firmantes para despachar preaviso
                        const emisor = (c.firmantes || []).find(f => f.rol === 'parte_emisora') || {};
                        const emailDestino = emisor.email || process.env.SMTP_USER || 'gestionhotel.pro@gmail.com';

                        const record = {
                            contrato_id: c.id,
                            titulo: c.titulo,
                            dias_restantes: diasRestantes,
                            tipo: 'PREAVISO_30_DIAS',
                            notificado_a: emailDestino,
                            fecha_envio: new Date().toISOString()
                        };

                        this.state.notifications_sent.push(record);
                        this.state.alerts_triggered++;
                        this.saveState();

                        // Enviar correo de preaviso legal formal
                        try {
                            await enviarNotificacionEmail({
                                email: emailDestino,
                                contrato: {
                                    ...c,
                                    titulo: `[ALERTA DE PREAVISO] Vencimiento Próximo: ${c.titulo}`
                                },
                                baseUrl: this.baseUrl,
                                nombreDestinatario: emisor.nombre_completo || 'Representante Legal'
                            });
                            console.log(`[SENTINEL ALERTA] Correo de preaviso despachado con éxito a ${emailDestino}`);
                        } catch (errEmail) {
                            console.error('[SENTINEL EMAIL ERROR]', errEmail.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[SENTINEL AUDIT FAIL]', err.message);
        }

        this.saveState();
    }

    getStatus() {
        return {
            is_running: this.isRunning,
            state: this.state
        };
    }
}

module.exports = new LegalSentinelWatcher();
