
export class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
    }

    update(t) {
        this.particles = this.particles.filter(p => {
            p.life -= 16; // Approx 60fps
            if (p.life <= 0) return false;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;

            if (p.decay) {
                p.vx *= p.decay;
                p.vy *= p.decay;
            }

            return true;
        });
    }

    draw(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;

            if (p.type === 'circle') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'star') {
                this.drawStar(ctx, p.x, p.y, 5, p.size, p.size / 2);
            } else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        });
        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    addParticle(config) {
        this.particles.push({
            x: config.x,
            y: config.y,
            vx: config.vx || (Math.random() - 0.5) * 2,
            vy: config.vy || (Math.random() - 0.5) * 2,
            life: config.life || 1000,
            maxLife: config.life || 1000,
            color: config.color || '#fff',
            size: config.size || 4,
            gravity: config.gravity || 0,
            decay: config.decay || 1,
            type: config.type || 'rect'
        });
    }

    createExplosion(x, y, color = '#ffaa00') {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const speed = 2 + Math.random() * 3;
            this.addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 600 + Math.random() * 400,
                color: color,
                size: 6 + Math.random() * 4,
                gravity: 0.1,
                decay: 0.95,
                type: 'circle'
            });
        }
    }

    createSparkle(x, y, color = '#ffff00') {
        for (let i = 0; i < 5; i++) {
            this.addParticle({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 400 + Math.random() * 200,
                color: color,
                size: 4 + Math.random() * 4,
                gravity: 0,
                decay: 0.9,
                type: 'star'
            });
        }
    }

    createJumpDust(x, y) {
        for (let i = 0; i < 6; i++) {
            this.addParticle({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1,
                life: 300 + Math.random() * 200,
                color: '#dddddd',
                size: 3 + Math.random() * 3,
                gravity: -0.05,
                decay: 0.95,
                type: 'circle'
            });
        }
    }
}
