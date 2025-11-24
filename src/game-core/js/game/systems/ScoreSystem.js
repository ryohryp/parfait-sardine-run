/**
 * ScoreSystem - スコアとコンボの管理クラス
 * 
 * Game.jsからスコア計算、コンボ、フィーバーゲージの
 * ロジックを分離します。
 */

import { playSfx } from '../../audio.js';
import { logger } from '../../utils/Logger.js';

function now() { return performance.now(); }

export class ScoreSystem {
    constructor() {
        // コンボシステム
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.lastComboTime = 0;

        // フィーバーシステム
        this.feverGauge = 0;
        this.feverModeUntil = 0;

        // 統計情報
        this.totalEnemiesDefeated = 0; // For EXP calculation
    }

    /**
     * 敵撃破時のスコア計算
     * @param {number} baseScore - 基本スコア
     * @returns {number} 計算されたスコア
     */
    awardEnemyDefeat(baseScore = 3) {
        this.comboCount++;
        this.totalEnemiesDefeated++; // Track total enemies defeated
        this.updateComboMultiplier();
        this.lastComboTime = now();

        const score = baseScore * this.comboMultiplier;

        logger.debug('Enemy defeated', {
            combo: this.comboCount,
            multiplier: this.comboMultiplier,
            totalDefeated: this.totalEnemiesDefeated,
            score
        });

        return score;
    }

    /**
     * コンボ数に応じて倍率を更新
     */
    updateComboMultiplier() {
        if (this.comboCount < 5) this.comboMultiplier = 1;
        else if (this.comboCount < 10) this.comboMultiplier = 1.5;
        else if (this.comboCount < 20) this.comboMultiplier = 2;
        else if (this.comboCount < 50) this.comboMultiplier = 3;
        else this.comboMultiplier = 5;
    }

    /**
     * コンボをリセット
     */
    resetCombo() {
        if (this.comboCount > 0) {
            logger.debug('Combo reset', { count: this.comboCount });
            this.comboCount = 0;
            this.comboMultiplier = 1;
        }
    }

    /**
     * フィーバーゲージを追加
     * @param {number} amount - 追加量
     * @returns {boolean} フィーバーが発動したかどうか
     */
    addFeverGauge(amount) {
        if (this.isFeverActive()) {
            return false; // フィーバー中は追加しない
        }

        this.feverGauge = Math.min(100, this.feverGauge + amount);

        if (this.feverGauge >= 100) {
            return true; // フィーバー発動
        }
        return false;
    }

    /**
     * フィーバーモードを発動
     */
    activateFever() {
        this.feverGauge = 0;
        this.feverModeUntil = now() + 10000; // 10秒間
        playSfx('powerup'); // プレースホルダー
        logger.info('Fever activated');
    }

    /**
     * フィーバーモードが有効かどうか
     * @returns {boolean}
     */
    isFeverActive() {
        return now() < this.feverModeUntil;
    }

    /**
     * コンボが現在アクティブかどうか
     * @returns {boolean}
     */
    isComboActive() {
        return this.comboCount > 0 && (now() - this.lastComboTime < 2000);
    }

    /**
     * 現在の状態を取得
     */
    getState() {
        return {
            comboCount: this.comboCount,
            comboMultiplier: this.comboMultiplier,
            feverGauge: this.feverGauge,
            isFever: this.isFeverActive(),
            isComboActive: this.isComboActive()
        };
    }

    /**
     * 状態をリセット
     */
    reset() {
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.lastComboTime = 0;
        this.feverGauge = 0;
        this.feverModeUntil = 0;
        this.totalEnemiesDefeated = 0; // Reset total count
        logger.debug('ScoreSystem reset');
    }
}
