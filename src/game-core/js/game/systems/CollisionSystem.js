/**
 * CollisionSystem - 衝突判定の専門クラス
 * 
 * Game.jsから衝突判定ロジックを分離し、
 * 各種衝突判定を管理します。
 */

import { playSfx } from '../audio.js';
import { characters } from '../game-data/characters.js';
import { POWER_DURATION } from '../game-constants.js';
import { logger } from '../utils/Logger.js';

function now() { return performance.now(); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class CollisionSystem {
    constructor(game) {
        this.game = game; // ゲーム本体への参照
    }

    /**
     * AABB (Axis-Aligned Bounding Box) 衝突判定
     */
    AABB(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    /**
     * プレイヤーとアイテムの衝突判定
     */
    checkPlayerItemCollisions() {
        const game = this.game;

        game.items.items = game.items.items.filter(it => {
            if (this.AABB(game.player, it)) {
                const isFever = now() < game.feverModeUntil;
                const mul = (now() < game.scoreMulUntil || isFever) ? 2 : 1;
                const gained = it.score * mul * game.comboMultiplier;
                game.score += gained;

                // コイン報酬
                const coinReward = Math.floor(0.5 * mul);
                if (coinReward > 0) game.gacha.addCoins(coinReward);
                game.handleMissionUpdate('collect_coin', 1 * mul);

                // 空中でのコンボ
                if (game.player.y < game.canvas.height - 72 - game.player.h) {
                    game.comboCount++;
                    game.updateComboMultiplier();
                    game.lastComboTime = now();
                }

                game.particles.createSparkle(it.x + it.w / 2, it.y + it.h / 2, '#ffd700');

                // フィーバーゲージ
                if (!isFever) {
                    game.feverGauge = Math.min(100, game.feverGauge + 2);
                    if (game.feverGauge >= 100) {
                        game.activateFever();
                    }
                }

                // 必殺技ゲージ
                const stats = game.getEffectiveStats(game.gacha.collection.current);
                game.ult = clamp(game.ult + (it.char === '🍨' ? 10 : 6) * stats.ultRate, 0, 100);
                return false;
            }
            return true;
        });
    }

    /**
     * プレイヤーとパワーアップアイテムの衝突判定
     */
    checkPlayerPowerCollisions() {
        const game = this.game;

        game.items.powers = game.items.powers.filter(pw => {
            if (this.AABB(game.player, pw)) {
                const stats = game.getEffectiveStats(game.gacha.collection.current);
                game.invUntil = now() + Math.max(POWER_DURATION, stats.inv);
                game.ult = Math.min(100, game.ult + 12 * stats.ultRate);
                game.particles.createExplosion(pw.x + pw.w / 2, pw.y + pw.h / 2, '#ffffff');
                return false;
            }
            return true;
        });
    }

    /**
     * プレイヤーと敵の衝突判定
     */
    checkPlayerEnemyCollisions() {
        const game = this.game;

        game.enemies.enemies = game.enemies.enemies.filter(en => {
            if (this.AABB(game.player, en)) {
                if (now() < game.invUntil || now() < game.feverModeUntil) {
                    game.awardEnemyDefeat(en);
                    return false;
                }
                if (now() > game.hurtUntil) {
                    game.lives = Math.max(0, game.lives - 1);
                    game.hurtUntil = now() + 900;
                    playSfx('hit');
                    game.particles.createExplosion(
                        game.player.x + game.player.w / 2,
                        game.player.y + game.player.h / 2,
                        '#ff0000'
                    );
                    logger.debug('Player hit by enemy', { lives: game.lives });
                    if (game.lives === 0) {
                        game.endGame();
                        return false;
                    }
                }
            }

            // 必殺技と敵の衝突
            if (now() < game.ultActiveUntil) {
                const type = characters[game.gacha.collection.current].ult;
                if (type === 'storm') {
                    const cx = game.player.x + game.player.w / 2;
                    const cy = game.player.y + game.player.h / 2;
                    const ex = en.x + en.w / 2;
                    const ey = en.y + en.h / 2;
                    if (Math.hypot(cx - ex, cy - ey) <= 120) {
                        game.awardEnemyDefeat(en);
                        return false;
                    }
                } else if (type === 'ncha') {
                    const beamX = game.player.x + game.player.w - 6;
                    const beamTop = game.player.y - 36;
                    const beamBottom = game.player.y + game.player.h + 36;
                    if ((en.x + en.w) >= beamX && en.x <= game.canvas.width &&
                        en.y <= beamBottom && (en.y + en.h) >= beamTop) {
                        game.awardEnemyDefeat(en);
                        return false;
                    }
                } else {
                    // Rainbow
                    const lanes = [
                        game.player.y + game.player.h / 2,
                        game.player.y + game.player.h / 2 - 36,
                        game.player.y + game.player.h / 2 + 36
                    ];
                    if (lanes.some(y => en.y - 6 <= y && y <= en.y + en.h + 6)) {
                        game.awardEnemyDefeat(en);
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * ボスとの衝突判定
     */
    checkBossCollisions() {
        const game = this.game;

        if (!game.enemies.bossState || game.enemies.bossState.state === 'defeated') {
            return;
        }

        const boss = game.enemies.bossState;

        // プレイヤーとボス本体の衝突
        if (this.AABB(game.player, boss)) {
            if (now() < game.invUntil || now() < game.feverModeUntil) {
                game.damageBoss(2);
            } else if (now() > game.hurtUntil) {
                game.lives = Math.max(0, game.lives - 1);
                game.hurtUntil = now() + 900;
                playSfx('hit');
                game.particles.createExplosion(
                    game.player.x + game.player.w / 2,
                    game.player.y + game.player.h / 2,
                    '#ff0000'
                );
                if (game.lives === 0) game.endGame();
            }
        }

        // 必殺技とボスの衝突
        if (now() < game.ultActiveUntil) {
            const type = characters[game.gacha.collection.current].ult;
            if (type === 'storm') {
                const cx = game.player.x + game.player.w / 2;
                const cy = game.player.y + game.player.h / 2;
                const bx = boss.x + boss.w / 2;
                const by = boss.y + boss.h / 2;
                if (Math.hypot(cx - bx, cy - by) <= 120) {
                    game.damageBoss(0.5);
                }
            }
        }
    }

    /**
     * ボスの弾とプレイヤーの衝突判定
     */
    checkBossProjectileCollisions() {
        const game = this.game;

        if (!game.enemies.bossProjectiles || game.enemies.bossProjectiles.length === 0) {
            return;
        }

        game.enemies.bossProjectiles = game.enemies.bossProjectiles.filter(shot => {
            if (this.AABB(game.player, shot)) {
                if (now() < game.invUntil || now() < game.feverModeUntil) {
                    // 無敵時は弾を消すだけ
                    game.particles.createExplosion(shot.x + shot.w / 2, shot.y + shot.h / 2, '#aaaaaa');
                    return false;
                }
                if (now() > game.hurtUntil) {
                    game.lives = Math.max(0, game.lives - 1);
                    game.hurtUntil = now() + 900;
                    playSfx('hit');
                    game.particles.createExplosion(
                        game.player.x + game.player.w / 2,
                        game.player.y + game.player.h / 2,
                        '#ff0000'
                    );
                    if (game.lives === 0) {
                        game.endGame();
                    }
                }
                return false;
            }
            return true;
        });
    }

    /**
     * 全ての衝突判定を実行
     */
    checkAll() {
        this.checkPlayerItemCollisions();
        this.checkPlayerPowerCollisions();
        this.checkPlayerEnemyCollisions();
        this.checkBossCollisions();
        this.checkBossProjectileCollisions();
    }
}
