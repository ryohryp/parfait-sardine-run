// equipment-data.js
// Equipment item definitions

/**
 * @typedef {Object} EquipmentEffects
 * @property {number} [moveSpeed] - Movement speed multiplier
 * @property {number} [jumpPower] - Jump power multiplier
 * @property {number} [bulletSpeed] - Bullet speed multiplier
 * @property {number} [coinBonus] - Coin gain multiplier
 * @property {number} [expBonus] - Experience gain multiplier
 * @property {number} [ultChargeRate] - Ultimate charge rate multiplier
 * @property {number} [damageReduction] - Damage reduction rate
 */

/**
 * @typedef {Object} EquipmentItem
 * @property {string} id
 * @property {string} name - Japanese name
 * @property {string} nameEn - English name
 * @property {string} emoji
 * @property {'C'|'R'|'E'|'L'} rarity
 * @property {EquipmentEffects} effects
 * @property {Object} [unlockCondition]
 */

/** @type {Record<string, EquipmentItem>} */
export const equipmentItems = {
    // Common (C)
    clover: {
        id: 'clover',
        name: '🍀 幸運のクローバー',
        nameEn: '🍀 Lucky Clover',
        emoji: '🍀',
        rarity: 'C',
        effects: {
            coinBonus: 1.10
        }
    },
    speedBoots: {
        id: 'speedBoots',
        name: '⚡ スピードブーツ',
        nameEn: '⚡ Speed Boots',
        emoji: '⚡',
        rarity: 'C',
        effects: {
            moveSpeed: 1.08
        }
    },
    jumpShoes: {
        id: 'jumpShoes',
        name: '👟 ジャンプシューズ',
        nameEn: '👟 Jump Shoes',
        emoji: '👟',
        rarity: 'C',
        effects: {
            jumpPower: 1.08
        }
    },

    // Rare (R)
    fireRing: {
        id: 'fireRing',
        name: '🔥 ファイアリング',
        nameEn: '🔥 Fire Ring',
        emoji: '🔥',
        rarity: 'R',
        effects: {
            bulletSpeed: 1.15
        }
    },
    diamondAmulet: {
        id: 'diamondAmulet',
        name: '💎 ダイヤの護符',
        nameEn: '💎 Diamond Amulet',
        emoji: '💎',
        rarity: 'R',
        effects: {
            damageReduction: 0.05
        }
    },
    coinMagnet: {
        id: 'coinMagnet',
        name: '🧲 コインマグネット',
        nameEn: '🧲 Coin Magnet',
        emoji: '🧲',
        rarity: 'R',
        effects: {
            coinBonus: 1.20
        }
    },

    // Epic (E)
    starPendant: {
        id: 'starPendant',
        name: '🌟 スターペンダント',
        nameEn: '🌟 Star Pendant',
        emoji: '🌟',
        rarity: 'E',
        effects: {
            ultChargeRate: 1.20
        }
    },
    scholarHat: {
        id: 'scholarHat',
        name: '🎓 賢者の帽子',
        nameEn: '🎓 Scholar Hat',
        emoji: '🎓',
        rarity: 'E',
        effects: {
            expBonus: 1.25
        }
    },
    goldenWings: {
        id: 'goldenWings',
        name: '🪽 黄金の翼',
        nameEn: '🪽 Golden Wings',
        emoji: '🪽',
        rarity: 'E',
        effects: {
            moveSpeed: 1.12,
            jumpPower: 1.12
        }
    },

    // Legendary (L)
    kingsCrown: {
        id: 'kingsCrown',
        name: '👑 王の王冠',
        nameEn: '👑 King\'s Crown',
        emoji: '👑',
        rarity: 'L',
        effects: {
            moveSpeed: 1.10,
            jumpPower: 1.10,
            bulletSpeed: 1.10
        }
    },
    rainbowGem: {
        id: 'rainbowGem',
        name: '🌈 虹の宝玉',
        nameEn: '🌈 Rainbow Gem',
        emoji: '🌈',
        rarity: 'L',
        effects: {
            coinBonus: 1.30,
            expBonus: 1.30
        }
    },
    holyShield: {
        id: 'holyShield',
        name: '🛡️ 聖なる盾',
        nameEn: '🛡️ Holy Shield',
        emoji: '🛡️',
        rarity: 'L',
        effects: {
            damageReduction: 0.15,
            ultChargeRate: 1.15
        }
    }
};

export const equipmentList = Object.values(equipmentItems);

// Rarity order for display
export const rarityOrder = ['C', 'R', 'E', 'L'];

export function getEquipmentsByRarity(rarity) {
    return equipmentList.filter(item => item.rarity === rarity);
}

export function getEquipmentById(id) {
    return equipmentItems[id] || null;
}
