import { stageBosses } from '../game-data/stages.js';
import { ENEMY_BONUS } from '../game-constants.js';

export const ENEMY_TYPES = {
    straight: {
        icon: '👾',
        label: '直進型',
        speedFactor: 1.0
    },
    zigzag: {
        icon: '🐍',
        label: '蛇行型',
        speedFactor: 0.9,
        amplitude: { min: 28, max: 68 },
        frequency: { min: 0.08, max: 0.14 },
        baseYOffset: { min: 10, max: 50 }
    },
    dash: {
        icon: '💥',
        label: '突進型',
        speedFactor: 0.75,
        maxSpeedFactor: 1.9,
        accelFactor: 0.045,
        chargeTime: { min: 260, max: 460 }
    },
    hover: {
        icon: '🛸',
        label: '浮遊型',
        speedFactor: 0.85,
        hoverRange: { min: 28, max: 92 },
        hoverSpeed: { min: 0.02, max: 0.035 },
        baseYOffset: { min: 40, max: 120 }
    },
    chaser: {
        icon: '🎯',
        label: '追跡型',
        speedFactor: 0.8,
        chaseSpeedFactor: 0.3,
        baseYOffset: { min: 20, max: 80 }
    },
    bomber: {
        icon: '💣',
        label: '爆弾型',
        speedFactor: 0.7,
        explosionRadius: 80,
        triggerDistance: 120,
        explosionDelay: 600
    },
    splitter: {
        icon: '🔷',
        label: '分裂型',
        speedFactor: 0.85,
        width: 42,
        height: 42
    },
    obstacle: {
        icon: '🧱',
        label: '障害物',
        speedFactor: 1.0,
        width: 48,
        height: 48,
        hp: 999
    },
    shield: {
        // Note: shield was missing from enemyTypeMeta in original file but present in spawn logic
        icon: '🛡️',
        label: 'シールド型',
        speedFactor: 0.6,
        hp: 3,
        width: 40,
        height: 40
    }
};

// Add boss entries to ENEMY_TYPES for icon lookup
Object.entries(stageBosses).forEach(([key, boss]) => {
    ENEMY_TYPES[boss.key] = {
        icon: boss.icon || '👑',
        label: `Boss - ${boss.displayName}`,
        base: boss.rewardScore || ENEMY_BONUS
    };
});
