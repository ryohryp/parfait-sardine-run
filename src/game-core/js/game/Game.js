import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { EnemyManager } from './EnemyManager.js';
import { ItemManager } from './ItemManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { GachaSystem } from './GachaSystem.js';
import { Companion } from './Companion.js';
import { initAudio, playBgm, stopBgm, playSfx } from '../audio.js';
import { GAME_TIME, INVINCIBILITY_DURATION, BASE_JUMP, SHOOT_COOLDOWN, POWER_DURATION, ITEM_LEVEL } from '../game-constants.js';
import { characters } from '../game-data/characters.js';
import { stageForLevel } from '../game-data/stages.js';

function now() { return performance.now(); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class Game {
    constructor(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = callbacks; // { onStateUpdate, onGameOver, onPlaySfx, onRunStart, onRunFinish }

        this.input = new InputManager();
        this.player = new Player(this.canvas);
        this.enemies = new EnemyManager(this.canvas);
        this.items = new ItemManager(this.canvas);
        this.projectiles = new ProjectileManager(this.canvas);
        this.gacha = new GachaSystem();
        this.companion = new Companion(this.player);

        this.gameOn = false;
        this.t0 = 0;
        this.runStartTimestamp = 0;

        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.invUntil = 0;
        this.hurtUntil = 0;
        this.ult = 0;
        this.ultReady = false;
        this.ultActiveUntil = 0;

        this.autoShootUntil = 0;
        this.bulletBoostUntil = 0;
        this.scoreMulUntil = 0;

        this.feverGauge = 0;
        this.feverModeUntil = 0;

        this.lastShot = 0;
        this.currentStageKey = null;

        this.bestScore = this.loadBestScore();

        this.init();
    }

    init() {
        this.input.init(this.canvas);

        this.input.on('jump', () => {
            if (this.gameOn) this.player.jump();
        });
        this.input.on('shoot', () => this.shoot());
        this.input.on('ult', () => this.tryUlt());

        initAudio();

        // Initial State Update
        this.notifyState();

        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    notifyState() {
        if (this.callbacks.onStateUpdate) {
            this.callbacks.onStateUpdate(this.getState());
        }
    }

    getState() {
        return {
            remainMs: this.gameOn ? (GAME_TIME - (now() - this.t0)) : 0,
            level: this.level,
            score: this.score,
            coins: this.gacha.coins,
            lives: this.lives,
            ult: this.ult,
            ultReady: this.ultReady,
            currentCharKey: this.gacha.collection.current,
            collection: this.gacha.collection,
            bestScore: this.bestScore,
            invUntil: this.invUntil,
            autoShootUntil: this.autoShootUntil,
            bulletBoostUntil: this.bulletBoostUntil,
            scoreMulUntil: this.scoreMulUntil,
            ultActiveUntil: this.ultActiveUntil,
            gameOn: this.gameOn,
            stageName: stageForLevel(this.level).name,
            fever: this.feverGauge,
            isFever: now() < this.feverModeUntil
        };
    }

    /**
     * Start the game
     * @param {string} [characterKey] - Optional character key to start with
     */
    start(characterKey) {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.invUntil = 0;
        this.hurtUntil = 0;
        this.ult = 0;
        this.ultReady = false;
        this.ultActiveUntil = 0;
        this.autoShootUntil = 0;
        this.bulletBoostUntil = 0;
        this.autoShootUntil = 0;
        this.bulletBoostUntil = 0;
        this.scoreMulUntil = 0;
        this.feverGauge = 0;
        this.feverModeUntil = 0;

        this.enemies.reset();
        this.items.reset();
        this.projectiles.reset();
        this.player.reset();

        // Set character from argument if provided, otherwise use current
        if (characterKey) {
            this.gacha.collection.current = characterKey;
        }
        this.player.setCharacter(this.gacha.collection.current, this.getEffectiveStats(this.gacha.collection.current));

        this.t0 = now();
        this.runStartTimestamp = this.t0;
        this.gameOn = true;

        playBgm({ reset: true });

        if (this.callbacks.onRunStart) {
            this.callbacks.onRunStart();
        }

        this.notifyState();
    }

    endGame() {
        if (!this.gameOn) return;
        this.gameOn = false;
        stopBgm();

        const durationMs = Math.max(0, Math.floor(now() - this.runStartTimestamp));

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        if (this.callbacks.onRunFinish) {
            this.callbacks.onRunFinish({
                score: this.score,
                stage: `level-${this.level}`,
                duration: durationMs,
                coins: this.gacha.coins,
                result: 'gameover'
            });
        }

        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
                score: this.score,
                level: this.level,
                coins: this.gacha.coins,
                newBest: this.score === this.bestScore
            });
        }

        this.notifyState();
    }

    update(t) {
        if (!this.gameOn) return;

        const elapsed = t - this.t0;
        const remain = GAME_TIME - elapsed;
        if (remain <= 0) return this.endGame();

        // Level Up
        this.level = Math.max(1, Math.floor(this.score / ITEM_LEVEL) + 1);

        // Update Entities
        this.player.update(16); // Fixed delta for now
        this.enemies.update(t, this.level, this.player);

        const hasMagnet = characters[this.gacha.collection.current]?.special?.includes('magnet');
        this.items.update(t, this.level, this.player, hasMagnet);

        const hasSlow = characters[this.gacha.collection.current]?.special?.includes('slowEnemy');
        this.projectiles.update(
            this.player,
            this.enemies.bossState,
            this.enemies.enemies,
            (en) => this.awardEnemyDefeat(en),
            (dmg) => this.damageBoss(dmg),
            hasSlow
        );

        this.companion.update(t, this.items.items);

        // Filter out dead enemies hit by bullets
        this.enemies.enemies = this.enemies.enemies.filter(en => !en._dead);

        // Collisions
        this.checkCollisions();

        // Ult Ready
        if (this.ult >= 100) this.ultReady = true;

        // Draw
        this.draw(remain);

        // UI Update
        this.notifyState();
    }

    loop(t) {
        this.update(t);
        requestAnimationFrame((t) => this.loop(t));
    }

    shoot() {
        if (!this.gameOn) return;
        const t = now();
        if (t - this.lastShot < SHOOT_COOLDOWN) return;
        this.lastShot = t;

        const pierce = characters[this.gacha.collection.current]?.special?.includes('pierce');
        const v = 9 + this.level * 0.6 + (now() < this.bulletBoostUntil ? 4 : 0);
        const stats = this.getEffectiveStats(this.gacha.collection.current);

        this.projectiles.addBullet(
            this.player.x + this.player.w,
            this.player.y + this.player.h / 2 - 3,
            v * stats.bullet,
            pierce ? 2 : 1
        );
    }

    tryUlt() {
        if (!this.gameOn || !this.ultReady) return;

        this.ultReady = false;
        this.ult = 0;

        const type = characters[this.gacha.collection.current].ult;

        // Play sound effect
        playSfx('hit'); // Using hit sound as placeholder for ult sound

        if (!type) {
            // Character has no ult, just show some effect
            this.ultActiveUntil = now() + 1000;
            return;
        }

        if (type === 'storm') {
            this.ultActiveUntil = now() + 1600;
        } else if (type === 'ncha') {
            this.ultActiveUntil = now() + 1500;
        } else if (type === 'yadon') {
            this.ultActiveUntil = now() + 2600;
            const baseY = this.player.y + this.player.h / 2;
            const count = 6;
            for (let i = 0; i < count; i++) {
                const spread = i - (count - 1) / 2;
                this.projectiles.addUltProjectile({
                    x: this.player.x + this.player.w - 8,
                    y: baseY + spread * 20,
                    w: 32, h: 32,
                    vx: 5.4 + Math.abs(spread) * 0.6,
                    vy: spread * 0.28,
                    gravity: 0.08,
                    hits: 2,
                    char: '??',
                    expires: now() + 2800,
                    dead: false
                });
            }
        } else {
            // rainbow or other ults
            this.ultActiveUntil = now() + 2000;
        }
    }

    checkCollisions() {
        // Player vs Items
        this.items.items = this.items.items.filter(it => {
            if (this.AABB(this.player, it)) {
                const isFever = now() < this.feverModeUntil;
                const mul = (now() < this.scoreMulUntil || isFever) ? 2 : 1;
                const gained = it.score * mul;
                this.score += gained;
                this.gacha.addCoins(1 * mul);

                if (!isFever) {
                    this.feverGauge = Math.min(100, this.feverGauge + 2);
                    if (this.feverGauge >= 100) {
                        this.activateFever();
                    }
                }

                const stats = this.getEffectiveStats(this.gacha.collection.current);
                this.ult = clamp(this.ult + (it.char === '🍨' ? 10 : 6) * stats.ultRate, 0, 100);
                return false;
            }
            return true;
        });

        // Player vs Powers
        this.items.powers = this.items.powers.filter(pw => {
            if (this.AABB(this.player, pw)) {
                const stats = this.getEffectiveStats(this.gacha.collection.current);
                this.invUntil = now() + Math.max(POWER_DURATION, stats.inv);
                this.ult = Math.min(100, this.ult + 12 * stats.ultRate);
                return false;
            }
            return true;
        });

        // Player vs Enemies
        this.enemies.enemies = this.enemies.enemies.filter(en => {
            if (this.AABB(this.player, en)) {
                if (now() < this.invUntil || now() < this.feverModeUntil) {
                    this.awardEnemyDefeat(en);
                    return false;
                }
                if (now() > this.hurtUntil) {
                    this.lives = Math.max(0, this.lives - 1);
                    this.hurtUntil = now() + 900;
                    playSfx('hit');
                    if (this.lives === 0) {
                        this.endGame();
                        return false;
                    }
                }
            }

            // Ult vs Enemies (Storm/Ncha/Beam)
            if (now() < this.ultActiveUntil) {
                const type = characters[this.gacha.collection.current].ult;
                if (type === 'storm') {
                    const cx = this.player.x + this.player.w / 2, cy = this.player.y + this.player.h / 2;
                    const ex = en.x + en.w / 2, ey = en.y + en.h / 2;
                    if (Math.hypot(cx - ex, cy - ey) <= 120) {
                        this.awardEnemyDefeat(en);
                        return false;
                    }
                } else if (type === 'ncha') {
                    // ... (Implement beam collision)
                    const beamX = this.player.x + this.player.w - 6;
                    const beamTop = this.player.y - 36;
                    const beamBottom = this.player.y + this.player.h + 36;
                    if ((en.x + en.w) >= beamX && en.x <= this.canvas.width && en.y <= beamBottom && (en.y + en.h) >= beamTop) {
                        this.awardEnemyDefeat(en);
                        return false;
                    }
                } else {
                    // Rainbow
                    const lanes = [this.player.y + this.player.h / 2, this.player.y + this.player.h / 2 - 36, this.player.y + this.player.h / 2 + 36];
                    if (lanes.some(y => en.y - 6 <= y && y <= en.y + en.h + 6)) {
                        this.awardEnemyDefeat(en);
                        return false;
                    }
                }
            }

            return true;
        });

        // Boss Collisions (Player vs Boss Body)
        if (this.enemies.bossState && this.enemies.bossState.state !== 'defeated') {
            const boss = this.enemies.bossState;
            if (this.AABB(this.player, boss)) {
                if (now() < this.invUntil || now() < this.feverModeUntil) {
                    this.damageBoss(2);
                } else if (now() > this.hurtUntil) {
                    this.lives = Math.max(0, this.lives - 1);
                    this.hurtUntil = now() + 900;
                    playSfx('hit');
                    if (this.lives === 0) this.endGame();
                }
            }

            // Ult vs Boss
            if (now() < this.ultActiveUntil) {
                const type = characters[this.gacha.collection.current].ult;
                if (type === 'storm') {
                    const cx = this.player.x + this.player.w / 2, cy = this.player.y + this.player.h / 2;
                    const bx = boss.x + boss.w / 2, by = boss.y + boss.h / 2;
                    if (Math.hypot(cx - bx, cy - by) <= 120) this.damageBoss(0.5);
                }
                // ... other ults
            }
        }

        // Player vs Boss Projectiles
        if (this.enemies.bossProjectiles && this.enemies.bossProjectiles.length > 0) {
            this.enemies.bossProjectiles = this.enemies.bossProjectiles.filter(shot => {
                if (this.AABB(this.player, shot)) {
                    // Hit player with boss projectile
                    if (now() < this.invUntil || now() < this.feverModeUntil) {
                        // Invincible - projectile passes through or is destroyed? 
                        // Let's destroy it but no damage
                        return false;
                    }
                    if (now() > this.hurtUntil) {
                        this.lives = Math.max(0, this.lives - 1);
                        this.hurtUntil = now() + 900;
                        playSfx('hit');
                        if (this.lives === 0) {
                            this.endGame();
                        }
                    }
                    return false; // Remove projectile after hit
                }
                return true; // Keep projectile
            });
        }
    }

    awardEnemyDefeat(enemy) {
        this.score += 3; // ENEMY_BONUS
        this.gacha.addCoins(2);
    }

    damageBoss(amount) {
        const config = this.enemies.damageBoss(amount);
        if (config) {
            // Boss defeated
            this.score += (config.rewardScore || 150);
            this.gacha.addCoins(config.rewardCoins || 10);
        }
    }

    activateFever() {
        this.feverGauge = 0;
        this.feverModeUntil = now() + 10000; // 10 seconds
        playSfx('powerup'); // Placeholder
    }

    AABB(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    getEffectiveStats(key) {
        const ch = characters[key];
        const lb = this.gacha.collection.owned[key]?.limit || 0;
        return {
            move: ch.move * (1 + lb),
            jump: BASE_JUMP * ch.jump * (1 + lb * 0.5),
            bullet: ch.bullet * (1 + lb),
            inv: Math.min(INVINCIBILITY_DURATION, Math.floor(ch.inv * (1 + lb * 0.5))),
            ultRate: ch.ultRate * (1 + lb * 0.5),
            special: ch.special,
            ult: ch.ult,
        };
    }

    loadBestScore() {
        try {
            const raw = localStorage.getItem('psrun_best_score_v1');
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
            }
        } catch { }
        return 0;
    }

    saveBestScore() {
        try { localStorage.setItem('psrun_best_score_v1', `${this.bestScore}`); } catch { }
    }

    draw(remain) {
        const st = stageForLevel(this.level);

        // BG
        // BG
        if (!this.bgImage) {
            this.bgImage = new Image();
            this.bgImage.src = './assets/bg/bg_fantasy_nature.png';
        }

        if (this.bgImage.complete) {
            // Parallax or simple scrolling
            const speed = 2; // Background scroll speed
            const offset = (now() * 0.05 * speed) % this.bgImage.width;

            // Draw repeated background
            // Assuming bgImage height fits or we scale it
            // Let's just draw it to cover
            const scale = Math.max(this.canvas.width / this.bgImage.width, this.canvas.height / this.bgImage.height);
            // Simple tiling for now if seamless

            // Actually, let's just draw it static or simple loop for now to ensure it works
            // Better: Draw 2 copies for scrolling
            const w = this.bgImage.width;
            const h = this.bgImage.height;
            const aspect = w / h;
            const drawH = this.canvas.height;
            const drawW = drawH * aspect;

            const x = -(now() * 0.1) % drawW;

            this.ctx.drawImage(this.bgImage, x, 0, drawW, drawH);
            this.ctx.drawImage(this.bgImage, x + drawW, 0, drawW, drawH);
            if (x + drawW < this.canvas.width) {
                this.ctx.drawImage(this.bgImage, x + drawW * 2, 0, drawW, drawH);
            }
        } else {
            // Fallback gradient
            const g = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            g.addColorStop(0, '#0f172a');
            g.addColorStop(1, '#334155');
            this.ctx.fillStyle = g;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.ctx.fillStyle = st.ground;
        this.ctx.fillRect(0, this.canvas.height - 72, this.canvas.width, 72); // GROUND constant

        // Entities
        this.player.draw(this.ctx, now(), this.invUntil, this.hurtUntil);
        this.enemies.draw(this.ctx);
        this.items.draw(this.ctx);
        this.projectiles.draw(this.ctx);
        this.companion.draw(this.ctx);

        // Fever Effect
        if (now() < this.feverModeUntil) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = `hsla(${(now() * 0.1) % 360}, 70%, 50%, 0.2)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Rainbow border
            this.ctx.strokeStyle = `hsl(${(now() * 0.2) % 360}, 80%, 60%)`;
            this.ctx.lineWidth = 8;
            this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }

        // Ult Effects
        if (now() < this.ultActiveUntil) {
            const type = characters[this.gacha.collection.current].ult;
            const px = this.player.x + this.player.w / 2;
            const py = this.player.y + this.player.h / 2;

            this.ctx.save();
            if (type === 'storm') {
                // Draw storm circle around player
                const fade = (this.ultActiveUntil - now()) / 1600;
                this.ctx.globalAlpha = 0.3 + Math.sin(now() * 0.01) * 0.2;
                this.ctx.strokeStyle = '#60a5fa';
                this.ctx.lineWidth = 8;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 120, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.strokeStyle = '#93c5fd';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 100 + Math.sin(now() * 0.02) * 20, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (type === 'ncha') {
                // Draw beam
                this.ctx.globalAlpha = 0.6;
                const gradient = this.ctx.createLinearGradient(px, 0, this.canvas.width, 0);
                gradient.addColorStop(0, '#f59e0b');
                gradient.addColorStop(1, '#dc2626');
                this.ctx.fillStyle = gradient;
                const beamHeight = 72;
                this.ctx.fillRect(px, py - beamHeight / 2, this.canvas.width - px, beamHeight);
            } else {
                // Rainbow (default)
                this.ctx.globalAlpha = 0.5;
                const lanes = [py, py - 36, py + 36];
                const colors = ['#ef4444', '#f59e0b', '#10b981'];
                lanes.forEach((y, i) => {
                    this.ctx.fillStyle = colors[i];
                    this.ctx.fillRect(px, y - 3, this.canvas.width - px, 6);
                });
            }
            this.ctx.restore();
        }
    }

    updateCharacter(key) {
        if (this.gacha.setCurrentChar(key)) {
            this.player.setCharacter(key, this.getEffectiveStats(key));
            this.notifyState();
        }
    }

    updateCharInfo() {
        // This is handled in UI setHUD mostly, but if we need to force update:
        // this.ui.updateCharInfo(this.gacha.collection.current, this.gacha.collection);
    }
}
