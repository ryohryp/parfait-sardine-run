import type { GameState } from '../types/index.js';
import type { GachaSystem } from './GachaSystem.js';
import type { ScoreSystem } from './systems/ScoreSystem.js';
import type { CollisionSystem } from './systems/CollisionSystem.js';
import type { GameRenderer } from './systems/GameRenderer.js';

export declare class Game {
    constructor(canvas: HTMLCanvasElement, callbacks?: any, dependencies?: any);
    start(characterKey?: string): void;
    getState(): GameState;
    updateCharacter(key: string): void;
    tryUlt(): void;
    destroy(): void;

    // expose systems
    gacha: GachaSystem;
    scoreSystem: ScoreSystem;
    collisionSystem: CollisionSystem;
    renderer: GameRenderer;

    // other properties exposed for testing or UI
    canvas: HTMLCanvasElement;
    score: number;
    comboCount: number;
    comboMultiplier: number;
    feverGauge: number;
    ult: number;
}
