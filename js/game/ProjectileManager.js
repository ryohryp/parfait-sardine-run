
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

    addBullet(x, y, v, hitsLeft) {
        this.bullets.push({
            x, y, w: 12, h: 6, v, hitsLeft
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
                damageBoss(1);
                b.hitsLeft -= 1;
                if (b.hitsLeft <= 0) return false;
            }

            // Hit Enemies
            for (let i = 0; i < enemies.length; i++) {
                const en = enemies[i];
                if (this.AABB(en, b)) {
                    awardEnemyDefeat(en);
                    b.hitsLeft--;
                    if (hasSlow) {
                        en.vx = Math.max(en.vx * 0.6, 1.6);
                    }
                    if (b.hitsLeft <= 0) return false;
                    // Continue to check other enemies if piercing? 
                    // Original logic: "return false" immediately after hitting ONE enemy.
                    // But wait, if hitsLeft > 0, it should continue?
                    // Original code:
                    /*
                      if (AABB(en,bullets[i])){
                          awardEnemyDefeat(en);
                          bullets[i].hitsLeft--;
                          if (hasSlow){ en.vx = Math.max(en.vx*0.6, 1.6); }
                          if (bullets[i].hitsLeft<=0) bullets.splice(i,1);
                          return false; // This returns from the enemy filter loop? No, this is inside enemies.filter?
                          // Wait, original code was:
                          // enemies = enemies.filter(en => { ... 
                          //    for (let i=0;i<bullets.length;i++){ ... if hit ... bullets.splice(i,1); return false; }
                          // })
                          // This means if an enemy is hit, it dies (return false for enemy filter).
                    */
                    // My logic here is updating bullets. So I need to check if bullet hits any enemy.
                    // If I do it here, I need to remove the enemy too.
                    // This suggests ProjectileManager might need to modify the enemies array or return hit enemies.
                    // A better approach might be to handle collision in Game.js or pass a callback.
                    // For now, let's assume we can modify enemies or return a list of dead enemies?
                    // Actually, the original code did collision checks inside the enemy update loop.
                    // To keep it modular, maybe ProjectileManager just updates positions, and Game.js handles collisions?
                    // OR, ProjectileManager has a `checkCollisions(enemies)` method.
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
                grad.addColorStop(0, '#fef3c7');
                grad.addColorStop(1, '#f97316');
                ctx.fillStyle = grad;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.strokeStyle = 'rgba(124,45,18,0.75)';
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
