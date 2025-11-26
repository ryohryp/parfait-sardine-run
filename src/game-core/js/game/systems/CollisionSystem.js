/**
 * CollisionSystem - 衝突判定の専門クラス
 * 
 * Game.jsから衝突判定ロジックを分離し、
 * 各種衝突判定を管理します。
 */

import { playSfx } from '../../audio.js';
import { characters } from '../../game-data/characters.js';
import { POWER_DURATION } from '../../game-constants.js';
import { logger } from '../../utils/Logger.js';

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
                const scoreState = game.scoreSystem.getState();
                const isFever = scoreState.isFever;
                const mul = (now() < game.scoreMulUntil || isFever) ? 2 : 1;
                const gained = it.score * mul * scoreState.comboMultiplier;
                game.score += gained;

                // コイン報酬
                const coinReward = Math.floor(0.5 * mul);
                if (coinReward > 0) game.gacha.addCoins(coinReward);
                game.handleMissionUpdate('collect_coin', 1 * mul);

                // 空中でのコンボ
                if (game.player.y < game.canvas.height - 72 - game.player.h) {
                    game.scoreSystem.comboCount++;
                    game.scoreSystem.updateComboMultiplier();
                    game.scoreSystem.lastComboTime = now();
                }

                game.particles.createSparkle(it.x + it.w / 2, it.y + it.h / 2, '#ffd700');

                // フィーバーゲージ
                if (!isFever) {
                    game.scoreSystem.addFeverGauge(2);
                }

                // 必殺技ゲージ
                const stats = game.getEffectiveStats(game.gacha.collection.current);
                game.ult = clamp(game.ult + (it.char === '🍨' ? 10 : 6) * stats.ultRate, 0, 100);

                // Collection Unlock
                if (it.char === '🍨') game.collection.unlockItem('parfait');
                else if (it.char === '🐟') game.collection.unlockItem('sardine');

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
                game.collection.unlockItem('star');
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
            // Bomber Explosion Logic
            if (en.type === 'bomber' && en.explode) {
                game.particles.createExplosion(en.x + en.w / 2, en.y + en.h / 2, '#ff4500', 60); // Big explosion
                playSfx('hit'); // Use hit sound for explosion for now

                // Check distance to player for explosion damage
                const dx = (game.player.x + game.player.w / 2) - (en.x + en.w / 2);
                const dy = (game.player.y + game.player.h / 2) - (en.y + en.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (en.explosionRadius || 80)) {
                    if (now() > game.invUntil && now() > game.feverModeUntil && now() > game.hurtUntil) {
                        const skillBonuses = game.gacha.progression.calculateSkillBonuses(game.gacha.collection.current);
                        const baseDamage = 30; // Explosion deals more damage
                        const finalDamage = Math.floor(baseDamage * (1 - skillBonuses.damageReduction));
                        game.hp = Math.max(0, game.hp - finalDamage);
                        game.hurtUntil = now() + 900;
                        logger.debug('Player hit by bomber explosion', { hp: game.hp });

                        if (game.hp <= 0) {
                            if (skillBonuses.hasAutoRevive && !game.hasUsedAutoRevive) {
                                game.hp = Math.floor(game.maxHp * 0.5);
                                game.hasUsedAutoRevive = true;
                                game.invUntil = now() + 3000;
                                game.particles.createExplosion(game.player.x, game.player.y, '#00ff00');
                            } else {
                                game.endGame();
                            }
                        }
                    }
                }
                return false; // Remove bomber after explosion
            }

            if (this.AABB(game.player, en)) {
                // Obstacle Platform Logic
                if (en.type === 'obstacle') {
                    const playerBottom = game.player.y + game.player.h;
                    const enemyTop = en.y;
                    const overlapY = playerBottom - enemyTop;

                    // If falling and hitting the top part
                    if (game.player.vy >= 0 && overlapY <= 30) {
                        game.player.y = en.y - game.player.h;
                        game.player.vy = 0;
                        game.player.onGround = true;
                        const hasDouble = characters[game.gacha.collection.current]?.special?.includes('doubleJump');
                        game.player.canDouble = hasDouble;
                        return true; // Safe landing
                    }
                }

                // Offensive Invincibility (Star, Fever, Revive)
                if (now() < game.invUntil || now() < game.feverModeUntil) {
                    game.awardEnemyDefeat(en);
                    game.collection.unlockEnemy(en.type);
                    // Splitter logic
                    if (en.type === 'splitter' && en.canSplit) {
                        for (let i = 0; i < 2; i++) {
                            game.enemies.spawnEnemy(game.level, 0);
                            const newEn = game.enemies.enemies[game.enemies.enemies.length - 1];
                            newEn.x = en.x;
                            newEn.y = en.y + (i === 0 ? -30 : 30);
                            newEn.type = 'straight'; // Split into straight enemies
                            newEn.vx = en.vx * 1.2;
                            newEn.w = 24;
                            newEn.h = 24;
                        }
                    }
                    return false;
                }

                // Defensive Invincibility (Dash, Guard) - Pass through
                if (game.player.isDashing || game.player.isGuarding) {
                    return true;
                }

                if (now() > game.hurtUntil) {
                    // Calculate damage with reduction
                    const skillBonuses = game.gacha.progression.calculateSkillBonuses(game.gacha.collection.current);
                    const baseDamage = 20; // Base damage per hit
                    const finalDamage = Math.floor(baseDamage * (1 - skillBonuses.damageReduction));

                    game.hp = Math.max(0, game.hp - finalDamage);
                    game.hurtUntil = now() + 900;
                    playSfx('hit');
                    game.particles.createExplosion(
                        game.player.x + game.player.w / 2,
                        game.player.y + game.player.h / 2,
                        '#ff0000'
                    );
                    logger.debug('Player hit by enemy', { hp: game.hp, damage: finalDamage });

                    if (game.hp <= 0) {
                        // Check for auto-revive
                        if (skillBonuses.hasAutoRevive && !game.hasUsedAutoRevive) {
                            game.hp = Math.floor(game.maxHp * 0.5); // Revive with 50% HP
                            game.hasUsedAutoRevive = true;
                            game.invUntil = now() + 3000; // 3 seconds invincibility
                            game.particles.createExplosion(
                                game.player.x + game.player.w / 2,
                                game.player.y + game.player.h / 2,
                                '#00ff00'
                            );
                            logger.info('Auto-revive activated!');
                        } else {
                            game.endGame();
                            return false;
                        }
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
                        game.collection.unlockEnemy(en.type);
                        return false;
                    }
                } else if (type === 'ncha') {
                    const beamX = game.player.x + game.player.w - 6;
                    const beamTop = game.player.y - 36;
                    const beamBottom = game.player.y + game.player.h + 36;
                    if ((en.x + en.w) >= beamX && en.x <= game.canvas.width &&
                        en.y <= beamBottom && (en.y + en.h) >= beamTop) {
                        game.awardEnemyDefeat(en);
                        game.collection.unlockEnemy(en.type);
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
                        game.collection.unlockEnemy(en.type);
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
            } else if (game.player.isDashing || game.player.isGuarding) {
                // No damage to boss, no damage to player
            } else if (now() > game.hurtUntil) {
                // Calculate damage with reduction
                const skillBonuses = game.gacha.progression.calculateSkillBonuses(game.gacha.collection.current);
                // Scale damage with level: Base 20 + 2 per level
                const baseDamage = 20 + (game.level - 1) * 2;
                const finalDamage = Math.floor(baseDamage * (1 - skillBonuses.damageReduction));

                game.hp = Math.max(0, game.hp - finalDamage);
                game.hurtUntil = now() + 900;
                playSfx('hit');
                game.particles.createExplosion(
                    game.player.x + game.player.w / 2,
                    game.player.y + game.player.h / 2,
                    '#ff0000'
                );

                if (game.hp <= 0) {
                    // Check for auto-revive
                    if (skillBonuses.hasAutoRevive && !game.hasUsedAutoRevive) {
                        game.hp = Math.floor(game.maxHp * 0.5);
                        game.hasUsedAutoRevive = true;
                        game.invUntil = now() + 3000;
                        game.particles.createExplosion(
                            game.player.x + game.player.w / 2,
                            game.player.y + game.player.h / 2,
                            '#00ff00'
                        );
                        logger.info('Auto-revive activated!');
                    } else {
                        game.endGame();
                    }
                }
            }
        }

        // 必殺技とボスの衝突
        if (now() < game.ultActiveUntil) {
            // 必殺技のヒット間隔制限 (0.2秒に1回)
            if (!this.lastUltHitTime || now() - this.lastUltHitTime > 200) {
                const type = characters[game.gacha.collection.current].ult;
                let hit = false;

                if (type === 'storm') {
                    const cx = game.player.x + game.player.w / 2;
                    const cy = game.player.y + game.player.h / 2;
                    const bx = boss.x + boss.w / 2;
                    const by = boss.y + boss.h / 2;
                    if (Math.hypot(cx - bx, cy - by) <= 120) {
                        hit = true;
                    }
                } else if (type === 'ncha') {
                    const beamX = game.player.x + game.player.w - 6;
                    const beamTop = game.player.y - 36;
                    const beamBottom = game.player.y + game.player.h + 36;
                    // Check overlap with boss
                    if ((boss.x + boss.w) >= beamX && boss.x <= game.canvas.width &&
                        boss.y <= beamBottom && (boss.y + boss.h) >= beamTop) {
                        hit = true;
                    }
                } else {
                    // Rainbow (default)
                    const lanes = [
                        game.player.y + game.player.h / 2,
                        game.player.y + game.player.h / 2 - 36,
                        game.player.y + game.player.h / 2 + 36
                    ];
                    if (lanes.some(y => boss.y - 6 <= y && y <= boss.y + boss.h + 6)) {
                        hit = true;
                    }
                }

                if (hit) {
                    game.damageBoss(1); // ダメージを0.5 -> 1に少し上げるが、ヒット数を制限
                    this.lastUltHitTime = now();
                    // エフェクト
                    game.particles.createSparkle(
                        boss.x + boss.w / 2 + (Math.random() - 0.5) * 40,
                        boss.y + boss.h / 2 + (Math.random() - 0.5) * 40,
                        '#ffff00'
                    );
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
                if (now() < game.invUntil || now() < game.feverModeUntil || game.player.isDashing || game.player.isGuarding) {
                    // 無敵時は弾を消すだけ
                    game.particles.createExplosion(shot.x + shot.w / 2, shot.y + shot.h / 2, '#aaaaaa');
                    return false;
                }
                if (now() > game.hurtUntil) {
                    // Calculate damage with reduction
                    const skillBonuses = game.gacha.progression.calculateSkillBonuses(game.gacha.collection.current);
                    // Scale damage with level: Base 20 + 2 per level
                    const baseDamage = 20 + (game.level - 1) * 2;
                    const finalDamage = Math.floor(baseDamage * (1 - skillBonuses.damageReduction));

                    game.hp = Math.max(0, game.hp - finalDamage);
                    game.hurtUntil = now() + 900;
                    playSfx('hit');
                    game.particles.createExplosion(
                        game.player.x + game.player.w / 2,
                        game.player.y + game.player.h / 2,
                        '#ff0000'
                    );

                    if (game.hp <= 0) {
                        // Check for auto-revive
                        if (skillBonuses.hasAutoRevive && !game.hasUsedAutoRevive) {
                            game.hp = Math.floor(game.maxHp * 0.5);
                            game.hasUsedAutoRevive = true;
                            game.invUntil = now() + 3000;
                            game.particles.createExplosion(
                                game.player.x + game.player.w / 2,
                                game.player.y + game.player.h / 2,
                                '#00ff00'
                            );
                            logger.info('Auto-revive activated!');
                        } else {
                            game.endGame();
                        }
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
