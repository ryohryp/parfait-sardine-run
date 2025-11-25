/**
 * GameRenderer - 描画ロジックの専門クラス
 * 
 * Game.jsから描画ロジックを分離し、
 * 背景、エンティティ、エフェクトの描画を管理します。
 */

import { stageForLevel } from '../../game-data/stages.js';
import { characters } from '../../game-data/characters.js';

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
     * ステージクリアエフェクトの描画
     */
    drawStageClear(stageClearUntil) {
        if (now() >= stageClearUntil) return;

        this.ctx.save();
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // "STAGE CLEAR" text
        const fadeProgress = 1 - (stageClearUntil - now()) / 4000;
        const scale = 0.8 + Math.sin(now() * 0.005) * 0.1;

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;

        // Main text
        this.ctx.font = `bold ${48 * scale}px sans-serif`;
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 150,
            this.canvas.height / 2,
            this.canvas.width / 2 + 150,
            this.canvas.height / 2
        );
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.5, '#ffed4e');
        gradient.addColorStop(1, '#ffd700');
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 4;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 - 40;

        this.ctx.strokeText('STAGE CLEAR!', centerX, centerY);
        this.ctx.fillText('STAGE CLEAR!', centerX, centerY);

        // Subtitle
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText('Time & HP Restored!', centerX, centerY + 60);

        this.ctx.restore();
    }

    /**
     * コンボテキストの描画
     */
    drawComboText(comboCount, comboMultiplier, lastComboTime) {
        // Show combo if count > 0 and recently active (within 2 seconds)
        const timeSinceHit = now() - lastComboTime;
        const comboDuration = 2000;
        const comboActive = comboCount > 0 && (timeSinceHit < comboDuration);

        if (!comboActive) return;

        this.ctx.save();

        // Dynamic styling based on multiplier
        let color = '#ffffff';
        let scale = 1.0;

        if (comboMultiplier >= 5.0) color = '#d946ef'; // Fuchsia
        else if (comboMultiplier >= 3.0) color = '#ef4444'; // Red
        else if (comboMultiplier >= 2.0) color = '#f97316'; // Orange
        else if (comboMultiplier >= 1.5) color = '#eab308'; // Yellow

        // Pop animation on hit
        if (timeSinceHit < 200) {
            scale = 1.0 + 0.5 * (1 - timeSinceHit / 200);
        }

        // Shake effect on hit
        let shakeX = 0;
        let shakeY = 0;
        if (timeSinceHit < 100) {
            shakeX = (Math.random() - 0.5) * 10;
            shakeY = (Math.random() - 0.5) * 10;
        }

        const x = this.canvas.width - 20 + shakeX;
        const y = 80 + shakeY;

        this.ctx.textAlign = 'right';

        // Draw Combo Count
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.font = 'bold italic 40px "Arial Black", sans-serif';

        const comboText = `${comboCount} COMBO!`;
        this.ctx.strokeText(comboText, 0, 0);
        this.ctx.fillText(comboText, 0, 0);

        // Draw Multiplier
        if (comboMultiplier > 1) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 24px sans-serif';
            const mulText = `x${comboMultiplier.toFixed(1)}`;
            this.ctx.strokeText(mulText, 0, 35);
            this.ctx.fillText(mulText, 0, 35);
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

        // Draw Combo Timer Bar
        const barWidth = 200;
        const barHeight = 6;
        const progress = 1 - (timeSinceHit / comboDuration);
        const barX = this.canvas.width - 20 - barWidth;
        const barY = 130;

        // Bar background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Bar fill
        this.ctx.fillStyle = color;
        this.ctx.fillRect(barX + barWidth * (1 - progress), barY, barWidth * progress, barHeight);

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

        // Draw stage clear effect
        if (gameState.stageClearUntil && now() < gameState.stageClearUntil) {
            this.drawStageClear(gameState.stageClearUntil);
        }
    }
}
