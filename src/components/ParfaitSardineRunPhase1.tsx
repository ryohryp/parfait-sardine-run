import { useEffect, useRef, useState } from 'react';
import {
  INGREDIENT_KINDS,
  calculateOrderScore,
  collectOrderIngredient,
  createParfaitOrder,
  getMissingIngredients,
  type IngredientKind,
  type ParfaitOrder,
} from '../features/order/parfaitOrder';
import { PLAYER_SPRITE_SHEET } from '../assets/playerSpriteData';
import './ParfaitSardineRun.css';

type Phase = 'menu' | 'playing' | 'paused' | 'over';
type ObstacleKind = 'crate' | 'fork' | 'bird';
type PickupKind = 'sardine' | 'cherry' | 'star' | IngredientKind;

type Obstacle = { kind: ObstacleKind; x: number; y: number; w: number; h: number; hit: boolean; passed: boolean };
type Pickup = { kind: PickupKind; x: number; y: number; radius: number; phase: number };
type Player = { x: number; y: number; vy: number; jumps: number; slide: number; dash: number; invulnerable: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; shape: 'dot' | 'spark' };
type RainDrop = { x: number; y: number; speed: number; length: number; alpha: number };

type HudState = {
  score: number;
  best: number;
  lives: number;
  combo: number;
  sardines: number;
  fever: number;
  feverTime: number;
  time: number;
  distance: number;
  message: string;
  result: 'clear' | 'crash' | null;
  order: ParfaitOrder;
  parfaits: number;
  orderCombo: number;
  maxOrderCombo: number;
};

type GameControls = { start: () => void; jump: () => void; slide: () => void; dash: () => void; pause: () => void };

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 432;
const RUN_TIME = 60;
const BEST_KEY = 'psr_midnight_best_v2';
const MAX_ORDER_COMBO = 9;
const PLAYER_SPRITE_CELL = 96;
const PLAYER_SPRITE_DRAW_SIZE = 142;

const INGREDIENT_INFO: Record<IngredientKind, { label: string; icon: string; color: string }> = {
  strawberry: { label: 'イチゴ', icon: '🍓', color: '#ff5477' },
  pudding: { label: 'プリン', icon: '🍮', color: '#ffd66e' },
  cream: { label: 'クリーム', icon: '☁', color: '#fff8e8' },
  banana: { label: 'バナナ', icon: '🍌', color: '#ffdf5d' },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const isIngredient = (kind: PickupKind): kind is IngredientKind => (INGREDIENT_KINDS as readonly string[]).includes(kind);
const pseudo = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const initialHud = (): HudState => ({
  score: 0,
  best: Number(localStorage.getItem(BEST_KEY) ?? 0),
  lives: 3,
  combo: 1,
  sardines: 0,
  fever: 0,
  feverTime: 0,
  time: RUN_TIME,
  distance: 0,
  message: '',
  result: null,
  order: createParfaitOrder(1),
  parfaits: 0,
  orderCombo: 1,
  maxOrderCombo: 1,
});

export function ParfaitSardineRunPhase1() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<GameControls | null>(null);
  const mutedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('menu');
  const [hud, setHud] = useState<HudState>(initialHud);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const playerSprite = new Image();
    playerSprite.decoding = 'async';
    playerSprite.src = PLAYER_SPRITE_SHEET;

    let raf = 0;
    let last = performance.now();
    let gamePhase: Phase = 'menu';
    let uiClock = 0;
    let elapsed = 0;
    let countdown = 0;
    let score = 0;
    let best = Number(localStorage.getItem(BEST_KEY) ?? 0);
    let lives = 3;
    let combo = 1;
    let sardines = 0;
    let fever = 0;
    let feverTime = 0;
    let distance = 0;
    let worldTime = 0;
    let spawnTimer = 1.2;
    let pickupTimer = 0.45;
    let shake = 0;
    let message = '';
    let messageTime = 0;
    let result: HudState['result'] = null;
    let orderNumber = 1;
    let order = createParfaitOrder(orderNumber);
    let parfaits = 0;
    let orderCombo = 1;
    let maxOrderCombo = 1;
    let audio: AudioContext | null = null;
    const obstacles: Obstacle[] = [];
    const pickups: Pickup[] = [];
    const particles: Particle[] = [];
    const rain: RainDrop[] = Array.from({ length: 72 }, (_, index) => ({
      x: pseudo(index + 4) * WIDTH,
      y: pseudo(index + 19) * HEIGHT,
      speed: 180 + pseudo(index + 37) * 260,
      length: 8 + pseudo(index + 71) * 19,
      alpha: 0.08 + pseudo(index + 101) * 0.18,
    }));
    const player: Player = { x: 166, y: GROUND - 76, vy: 0, jumps: 0, slide: 0, dash: 0, invulnerable: 0 };

    const syncHud = () => setHud({
      score: Math.floor(score), best, lives, combo, sardines, fever, feverTime,
      time: Math.max(0, RUN_TIME - elapsed), distance,
      message: messageTime > 0 ? message : '', result, order, parfaits, orderCombo, maxOrderCombo,
    });

    const announce = (text: string, duration = 0.75) => { message = text; messageTime = duration; };
    const tone = (frequency: number, duration = 0.1) => {
      if (mutedRef.current) return;
      try {
        audio ??= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = frequency < 200 ? 'sawtooth' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch { /* Audio is optional. */ }
    };
    const burst = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const power = 50 + Math.random() * 175;
        const life = 0.35 + Math.random() * 0.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power - 45,
          life,
          maxLife: life,
          size: 2.5 + Math.random() * 6,
          color,
          shape: Math.random() < 0.45 ? 'spark' : 'dot',
        });
      }
    };
    const addFever = (amount: number) => {
      if (feverTime > 0) return;
      fever = clamp(fever + amount, 0, 100);
      if (fever >= 100) {
        fever = 0;
        feverTime = 7;
        announce('SARDINE FEVER!', 1.2);
        burst(player.x + 35, player.y + 35, '#ffe86b', 34);
        tone(660, 0.2);
      }
    };
    const setGamePhase = (next: Phase) => { gamePhase = next; setPhase(next); };
    const finish = (didClear: boolean) => {
      if (gamePhase !== 'playing') return;
      result = didClear ? 'clear' : 'crash';
      if (didClear) score += lives * 1000 + sardines * 25 + parfaits * 150;
      best = Math.max(best, Math.floor(score));
      localStorage.setItem(BEST_KEY, String(best));
      announce(didClear ? 'DELIVERY COMPLETE!' : 'PARFAIT SPILL!', 10);
      setGamePhase('over');
      syncHud();
    };
    const start = () => {
      elapsed = 0; countdown = 2.8; score = 0; lives = 3; combo = 1; sardines = 0;
      fever = 0; feverTime = 0; distance = 0; spawnTimer = 1.1; pickupTimer = 0.3; shake = 0;
      result = null; orderNumber = 1; order = createParfaitOrder(orderNumber); parfaits = 0;
      orderCombo = 1; maxOrderCombo = 1; obstacles.length = 0; pickups.length = 0; particles.length = 0;
      Object.assign(player, { y: GROUND - 76, vy: 0, jumps: 0, slide: 0, dash: 0, invulnerable: 0 });
      announce('ORDER CHECK!', 1); setGamePhase('playing'); syncHud(); tone(330);
    };
    const jump = () => {
      if (gamePhase === 'menu' || gamePhase === 'over') { start(); return; }
      if (gamePhase !== 'playing' || countdown > 0 || player.jumps >= 2 || player.slide > 0) return;
      player.vy = player.jumps === 0 ? -660 : -585; player.jumps += 1; tone(player.jumps === 1 ? 310 : 430);
    };
    const slide = () => {
      if (gamePhase !== 'playing' || countdown > 0) return;
      if (player.y >= GROUND - 78) player.slide = 0.62; else player.vy = Math.max(player.vy, 520);
    };
    const dash = () => {
      if (gamePhase !== 'playing' || countdown > 0 || player.dash > 0) return;
      player.dash = feverTime > 0 ? 0.65 : 0.38; player.invulnerable = Math.max(player.invulnerable, player.dash); tone(120, 0.16);
    };
    const pause = () => {
      if (gamePhase === 'playing' && countdown <= 0) setGamePhase('paused');
      else if (gamePhase === 'paused') { last = performance.now(); setGamePhase('playing'); }
    };
    controlsRef.current = { start, jump, slide, dash, pause };

    const onKeyDown = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.repeat && event.code !== 'ArrowDown') return;
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') jump();
      if (event.code === 'ArrowDown' || event.code === 'KeyS') slide();
      if (event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'ShiftLeft') dash();
      if (event.code === 'Escape' || event.code === 'KeyP') pause();
      if (event.code === 'Enter' && (gamePhase === 'menu' || gamePhase === 'over')) start();
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });

    const spawnObstacle = (difficulty: number) => {
      const roll = Math.random();
      const obstacle: Obstacle = roll < 0.43
        ? { kind: 'crate', x: WIDTH + 60, y: GROUND - 58, w: 62, h: 58, hit: false, passed: false }
        : roll < 0.73 || difficulty < 0.25
          ? { kind: 'bird', x: WIDTH + 60, y: GROUND - 112, w: 76, h: 45, hit: false, passed: false }
          : { kind: 'fork', x: WIDTH + 60, y: GROUND - 104, w: 42, h: 104, hit: false, passed: false };
      obstacles.push(obstacle);
    };
    const chooseIngredient = (): IngredientKind => {
      const missing = getMissingIngredients(order);
      const source = missing.length > 0 && Math.random() < 0.72 ? missing : INGREDIENT_KINDS;
      return source[Math.floor(Math.random() * source.length)] ?? 'strawberry';
    };
    const spawnPickup = () => {
      const roll = Math.random();
      const kind: PickupKind = roll < 0.15 ? 'sardine' : roll < 0.20 ? 'cherry' : roll < 0.23 ? 'star' : chooseIngredient();
      const high = Math.random() < 0.48;
      const count = kind === 'sardine' ? 3 + Math.floor(Math.random() * 3) : 1;
      for (let i = 0; i < count; i += 1) pickups.push({
        kind, x: WIDTH + 60 + i * 54,
        y: high ? GROUND - 145 - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 65 : GROUND - 48,
        radius: kind === 'star' ? 20 : isIngredient(kind) ? 20 : 16, phase: Math.random() * Math.PI * 2,
      });
    };
    const playerBox = () => ({
      x: player.x + (player.dash > 0 ? 0 : 10), y: player.slide > 0 ? GROUND - 37 : player.y + 7,
      w: player.dash > 0 ? 82 : 45, h: player.slide > 0 ? 30 : 64,
    });
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const collectIngredient = (ingredient: IngredientKind, x: number, y: number) => {
      const progress = collectOrderIngredient(order, ingredient);
      order = progress.order;
      const info = INGREDIENT_INFO[ingredient];
      if (!progress.newlyCollected) { score += 25; return; }
      score += 120 * orderCombo; announce(`${info.icon} ${info.label} GET!`, 0.5); burst(x, y, info.color, 12); tone(590 + order.collected.length * 90);
      if (!progress.completed) return;
      const bonus = calculateOrderScore(orderCombo);
      score += bonus; parfaits += 1; maxOrderCombo = Math.max(maxOrderCombo, orderCombo);
      announce(`PERFECT PARFAIT! +${bonus.toLocaleString('ja-JP')}`, 1.05); burst(player.x + 35, player.y + 28, '#ffe86b', 34); tone(880, 0.2);
      const previousOrder = order; orderNumber += 1; order = createParfaitOrder(orderNumber, previousOrder);
      orderCombo = Math.min(MAX_ORDER_COMBO, orderCombo + 1);
    };

    const update = (dt: number) => {
      worldTime += dt; messageTime = Math.max(0, messageTime - dt); shake = Math.max(0, shake - dt * 3.5);
      player.invulnerable = Math.max(0, player.invulnerable - dt); player.dash = Math.max(0, player.dash - dt); player.slide = Math.max(0, player.slide - dt);
      if (countdown > 0) { countdown = Math.max(0, countdown - dt); if (countdown === 0) announce('GO!', 0.75); return; }

      elapsed += dt;
      const difficulty = clamp(elapsed / RUN_TIME, 0, 1);
      const speed = 370 + difficulty * 235 + (feverTime > 0 ? 55 : 0);
      distance += speed * dt * 0.026; score += dt * (42 + difficulty * 35) * (feverTime > 0 ? 3 : 1);
      feverTime = Math.max(0, feverTime - dt); if (feverTime > 0) player.invulnerable = Math.max(player.invulnerable, 0.15);
      player.vy += 1680 * dt; player.y += player.vy * dt;
      if (player.y >= GROUND - 76) { player.y = GROUND - 76; player.vy = 0; player.jumps = 0; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnObstacle(difficulty); spawnTimer = Math.max(0.62, 1.28 - difficulty * 0.42) + Math.random() * 0.42; }
      pickupTimer -= dt; if (pickupTimer <= 0) { spawnPickup(); pickupTimer = 0.92 + Math.random() * 0.82; }

      const box = playerBox();
      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = obstacles[i]; obstacle.x -= speed * dt;
        if (!obstacle.hit && overlaps(box, obstacle)) {
          if (player.dash > 0 || feverTime > 0) {
            obstacle.hit = true; score += 180 * combo; combo = Math.min(12, combo + 1); addFever(8); shake = 0.32; announce('SMASH!', 0.5); burst(obstacle.x, obstacle.y, '#79f2ff', 18);
          } else if (player.invulnerable <= 0) {
            obstacle.hit = true; lives -= 1; combo = 1; orderCombo = 1; player.invulnerable = 1.35; shake = 0.72;
            announce(lives > 0 ? 'ORDER COMBO LOST!' : 'PARFAIT SPILL!', 0.9); burst(player.x, player.y, '#ff537b', 24); if (lives <= 0) finish(false);
          }
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < player.x && !obstacle.hit) { obstacle.passed = true; combo = Math.min(12, combo + 1); score += 65 * combo; addFever(5); }
        if (obstacle.x < -120) obstacles.splice(i, 1);
      }

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i]; pickup.x -= speed * dt; pickup.phase += dt * 5;
        const dx = box.x + box.w / 2 - pickup.x; const dy = box.y + box.h / 2 - (pickup.y + Math.sin(pickup.phase) * 5);
        if (feverTime > 0 && Math.hypot(dx, dy) < 250) { pickup.x += dx * dt * 6; pickup.y += dy * dt * 6; }
        if (Math.abs(dx) < box.w / 2 + pickup.radius && Math.abs(dy) < box.h / 2 + pickup.radius) {
          if (isIngredient(pickup.kind)) collectIngredient(pickup.kind, pickup.x, pickup.y);
          else if (pickup.kind === 'sardine') { sardines += 1; combo = Math.min(12, combo + 1); score += 55 * combo; addFever(12); burst(pickup.x, pickup.y, '#8feaff', 5); }
          else if (pickup.kind === 'cherry') { score += 350 * combo; addFever(28); announce('CHERRY BONUS +350', 0.6); burst(pickup.x, pickup.y, '#ff5477', 14); }
          else { fever = 100; addFever(0); burst(pickup.x, pickup.y, '#ffe86b', 22); }
          pickups.splice(i, 1);
        } else if (pickup.x < -50) pickups.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i]; particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 260 * dt;
        if (particle.life <= 0) particles.splice(i, 1);
      }
      if (elapsed >= RUN_TIME) finish(true);
    };

    const roundedPath = (x: number, y: number, w: number, h: number, radius: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
    };
    const fillRounded = (x: number, y: number, w: number, h: number, radius: number, color: string) => {
      ctx.fillStyle = color; roundedPath(x, y, w, h, radius); ctx.fill();
    };
    const strokeRounded = (x: number, y: number, w: number, h: number, radius: number, color: string, width = 2) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; roundedPath(x, y, w, h, radius); ctx.stroke();
    };
    const drawStar = (x: number, y: number, outer: number, inner: number, points = 5) => {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i += 1) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (Math.PI * i) / points;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };
    const drawCloud = (x: number, y: number, scale: number, alpha: number) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#c7c6e8';
      ctx.beginPath();
      ctx.arc(x, y, 20 * scale, Math.PI, 0);
      ctx.arc(x + 22 * scale, y - 8 * scale, 28 * scale, Math.PI, 0);
      ctx.arc(x + 52 * scale, y, 20 * scale, Math.PI, 0);
      ctx.lineTo(x + 72 * scale, y + 12 * scale);
      ctx.lineTo(x - 20 * scale, y + 12 * scale);
      ctx.closePath(); ctx.fill(); ctx.restore();
    };
    const drawSky = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      if (feverTime > 0) {
        sky.addColorStop(0, '#25104d'); sky.addColorStop(0.45, '#6b2479'); sky.addColorStop(0.78, '#e84a91'); sky.addColorStop(1, '#ff9877');
      } else {
        sky.addColorStop(0, '#080d2b'); sky.addColorStop(0.48, '#192454'); sky.addColorStop(0.77, '#5a3972'); sky.addColorStop(1, '#e56d84');
      }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, GROUND);

      const moonGlow = ctx.createRadialGradient(792, 94, 10, 792, 94, 92);
      moonGlow.addColorStop(0, 'rgba(255,245,184,.55)'); moonGlow.addColorStop(0.38, 'rgba(255,223,126,.17)'); moonGlow.addColorStop(1, 'rgba(255,223,126,0)');
      ctx.fillStyle = moonGlow; ctx.fillRect(690, 0, 205, 200);
      ctx.fillStyle = '#fff1b1'; ctx.beginPath(); ctx.arc(792, 94, 47, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190,151,116,.14)';
      ctx.beginPath(); ctx.arc(777, 79, 9, 0, Math.PI * 2); ctx.arc(810, 106, 7, 0, Math.PI * 2); ctx.arc(786, 118, 5, 0, Math.PI * 2); ctx.fill();

      for (let i = 0; i < 62; i += 1) {
        const x = pseudo(i + 31) * WIDTH;
        const y = pseudo(i + 87) * 245;
        const twinkle = 0.35 + Math.sin(worldTime * (1.1 + pseudo(i + 5) * 2) + i) * 0.3;
        ctx.globalAlpha = clamp(twinkle, 0.12, 0.8);
        ctx.fillStyle = i % 9 === 0 ? '#ffe86b' : '#dbe9ff';
        ctx.beginPath(); ctx.arc(x, y, i % 11 === 0 ? 1.7 : 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawCloud(90 - (worldTime * 7) % 360, 95, 1.05, 0.1);
      drawCloud(470 - (worldTime * 10) % 520, 145, 0.75, 0.09);
      drawCloud(890 - (worldTime * 5) % 780, 62, 1.2, 0.08);
    };
    const drawSkylineLayer = (baseY: number, speed: number, color: string, seedOffset: number, minWidth: number, maxWidth: number, minHeight: number, maxHeight: number, windows: boolean) => {
      const loopWidth = 1320;
      const offset = (worldTime * speed) % loopWidth;
      for (let repeat = -1; repeat <= 1; repeat += 1) {
        let x = repeat * loopWidth - offset;
        for (let i = 0; i < 17; i += 1) {
          const w = minWidth + pseudo(i + seedOffset) * (maxWidth - minWidth);
          const h = minHeight + pseudo(i + seedOffset + 100) * (maxHeight - minHeight);
          ctx.fillStyle = color;
          ctx.fillRect(x, baseY - h, w, h);
          if (i % 4 === 0) ctx.fillRect(x + w * 0.4, baseY - h - 13, w * 0.18, 13);
          if (windows) {
            for (let wy = baseY - h + 15; wy < baseY - 18; wy += 18) {
              for (let wx = x + 12; wx < x + w - 10; wx += 18) {
                const lit = pseudo(i * 97 + Math.floor(wx) + Math.floor(wy) + seedOffset) > 0.57;
                ctx.fillStyle = lit ? (feverTime > 0 ? 'rgba(255,232,107,.68)' : 'rgba(121,242,255,.38)') : 'rgba(8,12,39,.44)';
                ctx.fillRect(wx, wy, 6, 8);
              }
            }
          }
          x += w + 18 + pseudo(i + seedOffset + 200) * 34;
        }
      }
    };
    const drawNeonSign = (x: number, y: number, label: string, color: string, rotation = 0) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      ctx.shadowBlur = 18; ctx.shadowColor = color;
      fillRounded(-42, -18, 84, 36, 8, 'rgba(11,15,43,.88)');
      strokeRounded(-42, -18, 84, 36, 8, color, 2);
      ctx.fillStyle = color; ctx.font = '900 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1);
      ctx.shadowBlur = 0; ctx.restore();
    };
    const drawMidground = () => {
      drawSkylineLayer(GROUND - 76, 12, '#11173d', 11, 58, 112, 85, 190, false);
      drawSkylineLayer(GROUND - 42, 25, '#1c2051', 43, 72, 136, 110, 230, true);

      const signOffset = (worldTime * 25) % 1180;
      drawNeonSign(330 - signOffset, 248, 'PARFAIT', '#ff6fae', -0.035);
      drawNeonSign(900 - signOffset, 215, 'SABA', '#79f2ff', 0.025);
      drawNeonSign(1480 - signOffset, 270, 'OPEN 24H', '#ffe86b', -0.02);

      ctx.fillStyle = '#242451';
      ctx.fillRect(0, GROUND - 42, WIDTH, 42);
      const shopOffset = (worldTime * 52) % 300;
      for (let i = -2; i < 6; i += 1) {
        const x = i * 300 - shopOffset;
        ctx.fillStyle = i % 2 === 0 ? '#342454' : '#2d285f'; ctx.fillRect(x, GROUND - 128, 248, 86);
        ctx.fillStyle = 'rgba(255,214,137,.34)'; ctx.fillRect(x + 25, GROUND - 108, 78, 54); ctx.fillRect(x + 135, GROUND - 108, 86, 54);
        ctx.fillStyle = i % 2 === 0 ? '#ff6fae' : '#79f2ff';
        for (let stripe = 0; stripe < 8; stripe += 1) ctx.fillRect(x + stripe * 31, GROUND - 139, 18, 20);
        ctx.fillStyle = '#f9e4b7'; ctx.fillRect(x, GROUND - 139, 248, 8);
      }
    };
    const drawStreet = () => {
      const asphalt = ctx.createLinearGradient(0, GROUND, 0, HEIGHT);
      asphalt.addColorStop(0, '#17182f'); asphalt.addColorStop(1, '#080b1c');
      ctx.fillStyle = asphalt; ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      ctx.fillStyle = '#383449'; ctx.fillRect(0, GROUND, WIDTH, 13);
      ctx.fillStyle = '#ffda76'; ctx.fillRect(0, GROUND + 58, WIDTH, 4);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, GROUND + 18, WIDTH, 2);

      const dashOffset = (worldTime * 380) % 180;
      for (let x = -160; x < WIDTH + 180; x += 180) {
        ctx.fillStyle = 'rgba(255,231,162,.48)';
        ctx.fillRect(x - dashOffset, GROUND + 78, 95, 5);
      }

      const reflection = ctx.createLinearGradient(0, GROUND + 6, 0, HEIGHT);
      reflection.addColorStop(0, 'rgba(255,111,174,.17)'); reflection.addColorStop(1, 'rgba(121,242,255,0)');
      ctx.fillStyle = reflection;
      for (let i = 0; i < 9; i += 1) {
        const x = (i * 132 - (worldTime * 95) % 132) - 80;
        ctx.beginPath(); ctx.ellipse(x, GROUND + 60 + (i % 3) * 17, 58, 8, -0.08, 0, Math.PI * 2); ctx.fill();
      }

      const postOffset = (worldTime * 180) % 360;
      for (let i = -1; i < 4; i += 1) {
        const x = i * 360 - postOffset + 300;
        ctx.fillStyle = '#11142c'; ctx.fillRect(x, GROUND - 158, 9, 158);
        ctx.fillStyle = '#22264e'; ctx.fillRect(x - 14, GROUND - 164, 37, 8);
        const lampGlow = ctx.createRadialGradient(x + 4, GROUND - 153, 2, x + 4, GROUND - 153, 52);
        lampGlow.addColorStop(0, 'rgba(255,232,107,.42)'); lampGlow.addColorStop(1, 'rgba(255,232,107,0)');
        ctx.fillStyle = lampGlow; ctx.fillRect(x - 50, GROUND - 205, 108, 104);
        ctx.fillStyle = '#ffeaa1'; ctx.beginPath(); ctx.arc(x + 4, GROUND - 153, 7, 0, Math.PI * 2); ctx.fill();
      }
    };
    const drawWeather = () => {
      ctx.strokeStyle = '#d9ecff'; ctx.lineWidth = 1;
      for (const drop of rain) {
        const y = (drop.y + worldTime * drop.speed) % (HEIGHT + 70) - 35;
        const x = (drop.x - worldTime * drop.speed * 0.13 + WIDTH * 2) % WIDTH;
        ctx.globalAlpha = drop.alpha;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - drop.length * 0.28, y + drop.length); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    const drawSpeedLines = () => {
      const intensity = player.dash > 0 ? 1 : feverTime > 0 ? 0.65 : 0;
      if (intensity <= 0) return;
      ctx.save(); ctx.globalAlpha = intensity * 0.7; ctx.strokeStyle = feverTime > 0 ? '#ffe86b' : '#79f2ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 28; i += 1) {
        const y = 65 + pseudo(i + 51) * 340;
        const length = 45 + pseudo(i + 90) * 150;
        const x = WIDTH - ((worldTime * 920 + i * 77) % (WIDTH + length));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y); ctx.stroke();
      }
      ctx.restore();
    };
    const drawBackground = () => {
      drawSky();
      drawMidground();
      drawStreet();
      drawWeather();
      drawSpeedLines();
    };
    const drawPlayer = () => {
      const frame = player.dash > 0 ? 3 : player.slide > 0 ? 2 : player.y < GROUND - 76 ? 1 : 0;
      const groundBob = frame === 0 ? Math.sin(worldTime * 14) * 2 : 0;
      const drawX = player.x - 47 + (frame === 3 ? 10 : 0);
      const drawY = player.y - 63 + groundBob;
      const blinking = player.invulnerable > 0 && Math.floor(worldTime * 18) % 2 === 0;
      const airHeight = clamp((GROUND - 76 - player.y) / 150, 0, 1);

      ctx.save();
      ctx.globalAlpha = 0.35 - airHeight * 0.18;
      ctx.fillStyle = '#040615';
      ctx.beginPath(); ctx.ellipse(player.x + 30, GROUND + 2, 40 - airHeight * 12, 9 - airHeight * 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      if (player.dash > 0 || feverTime > 0) {
        ctx.save();
        const aura = ctx.createRadialGradient(player.x + 36, player.y + 30, 10, player.x + 36, player.y + 30, 78);
        aura.addColorStop(0, feverTime > 0 ? 'rgba(255,232,107,.34)' : 'rgba(121,242,255,.28)');
        aura.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = aura; ctx.fillRect(player.x - 55, player.y - 55, 180, 180);
        ctx.strokeStyle = feverTime > 0 ? '#ffe86b' : '#79f2ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.ellipse(player.x + 30, player.y + 35, 58 + Math.sin(worldTime * 12) * 4, 42, -0.15, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      if (blinking) ctx.globalAlpha = 0.35;
      if (playerSprite.complete && playerSprite.naturalWidth > 0) {
        ctx.save();
        if (feverTime > 0) { ctx.shadowBlur = 30; ctx.shadowColor = '#ffe86b'; }
        else if (player.dash > 0) { ctx.shadowBlur = 24; ctx.shadowColor = '#79f2ff'; }
        ctx.drawImage(playerSprite, frame * PLAYER_SPRITE_CELL, 0, PLAYER_SPRITE_CELL, PLAYER_SPRITE_CELL, drawX, drawY, PLAYER_SPRITE_DRAW_SIZE, PLAYER_SPRITE_DRAW_SIZE);
        ctx.restore();
      } else {
        const x = player.x + (player.dash > 0 ? 20 : 0);
        const y = player.slide > 0 ? GROUND - 41 : player.y;
        fillRounded(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16, '#f8f4e8');
        ctx.fillStyle = '#ff6fae'; ctx.fillRect(x + 8, y + 33, 48, player.slide > 0 ? 8 : 12);
        ctx.fillStyle = '#79d9ec'; ctx.beginPath(); ctx.ellipse(x + 31, y + 8, 25, 13, -0.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const drawCrate = (obstacle: Obstacle) => {
      ctx.save();
      ctx.globalAlpha = obstacle.hit ? 0.35 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(obstacle.x + 31, GROUND + 3, 36, 7, 0, 0, Math.PI * 2); ctx.fill();
      const boxGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
      boxGradient.addColorStop(0, '#f1a758'); boxGradient.addColorStop(1, '#8d3d36');
      ctx.fillStyle = boxGradient; roundedPath(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 7); ctx.fill();
      strokeRounded(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 7, '#4a2030', 3);
      ctx.strokeStyle = '#6e2c32'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(obstacle.x + 10, obstacle.y + 9); ctx.lineTo(obstacle.x + 52, obstacle.y + 49); ctx.moveTo(obstacle.x + 52, obstacle.y + 9); ctx.lineTo(obstacle.x + 10, obstacle.y + 49); ctx.stroke();
      fillRounded(obstacle.x + 18, obstacle.y + 18, 26, 22, 4, '#fff3ca');
      ctx.fillStyle = '#c32955'; ctx.font = '900 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FRAGILE', obstacle.x + 31, obstacle.y + 29);
      ctx.restore();
    };
    const drawFork = (obstacle: Obstacle) => {
      ctx.save(); ctx.globalAlpha = obstacle.hit ? 0.35 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(obstacle.x + 22, GROUND + 2, 25, 6, 0, 0, Math.PI * 2); ctx.fill();
      const metal = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.w, 0);
      metal.addColorStop(0, '#6f7898'); metal.addColorStop(0.45, '#f7f8ff'); metal.addColorStop(0.7, '#a8afc8'); metal.addColorStop(1, '#555e7a');
      ctx.fillStyle = metal;
      roundedPath(obstacle.x + 14, obstacle.y + 38, 15, obstacle.h - 38, 7); ctx.fill();
      roundedPath(obstacle.x + 6, obstacle.y + 24, 31, 27, 8); ctx.fill();
      for (let i = 0; i < 4; i += 1) fillRounded(obstacle.x + 6 + i * 9, obstacle.y, 5, 31, 3, i % 2 === 0 ? '#e7e9f3' : '#aab2ca');
      ctx.strokeStyle = '#525a76'; ctx.lineWidth = 2; roundedPath(obstacle.x + 14, obstacle.y + 38, 15, obstacle.h - 38, 7); ctx.stroke();
      ctx.restore();
    };
    const drawBird = (obstacle: Obstacle) => {
      const wing = Math.sin(worldTime * 15 + obstacle.x * 0.02);
      ctx.save(); ctx.translate(obstacle.x + 38, obstacle.y + 23); ctx.globalAlpha = obstacle.hit ? 0.35 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(0, 29, 32, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f4ff';
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9def2';
      ctx.beginPath(); ctx.ellipse(-16, -7 - wing * 7, 22, 9, -0.45, 0, Math.PI * 2); ctx.ellipse(13, -9 + wing * 6, 21, 8, 0.48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcb62'; ctx.beginPath(); ctx.moveTo(25, -3); ctx.lineTo(39, 2); ctx.lineTo(25, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17152e'; ctx.beginPath(); ctx.arc(15, -6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c32955'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(18, -9); ctx.stroke();
      ctx.restore();
    };
    const drawObstacle = (obstacle: Obstacle) => {
      if (obstacle.kind === 'crate') drawCrate(obstacle);
      else if (obstacle.kind === 'fork') drawFork(obstacle);
      else drawBird(obstacle);
    };
    const drawStrawberry = (x: number, y: number) => {
      ctx.fillStyle = '#ff5477'; ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.bezierCurveTo(x - 22, y + 3, x - 18, y - 15, x, y - 13); ctx.bezierCurveTo(x + 18, y - 15, x + 22, y + 3, x, y + 16); ctx.fill();
      ctx.fillStyle = '#60cc7a';
      for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.ellipse(x + i * 7, y - 14, 8, 4, i * 0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffe7a2';
      for (let i = 0; i < 8; i += 1) { const angle = i * 2.4; ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * 9, y + Math.sin(angle) * 9, 1.3, 2.2, angle, 0, Math.PI * 2); ctx.fill(); }
    };
    const drawPudding = (x: number, y: number) => {
      ctx.fillStyle = '#9d4f26'; ctx.beginPath(); ctx.ellipse(x, y - 10, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
      const pudding = ctx.createLinearGradient(0, y - 8, 0, y + 17); pudding.addColorStop(0, '#ffe88c'); pudding.addColorStop(1, '#f2a946');
      ctx.fillStyle = pudding; ctx.beginPath(); ctx.moveTo(x - 16, y - 9); ctx.lineTo(x - 12, y + 14); ctx.quadraticCurveTo(x, y + 20, x + 12, y + 14); ctx.lineTo(x + 16, y - 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 8, y - 2, 4, 13);
    };
    const drawCream = (x: number, y: number) => {
      ctx.fillStyle = '#fff8e8';
      ctx.beginPath(); ctx.arc(x, y + 7, 14, 0, Math.PI * 2); ctx.arc(x - 9, y + 9, 10, 0, Math.PI * 2); ctx.arc(x + 9, y + 9, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 12, y + 2); ctx.quadraticCurveTo(x - 2, y - 17, x + 10, y - 3); ctx.quadraticCurveTo(x + 18, y + 5, x + 10, y + 12); ctx.lineTo(x - 10, y + 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d9d1df'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + 2, 11, Math.PI * 1.08, Math.PI * 1.8); ctx.stroke();
    };
    const drawBanana = (x: number, y: number) => {
      ctx.strokeStyle = '#ffdf5d'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x - 3, y - 2, 16, -0.15, 1.55); ctx.stroke();
      ctx.strokeStyle = '#a36d22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 3, y - 2, 16, -0.15, 1.55); ctx.stroke();
      ctx.fillStyle = '#6b4c25'; ctx.beginPath(); ctx.arc(x + 13, y - 5, 3, 0, Math.PI * 2); ctx.fill();
    };
    const drawIngredient = (pickup: Pickup, ingredient: IngredientKind, y: number) => {
      const info = INGREDIENT_INFO[ingredient];
      const needed = order.required.includes(ingredient) && !order.collected.includes(ingredient);
      ctx.save();
      const glow = ctx.createRadialGradient(pickup.x, y, 4, pickup.x, y, 38);
      glow.addColorStop(0, `${info.color}88`); glow.addColorStop(1, `${info.color}00`);
      ctx.fillStyle = glow; ctx.fillRect(pickup.x - 42, y - 42, 84, 84);
      ctx.fillStyle = 'rgba(12,15,39,.8)'; ctx.beginPath(); ctx.arc(pickup.x, y, 25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = needed ? '#ffe86b' : `${info.color}cc`; ctx.lineWidth = needed ? 3 : 2; ctx.beginPath(); ctx.arc(pickup.x, y, 24, 0, Math.PI * 2); ctx.stroke();
      if (ingredient === 'strawberry') drawStrawberry(pickup.x, y);
      else if (ingredient === 'pudding') drawPudding(pickup.x, y);
      else if (ingredient === 'cream') drawCream(pickup.x, y);
      else drawBanana(pickup.x, y);
      if (needed) {
        ctx.shadowBlur = 14; ctx.shadowColor = '#ffe86b';
        ctx.fillStyle = '#ffe86b'; ctx.beginPath(); ctx.arc(pickup.x + 22, y - 22, 10, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#17152e'; ctx.font = '900 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', pickup.x + 22, y - 21);
      }
      ctx.restore();
    };
    const drawSardine = (x: number, y: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(worldTime * 8 + x) * 0.08);
      const fish = ctx.createLinearGradient(-19, 0, 19, 0); fish.addColorStop(0, '#398bb5'); fish.addColorStop(0.5, '#a9efff'); fish.addColorStop(1, '#3d7c9f');
      ctx.fillStyle = fish; ctx.beginPath(); ctx.ellipse(0, 0, 19, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-29, -9); ctx.lineTo(-27, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.arc(10, -2, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#10142d'; ctx.beginPath(); ctx.arc(11, -2, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(5, -2); ctx.moveTo(-6, 3); ctx.lineTo(7, 3); ctx.stroke();
      ctx.restore();
    };
    const drawCherry = (x: number, y: number) => {
      ctx.strokeStyle = '#6fbf68'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 5); ctx.quadraticCurveTo(x - 2, y - 25, x + 8, y - 28); ctx.moveTo(x + 8, y - 5); ctx.quadraticCurveTo(x + 10, y - 19, x + 8, y - 28); ctx.stroke();
      const cherry = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14); cherry.addColorStop(0, '#ff9aae'); cherry.addColorStop(0.3, '#ff3f68'); cherry.addColorStop(1, '#94163d');
      ctx.fillStyle = cherry; ctx.beginPath(); ctx.arc(x - 8, y + 4, 10, 0, Math.PI * 2); ctx.arc(x + 9, y + 4, 10, 0, Math.PI * 2); ctx.fill();
    };
    const drawPickup = (pickup: Pickup) => {
      const y = pickup.y + Math.sin(pickup.phase) * 5;
      if (isIngredient(pickup.kind)) { drawIngredient(pickup, pickup.kind, y); return; }
      ctx.save();
      if (pickup.kind === 'sardine') {
        ctx.shadowBlur = 15; ctx.shadowColor = '#79d9ec'; drawSardine(pickup.x, y);
      } else if (pickup.kind === 'cherry') {
        ctx.shadowBlur = 18; ctx.shadowColor = '#ff537b'; drawCherry(pickup.x, y);
      } else {
        ctx.shadowBlur = 24; ctx.shadowColor = '#ffe86b'; ctx.fillStyle = '#ffe86b'; drawStar(pickup.x, y, 20, 9); ctx.fill();
        ctx.fillStyle = '#fff7c7'; drawStar(pickup.x - 3, y - 3, 7, 3.2); ctx.fill();
      }
      ctx.restore();
    };
    const drawParticles = () => {
      for (const particle of particles) {
        ctx.save(); ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color; ctx.strokeStyle = particle.color;
        if (particle.shape === 'spark') {
          ctx.lineWidth = Math.max(1, particle.size * 0.45); ctx.beginPath(); ctx.moveTo(particle.x - particle.size, particle.y); ctx.lineTo(particle.x + particle.size, particle.y); ctx.moveTo(particle.x, particle.y - particle.size); ctx.lineTo(particle.x, particle.y + particle.size); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    };
    const drawPostFx = () => {
      const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 170, WIDTH / 2, HEIGHT / 2, 600);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(0.75, 'rgba(0,0,0,.08)'); vignette.addColorStop(1, 'rgba(2,4,17,.52)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = 0.035; ctx.fillStyle = '#ffffff';
      for (let y = 0; y < HEIGHT; y += 4) ctx.fillRect(0, y, WIDTH, 1);
      ctx.globalAlpha = 1;
    };
    const draw = () => {
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 18, (Math.random() - 0.5) * shake * 12);
      drawBackground();
      pickups.forEach(drawPickup);
      obstacles.forEach(drawObstacle);
      drawPlayer();
      drawParticles();
      drawPostFx();
      if (countdown > 0 && gamePhase === 'playing') {
        const label = countdown < 0.65 ? 'GO!' : String(Math.ceil(countdown));
        const dim = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 40, WIDTH / 2, HEIGHT / 2, 430);
        dim.addColorStop(0, 'rgba(20,17,47,.14)'); dim.addColorStop(1, 'rgba(10,8,28,.72)');
        ctx.fillStyle = dim; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.shadowBlur = 35; ctx.shadowColor = '#ff6fae'; ctx.fillStyle = '#ffe86b'; ctx.strokeStyle = '#17152e'; ctx.lineWidth = 10;
        ctx.font = '1000 116px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(label, WIDTH / 2, HEIGHT / 2); ctx.fillText(label, WIDTH / 2, HEIGHT / 2);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    };
    const frame = (time: number) => {
      const dt = Math.min(0.033, Math.max(0, (time - last) / 1000)); last = time;
      if (gamePhase === 'playing') update(dt); else worldTime += dt * 0.2;
      draw(); uiClock += dt; if (uiClock >= 0.08) { uiClock = 0; syncHud(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKeyDown); controlsRef.current = null; void audio?.close(); };
  }, []);

  const isActive = phase === 'playing' || phase === 'paused';
  const orderProgress = hud.order.collected.length / hud.order.required.length;
  const ingredientRows = hud.order.required.map((ingredient) => {
    const info = INGREDIENT_INFO[ingredient]; const collected = hud.order.collected.includes(ingredient);
    return { ingredient, info, collected };
  });

  return (
    <main className="psr-shell">
      <div className="psr-ambient psr-ambient-a" />
      <div className="psr-ambient psr-ambient-b" />
      <header className="psr-topbar">
        <div className="psr-brand">
          <span className="psr-brand-mark" aria-hidden="true"><i>PS</i></span>
          <span><b>PARFAIT SARDINE</b><small>NIGHT DELIVERY CLUB</small></span>
        </div>
        <div className="psr-top-actions">
          <span className="psr-night-pill"><i /> ORDER RUSH · 00:60</span>
          <button className="psr-icon-button" onClick={() => { mutedRef.current = !muted; setMuted(!muted); }} aria-pressed={muted}>
            <span aria-hidden="true">{muted ? '×' : '♪'}</span>{muted ? 'SOUND OFF' : 'SOUND ON'}
          </button>
        </div>
      </header>

      <section className="psr-layout">
        <div className={`psr-game-frame ${hud.feverTime > 0 ? 'is-fever' : ''}`}>
          <div className="psr-frame-label"><span>HOWASABA ARCADE SYSTEM</span><b>LIVE</b></div>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="パフェ・サーディン・ランのゲーム画面" />
          {isActive && <div className="psr-hud" aria-live="polite">
            <div className="psr-hud-card psr-hud-left">
              <span className="psr-kicker">SCORE</span><strong>{hud.score.toLocaleString('ja-JP')}</strong><span className="psr-combo">RUN ×{hud.combo}</span>
            </div>
            <div className="psr-hud-center">
              <div className="psr-fever-label"><span>SARDINE FEVER</span><b>{hud.feverTime > 0 ? `${hud.feverTime.toFixed(1)}s` : `${Math.floor(hud.fever)}%`}</b></div>
              <div className="psr-fever-track"><i style={{ width: hud.feverTime > 0 ? '100%' : `${hud.fever}%` }} /></div>
            </div>
            <div className="psr-hud-card psr-hud-right">
              <span className={`psr-timer ${hud.time <= 10 ? 'danger' : ''}`}>{Math.ceil(hud.time).toString().padStart(2, '0')}</span>
              <span className="psr-hearts">{'♥'.repeat(hud.lives)}{'♡'.repeat(3 - hud.lives)}</span><span className="psr-fish-count">🐟 {hud.sardines}</span>
            </div>
          </div>}
          {isActive && <div className="psr-order-ribbon">
            <b>ORDER #{hud.order.number.toString().padStart(4, '0')}</b>
            <div>{ingredientRows.map(({ ingredient, info, collected }) => <span key={ingredient} className={collected ? 'is-collected' : ''}><i>{collected ? '✓' : info.icon}</i>{info.label}</span>)}</div>
            <strong>×{hud.orderCombo}</strong>
          </div>}
          {hud.message && isActive && <div className="psr-callout"><span>{hud.message}</span></div>}
          {phase === 'menu' && <div className="psr-overlay psr-title-screen">
            <div className="psr-title-copy">
              <div className="psr-eyebrow"><i /> MIDNIGHT PARFAIT ORDER RUSH</div>
              <h1><span>PARFAIT</span><br />SARDINE <em>RUN</em></h1>
              <p>注文を見極め、光る材料を集めて、夜明け前に届けろ。</p>
              <button className="psr-play-button" onClick={() => controlsRef.current?.start()}><span><small>START DELIVERY</small>RUN START</span><kbd>ENTER ↵</kbd></button>
              <div className="psr-title-stats"><span>PERSONAL BEST <b>{hud.best.toLocaleString('ja-JP')}</b></span><span>MISSION <b>60 SEC</b></span></div>
            </div>
            <div className="psr-title-art" aria-hidden="true"><div className="psr-parfait-glass"><i /><i /><i /><b>★</b></div><span className="psr-title-fish">➤</span><small>TONIGHT'S<br />SPECIAL</small></div>
          </div>}
          {phase === 'paused' && <div className="psr-overlay psr-pause-screen"><span className="psr-eyebrow"><i /> CREAM BREAK</span><h2>PAUSED</h2><p>パフェは溶けない。たぶん。</p><button className="psr-play-button" onClick={() => controlsRef.current?.pause()}><span><small>BACK TO STREET</small>走りに戻る</span><kbd>P</kbd></button></div>}
          {phase === 'over' && <div className="psr-overlay psr-result-screen">
            <span className="psr-eyebrow"><i /> {hud.result === 'clear' ? `${hud.parfaits} PARFAITS COMPLETE` : 'DELIVERY FAILED'}</span>
            <h2>{hud.result === 'clear' ? 'DELIVERED!' : 'PARFAIT SPILL!'}</h2>
            <div className="psr-result-score"><small>FINAL SCORE</small>{hud.score.toLocaleString('ja-JP')}</div>
            <div className="psr-result-grid"><span><small>SARDINES</small><b>{hud.sardines}</b></span><span><small>DISTANCE</small><b>{Math.floor(hud.distance)}m</b></span><span><small>BEST</small><b>{hud.best.toLocaleString('ja-JP')}</b></span><span><small>PARFAITS</small><b>{hud.parfaits}</b></span><span><small>MAX ORDER</small><b>×{hud.maxOrderCombo}</b></span></div>
            <button className="psr-play-button" onClick={() => controlsRef.current?.start()}><span><small>ONE MORE DELIVERY</small>RUN AGAIN</span><kbd>ENTER ↵</kbd></button>
          </div>}
          {isActive && <div className="psr-mobile-controls" aria-label="タッチ操作"><button onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.slide(); }}><span>▼</span>SLIDE</button><button className="jump" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.jump(); }}><span>↑</span>JUMP</button><button className="dash" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.dash(); }}><span>→</span>DASH</button></div>}
        </div>

        <aside className="psr-side-panel">
          <div className="psr-panel-heading"><span>TONIGHT'S ORDER</span><i>LIVE</i></div>
          <div className="psr-order-card">
            <div className="psr-order-card-top"><span className="psr-order-no">ORDER #{hud.order.number.toString().padStart(4, '0')}</span><b>×{hud.orderCombo}</b></div>
            <h2>材料を集めて<br /><em>パフェを完成</em></h2>
            <div className="psr-ingredient-list">{ingredientRows.map(({ ingredient, info, collected }, index) => <div key={ingredient} className={collected ? 'is-collected' : ''}><span className="psr-ingredient-index">0{index + 1}</span><i style={{ '--ingredient-color': info.color } as React.CSSProperties}>{info.icon}</i><span><b>{info.label}</b><small>{collected ? 'COLLECTED' : 'ON THE STREET'}</small></span><strong>{collected ? 'GET' : 'WAIT'}</strong></div>)}</div>
            <div className="psr-order-meta"><span><small>PARFAITS</small><b>{hud.parfaits}</b></span><span><small>ORDER COMBO</small><b>×{hud.orderCombo}</b></span></div>
            <div className="psr-progress-row"><span>ORDER PROGRESS</span><b>{hud.order.collected.length} / {hud.order.required.length}</b></div><div className="psr-route-track"><i style={{ width: `${clamp(orderProgress * 100, 0, 100)}%` }} /></div>
          </div>
          <div className="psr-controls-card"><div className="psr-panel-heading"><span>HOW TO RUN</span><button onClick={() => controlsRef.current?.pause()} disabled={!isActive}>{phase === 'paused' ? 'RESUME' : 'PAUSE'}</button></div><div className="psr-control-row"><kbd>SPACE</kbd><span><b>JUMP</b><small>高所の注文材料を取る</small></span></div><div className="psr-control-row"><kbd>↓</kbd><span><b>SLIDE</b><small>障害物をくぐり材料へ向かう</small></span></div><div className="psr-control-row"><kbd>SHIFT</kbd><span><b>DASH</b><small>障害物を壊して注文を守る</small></span></div></div>
          <div className="psr-tip"><span>CHEF'S TIP</span><p>金色の「!」が付いた材料が今ほしいもの。衝突すると注文コンボがリセットされます。</p></div>
        </aside>
      </section>
      <footer className="psr-footer"><span>HOWASABA MIDNIGHT KITCHEN</span><span>CHECK · COLLECT · COMPLETE · DELIVER</span><b>© NIGHT DELIVERY CLUB</b></footer>
    </main>
  );
}
