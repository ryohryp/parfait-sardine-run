import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollisionSystem } from '../systems/CollisionSystem.js';

// モック
vi.mock('../../audio.js', () => ({
    playSfx: vi.fn()
}));

vi.mock('../../utils/Logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn()
    }
}));

describe('CollisionSystem', () => {
    let collisionSystem;
    let mockGame;

    beforeEach(() => {
        // Gameクラスのモック
        mockGame = {
            player: { x: 0, y: 0, w: 50, h: 50, inv: false, damage: vi.fn(), heal: vi.fn() },
            enemies: {
                enemies: [],
                bossState: null,
                bossProjectiles: [],
                damageBoss: vi.fn()
            },
            items: {
                items: [],
                powers: []
            },
            projectiles: { active: [] },
            scoreSystem: {
                awardEnemyDefeat: vi.fn(),
                addFeverGauge: vi.fn(),
                getState: vi.fn().mockReturnValue({ isFever: false, comboMultiplier: 1 }),
                comboCount: 0,
                updateComboMultiplier: vi.fn(),
                lastComboTime: 0
            },
            particles: {
                createExplosion: vi.fn(),
                createText: vi.fn(),
                createSparkle: vi.fn()
            },
            gacha: {
                collection: { current: 'parfen' },
                addCoins: vi.fn()
            },
            collection: {
                unlockItem: vi.fn()
            },
            callbacks: {
                onPlaySfx: vi.fn()
            },
            level: 1,
            damageBoss: vi.fn(),
            handleMissionUpdate: vi.fn(),
            getEffectiveStats: vi.fn().mockReturnValue({ ultRate: 1, inv: 0 }),
            updateComboMultiplier: vi.fn(),
            canvas: { width: 360, height: 640 },
            feverModeUntil: 0,
            scoreMulUntil: 0,
            comboMultiplier: 1,
            score: 0,
            comboCount: 0,
            lastComboTime: 0,
            ult: 0
        };

        collisionSystem = new CollisionSystem(mockGame);
    });

    it('should detect AABB collision', () => {
        const rect1 = { x: 0, y: 0, w: 10, h: 10 };
        const rect2 = { x: 5, y: 5, w: 10, h: 10 };
        const rect3 = { x: 20, y: 20, w: 10, h: 10 };

        expect(collisionSystem.AABB(rect1, rect2)).toBe(true);
        expect(collisionSystem.AABB(rect1, rect3)).toBe(false);
    });

    it('should handle player-item collision', () => {
        const item = { x: 0, y: 0, w: 20, h: 20, type: 'coin', collected: false, score: 10, char: '🍨' };
        mockGame.items.items.push(item);

        collisionSystem.checkPlayerItemCollisions();

        // 衝突した場合、filterで除去されるはず（実装によるが、filterは残すものを返す）
        // CollisionSystemの実装では、衝突時にfalseを返して除去している
        expect(mockGame.items.items.length).toBe(0);
        expect(mockGame.score).toBeGreaterThan(0);
    });
});
