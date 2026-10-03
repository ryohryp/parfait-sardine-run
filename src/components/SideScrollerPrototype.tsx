import { useEffect, useRef, useState } from 'react';
import './SideScrollerPrototype.css';

type GameStatus = 'playing' | 'clear' | 'gameover';

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
};

type GameModel = {
  player: Player;
  enemies: Enemy[];
  cameraX: number;
  status: GameStatus;
  defeated: number;
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
const PLAYER_WIDTH = 42;
const PLAYER_HEIGHT = 62;
const GOAL_X = WORLD_WIDTH - 170;

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
  },
  enemies: enemyStarts.map((x, index) => ({
    id: index + 1,
    x,
    y: GROUND_Y - 42,
    width: 54,
    height: 42,
    vx: index % 2 === 0 ? 72 : -72,
    minX: x - 105,
    maxX: x + 105,
    hp: 2,
    flash: 0,
  })),
  cameraX: 0,
  status: 'playing',
  defeated: 0,
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
  });

  const restart = () => {
    gameRef.current = createGame();
    attackedThisSwing.current.clear();
    setUi({ hp: 4, status: 'playing', defeated: 0, progress: 0 });
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

    let animationFrame = 0;
    let previousTime = performance.now();
    let lastUiUpdate = 0;

    const drawBackground = (cameraX: number) => {
      const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      gradient.addColorStop(0, '#100923');
      gradient.addColorStop(0.58, '#241044');
      gradient.addColorStop(1, '#070813');
      context.fillStyle = gradient;
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      for (let i = 0; i < 42; i += 1) {
        const worldX = i * 137 + 60;
        const x = ((worldX - cameraX * 0.22) % (VIEW_WIDTH + 120)) - 60;
        const y = 45 + ((i * 83) % 270);
        context.globalAlpha = 0.28 + (i % 4) * 0.1;
        context.fillStyle = i % 3 === 0 ? '#ff81d7' : '#75dcff';
        context.fillRect(x, y, 2 + (i % 2), 2 + (i % 2));
      }
      context.globalAlpha = 1;

      const skylineOffset = -(cameraX * 0.4) % 210;
      context.fillStyle = 'rgba(75, 35, 125, 0.38)';
      for (let x = skylineOffset - 210; x < VIEW_WIDTH + 210; x += 210) {
        const height = 70 + ((x / 7) % 80);
        context.fillRect(x, GROUND_Y - height, 130, height);
        context.fillRect(x + 145, GROUND_Y - height * 0.7, 42, height * 0.7);
      }
    };

    const drawWorld = (game: GameModel) => {
      const { player, enemies, cameraX } = game;

      context.save();
      context.translate(-cameraX, 0);

      context.fillStyle = '#19152d';
      context.fillRect(0, GROUND_Y, WORLD_WIDTH, VIEW_HEIGHT - GROUND_Y);
      context.fillStyle = '#63e6ff';
      context.fillRect(0, GROUND_Y, WORLD_WIDTH, 4);
      context.fillStyle = 'rgba(255, 91, 202, 0.22)';
      for (let x = 0; x < WORLD_WIDTH; x += 84) {
        context.fillRect(x, GROUND_Y + 18, 48, 3);
      }

      for (const platform of platforms) {
        context.fillStyle = '#2b2452';
        context.fillRect(platform.x, platform.y, platform.width, platform.height);
        context.fillStyle = '#ff68ca';
        context.fillRect(platform.x, platform.y, platform.width, 4);
      }

      context.fillStyle = 'rgba(112, 244, 255, 0.12)';
      context.fillRect(GOAL_X - 20, 80, 90, GROUND_Y - 80);
      context.strokeStyle = '#7af6ff';
      context.lineWidth = 5;
      context.strokeRect(GOAL_X, 168, 58, 146);
      context.fillStyle = '#fef3ff';
      context.font = '700 18px system-ui, sans-serif';
      context.fillText('DELIVERY', GOAL_X - 20, 145);
      context.fillText('GOAL', GOAL_X + 4, 245);

      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;

        context.save();
        if (enemy.flash > 0) {
          context.shadowBlur = 24;
          context.shadowColor = '#ffffff';
        }
        context.fillStyle = enemy.flash > 0 ? '#ffffff' : '#6edcff';
        context.beginPath();
        context.ellipse(cx, cy, 25, 16, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ff6dcf';
        context.beginPath();
        const tailX = enemy.vx >= 0 ? enemy.x - 4 : enemy.x + enemy.width + 4;
        context.moveTo(tailX, cy);
        context.lineTo(tailX + (enemy.vx >= 0 ? -18 : 18), cy - 13);
        context.lineTo(tailX + (enemy.vx >= 0 ? -18 : 18), cy + 13);
        context.closePath();
        context.fill();
        context.fillStyle = '#0c0c18';
        const eyeX = cx + (enemy.vx >= 0 ? 10 : -10);
        context.beginPath();
        context.arc(eyeX, cy - 4, 3, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      context.save();
      if (player.invulnerable > 0 && Math.floor(player.invulnerable * 16) % 2 === 0) {
        context.globalAlpha = 0.35;
      }
      const px = player.x;
      const py = player.y;

      context.shadowBlur = 18;
      context.shadowColor = '#ff63ce';
      context.fillStyle = '#ff63ce';
      context.fillRect(px + 7, py + 25, 28, 30);

      context.shadowColor = '#79efff';
      context.fillStyle = '#f9f3ff';
      context.beginPath();
      context.arc(px + 21, py + 18, 17, Math.PI, Math.PI * 2);
      context.fill();

      context.fillStyle = '#ffcf5d';
      context.beginPath();
      context.arc(px + 21, py + 9, 10, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#7ef4ff';
      context.fillRect(px + 11, py + 55, 8, 7);
      context.fillRect(px + 25, py + 55, 8, 7);

      if (player.attackTimer > 0) {
        context.strokeStyle = '#fff59d';
        context.lineWidth = 9;
        context.lineCap = 'round';
        context.beginPath();
        const originX = px + player.width / 2;
        const originY = py + 32;
        if (player.facing === 1) {
          context.arc(originX + 9, originY, 48, -0.85, 0.85);
        } else {
          context.arc(originX - 9, originY, 48, Math.PI - 0.85, Math.PI + 0.85);
        }
        context.stroke();
      }
      context.restore();

      context.restore();
    };

    const update = (dt: number) => {
      const game = gameRef.current;
      const player = game.player;
      const input = inputRef.current;

      if (game.status !== 'playing') {
        input.jumpPressed = false;
        input.attackPressed = false;
        return;
      }

      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (direction !== 0) player.facing = direction as 1 | -1;

      const targetVx = direction * 285;
      const acceleration = player.onGround ? 2200 : 1250;
      player.vx = approach(player.vx, targetVx, acceleration * dt);

      if (direction === 0 && player.onGround) {
        player.vx = approach(player.vx, 0, 2500 * dt);
      }

      if (input.jumpPressed && player.onGround) {
        player.vy = -650;
        player.onGround = false;
      }
      input.jumpPressed = false;

      if (input.attackPressed && player.attackCooldown <= 0) {
        player.attackTimer = 0.22;
        player.attackCooldown = 0.32;
        attackedThisSwing.current.clear();
      }
      input.attackPressed = false;

      player.attackTimer = Math.max(0, player.attackTimer - dt);
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);

      const previousBottom = player.y + player.height;
      player.vy += 1800 * dt;
      player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * dt));
      player.y += player.vy * dt;
      const nextBottom = player.y + player.height;

      player.onGround = false;
      let landingY: number | null = null;

      const canLandOn = (surfaceY: number, x: number, width: number) =>
        player.vy >= 0 &&
        player.x + player.width > x + 4 &&
        player.x < x + width - 4 &&
        previousBottom <= surfaceY + 3 &&
        nextBottom >= surfaceY;

      for (const platform of platforms) {
        if (canLandOn(platform.y, platform.x, platform.width)) {
          landingY = landingY === null ? platform.y : Math.min(landingY, platform.y);
        }
      }

      if (previousBottom <= GROUND_Y + 3 && nextBottom >= GROUND_Y && player.vy >= 0) {
        landingY = landingY === null ? GROUND_Y : Math.min(landingY, GROUND_Y);
      }

      if (landingY !== null) {
        player.y = landingY - player.height;
        player.vy = 0;
        player.onGround = true;
      }

      for (const enemy of game.enemies) {
        if (enemy.hp <= 0) continue;

        enemy.flash = Math.max(0, enemy.flash - dt);
        enemy.x += enemy.vx * dt;
        if (enemy.x < enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
        }
        if (enemy.x > enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
        }

        if (player.attackTimer > 0.06 && player.attackTimer < 0.19) {
          const attackBox = {
            x: player.facing === 1 ? player.x + player.width - 2 : player.x - 62,
            y: player.y + 8,
            width: 64,
            height: 48,
          };

          if (!attackedThisSwing.current.has(enemy.id) && intersects(attackBox, enemy)) {
            attackedThisSwing.current.add(enemy.id);
            enemy.hp -= 1;
            enemy.flash = 0.1;
            enemy.x += player.facing * 26;
            if (enemy.hp <= 0) {
              game.defeated += 1;
            }
          }
        }

        if (enemy.hp > 0 && player.invulnerable <= 0 && intersects(player, enemy)) {
          player.hp -= 1;
          player.invulnerable = 1.05;
          player.vx = player.x < enemy.x ? -320 : 320;
          player.vy = -300;

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
      }

      const cameraTarget = player.x - 245;
      game.cameraX = approach(
        game.cameraX,
        Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, cameraTarget)),
        1500 * dt,
      );
    };

    const frame = (time: number) => {
      const dt = Math.min((time - previousTime) / 1000, 0.033);
      previousTime = time;

      update(dt);

      const game = gameRef.current;
      drawBackground(game.cameraX);
      drawWorld(game);

      if (time - lastUiUpdate > 80) {
        lastUiUpdate = time;
        setUi({
          hp: game.player.hp,
          status: game.status,
          defeated: game.defeated,
          progress: Math.min(100, Math.round((game.player.x / GOAL_X) * 100)),
        });
      }

      animationFrame = requestAnimationFrame(frame);
    };

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
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
          <small>PARFAIT × IWASHI / SIDE-SCROLL ACTION PROTOTYPE</small>
          <h1>パフェを守れ。イワシを蹴散らせ。</h1>
        </div>
        <div className="side-scroller__objective">
          <span>GOAL</span>
          <strong>{ui.progress}%</strong>
        </div>
      </header>

      <section className="side-scroller__frame" aria-label="横スクロールアクションゲーム">
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} />

        <div className="side-scroller__hud">
          <div className="side-scroller__hp" aria-label={`HP ${ui.hp}`}>
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className={index < ui.hp ? 'is-on' : ''}>♥</span>
            ))}
          </div>
          <div className="side-scroller__counter">IWASHI DOWN <b>{ui.defeated}</b></div>
        </div>

        {ui.status !== 'playing' && (
          <div className="side-scroller__result">
            <small>{ui.status === 'clear' ? 'STAGE CLEAR' : 'DELIVERY FAILED'}</small>
            <h2>{ui.status === 'clear' ? '届けた！' : 'パフェが危ない。'}</h2>
            <p>
              {ui.status === 'clear'
                ? `暴走イワシを ${ui.defeated} 匹倒してゴール。`
                : '動きながら間合いを取って、J / 攻撃で先に叩こう。'}
            </p>
            <button type="button" onClick={restart}>もう一度</button>
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
        <span>← → / A D : 移動</span>
        <span>↑ / W / Space : ジャンプ</span>
        <span>J / K / X : 攻撃</span>
      </footer>
    </main>
  );
}
