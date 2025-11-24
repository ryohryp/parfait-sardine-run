export interface Character {
    key: string;
    name: string;
    emoji: string;
    rar: 'C' | 'R' | 'E' | 'L' | 'M';
    move: number;
    jump: number;
    bullet: number;
    inv: number;
    ultRate: number;
    special: string[];
    ult: string | null;
}

export interface CharacterOwned {
    owned: boolean;
    dup: number;
    limit: number;
}

export interface CharacterCollection {
    current: string;
    owned: Record<string, CharacterOwned>;
}

export interface Pity {
    sinceL: number;
    sinceM: number;
}

export interface GachaResult {
    character: Character;
    isNew: boolean;
}

export interface Mission {
    id: string;
    type: string;
    target: number;
    current: number;
    reward: number;
    completed: boolean;
    description: string;
}

export interface GameState {
    remainMs: number;
    level: number;
    score: number;
    coins: number;
    lives: number;
    ult: number;
    ultReady: boolean;
    currentCharKey: string;
    collection: CharacterCollection;
    bestScore: number;
    invUntil: number;
    autoShootUntil: number;
    bulletBoostUntil: number;
    scoreMulUntil: number;
    ultActiveUntil: number;
    gameOn: boolean;
    stageName: string;
    fever: number;
    isFever: boolean;
    missions: Mission[];
}

export interface GameCallbacks {
    onStateUpdate: (state: GameState) => void;
    onGameOver: (result: any) => void;
    onPlaySfx?: (name: string) => void;
    onRunStart?: () => void;
    onRunFinish?: (data: any) => void;
    onMissionComplete?: (mission: Mission) => void;
}

