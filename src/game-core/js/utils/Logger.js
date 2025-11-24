/**
 * Logger - 構造化されたロギングユーティリティ
 * 
 * 開発環境ではコンソールに詳細ログを出力し、
 * 本番環境ではエラーのみを記録します。
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor() {
        this.level = this.getLogLevel();
        this.logs = [];
        this.maxLogs = 100; // メモリ節約のため最大ログ数を制限
    }

    getLogLevel() {
        // 本番環境ではERRORのみ、開発環境ではすべて
        return import.meta.env.PROD ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;
    }

    log(level, message, context = {}) {
        if (level < this.level) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: Object.keys(LOG_LEVELS)[level],
            message,
            context
        };

        // メモリに保存
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift(); // 古いログを削除
        }

        // コンソールに出力
        const formattedMessage = `[${logEntry.level}] ${logEntry.timestamp} - ${message}`;

        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(formattedMessage, context);
                break;
            case LOG_LEVELS.INFO:
                console.info(formattedMessage, context);
                break;
            case LOG_LEVELS.WARN:
                console.warn(formattedMessage, context);
                break;
            case LOG_LEVELS.ERROR:
                console.error(formattedMessage, context);
                break;
        }
    }

    debug(message, context) {
        this.log(LOG_LEVELS.DEBUG, message, context);
    }

    info(message, context) {
        this.log(LOG_LEVELS.INFO, message, context);
    }

    warn(message, context) {
        this.log(LOG_LEVELS.WARN, message, context);
    }

    error(message, context) {
        this.log(LOG_LEVELS.ERROR, message, context);
    }

    /**
     * 最近のログを取得(デバッグ用)
     */
    getRecentLogs(count = 20) {
        return this.logs.slice(-count);
    }

    /**
     * すべてのログをクリア
     */
    clearLogs() {
        this.logs = [];
    }
}

// シングルトンインスタンスをエクスポート
export const logger = new Logger();
