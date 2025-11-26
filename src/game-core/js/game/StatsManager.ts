import { GachaSystem } from './GachaSystem';
import { characters } from '../game-data/characters.js';
import { equipmentItems } from '../game-data/equipment-data.js';

export interface EffectiveStats {
    speed: number;
    jump: number;
    bullet: number;
    inv: number;
    ultRate: number;
}

export class StatsManager {
    private gacha: GachaSystem;

    constructor(gacha: GachaSystem) {
        this.gacha = gacha;
    }

    getEffectiveStats(charKey: string): EffectiveStats {
        const c = characters[charKey];
        if (!c) return { speed: 1, jump: 1, bullet: 1, inv: 0, ultRate: 1 };

        let stats: EffectiveStats = {
            speed: c.move || 1,
            jump: c.jump || 1,
            bullet: c.bullet || 1,
            inv: c.inv || 0,
            ultRate: c.ultRate || 1
        };

        const charData = this.gacha.progression.getCharacterData(charKey);
        if (!charData) return stats;

        const levelBonus = 1 + (charData.level * 0.005);
        stats.speed *= levelBonus;
        stats.jump *= levelBonus;
        stats.bullet *= levelBonus;
        stats.ultRate *= levelBonus;

        const skillBonuses = this.gacha.progression.calculateSkillBonuses(charKey);
        stats.bullet *= (1 + skillBonuses.bulletSpeedBonus);
        stats.ultRate *= (1 + skillBonuses.ultChargeBonus);

        const equippedItemsList = charData.equippedItems;
        if (equippedItemsList) {
            equippedItemsList.forEach((itemId: string) => {
                const item = equipmentItems[itemId];
                if (!item) return;
                const e = item.effects;
                if (e.moveSpeed) stats.speed *= e.moveSpeed;
                if (e.jumpPower) stats.jump *= e.jumpPower;
                if (e.bulletSpeed) stats.bullet *= e.bulletSpeed;
                if (e.ultChargeRate) stats.ultRate *= e.ultChargeRate;
            });
        }

        return stats;
    }
}
