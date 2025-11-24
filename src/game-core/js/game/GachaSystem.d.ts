export interface CharacterOwned {
    owned: boolean;
    dup: number;
    limit: number;
}

export interface CharacterCollection {
    current: string;
    owned: Record<string, CharacterOwned>;
}

export interface PityState {
    sinceL: number;
    sinceM: number;
}

export interface Character {
    key: string;
    name: string;
    emoji: string;
    rar: string;
    move: number;
    jump: number;
    bullet: number;
    inv: number;
    ultRate: number;
    ult: string | null;
    special: string[];
}

export class GachaSystem {
    coins: number;
    collection: CharacterCollection;
    pity: PityState;

    constructor();

    loadCoinBalance(): number;
    saveCoinBalance(value: number): void;
    loadCollection(): CharacterCollection;
    saveCollection(): void;
    loadPity(): PityState;
    savePity(): void;
    addCoins(amount: number): void;
    rollRarity(): string;
    rollCharByRar(r: string): Character;
    doGacha(n: number): Character[] | null;
    addToCollection(key: string): void;
    setCurrentChar(key: string): boolean;
}
