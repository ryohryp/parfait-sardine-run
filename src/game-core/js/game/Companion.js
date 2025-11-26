export class Companion {
    constructor(player) {
        this.player = player;
        this.x = player.x - 40;
        this.y = player.y - 40;
        this.w = 32;
        this.h = 32;
        this.targetX = this.x;
        this.targetY = this.y;
        this.floatOffset = 0;
    }

    update(t, items) {
        // Follow player with lerp
        this.targetX = this.player.x - 40 + (this.player.facingRight ? 0 : 80); // Stay behind? No, just follow
        // Actually let's just float near top left of player
        this.targetX = this.player.x - 30;
        this.targetY = this.player.y - 30;

        this.x += (this.targetX - this.x) * 0.1;
        this.y += (this.targetY - this.y) * 0.1;

        // Bobbing effect
        this.floatOffset = Math.sin(t * 0.005) * 5;

        // Auto-collect items
        // Auto-collect items logic removed - Companion should not attract items by default
        // If we want companion to collect, it should be skill-based or much shorter range
        // For now, removing to fix the "unwanted attraction" issue.
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + this.floatOffset);

        // Draw a cute little spirit/pet
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(10, 14, 2, 0, Math.PI * 2);
        ctx.arc(22, 14, 2, 0, Math.PI * 2);
        ctx.fill();

        // Blush
        ctx.fillStyle = '#fca5a5';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(8, 18, 3, 0, Math.PI * 2);
        ctx.arc(24, 18, 3, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(4, 10, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(28, 10, 8, 4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
