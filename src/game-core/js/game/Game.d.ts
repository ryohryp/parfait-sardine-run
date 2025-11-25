import { GameState } from '../../../types/game';
import { GachaSystem } from './GachaSystem';

export class Game {
    constructor(canvas: HTMLCanvasElement, callbacks?: any, dependencies?: any);
    gacha: GachaSystem;

    init(): void;
    start(characterKey?: string): void;
    endGame(): void;
    pause(): void;
    resume(): void;
    tryUlt(): void;
    destroy(): void; // Optional if you have destroy method

    getState(): GameState;
}
