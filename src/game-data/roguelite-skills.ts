export interface RogueliteSkillDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ROGUELITE_SKILLS: Record<string, RogueliteSkillDef> = {
    'attack_speed': { id: 'attack_speed', name: '連射アップ', description: '弾の発射間隔が20%短縮される。', icon: '⚡', rarity: 'common' },
    'attack_power': { id: 'attack_power', name: '火力アップ', description: '与えるダメージが20%増加する。', icon: '🔥', rarity: 'common' },
    'max_hp_up': { id: 'max_hp_up', name: '最大HPアップ', description: '最大HPが20%増加し、少し回復する。', icon: '❤️', rarity: 'common' },
    '3way_shot': { id: '3way_shot', name: '3WAYショット', description: '前方に3方向の弾を発射するようになる。', icon: '🔱', rarity: 'rare' },
    'piercing_shot': { id: 'piercing_shot', name: '貫通弾', description: '弾が敵を貫通するようになる。', icon: '🏹', rarity: 'epic' },
    'orbital_option': { id: 'orbital_option', name: 'オービタルオプション', description: '周囲を回転するダメージ判定のオプションを追加する。', icon: '🌀', rarity: 'epic' }
};

export function getRandomSkills(count: number, currentSkills: string[]): RogueliteSkillDef[] {
    const pool = Object.values(ROGUELITE_SKILLS).filter(s => {
        // 重複不可スキル
        if (['3way_shot', 'piercing_shot', 'orbital_option'].includes(s.id) && currentSkills.includes(s.id)) {
            return false;
        }
        return true;
    });

    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
