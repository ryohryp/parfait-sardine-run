import type { GameState } from '../../../types/game';
import type { GachaSystem } from './GachaSystem.js';

export declare class Game {
    constructor(canvas: HTMLCanvasElement, callbacks?: any);
    start(): void;
    getState(): GameState;
    updateCharacter(key: string): void;
    tryUlt(): void;
    // expose gacha system for UI components
    gacha: GachaSystem;
}
