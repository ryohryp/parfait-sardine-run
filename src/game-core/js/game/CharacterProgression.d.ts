export interface CharacterProgressionData {
    level: number;
    exp: number;
    expToNext: number;
    skillPoints: number;
    skills: {
        attack: number;
        defense: number;
        special: number;
    };
    limitBreak: number;
    equippedItems: string[];
}

export interface SkillBonuses {
    bulletSpeedBonus: number;
    bulletDamageBonus: number;
    criticalRate: number;
    hasPiercingBullets: boolean;
    maxHpBonus: number;
    invincibilityBonus: number;
    damageReduction: number;
    hasAutoRevive: boolean;
    ultChargeBonus: number;
    coinBonus: number;
    expBonus: number;
    hasItemMagnet: boolean;
}

export class CharacterProgression {
    progression: Record<string, CharacterProgressionData>;
    equipmentInventory: Record<string, { owned: boolean; count: number }>;

    constructor();
    load(): void;
    save(): void;
    initializeCharacter(charKey: string): void;
    getCharacterData(charKey: string): CharacterProgressionData;
    calculateExpToNext(level: number): number;
    getLevelCap(limitBreak: number): number;
    addExperience(charKey: string, exp: number): { leveledUp: boolean; newLevel: number; levelsGained: number };
    limitBreak(charKey: string): boolean;
    allocateSkillPoint(charKey: string, tree: 'attack' | 'defense' | 'special'): boolean;
    resetSkills(charKey: string): number;
    calculateSkillBonuses(charKey: string): SkillBonuses;
    equipItem(charKey: string, itemId: string): boolean;
    unequipItem(charKey: string, itemId: string): boolean;
    addEquipmentToInventory(itemId: string): boolean;
    getAllData(): { progression: Record<string, CharacterProgressionData>; equipmentInventory: Record<string, { owned: boolean; count: number }> };
}
