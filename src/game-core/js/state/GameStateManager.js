/**
 * GameStateManager - ゲーム状態の集中管理
 * 
 * 分散していた状態を一箇所に集約し、Single Source of Truthを実現します。
 * Observer パターンを使用して、状態変更時に自動的にリスナーに通知します。
 */

import { ErrorHandler } from './ErrorHandler.js';
import { logger } from './Logger.js';

export class GameStateManager {
    constructor() {
        // 全ての状態を一箇所に集約
        this.state = {
            // ゲームプレイ状態
            game: {
                isRunning: false,
                score: 0,
                level: 1,
                lives: 3,
                bestScore: 0,
                startTime: 0,
            },

            // プレイヤー状態
            player: {
                invUntil: 0,
                hurtUntil: 0,
                ultGauge: 0,
                ultReady: false,
                ultActiveUntil: 0,
                autoShootUntil: 0,
                bulletBoostUntil: 0,
                scoreMulUntil: 0,
            },

            // ガチャ・コレクション状態
            gacha: {
                coins: 0,
                collection: {
                    current: 'parfen',
                    owned: {}
                },
                pity: {
                    sinceL: 0,
                    sinceM: 0
                }
            },

            // ミッション状態
            missions: {
                list: [],
                lastGeneratedDate: null
            },

            // フィーバー・コンボ状態
            fever: {
                gauge: 0,
                modeUntil: 0,
                comboCount: 0,
                comboMultiplier: 1,
                lastComboTime: 0
            },

            // UI状態
            ui: {
                currentStageKey: null,
                stageName: ''
            }
        };

        // 状態変更リスナー
        this.listeners = [];

        // 永続化キー
        this.STORAGE_KEYS = {
            BEST_SCORE: 'psrun_best_score_v1',
            COINS: 'psrun_coin_balance_v1',
            COLLECTION: 'psrun_char_collection_v1',
            PITY: 'psrun_pity_v1',
            MISSIONS: 'psrun_missions_v1'
        };

        // 初期化時にストレージから状態を復元
        this.loadPersistedState();
    }

    /**
     * 永続化された状態をストレージから読み込む
     */
    loadPersistedState() {
        // ベストスコアの読み込み
        const bestScore = ErrorHandler.safely(() => {
            const raw = localStorage.getItem(this.STORAGE_KEYS.BEST_SCORE);
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value)) {
                    return Math.max(0, Math.floor(value));
                }
            }
            return null;
        }, 'GameStateManager.loadPersistedState.bestScore', null);

        if (bestScore !== null) {
            this.state.game.bestScore = bestScore;
            logger.info('Best score loaded', { score: bestScore });
        }

        // コインの読み込み
        const coins = ErrorHandler.safely(() => {
            const raw = localStorage.getItem(this.STORAGE_KEYS.COINS);
            if (raw != null) {
                const value = Number(raw);
                if (Number.isFinite(value)) {
                    return Math.max(0, Math.floor(value));
                }
            }
            return null;
        }, 'GameStateManager.loadPersistedState.coins', null);

        if (coins !== null) {
            this.state.gacha.coins = coins;
            logger.debug('Coins loaded', { coins });
        }

        // コレクションの読み込み
        const collection = ErrorHandler.safely(() => {
            const s = localStorage.getItem(this.STORAGE_KEYS.COLLECTION);
            if (s) {
                return JSON.parse(s);
            }
            return null;
        }, 'GameStateManager.loadPersistedState.collection', null);

        if (collection !== null) {
            this.state.gacha.collection = collection;
            logger.info('Collection loaded', {
                ownedCount: Object.keys(collection.owned || {}).length,
                current: collection.current
            });
        } else {
            // デフォルトキャラクター設定
            this.state.gacha.collection = {
                current: 'parfen',
                owned: { parfen: { owned: true, dup: 0, limit: 0 } }
            };
            logger.info('No saved collection found, starting with parfen');
        }

        // Pityの読み込み
        const pity = ErrorHandler.safely(() => {
            const s = localStorage.getItem(this.STORAGE_KEYS.PITY);
            if (s) {
                return JSON.parse(s);
            }
            return null;
        }, 'GameStateManager.loadPersistedState.pity', null);

        if (pity !== null) {
            this.state.gacha.pity = pity;
            logger.debug('Pity loaded', pity);
        }

        // ミッションの読み込み
        const missions = ErrorHandler.safely(() => {
            const data = localStorage.getItem(this.STORAGE_KEYS.MISSIONS);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        }, 'GameStateManager.loadPersistedState.missions', null);

        if (missions) {
            this.state.missions.list = missions.missions || [];
            this.state.missions.lastGeneratedDate = missions.lastGeneratedDate;
            logger.info('Missions loaded', {
                missionCount: this.state.missions.list.length,
                lastGenerated: this.state.missions.lastGeneratedDate
            });
        }
    }

    /**
     * 状態全体を取得
     */
    getState() {
        return this.state;
    }

    /**
     * 特定のパスの状態を取得
     * @param {string} path - ドット記法のパス (例: 'game.score', 'gacha.coins')
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                logger.warn('State path not found', { path });
                return undefined;
            }
        }

        return value;
    }

    /**
     * 状態を更新し、リスナーに通知
     * @param {string} path - ドット記法のパス
     * @param {*} value - 新しい値
     * @param {boolean} persist - localStorageに永続化するか
     */
    set(path, value, persist = false) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        // パスをたどって対象オブジェクトを取得
        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }

        // 値を更新
        const oldValue = target[lastKey];
        target[lastKey] = value;

        logger.debug('State updated', { path, oldValue, newValue: value });

        // 永続化が必要な場合
        if (persist) {
            this.persistState(path);
        }

        // リスナーに通知
        this.notifyListeners(path, value, oldValue);
    }

    /**
     * 複数の状態を一度に更新
     * @param {Object} updates - { path: value } の形式のオブジェクト
     */
    batchUpdate(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value, false);
        });

        // バッチ更新後に一度だけ通知
        this.notifyListeners('*', this.state, null);
    }

    /**
     * 状態をlocalStorageに永続化
     * @param {string} path - 永続化する状態のパス
     */
    persistState(path) {
        ErrorHandler.safely(() => {
            if (path.startsWith('game.bestScore')) {
                localStorage.setItem(this.STORAGE_KEYS.BEST_SCORE, `${this.state.game.bestScore}`);
                logger.debug('Best score persisted', { score: this.state.game.bestScore });
            } else if (path.startsWith('gacha.coins')) {
                localStorage.setItem(this.STORAGE_KEYS.COINS, `${this.state.gacha.coins}`);
                logger.debug('Coins persisted', { coins: this.state.gacha.coins });
            } else if (path.startsWith('gacha.collection')) {
                localStorage.setItem(this.STORAGE_KEYS.COLLECTION, JSON.stringify(this.state.gacha.collection));
                logger.debug('Collection persisted');
            } else if (path.startsWith('gacha.pity')) {
                localStorage.setItem(this.STORAGE_KEYS.PITY, JSON.stringify(this.state.gacha.pity));
                logger.debug('Pity persisted');
            } else if (path.startsWith('missions')) {
                const data = {
                    missions: this.state.missions.list,
                    lastGeneratedDate: this.state.missions.lastGeneratedDate
                };
                localStorage.setItem(this.STORAGE_KEYS.MISSIONS, JSON.stringify(data));
                logger.debug('Missions persisted', { count: this.state.missions.list.length });
            }
        }, `GameStateManager.persistState(${path})`);
    }

    /**
     * 状態変更リスナーを登録
     * @param {Function} listener - コールバック関数 (path, newValue, oldValue) => void
     */
    subscribe(listener) {
        this.listeners.push(listener);

        // 登録解除用の関数を返す
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * リスナーに状態変更を通知
     * @param {string} path - 変更されたパス
     * @param {*} newValue - 新しい値
     * @param {*} oldValue - 古い値
     */
    notifyListeners(path, newValue, oldValue) {
        this.listeners.forEach(listener => {
            try {
                listener(path, newValue, oldValue);
            } catch (error) {
                logger.error('Listener error', { path, error: error.message });
            }
        });
    }

    /**
     * ゲーム状態をリセット
     */
    resetGameState() {
        this.state.game = {
            isRunning: false,
            score: 0,
            level: 1,
            lives: 3,
            bestScore: this.state.game.bestScore, // ベストスコアは保持
            startTime: 0,
        };

        this.state.player = {
            invUntil: 0,
            hurtUntil: 0,
            ultGauge: 0,
            ultReady: false,
            ultActiveUntil: 0,
            autoShootUntil: 0,
            bulletBoostUntil: 0,
            scoreMulUntil: 0,
        };

        this.state.fever = {
            gauge: 0,
            modeUntil: 0,
            comboCount: 0,
            comboMultiplier: 1,
            lastComboTime: 0
        };

        logger.info('Game state reset');
        this.notifyListeners('*', this.state, null);
    }
}
