
import { G, BASE_JUMP, GROUND } from '../game-constants.js';
import { characters } from '../game-data/characters.js';

export class Player {
    constructor(canvas, particleSystem) {
        this.canvas = canvas;
        this.particles = particleSystem;
        this.w = 46;
        this.h = 46;
        this.x = 50;
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
            walkFrames: [0, 1, 2, 3],
            jumpFrames: [4, 5],
            sequence: [0, 1, 2, 3],
            index: 0,
            elapsed: 0,
            currentFrame: 0,
            frameDuration: 120
        };

        this.loadSprite();
    }

    loadSprite() {
        this.sprite.image.src = this.sprite.path;
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
        const charSpritePath = `assets/char-${key}.png`;
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
        this.x = 50;
        this.y = this.canvas.height - GROUND - this.h;
        this.vy = 0;
        this.onGround = true;
        this.canDouble = characters[this.charKey]?.special?.includes('doubleJump');
        this.resetAnimation();
    }

    resetAnimation() {
        this.anim.sequence = this.anim.walkFrames;
        this.anim.index = 0;
        this.anim.elapsed = 0;
        this.anim.currentFrame = this.anim.walkFrames[0];
    }

    update(delta) {
        // Physics
        this.vy += G;
        this.y += this.vy;

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

        if (this.onGround) {
            if (this.anim.sequence !== this.anim.walkFrames) {
                this.anim.sequence = this.anim.walkFrames;
                this.anim.index = 0;
                this.anim.elapsed = 0;
                this.anim.currentFrame = this.anim.walkFrames[0];
            }

            this.anim.elapsed += delta;
            const frameAdvance = Math.floor(this.anim.elapsed / this.anim.frameDuration);
            if (frameAdvance > 0) {
                this.anim.elapsed -= frameAdvance * this.anim.frameDuration;
                this.anim.index = (this.anim.index + frameAdvance) % this.anim.sequence.length;
                this.anim.currentFrame = this.anim.sequence[this.anim.index];
            }
        } else {
            if (this.anim.sequence !== this.anim.jumpFrames) {
                this.anim.sequence = this.anim.jumpFrames;
                this.anim.index = 0;
            }
            this.anim.elapsed = 0;
            this.anim.currentFrame = this.vy < 0 ? this.anim.jumpFrames[0] : this.anim.jumpFrames[1];
        }
    }

    jump() {
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

    draw(ctx, now, invUntil, hurtUntil) {
        // Invincibility outline
        if (now < invUntil) {
            ctx.strokeStyle = '#f5c542';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
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
