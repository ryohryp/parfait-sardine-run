import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/ParfaitSardineRunPhase1.tsx';
let source = readFileSync(path, 'utf8');

if (!source.includes("import { PLAYER_SPRITE_SHEET } from '../assets/playerSpriteData';")) {
  source = source.replace(
    "} from '../features/order/parfaitOrder';\n",
    "} from '../features/order/parfaitOrder';\nimport { PLAYER_SPRITE_SHEET } from '../assets/playerSpriteData';\n",
  );
}

if (!source.includes('const PLAYER_SPRITE_CELL = 96;')) {
  source = source.replace(
    "const MAX_ORDER_COMBO = 9;\n",
    "const MAX_ORDER_COMBO = 9;\nconst PLAYER_SPRITE_CELL = 96;\nconst PLAYER_SPRITE_DRAW_SIZE = 138;\n",
  );
}

if (!source.includes("playerSprite.src = PLAYER_SPRITE_SHEET;")) {
  source = source.replace(
    "    if (!canvas || !ctx) return;\n\n",
    "    if (!canvas || !ctx) return;\n\n    const playerSprite = new Image();\n    playerSprite.decoding = 'async';\n    playerSprite.src = PLAYER_SPRITE_SHEET;\n\n",
  );
}

const previousDrawPlayer = `    const drawPlayer = () => {
      const x = player.x + (player.dash > 0 ? 20 : 0); const y = player.slide > 0 ? GROUND - 41 : player.y;
      if (player.invulnerable > 0 && Math.floor(worldTime * 18) % 2 === 0) ctx.globalAlpha = 0.35;
      drawRounded(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16, '#f8f4e8');
      ctx.fillStyle = '#ff6fae'; ctx.fillRect(x + 8, y + 33, 48, player.slide > 0 ? 8 : 12);
      ctx.fillStyle = '#79d9ec'; ctx.beginPath(); ctx.ellipse(x + 31, y + 8, 25, 13, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };`;

const spriteDrawPlayer = `    const drawPlayer = () => {
      const frame = player.dash > 0 ? 3 : player.slide > 0 ? 2 : player.y < GROUND - 76 ? 1 : 0;
      const groundBob = frame === 0 ? Math.sin(worldTime * 14) * 2 : 0;
      const drawX = player.x - 45 + (frame === 3 ? 10 : 0);
      const drawY = player.y - 60 + groundBob;
      const blinking = player.invulnerable > 0 && Math.floor(worldTime * 18) % 2 === 0;

      if (blinking) ctx.globalAlpha = 0.35;
      if (playerSprite.complete && playerSprite.naturalWidth > 0) {
        if (feverTime > 0) {
          ctx.shadowBlur = 24;
          ctx.shadowColor = '#ffe86b';
        }
        ctx.drawImage(
          playerSprite,
          frame * PLAYER_SPRITE_CELL,
          0,
          PLAYER_SPRITE_CELL,
          PLAYER_SPRITE_CELL,
          drawX,
          drawY,
          PLAYER_SPRITE_DRAW_SIZE,
          PLAYER_SPRITE_DRAW_SIZE,
        );
        ctx.shadowBlur = 0;
      } else {
        const x = player.x + (player.dash > 0 ? 20 : 0);
        const y = player.slide > 0 ? GROUND - 41 : player.y;
        drawRounded(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16, '#f8f4e8');
        ctx.fillStyle = '#ff6fae'; ctx.fillRect(x + 8, y + 33, 48, player.slide > 0 ? 8 : 12);
        ctx.fillStyle = '#79d9ec'; ctx.beginPath(); ctx.ellipse(x + 31, y + 8, 25, 13, -0.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };`;

if (source.includes(previousDrawPlayer)) {
  source = source.replace(previousDrawPlayer, spriteDrawPlayer);
} else if (!source.includes('frame * PLAYER_SPRITE_CELL')) {
  throw new Error('Could not locate the current drawPlayer implementation.');
}

writeFileSync(path, source);
