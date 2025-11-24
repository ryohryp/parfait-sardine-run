
import { stageForLevel, stageBosses } from '../game-data/stages.js';
import { G, GROUND, ENEMY_BONUS } from '../game-constants.js';
import { showStageTitle, speedSE, cameraShake, floatText } from '../presentation.js';
import { playSfx } from '../audio.js';

function now() { return performance.now(); }
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class EnemyManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.enemies = [];
        this.bossState = null;
        this.bossProjectiles = [];
        this.defeatedBossStages = new Set();
        this.bossNextSpawnAt = 0;
        this.lastEnemyTime = 0;

        this.enemyTypeMeta = {
            straight: { icon: '👾', label: '直進型' },
            zigzag: { icon: '🐍', label: '蛇行型' },
            dash: { icon: '💥', label: '突進型' },
            hover: { icon: '🛸', label: '浮遊型' },
            'boss-meadow': { icon: stageBosses.meadow.icon || '👑', label: 'Boss - Meadow Monarch', base: stageBosses.meadow.rewardScore || ENEMY_BONUS },
            'boss-dunes': { icon: stageBosses.dunes.icon || '👑', label: 'Boss - Dune Typhoon', base: stageBosses.dunes.rewardScore || ENEMY_BONUS },
            'boss-sky': { icon: stageBosses.sky.icon || '👑', label: 'Boss - Stratos Ranger', base: stageBosses.sky.rewardScore || ENEMY_BONUS },
            'boss-abyss': { icon: stageBosses.abyss.icon || '👑', label: 'Boss - Abyss Sovereign', base: stageBosses.abyss.rewardScore || ENEMY_BONUS }
        };
        this.enemyTypeIcons = Object.fromEntries(Object.entries(this.enemyTypeMeta).map(([type, meta]) => [type, meta.icon]));

        // Load Assets
        this.droneImage = new Image();
        this.droneImage.src = 'assets/sprite/enemy_drone.png';
    }

    reset() {
        this.enemies = [];
        this.bossState = null;
        this.bossProjectiles = [];
        this.defeatedBossStages = new Set();
        this.bossNextSpawnAt = 0;
        this.lastEnemyTime = now();
    }

    spawnEnemy(level, offset = 0) {
        const st = stageForLevel(level);
        const baseSpeed = (2.7 + (level - 1) * 0.35) * st.enemyMul;
        const type = this.pickEnemyType(level);
        const baseY = this.canvas.height - GROUND - 36;

        const enemy = {
            x: this.canvas.width + 30 + offset,
            y: baseY,
            w: 36,
            h: 36,
            vx: baseSpeed,
            type,
            icon: this.enemyTypeIcons[type] || '??',
            spawnAt: now(),
            phase: Math.random() * Math.PI * 2,
            baseY
        };

        if (type === 'zigzag') {
            enemy.vx = baseSpeed * 0.9;
            enemy.amplitude = rand(28, 68);
            enemy.frequency = rand(0.08, 0.14);
            enemy.baseY = baseY - rand(10, 50);
        } else if (type === 'dash') {
            enemy.vx = baseSpeed * 0.75;
            enemy.maxV = baseSpeed * 1.9;
            enemy.accel = baseSpeed * 0.045;
            enemy.charge = rand(260, 460);
            enemy.boosted = false;
        } else if (type === 'hover') {
            enemy.vx = baseSpeed * 0.85;
            enemy.hoverRange = rand(28, 92);
            enemy.hoverSpeed = rand(0.02, 0.035);
            enemy.baseY = baseY - rand(40, 120);
        }

        this.enemies.push(enemy);
    }

    pickEnemyType(lv) {
        const r = Math.random();
        if (lv < 3) {
            return r < 0.75 ? 'straight' : 'zigzag';
        }
        if (lv < 6) {
            if (r < 0.55) return 'straight';
            if (r < 0.8) return 'zigzag';
            return 'hover';
        }
        if (r < 0.4) return 'straight';
        if (r < 0.65) return 'zigzag';
        if (r < 0.85) return 'hover';
        return 'dash';
    }

    spawnBossForStage(stageKey, t) {
        const config = stageBosses[stageKey];
        if (!config) return;

        this.bossProjectiles.length = 0;
        const baseY = Math.min(this.canvas.height - GROUND - config.height, Math.max(24, this.canvas.height - GROUND - config.height - config.groundOffset));

        this.bossState = {
            stageKey,
            config,
            x: this.canvas.width + config.width + 40,
            y: baseY,
            baseY,
            w: config.width,
            h: config.height,
            vx: config.speed,
            targetX: Math.max(this.canvas.width - (config.targetOffset || (config.width + 200)), this.canvas.width * 0.34),
            state: 'enter',
            hp: config.hp,
            maxHp: config.hp,
            floatPhase: Math.random() * Math.PI * 2,
            nextAttack: t + config.attackInterval,
            hitFlashUntil: 0,
            opacity: 1,
            defeatedAt: 0,
            contactCooldown: 0
        };

        showStageTitle(config.displayName + ' appears!');
        speedSE();
    }

    update(t, level, player) {
        const st = stageForLevel(level);

        // Boss Spawning Logic
        const stageBoss = stageBosses[st.key];
        if (!this.bossState && stageBoss && !this.defeatedBossStages.has(st.key)) {
            if (!this.bossNextSpawnAt) {
                this.bossNextSpawnAt = t + stageBoss.spawnDelay;
            } else if (t >= this.bossNextSpawnAt) {
                this.spawnBossForStage(st.key, t);
                this.bossNextSpawnAt = 0;
            }
        }

        // Boss Update
        if (this.bossState) {
            this.updateBoss(t, player);
        }

        const bossBattleActive = this.bossState && this.bossState.state !== 'defeated';

        // Enemy Spawning
        const enemyIv = clamp(1600 - (level - 1) * 120, 520, 1600);
        if (!bossBattleActive && t - this.lastEnemyTime > enemyIv) {
            this.spawnEnemy(level);
            const extraChance = clamp(0.06 + level * 0.018, 0.06, 0.45);
            if (Math.random() < extraChance) {
                this.spawnEnemy(level, rand(36, 120));
            }
            this.lastEnemyTime = t;
        }

        // Enemy Update
        this.enemies = this.enemies.filter(en => {
            const spawnAt = en.spawnAt ?? (en.spawnAt = now());
            if (!Number.isFinite(en.vx)) en.vx = en.v ?? 0;
            if (!Number.isFinite(en.baseY)) en.baseY = en.y;
            if (!Number.isFinite(en.phase)) en.phase = 0;

            if (en.type === 'zigzag') {
                const freq = en.frequency ?? 0.1;
                en.phase += freq;
                const amp = en.amplitude ?? 36;
                en.y = en.baseY + Math.sin(en.phase) * amp;
            } else if (en.type === 'hover') {
                const speed = en.hoverSpeed ?? 0.028;
                const range = en.hoverRange ?? 52;
                en.phase += speed;
                en.y = en.baseY + Math.sin(en.phase) * range;
            } else if (en.type === 'dash') {
                const charge = en.charge ?? 320;
                if (!en.boosted && (t - spawnAt) >= charge) {
                    en.boosted = true;
                }
                if (en.boosted) {
                    const accel = en.accel ?? (en.vx * 0.05);
                    const maxV = en.maxV ?? (en.vx * 2.1);
                    en.vx = Math.min(maxV, en.vx + accel);
                }
            }

            en.y = clamp(en.y, 18, this.canvas.height - GROUND - en.h + 6);
            en.x -= en.vx;

            return en.x + en.w > 0 && en.y < this.canvas.height;
        });

        this.updateBossProjectiles(player);
    }

    updateBoss(t, player) {
        if (!this.bossState) return;
        const config = this.bossState.config;

        if (this.bossState.state === 'enter') {
            this.bossState.x -= this.bossState.vx;
            if (this.bossState.x <= this.bossState.targetX) {
                this.bossState.x = this.bossState.targetX;
                this.bossState.state = 'battle';
                this.bossState.nextAttack = t + config.attackInterval;
                this.bossState.floatPhase = Math.random() * Math.PI * 2;
            }
        } else if (this.bossState.state === 'battle') {
            this.bossState.floatPhase += config.floatSpeed || 0.02;
            this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * (config.floatRange || 28);
            if (t >= this.bossState.nextAttack) {
                this.bossFireVolley(this.bossState, t, player);
                this.bossState.nextAttack = t + config.attackInterval;
            }
        } else if (this.bossState.state === 'defeated') {
            this.bossState.opacity = Math.max(0, this.bossState.opacity - 0.025);
            this.bossState.y -= 1.2;
            if (this.bossState.opacity <= 0) {
                this.bossState = null;
                this.bossProjectiles.length = 0;
            }
        }
    }

    bossFireVolley(boss, time, player) {
        const config = boss.config;
        const count = Math.max(1, config.volley || 3);
        const speed = config.projectileSpeed || 3;
        const baseX = boss.x + boss.w * 0.15;
        const launchY = boss.y + boss.h * 0.65;
        const targetX = player.x + player.w * 0.5;
        const distanceX = Math.max(32, Math.abs(baseX - targetX));
        const travelFrames = Math.max(12, distanceX / speed);

        for (let i = 0; i < count; i++) {
            const offset = i - (count - 1) / 2;
            const laneOffset = offset * (player.h * 0.22);
            const desiredY = player.y + player.h * 0.7 + laneOffset;
            const targetY = clamp(desiredY, player.y + 12, this.canvas.height - GROUND - 18);
            const vy = (targetY - launchY) / travelFrames;

            this.bossProjectiles.push({
                x: baseX,
                y: launchY,
                w: 30,
                h: 30,
                vx: speed,
                vy,
                gravity: 0,
                createdAt: time
            });
        }
    }

    updateBossProjectiles(player) {
        if (!this.bossProjectiles.length) return;
        this.bossProjectiles = this.bossProjectiles.filter((shot) => {
            shot.x -= shot.vx;
            shot.y += shot.vy;
            if (shot.gravity) shot.vy += shot.gravity;

            if (shot.y > this.canvas.height + 120 || shot.x + shot.w < -80 || shot.y + shot.h < -120) {
                return false;
            }
            return true;
        });
    }

    damageBoss(amount) {
        if (!this.bossState || this.bossState.state === 'defeated') return;
        const dmg = Number.isFinite(amount) ? amount : 1;
        this.bossState.hp = Math.max(0, this.bossState.hp - dmg);
        this.bossState.hitFlashUntil = now() + 140;

        if (this.bossState.hp <= 0) {
            this.bossState.state = 'defeated';
            this.bossState.defeatedAt = now();
            this.bossProjectiles.length = 0;
            this.defeatedBossStages.add(this.bossState.stageKey);

            floatText('BOSS DOWN!', this.bossState.x + this.bossState.w / 2 - 54, this.bossState.y - 16, '#fde68a');
            cameraShake(10, 320);
            return this.bossState.config; // Return config for reward handling
        }
        return null;
    }

    draw(ctx) {
        // Draw Enemies
        this.enemies.forEach(en => {
            if (this.droneImage.complete && this.droneImage.naturalWidth > 0) {
                // Draw drone sprite
                ctx.drawImage(this.droneImage, en.x, en.y, en.w, en.h);
            } else {
                // Fallback
                ctx.font = '32px serif';
                ctx.fillText(en.icon || '??', en.x, en.y - 4);
            }
        });

        // Draw Boss
        if (this.bossState) {
            const bodyColor = this.bossState.config.bodyColor || '#1e3a8a';
            const displayIcon = this.bossState.config.icon || '??';

            ctx.save();
            ctx.globalAlpha = (typeof this.bossState.opacity === 'number') ? this.bossState.opacity : 1;
            ctx.fillStyle = bodyColor;
            ctx.fillRect(this.bossState.x, this.bossState.y, this.bossState.w, this.bossState.h);

            ctx.fillStyle = '#fff';
            ctx.font = '48px serif';
            ctx.textAlign = 'center';
            ctx.fillText(displayIcon, this.bossState.x + this.bossState.w / 2, this.bossState.y + this.bossState.h / 2 + 18);
            ctx.restore();

            // Boss HP Bar
            const barWidth = 260;
            const barHeight = 12;
            const hpRatio = this.bossState.maxHp ? Math.max(0, this.bossState.hp / this.bossState.maxHp) : 0;
            const barX = this.canvas.width / 2 - barWidth / 2;
            const barY = 64;

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#f87171';
            ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.bossState.config.displayName} HP ${Math.max(0, Math.ceil(this.bossState.hp))}/${this.bossState.maxHp}`, barX + barWidth / 2, barY - 6);
            ctx.restore();
            ctx.textAlign = 'start';
        }

        // Draw Boss Projectiles
        if (this.bossProjectiles.length) {
            ctx.save();
            ctx.fillStyle = 'rgba(248,113,113,0.85)';
            this.bossProjectiles.forEach(shot => {
                ctx.beginPath();
                ctx.ellipse(shot.x + shot.w / 2, shot.y + shot.h / 2, shot.w / 2, shot.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    }
}
