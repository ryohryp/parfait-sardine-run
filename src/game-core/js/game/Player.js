
import { G, BASE_JUMP, GROUND, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_INITIAL_X } from '../game-constants.js';
import { characters } from '../game-data/characters.js';

const WALK_FRAMES = [0, 1, 2, 3];
const JUMP_FRAMES = [4, 5];
const FRAME_DURATION = 120;

export class Player {
    constructor(canvas, particleSystem) {
        this.canvas = canvas;
        this.particles = particleSystem;
        this.w = PLAYER_WIDTH;
        this.h = PLAYER_HEIGHT;
        this.x = PLAYER_INITIAL_X;
        this.y = this.canvas.height - GROUND - this.h;
        this.vy = 0;
        this.onGround = true;
        this.color = '#ff6347';

        this.canDouble = false;
        this.stats = null;
        this.charKey = 'parfen';

        // Animation
        this.sprite = {
            image: new Image(),
            loaded: false,
            frameWidth: 0,
            frameHeight: 0,
            path: 'assets/sprite/player_neon.png',
            cols: 1,
            rows: 1
        };

        this.anim = {
            walkFrames: WALK_FRAMES,
            jumpFrames: JUMP_FRAMES,
            sequence: WALK_FRAMES,
            index: 0,
            elapsed: 0,
            currentFrame: 0,
            frameDuration: FRAME_DURATION
        };

        this.isDashing = false;
        this.isGuarding = false;
        this.dashTimer = 0;
        this.guardTimer = 0;
        this.dashCooldown = 0;
        this.guardCooldown = 0;

        this.loadSprite();
    }

    loadSprite() {
        const baseUrl = import.meta.env.BASE_URL;
        // Ensure path is relative to base URL
        const src = this.sprite.path.startsWith('assets/')
            ? `${baseUrl}${this.sprite.path}`
            : this.sprite.path;

        this.sprite.image.src = src;
        this.sprite.image.onload = () => {
            this.sprite.loaded = true;
            this.sprite.frameWidth = Math.floor(this.sprite.image.naturalWidth / this.sprite.cols);
            this.sprite.frameHeight = Math.floor(this.sprite.image.naturalHeight / this.sprite.rows);
        };
    }

    setCharacter(key, stats) {
        this.charKey = key;
        this.stats = stats;

        // Try to load character-specific sprite
        const baseUrl = import.meta.env.BASE_URL;
        const charConfig = characters[key];
        // Use image from config if available, otherwise try default path
        const charSpritePath = (charConfig && charConfig.image)
            ? (charConfig.image.startsWith('assets/') ? `${baseUrl}${charConfig.image}` : charConfig.image)
            : `${baseUrl}assets/char-${key}.png`;

        const newImage = new Image();
        newImage.onerror = () => {
            // If character sprite doesn't exist, use emoji rendering
            this.sprite.loaded = false;
            this.sprite.useEmoji = true;
        };
        newImage.onload = () => {
            this.sprite.image = newImage;
            this.sprite.loaded = true;
            this.sprite.useEmoji = false;
            this.sprite.frameWidth = Math.floor(newImage.naturalWidth / this.sprite.cols);
            this.sprite.frameHeight = Math.floor(newImage.naturalHeight / this.sprite.rows);
        };
        newImage.src = charSpritePath;
    }

    reset() {
        this.x = PLAYER_INITIAL_X;
        this.y = this.canvas.height - GROUND - this.h;
        this.vy = 0;
        this.onGround = true;
        this.canDouble = characters[this.charKey]?.special?.includes('doubleJump');
        this.isDashing = false;
        this.isGuarding = false;
        this.dashTimer = 0;
        this.guardTimer = 0;
        this.dashCooldown = 0;
        this.guardCooldown = 0;
        this.resetAnimation();
    }

    resetAnimation() {
        this.anim.sequence = this.anim.walkFrames;
        this.anim.index = 0;
        this.anim.elapsed = 0;
        this.anim.currentFrame = this.anim.walkFrames[0];
    }

    update(delta) {
        // Cooldowns
        if (this.dashCooldown > 0) this.dashCooldown -= delta;
        if (this.guardCooldown > 0) this.guardCooldown -= delta;

        // Dash Logic
        if (this.isDashing) {
            this.dashTimer -= delta;

            // Dash Movement (Forward and Back)
            const dashDuration = 300;
            const progress = 1 - (this.dashTimer / dashDuration); // 0 to 1
            const dashDistance = 150;

            if (progress >= 0 && progress <= 1) {
                this.x = PLAYER_INITIAL_X + Math.sin(progress * Math.PI) * dashDistance;
            }

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.dashCooldown = 1000; // 1 second cooldown
                this.x = PLAYER_INITIAL_X; // Reset position
            }
        } else {
            // Ensure position is reset if not dashing
            if (this.x !== PLAYER_INITIAL_X) this.x = PLAYER_INITIAL_X;
        }

        // Guard Logic
        if (this.isGuarding) {
            this.guardTimer -= delta;
            if (this.guardTimer <= 0) {
                this.isGuarding = false;
                this.guardCooldown = 1000; // 1 second cooldown
            }
        }

        // Physics
        if (!this.isDashing) {
            this.vy += G;
            this.y += this.vy;
        } else {
            this.vy = 0; // Hover during dash
        }

        if (this.y + this.h >= this.canvas.height - GROUND) {
            this.y = this.canvas.height - GROUND - this.h;
            this.vy = 0;
            this.onGround = true;
            this.canDouble = characters[this.charKey]?.special?.includes('doubleJump');
        }

        // Animation
        this.updateAnimation(delta);
    }

    updateAnimation(delta) {
        if (delta < 0) delta = 0;

        if (!this.onGround && !this.isDashing) {
            // Jump animation
            if (this.anim.sequence !== this.anim.jumpFrames) {
                this.anim.sequence = this.anim.jumpFrames;
                this.anim.index = 0;
            }
            this.anim.elapsed = 0;
            this.anim.currentFrame = this.vy < 0 ? this.anim.jumpFrames[0] : this.anim.jumpFrames[1];
            return;
        }

        // Walk animation
        if (this.anim.sequence !== this.anim.walkFrames) {
            this.anim.sequence = this.anim.walkFrames;
            this.anim.index = 0;
            this.anim.elapsed = 0;
            this.anim.currentFrame = this.anim.walkFrames[0];
        }

        this.anim.elapsed += delta;
        const frameAdvance = Math.floor(this.anim.elapsed / this.anim.frameDuration);
        if (frameAdvance > 0) {
            this.anim.elapsed %= this.anim.frameDuration;
            this.anim.index = (this.anim.index + frameAdvance) % this.anim.sequence.length;
            this.anim.currentFrame = this.anim.sequence[this.anim.index];
        }
    }

    jump() {
        if (this.isDashing || this.isGuarding) return false;

        const hasDouble = characters[this.charKey]?.special?.includes('doubleJump');

        if (this.onGround) {
            this.vy = BASE_JUMP * (this.stats?.jump || 1);
            this.onGround = false;
            this.canDouble = hasDouble;
            if (this.particles) this.particles.createJumpDust(this.x + this.w / 2, this.y + this.h);
            return true; // Jumped
        } else if (hasDouble && this.canDouble) {
            this.vy = BASE_JUMP * (this.stats?.jump || 1) * 0.9;
            this.canDouble = false;
            if (this.particles) this.particles.createJumpDust(this.x + this.w / 2, this.y + this.h);
            return true; // Double jumped
        }
        return false;
    }

    dash() {
        if (this.isDashing || this.dashCooldown > 0 || this.isGuarding) return false;
        this.isDashing = true;
        this.dashTimer = 300; // 300ms dash
        // Visual effect
        if (this.particles) {
            for (let i = 0; i < 5; i++) {
                this.particles.createJumpDust(this.x + Math.random() * this.w, this.y + this.h / 2);
            }
        }
        return true;
    }

    guard() {
        if (this.isGuarding || this.guardCooldown > 0 || this.isDashing) return false;
        this.isGuarding = true;
        this.guardTimer = 500; // 500ms guard
        return true;
    }

    draw(ctx, now, invUntil, hurtUntil) {
        // Invincibility outline
        if (now < invUntil || this.isDashing) {
            ctx.strokeStyle = this.isDashing ? '#00ffff' : '#f5c542';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
        }

        // Guard Shield
        if (this.isGuarding) {
            ctx.save();
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Blink on hurt
        const blink = now < hurtUntil && Math.floor(now / 60) % 2 === 0;
        if (!blink) {
            if (this.sprite.loaded && this.sprite.frameWidth && !this.sprite.useEmoji) {
                const smoothingBackup = ctx.imageSmoothingEnabled;
                ctx.imageSmoothingEnabled = true;

                const frame = this.anim.currentFrame;
                const col = frame % this.sprite.cols;
                const row = Math.floor(frame / this.sprite.cols);

                ctx.save();
                if (this.isDashing) {
                    ctx.globalAlpha = 0.7;
                    ctx.filter = 'blur(2px)';
                }

                ctx.drawImage(
                    this.sprite.image,
                    col * this.sprite.frameWidth,
                    row * this.sprite.frameHeight,
                    this.sprite.frameWidth,
                    this.sprite.frameHeight,
                    this.x,
                    this.y,
                    this.w,
                    this.h
                );

                ctx.restore();

                ctx.imageSmoothingEnabled = smoothingBackup;
            } else {
                // Fallback: render character emoji or colored box
                const char = characters[this.charKey];
                if (char && char.emoji) {
                    ctx.font = '42px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(char.emoji, this.x + this.w / 2, this.y + this.h / 2 + 4);
                } else {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.w, this.h);
                }
            }
        }
    }
}
