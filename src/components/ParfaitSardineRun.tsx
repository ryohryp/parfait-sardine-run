import { useEffect, useRef, useState } from 'react';
import './ParfaitSardineRun.css';

type Phase = 'menu' | 'playing' | 'paused' | 'over';
export type ParfaitSardineRunPhase = Phase;

type ParfaitSardineRunProps = {
  onPhaseChange?: (phase: ParfaitSardineRunPhase) => void;
};
type ObstacleKind = 'crate' | 'fork' | 'bird';
type PickupKind = 'sardine' | 'cherry' | 'star';

type Obstacle = {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hit: boolean;
  passed: boolean;
};

type Pickup = {
  kind: PickupKind;
  x: number;
  y: number;
  radius: number;
  phase: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'dot' | 'star';
};

type Player = {
  x: number;
  y: number;
  vy: number;
  jumps: number;
  slide: number;
  dash: number;
  invulnerable: number;
};

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
};

type GameControls = {
  start: () => void;
  jump: () => void;
  slide: () => void;
  dash: () => void;
  pause: () => void;
};

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 432;
const RUN_TIME = 60;
const BEST_KEY = 'psr_midnight_best_v2';

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
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ParfaitSardineRun({ onPhaseChange }: ParfaitSardineRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<GameControls | null>(null);
  const mutedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('menu');
  const [hud, setHud] = useState<HudState>(initialHud);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    let spawnTimer = 1.25;
    let pickupTimer = 0.7;
    let shake = 0;
    let flash = 0;
    let message = '';
    let messageTime = 0;
    let result: HudState['result'] = null;
    let audio: AudioContext | null = null;
    const obstacles: Obstacle[] = [];
    const pickups: Pickup[] = [];
    const particles: Particle[] = [];
    const player: Player = { x: 166, y: GROUND - 76, vy: 0, jumps: 0, slide: 0, dash: 0, invulnerable: 0 };

    const syncHud = () => {
      setHud({
        score: Math.floor(score),
        best,
        lives,
        combo,
        sardines,
        fever,
        feverTime,
        time: Math.max(0, RUN_TIME - elapsed),
        distance,
        message: messageTime > 0 ? message : '',
        result,
      });
    };

    const tone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.05) => {
      if (mutedRef.current) return;
      try {
        audio ??= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 1.35), audio.currentTime + duration);
        gain.gain.setValueAtTime(volume, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch {
        // Audio is optional; gameplay must remain available when autoplay is blocked.
      }
    };

    const burst = (x: number, y: number, color: string, count: number, shape: Particle['shape'] = 'dot') => {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const power = 50 + Math.random() * 180;
        const life = 0.35 + Math.random() * 0.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power - 45,
          life,
          maxLife: life,
          size: 3 + Math.random() * 6,
          color,
          shape,
        });
      }
    };

    const announce = (text: string, time = 0.8) => {
      message = text;
      messageTime = time;
    };

    const enterFever = () => {
      fever = 0;
      feverTime = 7;
      flash = 0.65;
      announce('SARDINE FEVER!', 1.4);
      burst(player.x + 35, player.y + 35, '#ffe86b', 34, 'star');
      tone(440, 0.22, 'square', 0.045);
      window.setTimeout(() => tone(660, 0.28, 'square', 0.04), 90);
    };

    const addFever = (amount: number) => {
      if (feverTime > 0) return;
      fever = clamp(fever + amount, 0, 100);
      if (fever >= 100) enterFever();
    };

    const setGamePhase = (next: Phase) => {
      gamePhase = next;
      setPhase(next);
    };

    const finish = (didClear: boolean) => {
      if (gamePhase !== 'playing') return;
      result = didClear ? 'clear' : 'crash';
      if (didClear) {
        score += lives * 1000 + sardines * 25;
        announce('DELIVERY COMPLETE!', 10);
        burst(player.x + 45, player.y + 30, '#ff6fae', 48, 'star');
        tone(523, 0.25, 'triangle', 0.05);
        window.setTimeout(() => tone(784, 0.4, 'triangle', 0.05), 120);
      } else {
        announce('PARFAIT SPILL!', 10);
        tone(150, 0.45, 'sawtooth', 0.045);
      }
      best = Math.max(best, Math.floor(score));
      localStorage.setItem(BEST_KEY, String(best));
      setGamePhase('over');
      syncHud();
    };

    const start = () => {
      elapsed = 0;
      countdown = 2.8;
      score = 0;
      lives = 3;
      combo = 1;
      sardines = 0;
      fever = 0;
      feverTime = 0;
      distance = 0;
      spawnTimer = 1.15;
      pickupTimer = 0.45;
      shake = 0;
      flash = 0;
      result = null;
      obstacles.length = 0;
      pickups.length = 0;
      particles.length = 0;
      player.y = GROUND - 76;
      player.vy = 0;
      player.jumps = 0;
      player.slide = 0;
      player.dash = 0;
      player.invulnerable = 0;
      announce('READY?', 1);
      setGamePhase('playing');
      syncHud();
      tone(330, 0.12, 'square', 0.035);
    };

    const jump = () => {
      if (gamePhase === 'menu' || gamePhase === 'over') {
        start();
        return;
      }
      if (gamePhase !== 'playing' || countdown > 0 || player.jumps >= 2 || player.slide > 0) return;
      player.vy = player.jumps === 0 ? -660 : -585;
      player.jumps += 1;
      burst(player.x + 26, GROUND - 8, '#f7d9ba', 7);
      tone(player.jumps === 1 ? 310 : 430, 0.12, 'square', 0.028);
    };

    const slide = () => {
      if (gamePhase !== 'playing' || countdown > 0) return;
      if (player.y >= GROUND - 78) {
        player.slide = 0.62;
        tone(190, 0.1, 'sawtooth', 0.025);
      } else {
        player.vy = Math.max(player.vy, 520);
      }
    };

    const dash = () => {
      if (gamePhase !== 'playing' || countdown > 0 || player.dash > 0) return;
      player.dash = feverTime > 0 ? 0.65 : 0.38;
      player.invulnerable = Math.max(player.invulnerable, player.dash);
      burst(player.x + 10, player.y + 42, '#79f2ff', 12);
      tone(110, 0.2, 'sawtooth', 0.035);
    };

    const pause = () => {
      if (gamePhase === 'playing' && countdown <= 0) setGamePhase('paused');
      else if (gamePhase === 'paused') {
        last = performance.now();
        setGamePhase('playing');
      }
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
      let obstacle: Obstacle;
      if (roll < 0.43) {
        obstacle = { kind: 'crate', x: WIDTH + 60, y: GROUND - 58, w: 62, h: 58, hit: false, passed: false };
      } else if (roll < 0.73 || difficulty < 0.25) {
        obstacle = { kind: 'bird', x: WIDTH + 60, y: GROUND - 112, w: 76, h: 45, hit: false, passed: false };
      } else {
        obstacle = { kind: 'fork', x: WIDTH + 60, y: GROUND - 104, w: 42, h: 104, hit: false, passed: false };
      }
      obstacles.push(obstacle);
    };

    const spawnPickupTrail = () => {
      const kind: PickupKind = Math.random() < 0.08 ? 'star' : Math.random() < 0.18 ? 'cherry' : 'sardine';
      const high = Math.random() < 0.48;
      const count = kind === 'sardine' ? 3 + Math.floor(Math.random() * 3) : 1;
      for (let i = 0; i < count; i += 1) {
        pickups.push({
          kind,
          x: WIDTH + 60 + i * 54,
          y: high ? GROUND - 145 - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 65 : GROUND - 48,
          radius: kind === 'star' ? 20 : 16,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const playerBox = () => {
      const sliding = player.slide > 0;
      return {
        x: player.x + (player.dash > 0 ? 0 : 10),
        y: sliding ? GROUND - 37 : player.y + 7,
        w: player.dash > 0 ? 82 : 45,
        h: sliding ? 30 : 64,
      };
    };

    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const update = (dt: number) => {
      worldTime += dt;
      messageTime = Math.max(0, messageTime - dt);
      flash = Math.max(0, flash - dt);
      shake = Math.max(0, shake - dt * 3.5);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.dash = Math.max(0, player.dash - dt);
      player.slide = Math.max(0, player.slide - dt);

      if (countdown > 0) {
        const before = Math.ceil(countdown);
        countdown = Math.max(0, countdown - dt);
        const after = Math.ceil(countdown);
        if (before !== after) tone(after === 0 ? 620 : 360, 0.1, 'square', 0.035);
        if (countdown === 0) announce('GO!', 0.75);
        return;
      }

      elapsed += dt;
      const difficulty = clamp(elapsed / RUN_TIME, 0, 1);
      const speed = 370 + difficulty * 235 + (feverTime > 0 ? 55 : 0);
      distance += speed * dt * 0.026;
      score += dt * (42 + difficulty * 35) * (feverTime > 0 ? 3 : 1);

      feverTime = Math.max(0, feverTime - dt);
      if (feverTime > 0) {
        player.invulnerable = Math.max(player.invulnerable, 0.15);
        if (Math.random() < dt * 18) burst(player.x + Math.random() * 70, player.y + Math.random() * 70, '#ffe86b', 1, 'star');
      }

      player.vy += 1680 * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND - 76) {
        player.y = GROUND - 76;
        player.vy = 0;
        player.jumps = 0;
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnObstacle(difficulty);
        spawnTimer = Math.max(0.62, 1.28 - difficulty * 0.42) + Math.random() * 0.42;
      }
      pickupTimer -= dt;
      if (pickupTimer <= 0) {
        spawnPickupTrail();
        pickupTimer = 1.55 + Math.random() * 1.45;
      }

      const box = playerBox();
      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = obstacles[i];
        obstacle.x -= speed * dt;
        if (!obstacle.hit && overlaps(box, obstacle)) {
          if (player.dash > 0 || feverTime > 0) {
            obstacle.hit = true;
            score += 180 * combo * (feverTime > 0 ? 2 : 1);
            combo = Math.min(12, combo + 1);
            addFever(8);
            shake = 0.32;
            announce('SMASH! +' + Math.floor(180 * combo), 0.55);
            burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, '#79f2ff', 18, 'star');
            tone(95, 0.16, 'square', 0.04);
          } else if (player.invulnerable <= 0) {
            obstacle.hit = true;
            lives -= 1;
            combo = 1;
            player.invulnerable = 1.35;
            shake = 0.72;
            flash = 0.35;
            announce(lives > 0 ? 'WATCH THE TOPPING!' : 'PARFAIT SPILL!', 0.9);
            burst(player.x + 35, player.y + 38, '#ff537b', 22);
            tone(125, 0.34, 'sawtooth', 0.055);
            if (lives <= 0) finish(false);
          }
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < player.x && !obstacle.hit) {
          obstacle.passed = true;
          combo = Math.min(12, combo + 1);
          score += 65 * combo;
          addFever(5);
          announce('CLOSE CALL  ×' + combo, 0.45);
          tone(520, 0.08, 'triangle', 0.025);
        }
        if (obstacle.x < -120) obstacles.splice(i, 1);
      }

      for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const pickup = pickups[i];
        pickup.x -= speed * dt;
        pickup.phase += dt * 5;
        const dx = box.x + box.w / 2 - pickup.x;
        const dy = box.y + box.h / 2 - (pickup.y + Math.sin(pickup.phase) * 5);
        const magnet = feverTime > 0 && Math.hypot(dx, dy) < 250;
        if (magnet) {
          pickup.x += dx * dt * 6;
          pickup.y += dy * dt * 6;
        }
        if (Math.abs(dx) < box.w / 2 + pickup.radius && Math.abs(dy) < box.h / 2 + pickup.radius) {
          if (pickup.kind === 'sardine') {
            sardines += 1;
            combo = Math.min(12, combo + 1);
            score += 55 * combo * (feverTime > 0 ? 3 : 1);
            addFever(12);
            burst(pickup.x, pickup.y, '#79f2ff', 7);
            tone(520 + combo * 18, 0.08, 'square', 0.022);
          } else if (pickup.kind === 'cherry') {
            score += 350 * combo;
            addFever(28);
            announce('CHERRY BONUS +350', 0.65);
            burst(pickup.x, pickup.y, '#ff537b', 14, 'star');
            tone(720, 0.12, 'triangle', 0.035);
          } else {
            fever = 100;
            enterFever();
          }
          pickups.splice(i, 1);
        } else if (pickup.x < -50) pickups.splice(i, 1);
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 260 * dt;
        particle.vx *= Math.pow(0.985, dt * 60);
        if (particle.life <= 0) particles.splice(i, 1);
      }

      if (elapsed >= RUN_TIME) finish(true);
    };

    const roundedRect = (x: number, y: number, w: number, h: number, radius: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
    };

    const drawStar = (x: number, y: number, radius: number, color: string, rotation = 0) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = rotation - Math.PI / 2 + (i * Math.PI) / 5;
        const length = i % 2 === 0 ? radius : radius * 0.45;
        const px = x + Math.cos(angle) * length;
        const py = y + Math.sin(angle) * length;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawBackground = (speedFactor: number) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, feverTime > 0 ? '#352067' : '#151a40');
      gradient.addColorStop(0.62, feverTime > 0 ? '#cc4d86' : '#503a79');
      gradient.addColorStop(1, '#f67b88');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 28; i += 1) {
        const x = ((i * 151 - worldTime * (8 + (i % 3) * 4)) % (WIDTH + 30) + WIDTH + 30) % (WIDTH + 30);
        const y = 28 + ((i * 67) % 260);
        const size = i % 5 === 0 ? 2.4 : 1.2;
        ctx.fillStyle = i % 4 === 0 ? '#79f2ff' : '#fff7d6';
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffe9ac';
      ctx.beginPath();
      ctx.arc(790, 92, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#151a40';
      ctx.beginPath();
      ctx.arc(812, 72, 49, 0, Math.PI * 2);
      ctx.fill();

      const backOffset = (worldTime * speedFactor * 0.12) % 150;
      ctx.fillStyle = '#292651';
      for (let i = -1; i < 9; i += 1) {
        const x = i * 150 - backOffset;
        const height = 70 + ((i * 43 + 280) % 95);
        ctx.fillRect(x, GROUND - 78 - height, 112, height + 78);
        ctx.fillStyle = '#ffc963';
        for (let wy = GROUND - height - 58; wy < GROUND - 48; wy += 28) {
          for (let wx = x + 16; wx < x + 96; wx += 28) {
            if ((Math.floor(wx + wy) / 7) % 3 > 1) ctx.fillRect(wx, wy, 8, 12);
          }
        }
        ctx.fillStyle = '#292651';
      }

      ctx.fillStyle = '#211f3f';
      ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      ctx.fillStyle = '#34305c';
      ctx.fillRect(0, GROUND, WIDTH, 11);
      ctx.fillStyle = '#ffcf63';
      ctx.fillRect(0, GROUND + 64, WIDTH, 5);
      const stripeOffset = (worldTime * speedFactor * 1.1) % 115;
      ctx.fillStyle = '#7169a0';
      for (let x = -115; x < WIDTH + 115; x += 115) ctx.fillRect(x - stripeOffset, GROUND + 25, 62, 6);
      ctx.fillStyle = '#17152e';
      ctx.fillRect(0, GROUND + 82, WIDTH, 26);
    };

    const drawPlayer = () => {
      const blink = player.invulnerable > 0 && Math.floor(worldTime * 18) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.35;
      const x = player.x + (player.dash > 0 ? 22 : 0);
      const groundBob = player.y >= GROUND - 76 && player.slide <= 0 ? Math.sin(worldTime * 14) * 2.5 : 0;
      const y = player.slide > 0 ? GROUND - 41 : player.y + groundBob;

      if (player.dash > 0 || feverTime > 0) {
        ctx.globalAlpha = 0.18;
        for (let i = 1; i <= 4; i += 1) {
          ctx.fillStyle = i % 2 ? '#79f2ff' : '#ff6fae';
          roundedRect(x - i * 24, y + 16, 58, 45, 20);
          ctx.fill();
        }
        ctx.globalAlpha = blink ? 0.35 : 1;
      }

      ctx.save();
      if (player.slide > 0) {
        ctx.translate(x + 30, y + 20);
        ctx.rotate(-0.16);
        ctx.translate(-x - 30, -y - 20);
      }

      // Glass cup and parfait layers.
      ctx.fillStyle = '#f8f4e8';
      roundedRect(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16);
      ctx.fill();
      ctx.fillStyle = '#ff6fae';
      ctx.fillRect(x + 8, y + 33, 48, player.slide > 0 ? 8 : 12);
      ctx.fillStyle = '#ffc963';
      ctx.fillRect(x + 9, y + 45, 46, player.slide > 0 ? 5 : 11);
      ctx.fillStyle = '#79f2ff';
      ctx.fillRect(x + 10, y + 56, 44, player.slide > 0 ? 4 : 7);
      ctx.strokeStyle = '#17152e';
      ctx.lineWidth = 4;
      roundedRect(x + 4, y + 8, 56, player.slide > 0 ? 31 : 60, 16);
      ctx.stroke();

      // Sardine pilot.
      ctx.fillStyle = '#79d9ec';
      ctx.beginPath();
      ctx.ellipse(x + 31, y + 8, 25, 13, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 5);
      ctx.lineTo(x - 5, y - 5);
      ctx.lineTo(x - 2, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#17152e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#17152e';
      ctx.beginPath();
      ctx.arc(x + 43, y + 5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffcf63';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + 31, y + 4, 14, Math.PI, 0);
      ctx.stroke();

      if (player.slide <= 0) {
        ctx.fillStyle = '#f8f4e8';
        ctx.fillRect(x + 22, y + 68, 7, 8);
        ctx.fillRect(x + 41, y + 68, 7, 8);
        ctx.fillStyle = '#ff537b';
        ctx.fillRect(x + 16, y + 73, 17, 6);
        ctx.fillRect(x + 37, y + 73, 17, 6);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const drawObstacle = (obstacle: Obstacle) => {
      ctx.globalAlpha = obstacle.hit ? 0.3 : 1;
      if (obstacle.kind === 'crate') {
        ctx.fillStyle = '#b66b4b';
        roundedRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 8);
        ctx.fill();
        ctx.strokeStyle = '#17152e';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#ffc963';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 11, obstacle.y + 10);
        ctx.lineTo(obstacle.x + obstacle.w - 11, obstacle.y + obstacle.h - 10);
        ctx.moveTo(obstacle.x + obstacle.w - 11, obstacle.y + 10);
        ctx.lineTo(obstacle.x + 11, obstacle.y + obstacle.h - 10);
        ctx.stroke();
      } else if (obstacle.kind === 'fork') {
        ctx.fillStyle = '#d7daf0';
        roundedRect(obstacle.x + 14, obstacle.y + 28, 14, obstacle.h - 28, 7);
        ctx.fill();
        for (let i = 0; i < 3; i += 1) ctx.fillRect(obstacle.x + 4 + i * 14, obstacle.y, 7, 38);
        ctx.strokeStyle = '#17152e';
        ctx.lineWidth = 4;
        roundedRect(obstacle.x + 14, obstacle.y + 28, 14, obstacle.h - 28, 7);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffcf63';
        ctx.beginPath();
        ctx.ellipse(obstacle.x + 38, obstacle.y + 22, 27, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8f4e8';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 24, obstacle.y + 19);
        ctx.lineTo(obstacle.x - 3, obstacle.y - 3);
        ctx.lineTo(obstacle.x + 13, obstacle.y + 27);
        ctx.moveTo(obstacle.x + 50, obstacle.y + 19);
        ctx.lineTo(obstacle.x + 79, obstacle.y - 2);
        ctx.lineTo(obstacle.x + 61, obstacle.y + 28);
        ctx.fill();
        ctx.fillStyle = '#17152e';
        ctx.beginPath();
        ctx.arc(obstacle.x + 29, obstacle.y + 19, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawPickup = (pickup: Pickup) => {
      const y = pickup.y + Math.sin(pickup.phase) * 5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = pickup.kind === 'sardine' ? '#79f2ff' : '#ffcf63';
      if (pickup.kind === 'sardine') {
        ctx.fillStyle = '#79d9ec';
        ctx.beginPath();
        ctx.ellipse(pickup.x, y, 18, 9, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pickup.x - 15, y);
        ctx.lineTo(pickup.x - 27, y - 10);
        ctx.lineTo(pickup.x - 25, y + 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#17152e';
        ctx.beginPath();
        ctx.arc(pickup.x + 8, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pickup.kind === 'cherry') {
        ctx.strokeStyle = '#79e6ad';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pickup.x, y - 5);
        ctx.quadraticCurveTo(pickup.x + 8, y - 28, pickup.x + 22, y - 25);
        ctx.stroke();
        ctx.fillStyle = '#ff537b';
        ctx.beginPath();
        ctx.arc(pickup.x - 6, y + 5, 11, 0, Math.PI * 2);
        ctx.arc(pickup.x + 10, y + 8, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawStar(pickup.x, y, 23, '#ffe86b', worldTime * 2);
      }
      ctx.shadowBlur = 0;
    };

    const drawParticles = () => {
      for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        if (particle.shape === 'star') drawStar(particle.x, particle.y, particle.size, particle.color, worldTime * 3);
        else {
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const difficulty = clamp(elapsed / RUN_TIME, 0, 1);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 18, (Math.random() - 0.5) * shake * 12);
      drawBackground(370 + difficulty * 235);
      for (const pickup of pickups) drawPickup(pickup);
      for (const obstacle of obstacles) drawObstacle(obstacle);
      drawPlayer();
      drawParticles();

      if (countdown > 0 && gamePhase === 'playing') {
        const label = countdown < 0.65 ? 'GO!' : String(Math.ceil(countdown));
        ctx.fillStyle = 'rgba(16, 15, 38, .38)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 112px system-ui, sans-serif';
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#17152e';
        ctx.strokeText(label, WIDTH / 2, HEIGHT / 2);
        ctx.fillStyle = '#ffe86b';
        ctx.fillText(label, WIDTH / 2, HEIGHT / 2);
      }

      if (flash > 0) {
        ctx.fillStyle = feverTime > 0 ? `rgba(255, 232, 107, ${flash * 0.25})` : `rgba(255, 65, 104, ${flash * 0.35})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      ctx.restore();
    };

    const frame = (time: number) => {
      const dt = Math.min(0.033, Math.max(0, (time - last) / 1000));
      last = time;
      if (gamePhase === 'playing') update(dt);
      else worldTime += dt * (gamePhase === 'menu' ? 0.35 : 0.08);
      draw();
      uiClock += dt;
      if (uiClock >= 0.08) {
        uiClock = 0;
        syncHud();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      controlsRef.current = null;
      void audio?.close();
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
  };

  const isActive = phase === 'playing' || phase === 'paused';
  const timeClass = hud.time <= 10 && isActive ? 'danger' : '';

  return (
    <main className="psr-shell">
      <header className="psr-topbar">
        <div className="psr-brand">
          <span className="psr-brand-mark" aria-hidden="true">P/S</span>
          <span>PARFAIT SARDINE RUN</span>
        </div>
        <div className="psr-top-actions">
          <span className="psr-night-pill">NIGHT DELIVERY · 00:60</span>
          <button className="psr-icon-button" onClick={toggleMute} aria-label={muted ? 'サウンドをオン' : 'サウンドをオフ'}>
            {muted ? 'SOUND OFF' : 'SOUND ON'}
          </button>
        </div>
      </header>

      <section className="psr-layout">
        <div className={`psr-game-frame ${hud.feverTime > 0 ? 'is-fever' : ''}`}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="パフェ・サーディン・ランのゲーム画面" />

          {isActive && (
            <div className="psr-hud" aria-live="polite">
              <div className="psr-hud-left">
                <span className="psr-kicker">SCORE</span>
                <strong>{hud.score.toLocaleString('ja-JP')}</strong>
                <span className="psr-combo">COMBO ×{hud.combo}</span>
              </div>
              <div className="psr-hud-center">
                <div className="psr-fever-label"><span>FEVER</span><b>{hud.feverTime > 0 ? `${hud.feverTime.toFixed(1)}s` : `${Math.floor(hud.fever)}%`}</b></div>
                <div className="psr-fever-track"><i style={{ width: hud.feverTime > 0 ? '100%' : `${hud.fever}%` }} /></div>
              </div>
              <div className="psr-hud-right">
                <span className={`psr-timer ${timeClass}`}>{Math.ceil(hud.time).toString().padStart(2, '0')}</span>
                <span className="psr-hearts" aria-label={`ライフ ${hud.lives}`}>{'♥'.repeat(hud.lives)}{'♡'.repeat(3 - hud.lives)}</span>
                <span className="psr-fish-count">🐟 {hud.sardines}</span>
              </div>
            </div>
          )}

          {hud.message && isActive && <div className="psr-callout">{hud.message}</div>}

          {phase === 'menu' && (
            <div className="psr-overlay psr-title-screen">
              <div className="psr-eyebrow">MIDNIGHT DESSERT DELIVERY</div>
              <h1><span>PARFAIT</span><br />SARDINE RUN</h1>
              <p>崩れる前に、走りきれ。</p>
              <button className="psr-play-button" onClick={() => controlsRef.current?.start()}>
                <span>RUN START</span><kbd>ENTER</kbd>
              </button>
              <div className="psr-title-stats">
                <span>BEST <b>{hud.best.toLocaleString('ja-JP')}</b></span>
                <span>MISSION <b>60 SEC</b></span>
              </div>
            </div>
          )}

          {phase === 'paused' && (
            <div className="psr-overlay psr-pause-screen">
              <span className="psr-eyebrow">CREAM BREAK</span>
              <h2>PAUSED</h2>
              <button className="psr-play-button" onClick={() => controlsRef.current?.pause()}>走りに戻る</button>
            </div>
          )}

          {phase === 'over' && (
            <div className="psr-overlay psr-result-screen">
              <span className="psr-eyebrow">{hud.result === 'clear' ? 'ORDER #0001 COMPLETE' : 'DELIVERY FAILED'}</span>
              <h2>{hud.result === 'clear' ? 'DELIVERED!' : 'PARFAIT SPILL!'}</h2>
              <div className="psr-result-score">{hud.score.toLocaleString('ja-JP')}</div>
              <div className="psr-result-grid">
                <span><small>SARDINES</small><b>{hud.sardines}</b></span>
                <span><small>DISTANCE</small><b>{Math.floor(hud.distance)}m</b></span>
                <span><small>BEST</small><b>{hud.best.toLocaleString('ja-JP')}</b></span>
              </div>
              <button className="psr-play-button" onClick={() => controlsRef.current?.start()}>
                <span>RUN AGAIN</span><kbd>ENTER</kbd>
              </button>
            </div>
          )}

          {isActive && (
            <div className="psr-mobile-controls" aria-label="タッチ操作">
              <button onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.slide(); }}><span>▼</span>SLIDE</button>
              <button className="jump" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.jump(); }}><span>↑</span>JUMP</button>
              <button className="dash" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.dash(); }}><span>→</span>DASH</button>
            </div>
          )}
        </div>

        <aside className="psr-side-panel">
          <div className="psr-panel-heading">
            <span>TONIGHT'S ORDER</span>
            <i>LIVE</i>
          </div>
          <div className="psr-order-card">
            <span className="psr-order-no">ORDER #0001</span>
            <h2>星降る<br />サーディンパフェ</h2>
            <div className="psr-order-meta">
              <span><small>TIME LIMIT</small><b>60 SEC</b></span>
              <span><small>DESTINATION</small><b>MOON CAFE</b></span>
            </div>
            <div className="psr-progress-row"><span>ROUTE</span><b>{Math.floor(hud.distance)} m</b></div>
            <div className="psr-route-track"><i style={{ width: `${clamp(((RUN_TIME - hud.time) / RUN_TIME) * 100, 0, 100)}%` }} /></div>
          </div>

          <div className="psr-controls-card">
            <div className="psr-panel-heading"><span>HOW TO RUN</span><button onClick={() => controlsRef.current?.pause()} disabled={!isActive}>{phase === 'paused' ? 'RESUME' : 'PAUSE'}</button></div>
            <div className="psr-control-row"><kbd>SPACE</kbd><span><b>JUMP</b><small>2段ジャンプで木箱を越える</small></span></div>
            <div className="psr-control-row"><kbd>↓</kbd><span><b>SLIDE</b><small>空飛ぶカモメをくぐる</small></span></div>
            <div className="psr-control-row"><kbd>SHIFT</kbd><span><b>DASH</b><small>障害物を壊してコンボ</small></span></div>
          </div>

          <div className="psr-tip"><span>CHEF'S TIP</span><p>危険すれすれで避けるとコンボ上昇。FEVER中はサーディンを自動で引き寄せます。</p></div>
        </aside>
      </section>

      <footer className="psr-footer"><span>HOWASABA MIDNIGHT KITCHEN</span><span>JUMP · SLIDE · DASH · DELIVER</span></footer>
    </main>
  );
}
