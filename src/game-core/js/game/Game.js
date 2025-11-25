// Game core implementation
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { EnemyManager } from './EnemyManager.js';
import { ItemManager } from './ItemManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { GachaSystem } from './GachaSystem.js';
import { Companion } from './Companion.js';
import { MissionManager } from './MissionManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { GameRenderer } from './systems/GameRenderer.js';
import { initAudio, playBgm, stopBgm, playSfx } from '../audio.js';
import { GAME_TIME, INVINCIBILITY_DURATION, BASE_JUMP, SHOOT_COOLDOWN, POWER_DURATION, ITEM_LEVEL } from '../game-constants.js';
import { characters } from '../game-data/characters.js';
import { stageForLevel } from '../game-data/stages.js';
import { equipmentItems } from '../game-data/equipment-data.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { logger } from '../utils/Logger.js';

function now() { return performance.now(); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class Game {
    constructor(canvas, callbacks = {}, dependencies = {}) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = callbacks; // { onStateUpdate, onGameOver, onPlaySfx, onRunStart, onRunFinish }

        // Dependency injection with defaults
        this.input = dependencies.input || new InputManager();
        this.particles = dependencies.particles || new ParticleSystem(this.canvas);
        this.player = dependencies.player || new Player(this.canvas, this.particles);
        this.enemies = dependencies.enemies || new EnemyManager(this.canvas);
        this.items = dependencies.items || new ItemManager(this.canvas);
        this.projectiles = dependencies.projectiles || new ProjectileManager(this.canvas);
        this.gacha = dependencies.gacha || new GachaSystem();
        this.companion = dependencies.companion || new Companion(this.player);
        this.missions = dependencies.missions || new MissionManager();

        // System classes
        // System classes
        this.scoreSystem = dependencies.scoreSystem || new ScoreSystem();
        const CollisionSystemClass = dependencies.collisionSystemClass || CollisionSystem;
        this.collisionSystem = dependencies.collisionSystem || new CollisionSystemClass(this);
        const GameRendererClass = dependencies.rendererClass || GameRenderer;
        this.renderer = dependencies.renderer || new GameRendererClass(this.canvas, this);

        this.init();
    }

    init() {
        this.input.init(this.canvas);
        this.input.on('jump', () => {
            if (this.gameOn) {
                this.player.jump();
                this.sessionJumps++; // Track jumps
            }
        });
        this.input.on('shoot', () => this.shoot());
        this.input.on('ult', () => this.tryUlt());
        initAudio();
        this.notifyState();
        requestAnimationFrame(t => this.loop(t));
    }

    // ... (keep existing methods)

    pause() {
        this.paused = true;
        this.pauseTime = now();
    }

    resume() {
        if (this.paused) {
            this.paused = false;
            const duration = now() - this.pauseTime;
            this.t0 += duration;
            this.runStartTimestamp += duration;
            // Adjust timers
            if (this.invUntil > 0) this.invUntil += duration;
            if (this.hurtUntil > 0) this.hurtUntil += duration;
            if (this.autoShootUntil > 0) this.autoShootUntil += duration;
            if (this.bulletBoostUntil > 0) this.bulletBoostUntil += duration;
            if (this.scoreMulUntil > 0) this.scoreMulUntil += duration;
            if (this.ultActiveUntil > 0) this.ultActiveUntil += duration;
            if (this.stageClearUntil > 0) this.stageClearUntil += duration;
            if (this.scoreSystem.feverModeUntil > 0) this.scoreSystem.feverModeUntil += duration;
            if (this.scoreSystem.lastComboTime > 0) this.scoreSystem.lastComboTime += duration;
        }
    }

    notifyState() {
        if (this.callbacks.onStateUpdate) {
            this.callbacks.onStateUpdate(this.getState());
        }
    }

    getState() {
        const scoreState = this.scoreSystem.getState();
        return {
            remainMs: this.gameOn ? (GAME_TIME - (now() - this.t0)) : 0,
            level: this.level,
            score: this.score,
            coins: this.sessionCoins,
            hp: this.hp,
            maxHp: this.maxHp,
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
            fever: scoreState.feverGauge,
            isFever: scoreState.isFever,
            missions: this.missions.getMissions(),
            comboCount: scoreState.comboCount,
            comboMultiplier: scoreState.comboMultiplier,
            stageClearUntil: this.stageClearUntil
        };
    }

    /** Start the game */
    start(characterKey) {
        this.score = 0;
        this.level = 1;
        // Calculate max HP from skill bonuses
        const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current || 'parfen');
        this.maxHp = 100 + skillBonuses.maxHpBonus;
        this.hp = this.maxHp;
        this.hasUsedAutoRevive = false;
        this.invUntil = 0;
        this.hurtUntil = 0;
        this.ult = 0;
        this.ultReady = false;
        this.ultActiveUntil = 0;
        this.sessionCoins = 0;
        this.stageClearUntil = 0;
        this.levelOffset = 0;
        this.autoShootUntil = 0;
        this.bulletBoostUntil = 0;
        this.scoreMulUntil = 0;

        // New stats
        this.sessionDistance = 0;
        this.sessionJumps = 0;
        this.sessionAttacks = 0;

        this.scoreSystem.reset();
        this.enemies.reset();
        this.items.reset();
        this.projectiles.reset();
        this.player.reset();
        this.particles.particles = [];

        if (characterKey) this.gacha.collection.current = characterKey;
        this.player.setCharacter(this.gacha.collection.current, this.getEffectiveStats(this.gacha.collection.current));

        this.t0 = now();
        this.runStartTimestamp = this.t0;
        this.gameOn = true;
        playBgm({ reset: true });
        if (this.callbacks.onRunStart) this.callbacks.onRunStart();
        this.notifyState();
    }

    endGame() {
        if (!this.gameOn) return;
        this.gameOn = false;
        stopBgm();
        const durationMs = Math.max(0, Math.floor(now() - this.runStartTimestamp));
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }
        // No experience grant here – EXP is handled per enemy defeat
        const finalScore = Number(this.score) || 0;
        const finalCoins = Number(this.sessionCoins) || 0;
        const finalLevel = Number(this.level) || 1;

        const resultData = {
            score: finalScore,
            stage: `level-${finalLevel}`,
            duration: durationMs,
            coins: finalCoins,
            result: 'gameover',
            distance: Math.floor(this.sessionDistance),
            jumps: this.sessionJumps,
            attacks: this.sessionAttacks
        };

        if (this.callbacks.onRunFinish) {
            this.callbacks.onRunFinish(resultData);
        }
        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
                ...resultData,
                level: finalLevel,
                newBest: this.score === this.bestScore
            });
        }
        this.notifyState();
    }

    update(t) {
        if (!this.gameOn || this.paused) return;
        const elapsed = t - this.t0;
        const remain = GAME_TIME - elapsed;
        if (remain <= 0) return this.endGame();

        // Update distance (approximate based on scroll speed)
        // Base speed 6 + level * 0.5 (example assumption, adjusting to match feel)
        const currentSpeed = 6 + (this.level * 0.5);
        this.sessionDistance += currentSpeed * (16 / 1000) * 10; // Scale factor for "meters"

        // Level progression based on score
        this.level = Math.max(1, Math.floor(this.score / ITEM_LEVEL) + 1) + this.levelOffset;
        // Update entities
        this.player.update(16);
        if (this.player.y >= this.canvas.height - 72 - this.player.h && this.player.vy >= 0) {
            this.scoreSystem.resetCombo();
        }
        this.enemies.update(t, this.level, this.player);
        this.particles.update(t);
        const hasMagnet = characters[this.gacha.collection.current]?.special?.includes('magnet');
        this.items.update(t, this.level, this.player, hasMagnet);
        const hasSlow = characters[this.gacha.collection.current]?.special?.includes('slowEnemy');
        this.projectiles.update(
            this.player,
            this.enemies.bossState,
            this.enemies.enemies,
            en => this.awardEnemyDefeat(en),
            dmg => this.damageBoss(dmg),
            hasSlow
        );
        this.companion.update(t, this.items.items);
        this.enemies.enemies = this.enemies.enemies.filter(en => !en._dead);
        if (this.collisionSystem) {
            this.collisionSystem.checkAll();
        }
        if (this.ult >= 100) this.ultReady = true;
        // Render
        this.renderer.render({
            level: this.level,
            player: this.player,
            enemies: this.enemies,
            items: this.items,
            projectiles: this.projectiles,
            companion: this.companion,
            particles: this.particles,
            invUntil: this.invUntil,
            hurtUntil: this.hurtUntil,
            feverModeUntil: this.scoreSystem.feverModeUntil,
            ultActiveUntil: this.ultActiveUntil,
            currentCharKey: this.gacha.collection.current,
            comboCount: this.scoreSystem.comboCount,
            comboMultiplier: this.scoreSystem.comboMultiplier,
            lastComboTime: this.scoreSystem.lastComboTime,
            stageClearUntil: this.stageClearUntil
        });
        this.notifyState();
    }

    loop(t) {
        if (this.destroyed) return;
        if (!this.paused) {
            this.update(t);
        }
        requestAnimationFrame(t2 => this.loop(t2));
    }

    shoot() {
        if (!this.gameOn) return;
        const nowTime = now();
        if (nowTime - this.lastShot < SHOOT_COOLDOWN) return;
        this.lastShot = nowTime;
        this.sessionAttacks++; // Track attacks
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
        playSfx('hit');
        this.particles.createExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#00ffff');
        if (!type) { this.ultActiveUntil = now() + 1000; return; }
        if (type === 'storm') this.ultActiveUntil = now() + 1600;
        else if (type === 'ncha') this.ultActiveUntil = now() + 1500;
        else if (type === 'yadon') {
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
            this.ultActiveUntil = now() + 3000;
        }
    }

    awardEnemyDefeat(enemy) {
        const score = this.scoreSystem.awardEnemyDefeat(3);
        this.score += score;
        // Coin bonus
        const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current);
        const baseCoins = Math.floor(1 * this.scoreSystem.comboMultiplier);
        const finalCoins = Math.floor(baseCoins * (1 + skillBonuses.coinBonus));
        this.gacha.addCoins(finalCoins);
        this.sessionCoins += finalCoins;
        // Experience for enemy defeat (5 EXP base, modified by expBonus)
        const baseExp = 5;
        const finalExp = Math.floor(baseExp * (1 + skillBonuses.expBonus));
        const charKey = this.gacha.collection.current;
        this.gacha.progression.addExperience(charKey, finalExp);
        this.handleMissionUpdate('defeat_enemy', 1);
        this.particles.createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff4400');
    }

    damageBoss(amount) {
        if (!this.enemies.bossState) return;
        this.enemies.bossState.hp -= amount;
        this.particles.createExplosion(
            this.enemies.bossState.x + this.enemies.bossState.w / 2,
            this.enemies.bossState.y + this.enemies.bossState.h / 2,
            '#ff00ff'
        );
        if (this.enemies.bossState.hp <= 0) {
            this.enemies.bossState.state = 'defeated';
            this.score += 500;
            this.gacha.addCoins(50);
            this.sessionCoins += 50;
            this.handleMissionUpdate('defeat_boss', 1);
            this.stageClearUntil = now() + 4000;
            this.t0 = now();
            // Restore HP on stage clear
            const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current);
            this.maxHp = 100 + skillBonuses.maxHpBonus;
            this.hp = this.maxHp;
            this.hasUsedAutoRevive = false; // Reset auto-revive on stage clear
            this.levelOffset++;
            playSfx('powerup');
        } else {
            playSfx('hit');
        }
    }

    handleMissionUpdate(type, amount) {
        const updates = this.missions.updateProgress(type, amount);
        if (updates.length > 0) {
            updates.forEach(m => logger.info('Mission completed!', { id: m.id }));
            this.missions.save();
        }
    }

    getEffectiveStats(charKey) {
        const c = characters[charKey];
        if (!c) return { speed: 1, jump: 1, bullet: 1, inv: 0, ultRate: 1 };
        let stats = {
            speed: c.move || 1,
            jump: c.jump || 1,
            bullet: c.bullet || 1,
            inv: c.inv || 0,
            ultRate: c.ultRate || 1
        };
        const charData = this.gacha.progression.getCharacterData(charKey);
        const levelBonus = 1 + (charData.level * 0.005);
        stats.speed *= levelBonus;
        stats.jump *= levelBonus;
        stats.bullet *= levelBonus;
        stats.ultRate *= levelBonus;
        const skillBonuses = this.gacha.progression.calculateSkillBonuses(charKey);
        stats.bullet *= (1 + skillBonuses.bulletSpeedBonus);
        stats.ultRate *= (1 + skillBonuses.ultChargeBonus);
        const equippedItems = charData.equippedItems;
        equippedItems.forEach(itemId => {
            const item = equipmentItems[itemId];
            if (!item) return;
            const e = item.effects;
            if (e.moveSpeed) stats.speed *= e.moveSpeed;
            if (e.jumpPower) stats.jump *= e.jumpPower;
            if (e.bulletSpeed) stats.bullet *= e.bulletSpeed;
            if (e.ultChargeRate) stats.ultRate *= e.ultChargeRate;
        });
        return stats;
    }

    loadBestScore() {
        const score = ErrorHandler.safely(() => {
            const raw = localStorage.getItem('psrun_best_score_v1');
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
            }
            return null;
        }, 'Game.loadBestScore', null);
        if (score !== null) {
            logger.info('Best score loaded', { score });
            return score;
        }
        logger.info('No saved best score found, starting with 0');
        return 0;
    }

    saveBestScore() {
        ErrorHandler.safely(() => {
            localStorage.setItem('psrun_best_score_v1', `${this.bestScore}`);
            logger.debug('Best score saved', { score: this.bestScore });
        }, 'Game.saveBestScore');
    }

    updateCharInfo() {
        // UI updates handled elsewhere
    }

    destroy() {
        this.gameOn = false;
        this.paused = true;
        this.destroyed = true;
        stopBgm();

        // Clear callbacks to prevent further execution
        this.callbacks = {};
    }
}
