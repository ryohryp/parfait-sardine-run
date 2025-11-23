
import { GROUND } from '../game-constants.js';

function now() { return performance.now(); }
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class ItemManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.items = [];
        this.powers = [];
        this.lastItemTime = 0;
        this.lastPowerTime = 0;
    }

    reset() {
        this.items = [];
        this.powers = [];
        this.lastItemTime = now();
        this.lastPowerTime = now();
    }

    spawnItem(level) {
        const isParfait = Math.random() < 0.5;
        this.items.push({
            x: this.canvas.width + 24,
            y: this.canvas.height - GROUND - 44 - rand(0, 95),
            w: 30, h: 30,
            v: 3.0 + rand(0.6, 1.8) + (level - 1) * 0.22,
            char: isParfait ? '🍨' : '🐟',
            score: isParfait ? 2 : 1
        });
    }

    spawnPower(level) {
        this.powers.push({
            x: this.canvas.width + 26,
            y: this.canvas.height - GROUND - 44 - rand(0, 120),
            w: 26, h: 26,
            v: 3.0 + (level - 1) * 0.25,
            char: '⭐'
        });
    }

    update(t, level, player, hasMagnet) {
        const itemIv = clamp(1200 - (level - 1) * 100, 480, 1200);
        const powerIv = 11000;

        if (t - this.lastItemTime > itemIv) {
            this.spawnItem(level);
            this.lastItemTime = t;
        }

        if (t - this.lastPowerTime > powerIv) {
            this.spawnPower(level);
            this.lastPowerTime = t;
        }

        // Update Items
        this.items = this.items.filter(it => {
            if (hasMagnet) {
                const dx = (player.x - it.x), dy = (player.y - it.y);
                const dist = Math.hypot(dx, dy);
                if (dist < 160) {
                    it.x += dx * 0.18;
                    it.y += dy * 0.18;
                }
            }
            it.x -= it.v;
            return it.x + it.w > 0;
        });

        // Update Powers
        this.powers = this.powers.filter(pw => {
            pw.x -= pw.v;
            return pw.x + pw.w > 0;
        });
    }

    draw(ctx) {
        ctx.font = '28px serif';
        ctx.textBaseline = 'top';

        this.items.forEach(it => ctx.fillText(it.char, it.x, it.y));
        this.powers.forEach(pw => ctx.fillText(pw.char || '⭐', pw.x, pw.y));
    }
}
