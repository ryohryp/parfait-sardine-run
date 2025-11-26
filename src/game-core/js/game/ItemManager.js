
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
            rv: rand(0.3, 0.8), // Relative velocity to scroll speed
            char: isParfait ? '🍨' : '🐟',
            score: isParfait ? 2 : 1
        });
    }

    spawnPower(level) {
        this.powers.push({
            x: this.canvas.width + 26,
            y: this.canvas.height - GROUND - 44 - rand(0, 120),
            w: 26, h: 26,
            rv: 0, // Matches scroll speed exactly
            char: '⭐'
        });
    }

    update(t, level, player, hasMagnet) {
        // Balance Tweak: Reduced item frequency - start at 2500ms, decrease by 100ms per level
        const itemIv = clamp(2500 - (level - 1) * 100, 800, 2500);
        const powerIv = 11000;
        const scrollSpeed = 1.5 + level * 0.1;

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
                // Only attract if item is ahead of player (dx < 0) or very close
                if (dx < 0) {
                    const dist = Math.hypot(dx, dy);
                    if (dist < 200) { // Increased range slightly to feel better for ahead items
                        it.x += dx * 0.18;
                        it.y += dy * 0.18;
                    }
                }
            }
            // Move with scroll speed + relative velocity
            it.x -= (scrollSpeed + (it.rv || 0));
            return it.x + it.w > 0;
        });

        // Update Powers
        this.powers = this.powers.filter(pw => {
            pw.x -= (scrollSpeed + (pw.rv || 0));
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
