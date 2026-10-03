import { useEffect, useRef, useState } from 'react';
import { playBgm, playSfx, stopBgm } from '../game-core/js/audio.js';
import './SideScrollerPrototype.css';

type GameStatus = 'playing' | 'clear' | 'gameover';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  hp: number;
  onGround: boolean;
  invulnerable: number;
  attackTimer: number;
  attackCooldown: number;
  coyoteTime: number;
  jumpBuffer: number;
  runPhase: number;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  minX: number;
  maxX: number;
  hp: number;
  flash: number;
  knockback: number;
  bobPhase: number;
};

type GameModel = {
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  cameraX: number;
  status: GameStatus;
  defeated: number;
  combo: number;
  comboTimer: number;
  shake: number;
  hitStop: number;
  elapsed: number;
};

type InputState = {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
};

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const WORLD_WIDTH = 3200;
const GROUND_Y = 470;
const PLAYER_WIDTH = 44;
const PLAYER_HEIGHT = 66;
const GOAL_X = WORLD_WIDTH - 170;
const ATTACK_DURATION = 0.24;

const platforms = [
  { x: 430, y: 388, width: 210, height: 18 },
  { x: 760, y: 335, width: 180, height: 18 },
  { x: 1160, y: 395, width: 240, height: 18 },
  { x: 1550, y: 350, width: 210, height: 18 },
  { x: 1950, y: 405, width: 180, height: 18 },
  { x: 2320, y: 345, width: 240, height: 18 },
];

const enemyStarts = [620, 1010, 1430, 1810, 2180, 2630];

const createGame = (): GameModel => ({
  player: {
    x: 90,
    y: GROUND_Y - PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    facing: 1,
    hp: 4,
    onGround: true,
    invulnerable: 0,
    attackTimer: 0,
    attackCooldown: 0,
    coyoteTime: 0.1,
    jumpBuffer: 0,
    runPhase: 0,
  },
  enemies: enemyStarts.map((x, index) => ({
    id: index + 1,
    x,
    y: GROUND_Y - 44,
    width: 58,
    height: 44,
    vx: index % 2 === 0 ? 76 : -76,
    minX: x - 110,
    maxX: x + 110,
    hp: 2,
    flash: 0,
    knockback: 0,
    bobPhase: index * 1.7,
  })),
  particles: [],
  cameraX: 0,
  status: 'playing',
  defeated: 0,
  combo: 0,
  comboTimer: 0,
  shake: 0,
  hitStop: 0,
  elapsed: 0,
});

const intersects = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const approach = (value: number, target: number, amount: number) => {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
};

const spawnBurst = (
  game: GameModel,
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 220,
  size = 4,
) => {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const velocity = speed * (0.45 + Math.random() * 0.75);
    const life = 0.22 + Math.random() * 0.28;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 35,
      life,
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      gravity: 620,
    });
  }
};

const spawnDust = (game: GameModel, x: number, y: number, direction = 0) => {
  for (let i = 0; i < 7; i += 1) {
    const life = 0.18 + Math.random() * 0.18;
    game.particles.push({
      x: x + (Math.random() - 0.5) * 28,
      y,
      vx: direction * 55 + (Math.random() - 0.5) * 90,
      vy: -40 - Math.random() * 95,
      life,
      maxLife: life,
      size: 3 + Math.random() * 4,
      color: i % 2 === 0 ? '#82efff' : '#ff75cd',
      gravity: 260,
    });
  }
};

export function SideScrollerPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameModel>(createGame());
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    jumpPressed: false,
    attackPressed: false,
  });
  const attackedThisSwing = useRef(new Set<number>());
  const [ui, setUi] = useState({
    hp: 4,
    status: 'playing' as GameStatus,
    defeated: 0,
    progress: 0,
    combo: 0,
  });

  const restart = () => {
    gameRef.current = createGame();
    attackedThisSwing.current.clear();
    setUi({ hp: 4, status: 'playing', defeated: 0, progress: 0, combo: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const setKey = (event: KeyboardEvent, pressed: boolean) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w', 'j', 'k', 'x'].includes(key)) {
        event.preventDefault();
      }

      if (key === 'arrowleft' || key === 'a') inputRef.current.left = pressed;
      if (key === 'arrowright' || key === 'd') inputRef.current.right = pressed;

      if (pressed && !event.repeat && (key === 'arrowup' || key === 'w' || key === ' ')) {
        inputRef.current.jumpPressed = true;
      }
      if (pressed && !event.repeat && (key === 'j' || key === 'k' || key === 'x')) {
        inputRef.current.attackPressed = true;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
    const onKeyUp = (event: KeyboardEvent) => setKey(event, false);

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    playBgm({ reset: true });

    let animationFrame = 0;
    let previousTime = performance.now();
    let lastUiUpdate = 0;

    const drawMountainLayer = (cameraX: number, factor: number, baseY: number, color: string, step: number) => {
      const offset = -(cameraX * factor) % step;
      context.fillStyle = color;
      for (let x = offset - step; x < VIEW_WIDTH + step; x += step) {
        context.beginPath();
        context.moveTo(x - 40, baseY);
        context.lineTo(x + step * 0.28, baseY - 125);
        context.lineTo(x + step * 0.52, baseY - 54);
        context.lineTo(x + step * 0.76, baseY - 155);
        context.lineTo(x + step + 50, baseY);
        context.closePath();
        context.fill();
      }
    };

    const drawSkyline = (cameraX: number, factor: number, baseY: number, alpha: number) => {
      const step = 158;
      const offset = -(cameraX * factor) % step;
      for (let x = offset - step; x < VIEW_WIDTH + step; x += step) {
        const seed = Math.abs(Math.floor((x + cameraX * factor) / step));
        const width = 94 + (seed % 3) * 18;
        const height = 78 + (seed % 5) * 22;
        context.fillStyle = `rgba(17, 15, 39, ${alpha})`;
        context.fillRect(x, baseY - height, width, height);

        context.fillStyle = `rgba(94, 226, 255, ${alpha * 0.42})`;
        for (let wy = baseY - height + 16; wy < baseY - 15; wy += 22) {
          for (let wx = x + 14; wx < x + width - 10; wx += 24) {
            if ((Math.floor(wx + wy) + seed) % 3 !== 0) {
              context.fillRect(wx, wy, 6, 9);
            }
          }
        }

        if (seed % 4 === 0) {
          context.fillStyle = `rgba(255, 97, 202, ${alpha * 0.85})`;
          context.fillRect(x + width - 7, baseY - height - 28, 4, 28);
          context.fillRect(x + width - 18, baseY - height - 28, 26, 4);
        }
      }
    };

    const drawBackground = (game: GameModel) => {
      const cameraX = game.cameraX;
      const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      gradient.addColorStop(0, '#070718');
      gradient.addColorStop(0.48, '#171239');
      gradient.addColorStop(1, '#090812');
      context.fillStyle = gradient;
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      const moonX = 760 - cameraX * 0.06;
      const moonY = 108;
      const moonGlow = context.createRadialGradient(moonX, moonY, 8, moonX, moonY, 78);
      moonGlow.addColorStop(0, 'rgba(243, 240, 255, 0.9)');
      moonGlow.addColorStop(0.42, 'rgba(127, 226, 255, 0.32)');
      moonGlow.addColorStop(1, 'rgba(127, 226, 255, 0)');
      context.fillStyle = moonGlow;
      context.beginPath();
      context.arc(moonX, moonY, 78, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f1efff';
      context.beginPath();
      context.arc(moonX, moonY, 34, 0, Math.PI * 2);
      context.fill();

      for (let i = 0; i < 55; i += 1) {
        const worldX = i * 173 + 45;
        const x = ((worldX - cameraX * 0.12) % (VIEW_WIDTH + 160)) - 80;
        const y = 28 + ((i * 97) % 255);
        const twinkle = 0.35 + Math.sin(game.elapsed * 2.2 + i) * 0.14;
        context.globalAlpha = twinkle;
        context.fillStyle = i % 4 === 0 ? '#ff8ad7' : '#9aefff';
        context.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
      }
      context.globalAlpha = 1;

      drawMountainLayer(cameraX, 0.12, 375, '#0e1430', 310);
      drawMountainLayer(cameraX, 0.2, 420, '#17173d', 260);
      drawSkyline(cameraX, 0.32, GROUND_Y, 0.75);
      drawSkyline(cameraX, 0.52, GROUND_Y + 8, 0.95);

      context.fillStyle = 'rgba(255, 91, 202, 0.16)';
      context.fillRect(0, GROUND_Y - 6, VIEW_WIDTH, 6);
    };

    const drawNeonSign = (x: number, y: number, width: number, text: string, accent: string) => {
      context.save();
      context.shadowBlur = 20;
      context.shadowColor = accent;
      context.strokeStyle = accent;
      context.lineWidth = 3;
      context.strokeRect(x, y, width, 54);
      context.fillStyle = 'rgba(8, 7, 20, 0.86)';
      context.fillRect(x + 3, y + 3, width - 6, 48);
      context.fillStyle = accent;
      context.font = '900 16px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(text, x + width / 2, y + 34);
      context.restore();
      context.textAlign = 'start';
    };

    const drawPlayer = (player: Player) => {
      const cx = player.x + player.width / 2;
      const bottom = player.y + player.height;
      const speedRatio = Math.min(1, Math.abs(player.vx) / 285);
      const running = player.onGround && speedRatio > 0.08;
      const legSwing = running ? Math.sin(player.runPhase) * 7 : 0;
      const airborneStretch = player.onGround ? 1 : player.vy < 0 ? 1.08 : 0.94;

      context.save();
      if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2 === 0) {
        context.globalAlpha = 0.35;
      }

      context.fillStyle = 'rgba(0, 0, 0, 0.34)';
      context.beginPath();
      context.ellipse(cx, GROUND_Y + 2, 24 - Math.min(8, Math.abs(player.y + player.height - GROUND_Y) * 0.05), 6, 0, 0, Math.PI * 2);
      context.fill();

      context.translate(cx, bottom);
      context.scale(player.facing, airborneStretch);

      const scarfTrail = 16 + speedRatio * 20;
      context.strokeStyle = '#ff4ebc';
      context.lineWidth = 7;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-7, -49);
      context.quadraticCurveTo(-20 - scarfTrail * 0.45, -43 + Math.sin(player.runPhase) * 3, -23 - scarfTrail, -34);
      context.stroke();

      context.strokeStyle = '#7bf3ff';
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(-10, -8);
      context.lineTo(-11 + legSwing, 0);
      context.moveTo(10, -8);
      context.lineTo(11 - legSwing, 0);
      context.stroke();

      context.shadowBlur = 16;
      context.shadowColor = '#ff62ca';
      context.fillStyle = '#ff5fc4';
      context.beginPath();
      context.moveTo(-16, -44);
      context.lineTo(14, -44);
      context.lineTo(18, -12);
      context.lineTo(-18, -12);
      context.closePath();
      context.fill();

      context.shadowBlur = 0;
      context.fillStyle = '#2c214e';
      context.fillRect(-12, -38, 24, 20);

      context.fillStyle = '#f7eaff';
      context.beginPath();
      context.arc(0, -54, 15, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#261b45';
      context.beginPath();
      context.arc(-3, -58, 14, Math.PI * 1.05, Math.PI * 1.95);
      context.fill();

      context.fillStyle = '#10101d';
      context.beginPath();
      context.arc(6, -55, 2.1, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = '#171326';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(12, -33);
      context.lineTo(26, -31);
      context.stroke();

      context.save();
      context.translate(-19, -31);
      context.shadowBlur = 12;
      context.shadowColor = '#ffcc67';
      context.fillStyle = '#f8f4ff';
      context.beginPath();
      context.moveTo(-7, -10);
      context.lineTo(7, -10);
      context.lineTo(5, 12);
      context.lineTo(-5, 12);
      context.closePath();
      context.fill();
      context.fillStyle = '#ff72c9';
      context.fillRect(-5, -5, 10, 5);
      context.fillStyle = '#ffd36b';
      context.beginPath();
      context.arc(0, -13, 6, 0, Math.PI * 2);
      context.fill();
      context.restore();

      if (player.attackTimer > 0) {
        const progress = 1 - player.attackTimer / ATTACK_DURATION;
        const arcOffset = -0.8 + progress * 1.6;
        context.save();
        context.rotate(arcOffset * 0.4);
        context.shadowBlur = 24;
        context.shadowColor = '#fff3a6';
        context.strokeStyle = 'rgba(255, 249, 173, 0.95)';
        context.lineWidth = 10;
        context.beginPath();
        context.arc(11, -31, 46, -0.82, 0.78);
        context.stroke();
        context.strokeStyle = 'rgba(255, 104, 204, 0.82)';
        context.lineWidth = 4;
        context.beginPath();
        context.arc(11, -31, 58, -0.72, 0.68);
        context.stroke();
        context.restore();
      }

      context.restore();
    };

    const drawEnemy = (enemy: Enemy, elapsed: number) => {
      if (enemy.hp <= 0) return;
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2 + Math.sin(elapsed * 5 + enemy.bobPhase) * 2.5;
      const facing = enemy.vx >= 0 ? 1 : -1;

      context.save();
      context.translate(cx, cy);
      context.scale(facing, 1);

      if (enemy.flash > 0) {
        context.shadowBlur = 26;
        context.shadowColor = '#ffffff';
      } else {
        context.shadowBlur = 12;
        context.shadowColor = '#4fe7ff';
      }

      context.fillStyle = enemy.flash > 0 ? '#ffffff' : '#61dff8';
      context.beginPath();
      context.ellipse(0, 0, 25, 16, 0, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#2a315e';
      context.beginPath();
      context.moveTo(-18, -11);
      context.lineTo(-5, -25);
      context.lineTo(5, -12);
      context.closePath();
      context.fill();

      context.fillStyle = '#ff61bd';
      context.beginPath();
      context.moveTo(-24, 0);
      context.lineTo(-42, -15);
      context.lineTo(-39, 1);
      context.lineTo(-42, 16);
      context.closePath();
      context.fill();

      context.fillStyle = '#ffef73';
      context.beginPath();
      context.arc(11, -5, 5.5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1a0c21';
      context.beginPath();
      context.arc(13, -5, 2.2, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#1a0c21';
      context.beginPath();
      context.moveTo(18, 4);
      context.lineTo(28, 9);
      context.lineTo(19, 11);
      context.closePath();
      context.fill();

      context.fillStyle = '#fff';
      context.beginPath();
      context.moveTo(19, 6);
      context.lineTo(23, 9);
      context.lineTo(19, 9);
      context.closePath();
      context.fill();

      context.restore();

      if (enemy.hp === 1) {
        context.fillStyle = 'rgba(255, 91, 187, 0.75)';
        context.fillRect(enemy.x + 10, enemy.y - 9, enemy.width - 20, 3);
      }
    };

    const drawParticles = (game: GameModel) => {
      for (const particle of game.particles) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.shadowBlur = 10 * alpha;
        context.shadowColor = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    };

    const drawWorld = (game: GameModel) => {
      const { player, enemies, cameraX } = game;
      const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake * 2 : 0;
      const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake * 1.5 : 0;

      context.save();
      context.translate(-cameraX + shakeX, shakeY);

      context.fillStyle = '#111323';
      context.fillRect(0, GROUND_Y, WORLD_WIDTH, VIEW_HEIGHT - GROUND_Y);
      context.fillStyle = '#63e6ff';
      context.fillRect(0, GROUND_Y, WORLD_WIDTH, 4);
      context.fillStyle = 'rgba(255, 91, 202, 0.24)';
      for (let x = 0; x < WORLD_WIDTH; x += 84) {
        context.fillRect(x, GROUND_Y + 18, 48, 3);
      }

      context.strokeStyle = 'rgba(119, 240, 255, 0.18)';
      context.lineWidth = 1;
      for (let x = 0; x < WORLD_WIDTH; x += 64) {
        context.beginPath();
        context.moveTo(x, GROUND_Y + 4);
        context.lineTo(x + 26, VIEW_HEIGHT);
        context.stroke();
      }

      for (const platform of platforms) {
        context.fillStyle = '#292449';
        context.fillRect(platform.x, platform.y, platform.width, platform.height);
        context.fillStyle = '#ff68ca';
        context.shadowBlur = 14;
        context.shadowColor = '#ff68ca';
        context.fillRect(platform.x, platform.y, platform.width, 4);
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(119, 240, 255, 0.24)';
        for (let x = platform.x + 12; x < platform.x + platform.width - 8; x += 32) {
          context.fillRect(x, platform.y + 8, 17, 3);
        }
      }

      drawNeonSign(250, 270, 150, 'PARFAIT 24H', '#ff64c7');
      drawNeonSign(1360, 250, 164, 'IWASHI ALERT', '#6fe8ff');
      drawNeonSign(2460, 245, 145, 'LAST MILE', '#ffe36f');

      context.fillStyle = 'rgba(112, 244, 255, 0.1)';
      context.fillRect(GOAL_X - 28, 76, 104, GROUND_Y - 76);
      context.shadowBlur = 28;
      context.shadowColor = '#7af6ff';
      context.strokeStyle = '#7af6ff';
      context.lineWidth = 5;
      context.strokeRect(GOAL_X, 168, 58, 146);
      context.shadowBlur = 0;
      context.fillStyle = '#fef3ff';
      context.font = '900 18px system-ui, sans-serif';
      context.fillText('DELIVERY', GOAL_X - 18, 145);
      context.fillText('GOAL', GOAL_X + 5, 245);

      for (const enemy of enemies) {
        drawEnemy(enemy, game.elapsed);
      }

      drawParticles(game);
      drawPlayer(player);

      context.restore();
    };

    const updateParticles = (game: GameModel, dt: number) => {
      for (const particle of game.particles) {
        particle.life -= dt;
        particle.vy += particle.gravity * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.985, dt * 60);
      }
      game.particles = game.particles.filter((particle) => particle.life > 0);
    };

    const update = (dt: number) => {
      const game = gameRef.current;
      const player = game.player;
      const input = inputRef.current;

      game.elapsed += dt;
      game.shake = Math.max(0, game.shake - 34 * dt);
      updateParticles(game, dt);

      if (game.comboTimer > 0) {
        game.comboTimer = Math.max(0, game.comboTimer - dt);
        if (game.comboTimer === 0) game.combo = 0;
      }

      if (game.status !== 'playing') {
        input.jumpPressed = false;
        input.attackPressed = false;
        return;
      }

      if (game.hitStop > 0) {
        game.hitStop = Math.max(0, game.hitStop - dt);
        input.jumpPressed = false;
        input.attackPressed = false;
        return;
      }

      if (input.jumpPressed) {
        player.jumpBuffer = 0.12;
      }
      input.jumpPressed = false;

      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (direction !== 0) player.facing = direction as 1 | -1;

      const targetVx = direction * 300;
      const acceleration = player.onGround ? 2500 : 1400;
      player.vx = approach(player.vx, targetVx, acceleration * dt);

      if (direction === 0 && player.onGround) {
        player.vx = approach(player.vx, 0, 2950 * dt);
      }

      if (player.onGround) {
        player.coyoteTime = 0.105;
      } else {
        player.coyoteTime = Math.max(0, player.coyoteTime - dt);
      }
      player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

      if (player.jumpBuffer > 0 && player.coyoteTime > 0) {
        player.vy = -675;
        player.onGround = false;
        player.coyoteTime = 0;
        player.jumpBuffer = 0;
        spawnDust(game, player.x + player.width / 2, player.y + player.height, -player.facing * 0.45);
        playSfx('jump');
      }

      if (input.attackPressed && player.attackCooldown <= 0) {
        player.attackTimer = ATTACK_DURATION;
        player.attackCooldown = 0.3;
        attackedThisSwing.current.clear();
        playSfx('powerup');
      }
      input.attackPressed = false;

      player.attackTimer = Math.max(0, player.attackTimer - dt);
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.runPhase += Math.abs(player.vx) * dt * 0.065;

      const previousBottom = player.y + player.height;
      const wasGrounded = player.onGround;
      const impactVelocity = player.vy;

      player.vy += 1880 * dt;
      player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * dt));
      player.y += player.vy * dt;
      const nextBottom = player.y + player.height;

      player.onGround = false;
      let landingY: number | null = null;

      const canLandOn = (surfaceY: number, x: number, width: number) =>
        player.vy >= 0 &&
        player.x + player.width > x + 4 &&
        player.x < x + width - 4 &&
        previousBottom <= surfaceY + 4 &&
        nextBottom >= surfaceY;

      for (const platform of platforms) {
        if (canLandOn(platform.y, platform.x, platform.width)) {
          landingY = landingY === null ? platform.y : Math.min(landingY, platform.y);
        }
      }

      if (previousBottom <= GROUND_Y + 4 && nextBottom >= GROUND_Y && player.vy >= 0) {
        landingY = landingY === null ? GROUND_Y : Math.min(landingY, GROUND_Y);
      }

      if (landingY !== null) {
        player.y = landingY - player.height;
        player.vy = 0;
        player.onGround = true;

        if (!wasGrounded && impactVelocity > 330) {
          spawnDust(game, player.x + player.width / 2, landingY, player.vx > 0 ? -0.5 : 0.5);
          game.shake = Math.max(game.shake, 2.4);
        }
      }

      if (player.onGround && Math.abs(player.vx) > 235 && Math.floor(game.elapsed * 11) % 5 === 0 && Math.random() < 0.18) {
        spawnDust(game, player.x + player.width / 2 - player.facing * 12, player.y + player.height - 1, -player.facing);
      }

      for (const enemy of game.enemies) {
        if (enemy.hp <= 0) continue;

        enemy.flash = Math.max(0, enemy.flash - dt);
        enemy.knockback = approach(enemy.knockback, 0, 1000 * dt);
        enemy.x += (enemy.vx + enemy.knockback) * dt;

        if (enemy.x < enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
        }
        if (enemy.x > enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
        }

        if (player.attackTimer > 0.055 && player.attackTimer < 0.19) {
          const attackBox = {
            x: player.facing === 1 ? player.x + player.width - 2 : player.x - 66,
            y: player.y + 7,
            width: 68,
            height: 51,
          };

          if (!attackedThisSwing.current.has(enemy.id) && intersects(attackBox, enemy)) {
            attackedThisSwing.current.add(enemy.id);
            enemy.hp -= 1;
            enemy.flash = 0.11;
            enemy.knockback = player.facing * 460;
            game.hitStop = enemy.hp <= 0 ? 0.07 : 0.045;
            game.shake = enemy.hp <= 0 ? 9 : 5;
            game.combo += 1;
            game.comboTimer = 1.35;
            playSfx('hit');

            const hitX = enemy.x + enemy.width / 2;
            const hitY = enemy.y + enemy.height / 2;
            spawnBurst(game, hitX, hitY, '#fff28a', enemy.hp <= 0 ? 12 : 7, enemy.hp <= 0 ? 330 : 245, 5);
            spawnBurst(game, hitX, hitY, '#ff5fc5', enemy.hp <= 0 ? 10 : 5, enemy.hp <= 0 ? 280 : 210, 4);

            if (enemy.hp <= 0) {
              game.defeated += 1;
            }
          }
        }

        if (enemy.hp > 0 && player.invulnerable <= 0 && intersects(player, enemy)) {
          player.hp -= 1;
          player.invulnerable = 1.05;
          player.vx = player.x < enemy.x ? -360 : 360;
          player.vy = -330;
          game.shake = 11;
          game.combo = 0;
          game.comboTimer = 0;
          playSfx('hit');

          spawnBurst(
            game,
            player.x + player.width / 2,
            player.y + player.height / 2,
            '#ff4e7a',
            11,
            270,
            5,
          );

          if (player.hp <= 0) {
            game.status = 'gameover';
          }
        }
      }

      if (player.y > VIEW_HEIGHT + 160) {
        player.hp = 0;
        game.status = 'gameover';
      }

      if (player.x >= GOAL_X - 12) {
        game.status = 'clear';
        game.shake = 4;
        playSfx('powerup');
        spawnBurst(game, GOAL_X + 28, 230, '#7af6ff', 18, 300, 5);
        spawnBurst(game, GOAL_X + 28, 230, '#ff79ce', 14, 260, 4);
      }

      const lookAhead = player.facing * Math.min(100, Math.abs(player.vx) * 0.23);
      const cameraTarget = player.x - 270 + lookAhead;
      game.cameraX = approach(
        game.cameraX,
        Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, cameraTarget)),
        1750 * dt,
      );
    };

    const frame = (time: number) => {
      const dt = Math.min((time - previousTime) / 1000, 0.033);
      previousTime = time;

      update(dt);

      const game = gameRef.current;
      drawBackground(game);
      drawWorld(game);

      if (time - lastUiUpdate > 65) {
        lastUiUpdate = time;
        setUi({
          hp: game.player.hp,
          status: game.status,
          defeated: game.defeated,
          progress: Math.min(100, Math.round((game.player.x / GOAL_X) * 100)),
          combo: game.combo,
        });
      }

      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stopBgm();
    };
  }, []);

  const hold = (key: 'left' | 'right', pressed: boolean) => {
    inputRef.current[key] = pressed;
  };

  const pulse = (key: 'jumpPressed' | 'attackPressed') => {
    inputRef.current[key] = true;
  };

  return (
    <main className="side-scroller">
      <header className="side-scroller__header">
        <div>
          <small>PARFAIT × IWASHI / NIGHT DELIVERY</small>
          <h1>パフェを守れ。夜を駆けろ。</h1>
        </div>
        <div className="side-scroller__objective">
          <span>DELIVERY</span>
          <strong>{ui.progress}%</strong>
        </div>
      </header>

      <section className="side-scroller__frame" aria-label="横スクロールアクションゲーム">
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} />

        <div className="side-scroller__scanlines" aria-hidden="true" />

        <div className="side-scroller__hud">
          <div className="side-scroller__hud-left">
            <div className="side-scroller__hp" aria-label={`HP ${ui.hp}`}>
              <span className="side-scroller__hud-label">PARFAIT HP</span>
              <div>
                {Array.from({ length: 4 }, (_, index) => (
                  <i key={index} className={index < ui.hp ? 'is-on' : ''}>♥</i>
                ))}
              </div>
            </div>
            {ui.combo >= 2 && (
              <div className="side-scroller__combo">
                <b>{ui.combo}</b>
                <span>HIT</span>
              </div>
            )}
          </div>
          <div className="side-scroller__counter">
            <span>IWASHI DOWN</span>
            <b>{String(ui.defeated).padStart(2, '0')}</b>
          </div>
        </div>

        <div className="side-scroller__progress" aria-hidden="true">
          <span style={{ width: `${ui.progress}%` }} />
        </div>

        {ui.status !== 'playing' && (
          <div className="side-scroller__result">
            <small>{ui.status === 'clear' ? 'NIGHT DELIVERY COMPLETE' : 'DELIVERY FAILED'}</small>
            <h2>{ui.status === 'clear' ? '届けた。' : 'まだ終われない。'}</h2>
            <p>
              {ui.status === 'clear'
                ? `暴走イワシを ${ui.defeated} 匹退けて、パフェを届け切った。`
                : '先に斬る。跳んでかわす。間合いを作ってもう一度。'}
            </p>
            <button type="button" onClick={restart}>RETRY</button>
          </div>
        )}
      </section>

      <section className="side-scroller__controls" aria-label="タッチ操作">
        <div className="side-scroller__move">
          <button
            type="button"
            aria-label="左へ移動"
            onPointerDown={() => hold('left', true)}
            onPointerUp={() => hold('left', false)}
            onPointerCancel={() => hold('left', false)}
            onPointerLeave={() => hold('left', false)}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="右へ移動"
            onPointerDown={() => hold('right', true)}
            onPointerUp={() => hold('right', false)}
            onPointerCancel={() => hold('right', false)}
            onPointerLeave={() => hold('right', false)}
          >
            ▶
          </button>
        </div>
        <div className="side-scroller__actions">
          <button type="button" onPointerDown={() => pulse('jumpPressed')}>JUMP</button>
          <button type="button" className="is-attack" onPointerDown={() => pulse('attackPressed')}>ATTACK</button>
        </div>
      </section>

      <footer className="side-scroller__help">
        <span>MOVE ← → / A D</span>
        <span>JUMP ↑ / W / SPACE</span>
        <span>ATTACK J / K / X</span>
      </footer>
    </main>
  );
}
