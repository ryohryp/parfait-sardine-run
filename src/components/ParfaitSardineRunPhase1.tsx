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
import './ParfaitSardineRun.css';

type Phase = 'menu' | 'playing' | 'paused' | 'over';
type ObstacleKind = 'crate' | 'fork' | 'bird';
type PickupKind = 'sardine' | 'cherry' | 'star' | IngredientKind;

type Obstacle = { kind: ObstacleKind; x: number; y: number; w: number; h: number; hit: boolean; passed: boolean };
type Pickup = { kind: PickupKind; x: number; y: number; radius: number; phase: number };
type Player = { x: number; y: number; vy: number; jumps: number; slide: number; dash: number; invulnerable: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string };

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

const INGREDIENT_INFO: Record<IngredientKind, { label: string; icon: string; color: string }> = {
  strawberry: { label: 'イチゴ', icon: '🍓', color: '#ff537b' },
  pudding: { label: 'プリン', icon: '🍮', color: '#ffe86b' },
  cream: { label: 'クリーム', icon: '☁', color: '#f8f4e8' },
  banana: { label: 'バナナ', icon: '🍌', color: '#ffc963' },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const isIngredient = (kind: PickupKind): kind is IngredientKind => (INGREDIENT_KINDS as readonly string[]).includes(kind);
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
        const power = 50 + Math.random() * 150;
        const life = 0.35 + Math.random() * 0.4;
        particles.push({ x, y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - 40, life, maxLife: life, size: 3 + Math.random() * 5, color });
      }
    };
    const addFever = (amount: number) => {
      if (feverTime > 0) return;
      fever = clamp(fever + amount, 0, 100);
      if (fever >= 100) {
        fever = 0;
        feverTime = 7;
        announce('SARDINE FEVER!', 1.2);
        burst(player.x + 35, player.y + 35, '#ffe86b', 30);
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
        radius: kind === 'star' ? 20 : isIngredient(kind) ? 19 : 16, phase: Math.random() * Math.PI * 2,
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
      score += 120 * orderCombo; announce(`${info.icon} ${info.label} GET!`, 0.5); burst(x, y, info.color, 10); tone(590 + order.collected.length * 90);
      if (!progress.completed) return;
      const bonus = calculateOrderScore(orderCombo);
      score += bonus; parfaits += 1; maxOrderCombo = Math.max(maxOrderCombo, orderCombo);
      announce(`PERFECT PARFAIT! +${bonus.toLocaleString('ja-JP')}`, 1.05); burst(player.x + 35, player.y + 28, '#ffe86b', 30); tone(880, 0.2);
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
            obstacle.hit = true; score += 180 * combo; combo = Math.min(12, combo + 1); addFever(8); shake = 0.32; announce('SMASH!', 0.5); burst(obstacle.x, obstacle.y, '#79f2ff', 14);
          } else if (player.invulnerable <= 0) {
            obstacle.hit = true; lives -= 1; combo = 1; orderCombo = 1; player.invulnerable = 1.35; shake = 0.72;
            announce(lives > 0 ? 'ORDER COMBO LOST!' : 'PARFAIT SPILL!', 0.9); burst(player.x, player.y, '#ff537b', 20); if (lives <= 0) finish(false);
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
          else if (pickup.kind === 'sardine') { sardines += 1; combo = Math.min(12, combo + 1); score += 55 * combo; addFever(12); }
          else if (pickup.kind === 'cherry') { score += 350 * combo; addFever(28); announce('CHERRY BONUS +350', 0.6); }
          else { fever = 100; addFever(0); }
          pickups.splice(i, 1);
        } else if (pickup.x < -50) pickups.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i]; particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 260 * dt;
        if (particle.life <= 0) particles.splice(i, 1);
      }
      if (elapsed >= RUN_TIME) finish(true);
    };

    const drawRounded = (x: number, y: number, w: number, h: number, radius: number, color: string) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
    };
    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, feverTime > 0 ? '#352067' : '#151a40'); gradient.addColorStop(0.65, '#503a79'); gradient.addColorStop(1, '#f67b88');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffe9ac'; ctx.beginPath(); ctx.arc(790, 92, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#292651';
      const offset = (worldTime * 55) % 150;
      for (let i = -1; i < 9; i += 1) { const x = i * 150 - offset; const height = 70 + ((i * 43 + 280) % 95); ctx.fillRect(x, GROUND - 78 - height, 112, height + 78); }
      ctx.fillStyle = '#211f3f'; ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND); ctx.fillStyle = '#ffcf63'; ctx.fillRect(0, GROUND + 64, WIDTH, 5);
    };
    const drawPlayer = () => {
      const x = player.x + (player.dash > 0 ? 20 : 0); const y = player.slide > 0 ? GROUND - 41 : player.y;
      if (player.invulnerable > 0 && Math.floor(worldTime * 18) % 2 === 0) ctx.globalAlpha = 0.35;
      drawRounded(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16, '#f8f4e8');
      ctx.fillStyle = '#ff6fae'; ctx.fillRect(x + 8, y + 33, 48, player.slide > 0 ? 8 : 12);
      ctx.fillStyle = '#79d9ec'; ctx.beginPath(); ctx.ellipse(x + 31, y + 8, 25, 13, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    const drawObstacle = (obstacle: Obstacle) => {
      if (obstacle.kind === 'crate') drawRounded(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 8, '#b66b4b');
      else if (obstacle.kind === 'fork') drawRounded(obstacle.x + 14, obstacle.y, 16, obstacle.h, 7, '#d7daf0');
      else { ctx.fillStyle = '#ffcf63'; ctx.beginPath(); ctx.ellipse(obstacle.x + 38, obstacle.y + 22, 28, 17, 0, 0, Math.PI * 2); ctx.fill(); }
    };
    const drawIngredient = (pickup: Pickup, ingredient: IngredientKind, y: number) => {
      const info = INGREDIENT_INFO[ingredient]; const needed = order.required.includes(ingredient) && !order.collected.includes(ingredient);
      ctx.shadowBlur = needed ? 26 : 12; ctx.shadowColor = needed ? '#ffe86b' : info.color;
      drawRounded(pickup.x - 19, y - 18, 38, 36, 11, info.color); ctx.shadowBlur = 0;
      ctx.fillStyle = '#17152e'; ctx.font = '900 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(info.icon, pickup.x, y);
      if (needed) { ctx.fillStyle = '#ffe86b'; ctx.font = '900 16px system-ui, sans-serif'; ctx.fillText('!', pickup.x + 22, y - 20); }
    };
    const drawPickup = (pickup: Pickup) => {
      const y = pickup.y + Math.sin(pickup.phase) * 5;
      if (isIngredient(pickup.kind)) { drawIngredient(pickup, pickup.kind, y); return; }
      ctx.fillStyle = pickup.kind === 'sardine' ? '#79d9ec' : pickup.kind === 'cherry' ? '#ff537b' : '#ffe86b';
      ctx.beginPath(); ctx.arc(pickup.x, y, pickup.radius, 0, Math.PI * 2); ctx.fill();
    };
    const draw = () => {
      ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 18, (Math.random() - 0.5) * shake * 12);
      drawBackground(); pickups.forEach(drawPickup); obstacles.forEach(drawObstacle); drawPlayer();
      for (const particle of particles) { ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (countdown > 0 && gamePhase === 'playing') {
        const label = countdown < 0.65 ? 'GO!' : String(Math.ceil(countdown)); ctx.fillStyle = 'rgba(16, 15, 38, .38)'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#ffe86b'; ctx.font = '900 112px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, WIDTH / 2, HEIGHT / 2);
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
      <header className="psr-topbar">
        <div className="psr-brand"><span className="psr-brand-mark" aria-hidden="true">P/S</span><span>PARFAIT SARDINE RUN</span></div>
        <div className="psr-top-actions"><span className="psr-night-pill">ORDER RUSH · 00:60</span><button className="psr-icon-button" onClick={() => { mutedRef.current = !muted; setMuted(!muted); }}>{muted ? 'SOUND OFF' : 'SOUND ON'}</button></div>
      </header>

      <section className="psr-layout">
        <div className={`psr-game-frame ${hud.feverTime > 0 ? 'is-fever' : ''}`}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="パフェ・サーディン・ランのゲーム画面" />
          {isActive && <div className="psr-hud" aria-live="polite">
            <div className="psr-hud-left"><span className="psr-kicker">SCORE</span><strong>{hud.score.toLocaleString('ja-JP')}</strong><span className="psr-combo">RUN ×{hud.combo}</span></div>
            <div className="psr-hud-center"><div className="psr-fever-label"><span>FEVER</span><b>{hud.feverTime > 0 ? `${hud.feverTime.toFixed(1)}s` : `${Math.floor(hud.fever)}%`}</b></div><div className="psr-fever-track"><i style={{ width: hud.feverTime > 0 ? '100%' : `${hud.fever}%` }} /></div></div>
            <div className="psr-hud-right"><span className={`psr-timer ${hud.time <= 10 ? 'danger' : ''}`}>{Math.ceil(hud.time).toString().padStart(2, '0')}</span><span className="psr-hearts">{'♥'.repeat(hud.lives)}{'♡'.repeat(3 - hud.lives)}</span><span className="psr-fish-count">🐟 {hud.sardines}</span></div>
          </div>}
          {isActive && <div style={{ position: 'absolute', zIndex: 9, top: '17%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '7px 11px', borderRadius: 999, border: '1px solid rgba(248,244,232,.55)', background: 'rgba(15,14,36,.78)', fontSize: 'clamp(.48rem,1vw,.68rem)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            <b style={{ color: '#79f2ff' }}>ORDER #{hud.order.number.toString().padStart(4, '0')}</b>
            {ingredientRows.map(({ ingredient, info, collected }) => <span key={ingredient} style={{ opacity: collected ? .48 : 1, textDecoration: collected ? 'line-through' : 'none' }}>{collected ? '✓' : '・'} {info.icon} {info.label}</span>)}
            <b style={{ color: '#ffe86b' }}>×{hud.orderCombo}</b>
          </div>}
          {hud.message && isActive && <div className="psr-callout">{hud.message}</div>}
          {phase === 'menu' && <div className="psr-overlay psr-title-screen"><div className="psr-eyebrow">MIDNIGHT PARFAIT ORDER RUSH</div><h1><span>PARFAIT</span><br />SARDINE RUN</h1><p>注文を見極め、材料をそろえろ。</p><button className="psr-play-button" onClick={() => controlsRef.current?.start()}><span>RUN START</span><kbd>ENTER</kbd></button><div className="psr-title-stats"><span>BEST <b>{hud.best.toLocaleString('ja-JP')}</b></span><span>MISSION <b>60 SEC</b></span></div></div>}
          {phase === 'paused' && <div className="psr-overlay psr-pause-screen"><span className="psr-eyebrow">CREAM BREAK</span><h2>PAUSED</h2><button className="psr-play-button" onClick={() => controlsRef.current?.pause()}>走りに戻る</button></div>}
          {phase === 'over' && <div className="psr-overlay psr-result-screen"><span className="psr-eyebrow">{hud.result === 'clear' ? `${hud.parfaits} PARFAITS COMPLETE` : 'DELIVERY FAILED'}</span><h2>{hud.result === 'clear' ? 'DELIVERED!' : 'PARFAIT SPILL!'}</h2><div className="psr-result-score">{hud.score.toLocaleString('ja-JP')}</div><div className="psr-result-grid"><span><small>SARDINES</small><b>{hud.sardines}</b></span><span><small>DISTANCE</small><b>{Math.floor(hud.distance)}m</b></span><span><small>BEST</small><b>{hud.best.toLocaleString('ja-JP')}</b></span></div><div className="psr-result-grid" style={{ marginTop: 0 }}><span><small>PARFAITS</small><b>{hud.parfaits}</b></span><span><small>MAX ORDER COMBO</small><b>×{hud.maxOrderCombo}</b></span></div><button className="psr-play-button" onClick={() => controlsRef.current?.start()}><span>RUN AGAIN</span><kbd>ENTER</kbd></button></div>}
          {isActive && <div className="psr-mobile-controls" aria-label="タッチ操作"><button onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.slide(); }}><span>▼</span>SLIDE</button><button className="jump" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.jump(); }}><span>↑</span>JUMP</button><button className="dash" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.dash(); }}><span>→</span>DASH</button></div>}
        </div>

        <aside className="psr-side-panel">
          <div className="psr-panel-heading"><span>TONIGHT'S ORDER</span><i>LIVE</i></div>
          <div className="psr-order-card">
            <span className="psr-order-no">ORDER #{hud.order.number.toString().padStart(4, '0')}</span><h2>材料を集めて<br />パフェを完成</h2>
            <div style={{ display: 'grid', gap: 9, marginBottom: 18 }}>{ingredientRows.map(({ ingredient, info, collected }) => <div key={ingredient} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 11px', borderRadius: 8, border: `1px solid ${collected ? 'rgba(121,242,255,.55)' : 'rgba(248,244,232,.18)'}`, background: collected ? 'rgba(121,242,255,.08)' : 'rgba(15,14,36,.2)' }}><span style={{ color: info.color, fontWeight: 800 }}>{info.icon} {info.label}</span><b style={{ color: collected ? '#79f2ff' : 'rgba(248,244,232,.45)' }}>{collected ? 'GET' : 'WAIT'}</b></div>)}</div>
            <div className="psr-order-meta"><span><small>PARFAITS</small><b>{hud.parfaits}</b></span><span><small>ORDER COMBO</small><b>×{hud.orderCombo}</b></span></div>
            <div className="psr-progress-row"><span>ORDER PROGRESS</span><b>{hud.order.collected.length} / {hud.order.required.length}</b></div><div className="psr-route-track"><i style={{ width: `${clamp(orderProgress * 100, 0, 100)}%` }} /></div>
          </div>
          <div className="psr-controls-card"><div className="psr-panel-heading"><span>HOW TO RUN</span><button onClick={() => controlsRef.current?.pause()} disabled={!isActive}>{phase === 'paused' ? 'RESUME' : 'PAUSE'}</button></div><div className="psr-control-row"><kbd>SPACE</kbd><span><b>JUMP</b><small>高所の注文材料を取る</small></span></div><div className="psr-control-row"><kbd>↓</kbd><span><b>SLIDE</b><small>障害物をくぐり材料へ向かう</small></span></div><div className="psr-control-row"><kbd>SHIFT</kbd><span><b>DASH</b><small>障害物を壊して注文を守る</small></span></div></div>
          <div className="psr-tip"><span>CHEF'S TIP</span><p>黄色い「!」付きが必要材料。衝突すると注文コンボは1へ戻ります。</p></div>
        </aside>
      </section>
      <footer className="psr-footer"><span>HOWASABA MIDNIGHT KITCHEN</span><span>CHECK · COLLECT · COMPLETE · DELIVER</span></footer>
    </main>
  );
}
