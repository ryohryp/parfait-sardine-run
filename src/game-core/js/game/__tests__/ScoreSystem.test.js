import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreSystem } from '../systems/ScoreSystem.js';

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

describe('ScoreSystem', () => {
    let scoreSystem;

    beforeEach(() => {
        scoreSystem = new ScoreSystem();
        // 時間依存のテストのためにDate.nowなどをモックする必要があるかもしれないが、
        // ScoreSystemはperformance.now()を使用しているため、
        // 必要に応じてglobal.performance.nowをモックする。
        vi.stubGlobal('performance', { now: () => 1000 });
    });

    it('should initialize with default values', () => {
        expect(scoreSystem.comboCount).toBe(0);
        expect(scoreSystem.comboMultiplier).toBe(1);
        expect(scoreSystem.feverGauge).toBe(0);
    });

    it('should calculate score correctly on enemy defeat', () => {
        const score = scoreSystem.awardEnemyDefeat(10);
        // 初回はコンボ1、倍率1
        expect(score).toBe(10);
        expect(scoreSystem.comboCount).toBe(1);
    });

    it('should increase multiplier with combo', () => {
        // コンボを積む
        // 1回目: count=1, mul=1
        scoreSystem.awardEnemyDefeat(10);

        // 2-10回目
        for (let i = 0; i < 9; i++) scoreSystem.awardEnemyDefeat(10);

        expect(scoreSystem.comboCount).toBe(10);
        // 倍率計算ロジックに依存するが、1より大きくなっているはず
        expect(scoreSystem.comboMultiplier).toBeGreaterThan(1);
    });

    it('should reset combo', () => {
        scoreSystem.awardEnemyDefeat(10);
        expect(scoreSystem.comboCount).toBe(1);

        scoreSystem.resetCombo();
        expect(scoreSystem.comboCount).toBe(0);
        expect(scoreSystem.comboMultiplier).toBe(1);
    });

    it('should activate fever mode', () => {
        scoreSystem.feverGauge = 100;
        scoreSystem.activateFever();

        const state = scoreSystem.getState();
        expect(state.isFever).toBe(true);
        expect(scoreSystem.feverGauge).toBe(0);
    });
});
