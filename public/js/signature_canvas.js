/**
 * Componente Vectorial de Captura de Firmas para LexiProof
 * Soporte táctil en móviles/tablets, mouse/stylus y subida de imágenes PNG/JPG
 */
class SignaturePad {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.strokeColor = options.strokeColor || '#0F172A';
        this.lineWidth = options.lineWidth || 2.5;
        this.isDrawing = false;
        this.points = [];
        this.strokes = [];
        this.strokeCount = 0;
        this.isEmpty = true;
        this.customDataUrl = null;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Configurar contexto 2D
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.lineWidth;

        // Eventos de Mouse
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        window.addEventListener('mouseup', () => this.stopDrawing());

        // Eventos Táctiles (Móviles / Tablets)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.draw(touch);
        }, { passive: false });

        window.addEventListener('touchend', () => this.stopDrawing());
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const data = !this.isEmpty ? this.toDataURL() : null;
        
        this.canvas.width = rect.width * (window.devicePixelRatio || 1);
        this.canvas.height = rect.height * (window.devicePixelRatio || 1);
        this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.lineWidth;

        if (data) {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min((rect.width - 20) / img.width, (rect.height - 20) / img.height, 1);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (rect.width - w) / 2;
                const y = (rect.height - h) / 2;
                this.ctx.drawImage(img, x, y, w, h);
            };
            img.src = data;
        }
    }

    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            time: Date.now()
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.isEmpty = false;
        this.customDataUrl = null;
        const pt = this.getCoordinates(e);
        this.points = [pt];
        this.currentStroke = [pt];

        this.ctx.beginPath();
        this.ctx.moveTo(pt.x, pt.y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pt = this.getCoordinates(e);
        this.points.push(pt);
        this.currentStroke.push(pt);

        if (this.points.length > 2) {
            const p1 = this.points[this.points.length - 2];
            const p2 = this.points[this.points.length - 1];
            const midPoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };

            this.ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            this.ctx.stroke();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.currentStroke && this.currentStroke.length > 0) {
            this.strokes.push(this.currentStroke);
            this.strokeCount++;
        }
        this.points = [];
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        this.isEmpty = true;
        this.points = [];
        this.strokes = [];
        this.strokeCount = 0;
        this.customDataUrl = null;
    }

    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.clear();
                const rect = this.canvas.getBoundingClientRect();
                const scale = Math.min((rect.width - 24) / img.width, (rect.height - 24) / img.height, 1);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (rect.width - w) / 2;
                const y = (rect.height - h) / 2;

                this.ctx.drawImage(img, x, y, w, h);
                this.isEmpty = false;
                this.customDataUrl = dataUrl;
                this.strokeCount = 1;
                resolve();
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    toDataURL(type = 'image/png') {
        if (this.isEmpty) return null;
        if (this.customDataUrl) return this.customDataUrl;
        return this.canvas.toDataURL(type);
    }

    getMetadata() {
        return {
            strokes_count: this.strokeCount,
            is_empty: this.isEmpty,
            is_custom_image: Boolean(this.customDataUrl),
            timestamp_ms: Date.now(),
            canvas_dimensions: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }
}

window.SignaturePad = SignaturePad;
