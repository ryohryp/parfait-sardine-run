
import { characters } from '../game-data/characters.js';

function now() { return performance.now(); }

export class ProjectileManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.bullets = [];
        this.ultProjectiles = [];
    }

    reset() {
        this.bullets = [];
        this.ultProjectiles = [];
    }

    addBullet(x, y, v, hitsLeft, isCompanionShot = false) {
        this.bullets.push({
            x, y, w: 12, h: 6, v, hitsLeft, isCompanionShot
        });
    }

    addUltProjectile(proj) {
        this.ultProjectiles.push(proj);
    }

    update(player, bossState, enemies, awardEnemyDefeat, damageBoss, hasSlow) {
        // Player Bullets
        this.bullets = this.bullets.filter(b => {
            b.x += b.v;

            // Hit Boss
            if (bossState && bossState.state !== 'defeated' && this.AABB(bossState, b)) {
                damageBoss(b.isCompanionShot ? 0.5 : 1); // Companion deals less damage
                b.hitsLeft -= 1;
                if (b.hitsLeft <= 0) return false;
            }

            // Hit Enemies
            // Mark enemy as dead by setting a flag, which will be filtered by the caller
            for (let i = 0; i < enemies.length; i++) {
                const en = enemies[i];
                if (this.AABB(en, b)) {
                    awardEnemyDefeat(en);
                    en._dead = true; // Mark for removal
                    b.hitsLeft--;
                    if (hasSlow) {
                        en.vx = Math.max(en.vx * 0.6, 1.6);
                    }
                    if (b.hitsLeft <= 0) return false;
                    // If piercing, continue to check other enemies
                }
            }

            return (b.x < this.canvas.width + 24) && b.hitsLeft > 0;
        });

        // Ult Projectiles
        this.ultProjectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
        });

        this.ultProjectiles = this.ultProjectiles.filter(p =>
            !p.dead && now() < p.expires && p.x < this.canvas.width + 60 && p.y > -80 && p.y < this.canvas.height + 80 && p.hits > 0
        );
    }

    // Helper for AABB
    AABB(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    draw(ctx) {
        // Bullets
        if (this.bullets.length) {
            ctx.save();
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            this.bullets.forEach(b => {
                const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
                if (b.isCompanionShot) {
                    grad.addColorStop(0, '#e0f2fe');
                    grad.addColorStop(1, '#38bdf8'); // Blue for companion
                    ctx.strokeStyle = 'rgba(14, 165, 233, 0.75)';
                } else {
                    grad.addColorStop(0, '#fef3c7');
                    grad.addColorStop(1, '#f97316'); // Orange for player
                    ctx.strokeStyle = 'rgba(124,45,18,0.75)';
                }

                ctx.fillStyle = grad;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.lineWidth = 1.2;
                ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            });
            ctx.restore();
        }

        // Ult Projectiles
        if (this.ultProjectiles.length) {
            ctx.font = '32px serif';
            this.ultProjectiles.forEach(p => {
                const fade = Math.max(0.35, Math.min(1, (p.expires - now()) / 400));
                ctx.save();
                ctx.globalAlpha = fade;
                ctx.fillText(p.char, p.x, p.y);
                ctx.restore();
            });
        }
    }
}
