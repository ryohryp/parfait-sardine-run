import { CharacterProgression } from './CharacterProgression';

export interface EquipmentEffects {
    moveSpeed?: number;
    jumpPower?: number;
    bulletSpeed?: number;
    coinBonus?: number;
    expBonus?: number;
    ultChargeRate?: number;
    damageReduction?: number;
}

export interface EquipmentItem {
    id: string;
    name: string;
    nameEn: string;
    emoji: string;
    rarity: 'C' | 'R' | 'E' | 'L';
    effects: EquipmentEffects;
    unlockCondition?: any;
}

export interface CharacterOwned {
    owned: boolean;
    dup: number;
    limit: number;
    equipment?: {
        item: EquipmentItem;
        isNew: boolean;
    };
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
    progression: CharacterProgression;

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
    doGacha(n: number): (CharacterOwned & { char: Character; isLimitBreak: boolean; limitBreakPerformed: boolean; isNew: boolean })[] | null;
    addToCollection(key: string): CharacterOwned & { isNew: boolean; isLimitBreak: boolean; limitBreakPerformed: boolean };
    setCurrentChar(key: string): boolean;
    rollEquipment(charRarity: string): EquipmentItem | null;
}
