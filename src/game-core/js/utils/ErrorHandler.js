/**
 * ErrorHandler - 統一的なエラーハンドリングユーティリティ
 * 
 * アプリケーション全体で一貫したエラー処理を提供し、
 * エラーのロギング、ユーザー通知、リカバリー処理を行います。
 */

import { logger } from './Logger.js';

export class ErrorHandler {
    /**
     * LocalStorage関連のエラーをハンドリング
     * @param {Error} error - 発生したエラー
     * @param {string} context - エラーが発生したコンテキスト(クラス名やメソッド名)
     * @param {*} fallbackValue - エラー時に返すフォールバック値
     * @returns {*} フォールバック値
     */
    static handleStorageError(error, context, fallbackValue = null) {
        logger.error('Storage Error', {
            context,
            error: error.message,
            stack: error.stack
        });

        // LocalStorageが無効な場合の警告(プライベートブラウジングなど)
        if (error.name === 'QuotaExceededError') {
            logger.warn('LocalStorage quota exceeded', { context });
            this.notifyUser('ストレージ容量が不足しています。一部のデータが保存されない可能性があります。');
        } else if (error.name === 'SecurityError') {
            logger.warn('LocalStorage access denied', { context });
        }

        return fallbackValue;
    }

    /**
     * ゲームロジック関連のエラーをハンドリング
     * @param {Error} error - 発生したエラー
     * @param {string} context - エラーが発生したコンテキスト
     * @param {Function} recoveryFn - リカバリー処理(オプション)
     */
    static handleGameError(error, context, recoveryFn = null) {
        logger.error('Game Error', {
            context,
            error: error.message,
            stack: error.stack
        });

        // リカバリー処理があれば実行
        if (recoveryFn && typeof recoveryFn === 'function') {
            try {
                logger.info('Attempting error recovery', { context });
                recoveryFn();
            } catch (recoveryError) {
                logger.error('Recovery failed', {
                    context,
                    error: recoveryError.message
                });
            }
        }

        // クリティカルなエラーの場合はユーザーに通知
        if (this.isCriticalError(error)) {
            this.notifyUser('予期しないエラーが発生しました。ページを再読み込みしてください。');
        }
    }

    /**
     * API呼び出しのエラーをハンドリング
     * @param {Error} error - 発生したエラー
     * @param {string} endpoint - APIエンドポイント
     * @param {*} fallbackValue - エラー時に返すフォールバック値
     * @returns {*} フォールバック値
     */
    static handleAPIError(error, endpoint, fallbackValue = null) {
        logger.error('API Error', {
            endpoint,
            error: error.message,
            stack: error.stack
        });

        // ネットワークエラーの判定
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            logger.warn('Network error detected', { endpoint });
            this.notifyUser('ネットワークエラーが発生しました。接続を確認してください。');
        }

        return fallbackValue;
    }

    /**
     * クリティカルなエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} クリティカルなエラーならtrue
     */
    static isCriticalError(error) {
        const criticalErrors = [
            'ReferenceError',
            'TypeError',
            'RangeError'
        ];
        return criticalErrors.includes(error.name);
    }

    /**
     * ユーザーに通知を表示
     * @param {string} message - 通知メッセージ
     */
    static notifyUser(message) {
        // 将来的にはトーストUIなどを使用する可能性があるため、
        // 現時点ではコンソールに出力し、将来の拡張に備える
        logger.info('User notification', { message });

        // TODO: UI通知システムと統合
        // 現在はコンソールログのみ
    }

    /**
     * 安全な関数実行ラッパー
     * @param {Function} fn - 実行する関数
     * @param {string} context - コンテキスト
     * @param {*} fallbackValue - エラー時のフォールバック値
     * @returns {*} 関数の戻り値またはフォールバック値
     */
    static safely(fn, context, fallbackValue = null) {
        try {
            return fn();
        } catch (error) {
            this.handleGameError(error, context);
            return fallbackValue;
        }
    }
}
