export interface GameState {
    remainMs: number;
    level: number;
    score: number;
    coins: number;
    lives: number;
    ult: number;
    ultReady: boolean;
    currentCharKey: string;
    collection: any;
    bestScore: number;
    invUntil: number;
    autoShootUntil: number;
    bulletBoostUntil: number;
    scoreMulUntil: number;
    ultActiveUntil: number;
    gameOn: boolean;
    stageName: string;
}

export interface GameCallbacks {
    onStateUpdate: (state: GameState) => void;
    onGameOver: (result: any) => void;
    onPlaySfx?: (name: string) => void;
    onRunStart?: () => void;
    onRunFinish?: (data: any) => void;
}
