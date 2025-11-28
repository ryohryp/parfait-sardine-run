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
import { GAME_TIME, SHOOT_COOLDOWN, ITEM_LEVEL } from '../game-constants.js';
import { characters } from '../game-data/characters.js';
import { stageForLevel } from '../game-data/stages.js';
import { CollectionSystem } from './CollectionSystem';
import { logger } from '../utils/Logger.js';
import { StatsManager, type EffectiveStats } from './StatsManager';
import { GameStateManager } from './GameStateManager';

function now() { return performance.now(); }

export interface GameCallbacks {
    onStateUpdate?: (state: any) => void;
    onGameOver?: (result: any) => void;
    onPlaySfx?: (name: string) => void;
    onRunStart?: () => void;
    onRunFinish?: (result: any) => void;
    onStageClear?: (result: any) => void;
    onMissionComplete?: (mission: any) => void;
}

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    callbacks: GameCallbacks;

    // Dependencies
    input: any;
    particles: any;
    player: any;
    enemies: any;
    items: any;
    projectiles: any;
    gacha: GachaSystem;
    companion: any;
    missions: any;

    // Systems
    collection: CollectionSystem;
    scoreSystem: ScoreSystem;
    collisionSystem: any;
    renderer: any;

    // Managers
    statsManager: StatsManager;
    stateManager: GameStateManager;

    // Local state
    lastShot: number = 0;

    constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}, dependencies: any = {}) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.callbacks = callbacks;

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

        // Systems
        this.collection = new CollectionSystem();
        this.scoreSystem = dependencies.scoreSystem || new ScoreSystem();
        const CollisionSystemClass = dependencies.collisionSystemClass || CollisionSystem;
        this.collisionSystem = dependencies.collisionSystem || new CollisionSystemClass(this);
        const GameRendererClass = dependencies.rendererClass || GameRenderer;
        this.renderer = dependencies.renderer || new GameRendererClass(this.canvas, this);

        // Managers
        this.statsManager = new StatsManager(this.gacha);
        this.stateManager = new GameStateManager();

        this.init();
    }

    // State Proxies for Compatibility
    get level() { return this.stateManager.state.level; }
    set level(v) { this.stateManager.state.level = v; }

    get score() { return this.stateManager.state.score; }
    set score(v) { this.stateManager.state.score = v; }

    get sessionCoins() { return this.stateManager.state.coins; }
    set sessionCoins(v) { this.stateManager.state.coins = v; }

    get hp() { return this.stateManager.state.hp; }
    set hp(v) { this.stateManager.state.hp = v; }

    get maxHp() { return this.stateManager.state.maxHp; }
    set maxHp(v) { this.stateManager.state.maxHp = v; }

    get ult() { return this.stateManager.state.ult; }
    set ult(v) { this.stateManager.state.ult = v; }

    get ultReady() { return this.stateManager.state.ultReady; }
    set ultReady(v) { this.stateManager.state.ultReady = v; }

    get ultActiveUntil() { return this.stateManager.state.ultActiveUntil; }
    set ultActiveUntil(v) { this.stateManager.state.ultActiveUntil = v; }

    get gameOn() { return this.stateManager.state.gameOn; }
    set gameOn(v) { this.stateManager.state.gameOn = v; }

    get paused() { return this.stateManager.state.paused; }
    set paused(v) { this.stateManager.state.paused = v; }

    get invUntil() { return this.stateManager.state.invUntil; }
    set invUntil(v) { this.stateManager.state.invUntil = v; }

    get hurtUntil() { return this.stateManager.state.hurtUntil; }
    set hurtUntil(v) { this.stateManager.state.hurtUntil = v; }

    get autoShootUntil() { return this.stateManager.state.autoShootUntil; }
    set autoShootUntil(v) { this.stateManager.state.autoShootUntil = v; }

    get bulletBoostUntil() { return this.stateManager.state.bulletBoostUntil; }
    set bulletBoostUntil(v) { this.stateManager.state.bulletBoostUntil = v; }

    get scoreMulUntil() { return this.stateManager.state.scoreMulUntil; }
    set scoreMulUntil(v) { this.stateManager.state.scoreMulUntil = v; }

    get stageClearUntil() { return this.stateManager.state.stageClearUntil; }
    set stageClearUntil(v) { this.stateManager.state.stageClearUntil = v; }

    get currentStageIndex() { return this.stateManager.state.currentStageIndex; }
    set currentStageIndex(v) { this.stateManager.state.currentStageIndex = v; }

    get sessionDistance() { return this.stateManager.state.sessionDistance; }
    set sessionDistance(v) { this.stateManager.state.sessionDistance = v; }

    get sessionJumps() { return this.stateManager.state.sessionJumps; }
    set sessionJumps(v) { this.stateManager.state.sessionJumps = v; }

    get sessionAttacks() { return this.stateManager.state.sessionAttacks; }
    set sessionAttacks(v) { this.stateManager.state.sessionAttacks = v; }

    get bestScore() { return this.stateManager.state.bestScore; }
    set bestScore(v) { this.stateManager.state.bestScore = v; }

    get runStartTimestamp() { return this.stateManager.state.runStartTimestamp; }
    set runStartTimestamp(v) { this.stateManager.state.runStartTimestamp = v; }

    get t0() { return this.stateManager.state.t0; }
    set t0(v) { this.stateManager.state.t0 = v; }

    get destroyed() { return this.stateManager.state.destroyed; }
    set destroyed(v) { this.stateManager.state.destroyed = v; }

    get hasUsedAutoRevive() { return this.stateManager.state.hasUsedAutoRevive; }
    set hasUsedAutoRevive(v) { this.stateManager.state.hasUsedAutoRevive = v; }

    get hasUsedOneGuard() { return this.stateManager.state.hasUsedOneGuard; }
    set hasUsedOneGuard(v) { this.stateManager.state.hasUsedOneGuard = v; }

    // Methods
    init() {
        this.input.init(this.canvas);
        this.input.on('jump', () => {
            if (this.gameOn) {
                this.player.jump();
                this.sessionJumps++;
            }
        });
        this.input.on('shoot', () => this.shoot());
        this.input.on('ult', () => this.tryUlt());
        this.input.on('dash', () => {
            if (this.gameOn) {
                this.player.dash();
            }
        });
        this.input.on('guard', () => {
            if (this.gameOn) {
                this.player.guard();
            }
        });
        initAudio();
        this.notifyState();
        requestAnimationFrame(t => this.loop(t));
    }

    pause() {
        this.paused = true;
        // We need to store pauseTime in stateManager or locally?
        // Game.js used this.pauseTime.
        // Let's add it to stateManager or keep it local as it's transient.
        // Keeping it local for now as it wasn't in my initial StateData list, 
        // but wait, resume() needs it.
        // I'll add it to Game class as private property.
        (this as any)._pauseTime = now();
    }

    resume() {
        if (this.paused) {
            this.paused = false;
            const pauseTime = (this as any)._pauseTime || now();
            const duration = now() - pauseTime;
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
            stageName: stageForLevel(this.currentStageIndex * 3 + 1).name,
            fever: scoreState.feverGauge,
            isFever: scoreState.isFever,
            missions: this.missions.getMissions(),
            comboCount: scoreState.comboCount,
            comboMultiplier: scoreState.comboMultiplier,
            stageClearUntil: this.stageClearUntil
        };
    }

    start(characterKey?: string) {
        this.stateManager.reset();

        // Calculate max HP from skill bonuses
        const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current || 'parfen');
        this.maxHp = 100 + (skillBonuses.maxHpBonus || 0);
        this.hp = this.maxHp;

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

        this.stateManager.saveBestScore();

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

    update(t: number) {
        if (!this.gameOn || this.paused) return;
        const elapsed = t - this.t0;
        const remain = GAME_TIME - elapsed;
        if (remain <= 0) return this.endGame();

        const currentSpeed = 6 + (this.level * 0.5);
        const distanceDelta = currentSpeed * (16 / 1000) * 10;
        this.sessionDistance += distanceDelta;

        // Level progression based on score
        this.level = Math.max(1, Math.floor(this.score / ITEM_LEVEL) + 1);

        this.player.update(16);
        if (this.player.y >= this.canvas.height - 72 - this.player.h && this.player.vy >= 0) {
            this.scoreSystem.resetCombo();
        }

        const stageLevel = (this.currentStageIndex * 3) + 1;
        this.enemies.update(t, stageLevel, this.player);

        this.particles.update(t);
        const hasMagnet = characters[this.gacha.collection.current]?.special?.includes('magnet');
        this.items.update(t, this.level, this.player, hasMagnet);
        const hasSlow = characters[this.gacha.collection.current]?.special?.includes('slowEnemy');
        this.projectiles.update(
            this.player,
            this.enemies.bossState,
            this.enemies.enemies,
            (en: any) => this.awardEnemyDefeat(en),
            (dmg: number) => this.damageBoss(dmg),
            hasSlow
        );
        this.companion.update(t, this.items.items);
        this.enemies.enemies = this.enemies.enemies.filter((en: any) => !en._dead);
        if (this.collisionSystem) {
            this.collisionSystem.checkAll();
        }
        if (this.ult >= 100) this.ultReady = true;

        this.renderer.render({
            level: (this.currentStageIndex * 3) + 1,
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

    loop(t: number) {
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
        this.sessionAttacks++;
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

    awardEnemyDefeat(enemy: any) {
        const score = this.scoreSystem.awardEnemyDefeat(3);
        this.score += score;

        const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current);
        const baseCoins = Math.floor(1 * this.scoreSystem.comboMultiplier);
        const finalCoins = Math.floor(baseCoins * (1 + skillBonuses.coinBonus));
        this.gacha.addCoins(finalCoins);
        this.sessionCoins += finalCoins;

        const baseExp = 5;
        const finalExp = Math.floor(baseExp * (1 + skillBonuses.expBonus));
        const charKey = this.gacha.collection.current;
        this.gacha.progression.addExperience(charKey, finalExp);
        this.handleMissionUpdate('defeat_enemy', 1);
        this.particles.createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ff4400');
    }

    damageBoss(amount: number) {
        if (!this.enemies.bossState) return;
        this.enemies.bossState.hp -= amount;
        this.particles.createExplosion(
            this.enemies.bossState.x + this.enemies.bossState.w / 2,
            this.enemies.bossState.y + this.enemies.bossState.h / 2,
            '#ff00ff'
        );
        if (this.enemies.bossState.hp <= 0) {
            this.enemies.bossState.state = 'defeated';
            this.score += 50;
            this.gacha.addCoins(50);
            this.sessionCoins += 50;
            this.handleMissionUpdate('defeat_boss', 1);
            this.collection.unlockBoss('boss-' + this.enemies.bossState.stageKey);
            this.stageClearUntil = now() + 4000;
            this.t0 = now();

            const skillBonuses = this.gacha.progression.calculateSkillBonuses(this.gacha.collection.current);
            this.maxHp = 100 + skillBonuses.maxHpBonus;
            this.hp = this.maxHp;
            this.hp = this.maxHp;
            this.hasUsedAutoRevive = false;
            this.hasUsedOneGuard = false;

            this.currentStageIndex++;

            playSfx('powerup');
        } else {
            playSfx('hit');
        }
    }

    handleMissionUpdate(type: string, amount: number) {
        const updates = this.missions.updateProgress(type, amount);
        if (updates.length > 0) {
            updates.forEach((m: any) => logger.info('Mission completed!', { id: m.id }));
            this.missions.save();
        }
    }

    getEffectiveStats(charKey: string): EffectiveStats {
        return this.statsManager.getEffectiveStats(charKey);
    }

    // loadBestScore and saveBestScore are now handled by GameStateManager, 
    // but Game.js didn't export them. They were internal or used by Game.
    // I removed them from Game class interface as they are not used externally.
    // If they were used externally, I would need to proxy them.
    // Checking Game.js again... they were methods of Game class.
    // But they were only used internally in Game.js.
    // So it's safe to remove them from public interface.

    updateCharInfo() {
        // UI updates handled elsewhere
    }

    destroy() {
        this.gameOn = false;
        this.paused = true;
        this.destroyed = true;
        stopBgm();
        this.callbacks = {};
    }
}
