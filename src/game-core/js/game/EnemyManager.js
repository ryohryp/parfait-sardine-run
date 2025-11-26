import { stageForLevel, stageBosses } from '../game-data/stages.js';
import { G, GROUND, ENEMY_BONUS } from '../game-constants.js';
import { showStageTitle, speedSE, cameraShake, floatText } from '../presentation.js';
import { playSfx } from '../audio.js';
import { ENEMY_TYPES } from './EnemyConfig.js';

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

        // Use imported configuration
        this.enemyTypeMeta = ENEMY_TYPES;
        // Create icon map for quick lookup
        this.enemyTypeIcons = {};
        Object.entries(this.enemyTypeMeta).forEach(([type, meta]) => {
            this.enemyTypeIcons[type] = meta.icon;
        });

        // Load Assets
        const baseUrl = import.meta.env.BASE_URL;

        this.droneImage = new Image();
        this.droneImage.src = `${baseUrl}assets/sprite/enemy_cupcake.png`;

        this.shieldImage = new Image();
        this.shieldImage.src = `${baseUrl}assets/sprite/enemy_shield.png`;

        this.bossImages = {
            meadow: new Image(),
            dunes: new Image(),
            sky: new Image(),
            volcano: new Image(),
            ocean: new Image(),
            abyss: new Image()
        };
        this.bossImages.meadow.src = `${baseUrl}assets/sprite/boss_meadow.png`;
        this.bossImages.dunes.src = `${baseUrl}assets/sprite/boss_dunes_v2.png`;
        this.bossImages.sky.src = `${baseUrl}assets/sprite/boss_sky_v2.png`;
        this.bossImages.volcano.src = `${baseUrl}assets/sprite/boss_volcano.png`;
        this.bossImages.ocean.src = `${baseUrl}assets/sprite/boss_ocean.png`;
        this.bossImages.abyss.src = `${baseUrl}assets/sprite/boss_abyss_v2.png`;

        // Enemy images for new types
        this.chaserImage = new Image();
        this.chaserImage.src = `${baseUrl}assets/sprite/enemy_chaser.png`;
        this.bomberImage = new Image();
        this.bomberImage.src = `${baseUrl}assets/sprite/enemy_bomber.png`;
        this.splitterImage = new Image();
        this.splitterImage.src = `${baseUrl}assets/sprite/enemy_splitter.png`;

        // Image map for cleaner drawing
        this.enemyImages = {
            shield: this.shieldImage,
            chaser: this.chaserImage,
            bomber: this.bomberImage,
            splitter: this.splitterImage
        };

        // Boss particles
        this.bossParticles = [];
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
        // Balance: Reduced base speed from 2.2 to 1.5, scaling from 0.25 to 0.15
        // Cap level at 10 for speed calculation to prevent late-game difficulty spike
        const cappedLevel = Math.min(level, 10);
        const baseSpeed = (0.6 + (cappedLevel - 1) * 0.05) * st.enemyMul;
        let type = this.pickEnemyType(level);

        // Gimmick: Obstacles
        if (st.gimmick === 'obstacle' && Math.random() < 0.25) {
            type = 'obstacle';
        }

        const config = ENEMY_TYPES[type];
        if (!config) return; // Should not happen

        const baseY = this.canvas.height - GROUND - (config.height || 36);

        const enemy = {
            x: this.canvas.width + 60 + offset,
            y: baseY,
            w: config.width || 36,
            h: config.height || 36,
            vx: baseSpeed * (config.speedFactor || 1),
            type,
            icon: config.icon || '??',
            spawnAt: now(),
            phase: Math.random() * Math.PI * 2,
            baseY,
            hp: config.hp // Optional
        };

        // Apply type-specific dynamic properties
        if (type === 'zigzag') {
            enemy.amplitude = rand(config.amplitude.min, config.amplitude.max);
            enemy.frequency = rand(config.frequency.min, config.frequency.max);
            enemy.baseY = baseY - rand(config.baseYOffset.min, config.baseYOffset.max);
        } else if (type === 'dash') {
            enemy.maxV = baseSpeed * config.maxSpeedFactor;
            enemy.accel = baseSpeed * config.accelFactor;
            enemy.charge = rand(config.chargeTime.min, config.chargeTime.max);
            enemy.boosted = false;
        } else if (type === 'hover') {
            enemy.hoverRange = rand(config.hoverRange.min, config.hoverRange.max);
            enemy.hoverSpeed = rand(config.hoverSpeed.min, config.hoverSpeed.max);
            enemy.baseY = baseY - rand(config.baseYOffset.min, config.baseYOffset.max);
        } else if (type === 'chaser') {
            enemy.vy = 0;
            enemy.chaseSpeed = baseSpeed * config.chaseSpeedFactor;
            enemy.baseY = baseY - rand(config.baseYOffset.min, config.baseYOffset.max);
        } else if (type === 'bomber') {
            enemy.explosionRadius = config.explosionRadius;
            enemy.triggerDistance = config.triggerDistance;
            enemy.exploding = false;
            enemy.explosionTimer = 0;
            enemy.explosionDelay = config.explosionDelay;
        } else if (type === 'splitter') {
            enemy.canSplit = true;
        } else if (type === 'obstacle') {
            enemy.vx = baseSpeed; // Move with flow, ignore speedFactor? Or maybe config.speedFactor is 1.0 anyway
            enemy.y = this.canvas.height - GROUND - enemy.h; // On ground
        }

        this.enemies.push(enemy);
    }

    pickEnemyType(lv) {
        const r = Math.random();
        if (lv < 3) {
            return r < 0.75 ? 'straight' : 'zigzag';
        }
        if (lv < 6) {
            if (r < 0.50) return 'straight';
            if (r < 0.75) return 'zigzag';
            return 'hover';
        }
        if (lv < 10) {
            if (r < 0.30) return 'straight';
            if (r < 0.50) return 'zigzag';
            if (r < 0.70) return 'hover';
            if (r < 0.85) return 'shield';
            return 'chaser';
        }
        // Higher levels - all types
        if (r < 0.20) return 'straight';
        if (r < 0.35) return 'zigzag';
        if (r < 0.50) return 'hover';
        if (r < 0.65) return 'shield';
        if (r < 0.80) return 'chaser';
        if (r < 0.90) return 'bomber';
        return 'splitter';
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
            targetX: Math.max(this.canvas.width - (config.targetOffset || (config.width + 200)), this.canvas.width * 0.6),
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

    update(t, level, player, stageKey, isBossBattle) {
        const st = stageForLevel(level); // Note: level might be decoupled from stageKey in future

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
        // Balance Tweak: Make easier - start at 2500ms, ramp up slower (120ms per level)
        const enemyIv = clamp(2500 - (level - 1) * 120, 600, 2500);
        if (!bossBattleActive && !isBossBattle && t - this.lastEnemyTime > enemyIv) {
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
            } else if (en.type === 'chaser') {
                // Chase player vertically
                if (!en.vy) en.vy = 0;
                const targetY = player.y + player.h / 2;
                const deltaY = targetY - (en.y + en.h / 2);
                if (Math.abs(deltaY) > 5) {
                    en.vy = Math.sign(deltaY) * Math.min(Math.abs(deltaY) * 0.05, en.chaseSpeed || 2);
                } else {
                    en.vy *= 0.9; // Damping
                }
                en.y += en.vy;
            } else if (en.type === 'bomber') {
                // Check distance to player
                const dx = player.x - en.x;
                const dy = player.y - en.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (!en.exploding && dist < en.triggerDistance) {
                    en.exploding = true;
                    en.explosionTimer = now() + (en.explosionDelay || 600); // 600ms before explosion
                    en.vx *= 0.3; // Slow down
                }
                if (en.exploding && now() >= en.explosionTimer) {
                    // Mark for explosion (CollisionSystem should handle actual explosion)
                    en.explode = true;
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
        const behavior = config.behavior || 'float';

        if (this.bossState.state === 'enter') {
            this.bossState.x -= this.bossState.vx;
            if (this.bossState.x <= this.bossState.targetX) {
                this.bossState.x = this.bossState.targetX;
                this.bossState.state = 'battle';
                this.bossState.nextAttack = t + config.attackInterval;
                this.bossState.floatPhase = Math.random() * Math.PI * 2;
                this.bossState.moveTimer = 0; // For timed behaviors
            }
        } else if (this.bossState.state === 'battle') {
            this.bossState.floatPhase += config.floatSpeed || 0.02;

            // Movement Behaviors
            if (behavior === 'float') {
                // Standard floating (Meadow)
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * (config.floatRange || 28);
            } else if (behavior === 'charge') {
                // Horizontal charging (Dunes)
                const chargeSpeed = 0.04;
                const chargeRange = 80;
                this.bossState.x = this.bossState.targetX + Math.sin(this.bossState.floatPhase * 1.5) * chargeRange;
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase * 0.5) * 10;
            } else if (behavior === 'swoop') {
                // Swooping motion (Sky)
                const swoopRangeY = 120;
                const swoopRangeX = 60;
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * swoopRangeY;
                this.bossState.x = this.bossState.targetX + Math.cos(this.bossState.floatPhase) * swoopRangeX;
            } else if (behavior === 'shake') {
                // Vibrating/Shaking (Volcano)
                if (Math.random() < 0.2) {
                    this.bossState.x = this.bossState.targetX + rand(-4, 4);
                    this.bossState.y = this.bossState.baseY + rand(-4, 4);
                }
                // Occasional large shift
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase * 0.2) * 40;
            } else if (behavior === 'sine') {
                // Large vertical sine wave (Ocean)
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * (config.floatRange * 1.5 || 60);
            } else if (behavior === 'teleport') {
                // Teleporting (Abyss)
                this.bossState.moveTimer = (this.bossState.moveTimer || 0) + 1;
                if (this.bossState.moveTimer > 180) {
                    // Teleport sequence
                    if (this.bossState.opacity > 0 && !this.bossState.teleporting) {
                        this.bossState.opacity -= 0.05;
                        if (this.bossState.opacity <= 0) {
                            this.bossState.teleporting = true;
                            this.bossState.y = rand(40, this.canvas.height - GROUND - this.bossState.h - 20);
                            this.bossState.x = rand(this.canvas.width * 0.5, this.canvas.width - 100);
                        }
                    } else if (this.bossState.teleporting) {
                        this.bossState.opacity += 0.05;
                        if (this.bossState.opacity >= 1) {
                            this.bossState.opacity = 1;
                            this.bossState.teleporting = false;
                            this.bossState.moveTimer = 0;
                        }
                    }
                } else {
                    // Slight hover while visible
                    this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * 10;
                }
            } else {
                // Fallback
                this.bossState.y = this.bossState.baseY + Math.sin(this.bossState.floatPhase) * (config.floatRange || 28);
            }

            if (t >= this.bossState.nextAttack) {
                this.bossAttack(this.bossState, t, player);
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

        // Update Boss Particles
        if (this.bossState && this.bossState.state === 'battle') {
            // Generate particles
            if (Math.random() < 0.3) {
                this.bossParticles.push({
                    x: this.bossState.x + rand(10, this.bossState.w - 10),
                    y: this.bossState.y + rand(10, this.bossState.h - 10),
                    vx: rand(-1, 1),
                    vy: rand(-1, 1),
                    life: 1.0,
                    color: this.bossState.config.bodyColor || '#fff'
                });
            }
        }

        this.bossParticles = this.bossParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            return p.life > 0;
        });
    }

    bossAttack(boss, time, player) {
        const config = boss.config;
        const attackType = config.attack || 'spread';
        const count = Math.max(1, config.volley || 3);
        const speed = config.projectileSpeed || 3;
        const baseX = boss.x + boss.w * 0.15;
        const launchY = boss.y + boss.h * 0.65;

        if (attackType === 'spread') {
            // Original spread logic
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
        } else if (attackType === 'rapid') {
            // Rapid fire straight shots
            // Refinement: Aim at player (Scorpion attack)
            const gap = 180;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    if (!this.bossState || this.bossState.state !== 'battle') return;

                    // Telegraph
                    this.bossParticles.push({
                        x: this.bossState.x,
                        y: this.bossState.y + this.bossState.h / 2,
                        vx: 0,
                        vy: 0,
                        life: 0.5,
                        color: '#ff0000'
                    });

                    // Calculate aim
                    const startX = this.bossState.x;
                    const startY = this.bossState.y + this.bossState.h * 0.6; // Lower spawn point
                    const targetX = player.x + player.w / 2;
                    const targetY = player.y + player.h / 2;

                    const dx = targetX - startX;
                    const dy = targetY - startY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const aimVx = (dx / dist) * speed * 1.2;
                    const aimVy = (dy / dist) * speed * 1.2;

                    this.bossProjectiles.push({
                        x: startX,
                        y: startY,
                        w: 24,
                        h: 24,
                        vx: -aimVx, // Projectile logic usually subtracts vx, so we invert or just use positive speed if logic expects it. 
                        // Wait, updateBossProjectiles does x -= shot.vx. 
                        // If aimVx is negative (towards left), -(-val) = +val (moves right).
                        // Player is usually to the left. dx is negative. aimVx is negative.
                        // x -= (-val) => x += val (moves right). WRONG.
                        // We want it to move left towards player.
                        // If player is left, dx is negative. aimVx is negative.
                        // We want x to decrease. x += vx where vx is negative.
                        // But updateBossProjectiles does x -= shot.vx.
                        // So shot.vx should be POSITIVE to move LEFT.
                        // So we want -aimVx (which is positive).
                        // Let's just use absolute speed and direction.
                        vx: Math.abs(aimVx), // Move left
                        vy: aimVy,
                        gravity: 0,
                        createdAt: time
                    });
                }, i * gap);
            }
        } else if (attackType === 'drop') {
            // Drop from above (Targeted)
            // Refinement: Spawn directly above player
            for (let i = 0; i < count; i++) {
                this.bossProjectiles.push({
                    x: player.x + rand(-20, 20), // Target player X
                    y: -40 - rand(0, 100), // Start above
                    w: 32,
                    h: 32,
                    vx: 0, // Fall straight down
                    vy: speed * 0.8, // Move down
                    gravity: 0,
                    createdAt: time
                });
            }
        } else if (attackType === 'arc') {
            // Arcing shots
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 4 - (i * 0.2); // Up and left
                const power = speed * 1.2;
                this.bossProjectiles.push({
                    x: baseX,
                    y: launchY,
                    w: 28,
                    h: 28,
                    vx: Math.cos(angle) * power, // Positive vx moves left (x -= vx)
                    vy: Math.sin(angle) * power,
                    gravity: 0.15,
                    createdAt: time
                });
            }
        } else if (attackType === 'wave') {
            // Sine wave projectiles
            for (let i = 0; i < count; i++) {
                this.bossProjectiles.push({
                    x: baseX,
                    y: launchY + (i - count / 2) * 40,
                    w: 28,
                    h: 28,
                    vx: speed,
                    vy: 0,
                    gravity: 0,
                    type: 'wave',
                    phase: i * 0.5,
                    baseY: launchY + (i - count / 2) * 40,
                    createdAt: time
                });
            }
        } else if (attackType === 'homing') {
            // Homing projectiles
            // Refinement: Reduce homing strength and duration
            for (let i = 0; i < count; i++) {
                this.bossProjectiles.push({
                    x: baseX,
                    y: launchY + rand(-40, 40),
                    w: 24,
                    h: 24,
                    vx: speed * 0.6, // Start slower
                    vy: rand(-2, 2),
                    gravity: 0,
                    type: 'homing',
                    homingDuration: 120, // Stop homing after 2 seconds (60fps)
                    createdAt: time
                });
            }
        }
    }

    updateBossProjectiles(player) {
        if (!this.bossProjectiles.length) return;
        this.bossProjectiles = this.bossProjectiles.filter((shot) => {
            if (shot.type === 'wave') {
                shot.phase = (shot.phase || 0) + 0.1;
                shot.y = shot.baseY + Math.sin(shot.phase) * 40;
                shot.x -= shot.vx;
            } else if (shot.type === 'homing') {
                // Simple homing with limited duration
                shot.life = (shot.life || 0) + 1;

                if (shot.life < (shot.homingDuration || 100)) {
                    const dx = player.x - shot.x;
                    const dy = player.y - shot.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        // Reduced turning speed for fairness
                        shot.vx += (dx / dist) * 0.08;
                        shot.vy += (dy / dist) * 0.08;
                    }
                }

                // Cap speed
                const speed = Math.sqrt(shot.vx * shot.vx + shot.vy * shot.vy);
                if (speed > 4.5) {
                    shot.vx = (shot.vx / speed) * 4.5;
                    shot.vy = (shot.vy / speed) * 4.5;
                }
                shot.x += shot.vx;
                shot.y += shot.vy;
            } else {
                shot.x -= shot.vx;
                shot.y += shot.vy;
                if (shot.gravity) shot.vy += shot.gravity;
            }

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
            const img = this.enemyImages[en.type];

            if (en.type === 'obstacle') {
                ctx.save();
                ctx.font = '48px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Adjust Y slightly (+4) because many emojis render a bit high
                ctx.fillText('🧱', en.x + en.w / 2, en.y + en.h / 2 + 4);
                ctx.restore();
            } else if (en.type === 'bomber' && img && img.complete && img.naturalWidth > 0) {
                if (en.exploding && Math.floor(now() / 50) % 2 === 0) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(img, en.x, en.y, en.w, en.h);
                    ctx.globalCompositeOperation = 'source-over';
                } else {
                    ctx.drawImage(img, en.x, en.y, en.w, en.h);
                }
            } else if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, en.x, en.y, en.w, en.h);
            } else if (this.droneImage.complete && this.droneImage.naturalWidth > 0) {
                // Draw drone sprite for others (or add more specific ones later)
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

            // Draw Boss Particles
            ctx.save();
            this.bossParticles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Draw Boss Glow
            ctx.save();
            ctx.globalAlpha = (typeof this.bossState.opacity === 'number') ? this.bossState.opacity * 0.5 : 0.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = bodyColor;

            // Draw Boss Image if available
            const bossImg = this.bossImages[this.bossState.stageKey];
            if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = (typeof this.bossState.opacity === 'number') ? this.bossState.opacity : 1;
                // Draw image centered
                ctx.drawImage(bossImg, this.bossState.x, this.bossState.y, this.bossState.w, this.bossState.h);
                ctx.restore();
            } else {
                // Fallback
                ctx.save();
                ctx.globalAlpha = (typeof this.bossState.opacity === 'number') ? this.bossState.opacity : 1;
                ctx.fillStyle = bodyColor;
                ctx.fillRect(this.bossState.x, this.bossState.y, this.bossState.w, this.bossState.h);

                ctx.fillStyle = '#fff';
                ctx.font = '48px serif';
                ctx.textAlign = 'center';
                ctx.fillText(displayIcon, this.bossState.x + this.bossState.w / 2, this.bossState.y + this.bossState.h / 2 + 18);
                ctx.restore();
            }

            // Restore glow context
            ctx.restore();

            // Hit Flash
            if (now() < this.bossState.hitFlashUntil) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(this.bossState.x, this.bossState.y, this.bossState.w, this.bossState.h);
                ctx.restore();
            }

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
