import { logger } from '../utils/Logger.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { ITEM_LEVEL } from '../game-constants.js';

export interface GameStateData {
    level: number;
    score: number;
    coins: number;
    hp: number;
    maxHp: number;
    ult: number;
    ultReady: boolean;
    ultActiveUntil: number;
    gameOn: boolean;
    paused: boolean;
    invUntil: number;
    hurtUntil: number;
    autoShootUntil: number;
    bulletBoostUntil: number;
    scoreMulUntil: number;
    stageClearUntil: number;
    currentStageIndex: number;
    sessionDistance: number;
    sessionJumps: number;
    sessionAttacks: number;
    bestScore: number;
    runStartTimestamp: number;
    t0: number;
    destroyed: boolean;
    hasUsedAutoRevive: boolean;
    hasUsedOneGuard: boolean;
}

export class GameStateManager {
    state: GameStateData;

    constructor() {
        this.state = this.getInitialState();
        this.loadBestScore();
    }

    getInitialState(): GameStateData {
        return {
            level: 1,
            score: 0,
            coins: 0,
            hp: 100,
            maxHp: 100,
            ult: 0,
            ultReady: false,
            ultActiveUntil: 0,
            gameOn: false,
            paused: false,
            invUntil: 0,
            hurtUntil: 0,
            autoShootUntil: 0,
            bulletBoostUntil: 0,
            scoreMulUntil: 0,
            stageClearUntil: 0,
            currentStageIndex: 0,
            sessionDistance: 0,
            sessionJumps: 0,
            sessionAttacks: 0,
            bestScore: 0,
            runStartTimestamp: 0,
            t0: 0,
            destroyed: false,
            hasUsedAutoRevive: false,
            hasUsedOneGuard: false
        };
    }

    reset() {
        const bestScore = this.state.bestScore;
        this.state = this.getInitialState();
        this.state.bestScore = bestScore;
    }

    loadBestScore() {
        const score = ErrorHandler.safely(() => {
            const raw = localStorage.getItem('psrun_best_score_v1');
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
            }
            return null;
        }, 'GameStateManager.loadBestScore', null);

        if (score !== null) {
            this.state.bestScore = score;
            logger.info('Best score loaded', { score });
        } else {
            this.state.bestScore = 0;
            logger.info('No saved best score found, starting with 0');
        }
    }

    saveBestScore() {
        if (this.state.score > this.state.bestScore) {
            this.state.bestScore = this.state.score;
            ErrorHandler.safely(() => {
                localStorage.setItem('psrun_best_score_v1', `${this.state.bestScore}`);
                logger.debug('Best score saved', { score: this.state.bestScore });
            }, 'GameStateManager.saveBestScore');
        }
    }

    addScore(amount: number) {
        this.state.score += amount;
        // Level progression based on score
        this.state.level = Math.max(1, Math.floor(this.state.score / ITEM_LEVEL) + 1);
    }

    addCoins(amount: number) {
        this.state.coins += amount;
    }

    takeDamage(amount: number) {
        this.state.hp -= amount;
        if (this.state.hp < 0) this.state.hp = 0;
    }

    heal(amount: number) {
        this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount);
    }
}
