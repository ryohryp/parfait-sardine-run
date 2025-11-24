/**
 * GameRenderer - 描画ロジックの専門クラス
 * 
 * Game.jsから描画ロジックを分離し、
 * 背景、エンティティ、エフェクトの描画を管理します。
 */

import { stageForLevel } from '../game-data/stages.js';
import { characters } from '../game-data/characters.js';

function now() { return performance.now(); }

export class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 背景レイヤー
        this.bgLayers = [
            { src: './assets/bg/bg_layer_1_sky.png', speed: 0.2, img: new Image(), alpha: 1.0 },
            { src: './assets/bg/bg_layer_2_mountains.png', speed: 0.5, img: new Image(), alpha: 1.0 }
        ];
        this.bgLayers.forEach(l => l.img.src = l.src);
    }

    /**
     * 背景の描画
     */
    drawBackground(level) {
        const st = stageForLevel(level);

        // Parallax BG
        this.bgLayers.forEach(layer => {
            if (layer.img.complete) {
                const scale = this.canvas.height / layer.img.height;
                const w = layer.img.width * scale;
                const h = this.canvas.height;
                const x = -(now() * 0.1 * layer.speed) % w;

                this.ctx.save();
                this.ctx.globalAlpha = layer.alpha || 1.0;
                this.ctx.drawImage(layer.img, x, 0, w, h);
                this.ctx.drawImage(layer.img, x + w, 0, w, h);
                if (x + w < this.canvas.width) {
                    this.ctx.drawImage(layer.img, x + w * 2, 0, w, h);
                }
                this.ctx.restore();
            }
        });

        // Fallback gradient if bg not loaded
        if (!this.bgLayers[0].img.complete) {
            const g = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            g.addColorStop(0, '#0f172a');
            g.addColorStop(1, '#334155');
            this.ctx.fillStyle = g;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Ground
        this.ctx.fillStyle = st.ground;
        this.ctx.fillRect(0, this.canvas.height - 72, this.canvas.width, 72);
    }

    /**
     * エンティティの描画
     */
    drawEntities(player, enemies, items, projectiles, companion, particles, invUntil, hurtUntil) {
        const time = now();
        player.draw(this.ctx, time, invUntil, hurtUntil);
        enemies.draw(this.ctx);
        items.draw(this.ctx);
        projectiles.draw(this.ctx);
        companion.draw(this.ctx);
        particles.draw(this.ctx);
    }

    /**
     * フィーバーエフェクトの描画
     */
    drawFeverEffect(feverModeUntil) {
        if (now() < feverModeUntil) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = `hsla(${(now() * 0.1) % 360}, 70%, 50%, 0.2)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Rainbow border
            this.ctx.strokeStyle = `hsl(${(now() * 0.2) % 360}, 80%, 60%)`;
            this.ctx.lineWidth = 8;
            this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }

    /**
     * 必殺技エフェクトの描画
     */
    drawUltEffect(ultType, player, ultActiveUntil) {
        if (now() >= ultActiveUntil) return;

        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;

        this.ctx.save();
        if (ultType === 'storm') {
            // Draw storm circle around player
            const fade = (ultActiveUntil - now()) / 1600;
            this.ctx.globalAlpha = 0.3 + Math.sin(now() * 0.01) * 0.2;
            this.ctx.strokeStyle = '#60a5fa';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 120, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.strokeStyle = '#93c5fd';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 100 + Math.sin(now() * 0.02) * 20, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (ultType === 'ncha') {
            // Draw beam
            this.ctx.globalAlpha = 0.6;
            const gradient = this.ctx.createLinearGradient(px, 0, this.canvas.width, 0);
            gradient.addColorStop(0, '#f59e0b');
            gradient.addColorStop(1, '#dc2626');
            this.ctx.fillStyle = gradient;
            const beamHeight = 72;
            this.ctx.fillRect(px, py - beamHeight / 2, this.canvas.width - px, beamHeight);
        } else {
            // Rainbow (default)
            this.ctx.globalAlpha = 0.5;
            const lanes = [py, py - 36, py + 36];
            const colors = ['#ef4444', '#f59e0b', '#10b981'];
            lanes.forEach((y, i) => {
                this.ctx.fillStyle = colors[i];
                this.ctx.fillRect(px, y - 3, this.canvas.width - px, 6);
            });
        }
        this.ctx.restore();
    }

    /**
     * コンボテキストの描画
     */
    drawComboText(comboCount, comboMultiplier, lastComboTime) {
        // Show combo if count > 0 and recently active (within 2 seconds)
        const comboActive = comboCount > 0 && (now() - lastComboTime < 2000);
        if (!comboActive) return;

        this.ctx.save();
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 32px sans-serif';
        this.ctx.textAlign = 'right';
        const comboText = `${comboCount} COMBO!`;
        this.ctx.strokeText(comboText, this.canvas.width - 20, 80);
        this.ctx.fillText(comboText, this.canvas.width - 20, 80);

        if (comboMultiplier > 1) {
            this.ctx.fillStyle = '#00e676';
            this.ctx.font = 'bold 24px sans-serif';
            const mulText = `x${comboMultiplier.toFixed(1)}`;
            this.ctx.strokeText(mulText, this.canvas.width - 20, 110);
            this.ctx.fillText(mulText, this.canvas.width - 20, 110);
        }
        this.ctx.restore();
    }

    /**
     * 全体の描画を実行
     */
    render(gameState) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.drawBackground(gameState.level);

        // Draw entities
        this.drawEntities(
            gameState.player,
            gameState.enemies,
            gameState.items,
            gameState.projectiles,
            gameState.companion,
            gameState.particles,
            gameState.invUntil,
            gameState.hurtUntil
        );

        // Draw fever effect
        this.drawFeverEffect(gameState.feverModeUntil);

        // Draw ult effect
        if (gameState.ultActiveUntil > now()) {
            const ultType = characters[gameState.currentCharKey]?.ult;
            this.drawUltEffect(ultType, gameState.player, gameState.ultActiveUntil);
        }

        // Draw combo text
        this.drawComboText(
            gameState.comboCount,
            gameState.comboMultiplier,
            gameState.lastComboTime
        );
    }
}
