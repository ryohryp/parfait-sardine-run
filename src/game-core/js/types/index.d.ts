export interface GameState {
    score: number;
    level: number;
    lives: number;
    gameOver: boolean;
    isPaused: boolean;
    comboCount: number;
    comboMultiplier: number;
    feverGauge: number;
    isFever: boolean;
    ultGauge: number;
    currentCharKey: string;
}

export interface GameCallbacks {
    onStateUpdate: (state: GameState) => void;
    onGameOver: (result: any) => void;
    onPlaySfx: (sfx: string) => void;
    onRunStart: () => void;
    onRunFinish: (result: any) => void;
}
