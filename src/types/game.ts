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
    hp: number;
    maxHp: number;
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

export interface GameResult {
    score: number;
    stage: string;
    duration: number;
    coins: number;
    result: string;
    level: number;
    newBest: boolean;
    stageClear?: boolean;
    enemiesDefeated?: number;
    bossesDefeated?: number;
    distance?: number; // New
    jumps?: number;    // New
    attacks?: number;  // New
}

export interface GameRunData {
    score: number;
    stage: string;
    duration: number;
    coins: number;
    result: string;
    enemiesDefeated?: number;
    bossesDefeated?: number;
    distance?: number; // New
    jumps?: number;    // New
    attacks?: number;  // New
}

export interface GameCallbacks {
    onStateUpdate: (state: GameState) => void;
    onGameOver: (result: GameResult) => void;
    onPlaySfx?: (name: string) => void;
    onRunStart?: () => void | Promise<void>;
    onRunFinish?: (data: GameRunData) => void | Promise<void>;
    onStageClear?: (data: GameResult) => void;
    onMissionComplete?: (mission: Mission) => void;
}

// === Character Progression System ===

export interface SkillTree {
    attack: number;   // 0-10: Attack skill points
    defense: number;  // 0-10: Defense skill points  
    special: number;  // 0-10: Special skill points
}

export interface CharacterProgressionData {
    level: number;              // Current level (1-120)
    exp: number;                // Current experience points
    expToNext: number;          // Experience needed for next level
    skillPoints: number;        // Available skill points to allocate
    skills: SkillTree;         // Allocated skill points
    limitBreak: number;         // Number of limit breaks (0-5)
    equippedItems: string[];    // IDs of equipped items (max 3)
}

export interface CharacterProgression {
    [characterKey: string]: CharacterProgressionData;
}

// === Equipment System ===

export interface EquipmentEffects {
    moveSpeed?: number;         // Movement speed multiplier (e.g., 1.1 = +10%)
    jumpPower?: number;         // Jump power multiplier
    bulletSpeed?: number;       // Bullet speed multiplier
    coinBonus?: number;         // Coin gain multiplier
    expBonus?: number;          // Experience gain multiplier
    ultChargeRate?: number;     // Ultimate charge rate multiplier
    damageReduction?: number;   // Damage reduction percentage (0-1)
}

export interface EquipmentItem {
    id: string;
    name: string;
    nameEn: string;
    emoji: string;
    rarity: 'C' | 'R' | 'E' | 'L';
    effects: EquipmentEffects;
    unlockCondition?: {
        type: 'level' | 'achievement' | 'gacha' | 'mission';
        value: any;
    };
}

export interface EquipmentInventory {
    [itemId: string]: {
        owned: boolean;
        count: number;
    };
}

// === Skill Effects (calculated bonuses) ===

export interface SkillBonuses {
    // Attack tree
    bulletSpeedBonus: number;
    bulletDamageBonus: number;
    criticalRate: number;
    hasPiercingBullets: boolean;

    // Defense tree
    extraLives: number;
    invincibilityBonus: number;
    damageReduction: number;
    hasAutoRevive: boolean;

    // Special tree
    ultChargeBonus: number;
    coinBonus: number;
    expBonus: number;
    hasItemMagnet: boolean;
}

