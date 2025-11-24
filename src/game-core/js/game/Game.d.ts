export interface GameCallbacks {
    onStateUpdate: (state: GameState) => void;
    onGameOver: (result: any) => void;
    onPlaySfx?: (name: string) => void;
    onRunStart?: () => void;
    onRunFinish?: (data: any) => void;
}

export class Game {
    constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks);
    init(): void;
    start(): void;
    endGame(): void;
    input: any;
}
