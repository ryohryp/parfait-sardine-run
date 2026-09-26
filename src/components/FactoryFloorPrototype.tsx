import { useEffect, useMemo, useState } from 'react';
import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  MAKER,
  SHIPPING,
  SOURCE,
  createFactoryFloor,
  placeFactoryTool,
  stepFactoryFloor,
  type DeviceType,
  type Direction,
  type FactoryFloorState,
} from '../features/prototype/factoryFloor';
import './FactoryFloorPrototype.css';

type BuildMode = 'belt' | DeviceType | 'erase';

const beltArrow: Record<Direction, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};

const rotateBelt = (direction?: Direction): Direction => {
  if (!direction) return 'right';
  if (direction === 'right') return 'down';
  if (direction === 'down') return 'left';
  if (direction === 'left') return 'up';
  return 'right';
};

const keyOf = (x: number, y: number) => `${x},${y}`;

export function FactoryFloorPrototype() {
  const [state, setState] = useState<FactoryFloorState>(() => createFactoryFloor(17));
  const [mode, setMode] = useState<BuildMode>('belt');
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setState((current) => stepFactoryFloor(current));
    }, 420);
    return () => window.clearInterval(timer);
  }, [running]);

  const cells = useMemo(
    () =>
      Array.from({ length: FLOOR_HEIGHT }, (_, y) =>
        Array.from({ length: FLOOR_WIDTH }, (_, x) => ({ x, y })),
      ).flat(),
    [],
  );

  const reset = () => {
    setState((current) => createFactoryFloor(current.seed + 1));
    setRunning(true);
  };

  const handleCell = (x: number, y: number) => {
    if (
      (x === SOURCE.x && y === SOURCE.y) ||
      (x === MAKER.x && y === MAKER.y) ||
      (x === SHIPPING.x && y === SHIPPING.y)
    ) {
      return;
    }

    setState((current) => {
      if (mode === 'belt') {
        const tile = current.tiles[keyOf(x, y)];
        const next = rotateBelt(tile?.belt);
        return placeFactoryTool(current, x, y, `belt-${next}` as const);
      }
      return placeFactoryTool(current, x, y, mode);
    });
  };

  const itemAt = (x: number, y: number) =>
    state.items.find((item) => item.x === x && item.y === y);
  const wasteAt = (x: number, y: number) =>
    state.waste.filter((waste) => waste.x === x && waste.y === y).length;
  const fishAt = (x: number, y: number) =>
    state.iwashi.filter((fish) => fish.x === x && fish.y === y).length;

  const modeLabel: Record<BuildMode, string> = {
    belt: 'ベルト',
    filter: 'フィルター',
    catcher: '捕獲機',
    bait: '誘導餌場',
    erase: '消去',
  };

  return (
    <main className="factory-game">
      <header className="factory-header">
        <div>
          <small>PARFAIT × IWASHI / FACTORY ECOLOGY</small>
          <h1>工場を回せ。<em>イワシとは、うまくやれ。</em></h1>
          <p>ベルトを組み替え、設備を置く。イワシは勝手に餌を探し、群れ、増え、時々ラインを止める。</p>
        </div>
        <button type="button" className="factory-reset" onClick={reset}>
          NEW FACTORY
        </button>
      </header>

      <section className="factory-hud" aria-label="工場状況">
        <div><span>出荷</span><b>{state.shipped}</b></div>
        <div><span>売上</span><b>¥{state.cash}</b></div>
        <div><span>イワシ</span><b>{state.iwashi.length}</b></div>
        <div><span>食品くず</span><b>{state.waste.length}</b></div>
        <div><span>捕獲</span><b>{state.captured}</b></div>
        <div><span>再利用</span><b>{state.recycled}</b></div>
      </section>

      <section className="factory-workbench">
        <aside className="factory-tools" aria-label="配置ツール">
          <div className="factory-tools__title">
            <small>BUILD</small>
            <strong>{modeLabel[mode]}</strong>
          </div>

          <button
            type="button"
            className={mode === 'belt' ? 'is-active' : ''}
            onClick={() => setMode('belt')}
          >
            <span>↪</span>
            <b>ベルト</b>
            <small>同じ場所を押すと回転</small>
          </button>

          <button
            type="button"
            className={mode === 'filter' ? 'is-active' : ''}
            onClick={() => setMode('filter')}
          >
            <span>▥</span>
            <b>フィルター</b>
            <small>イワシを追い出す</small>
          </button>

          <button
            type="button"
            className={mode === 'catcher' ? 'is-active' : ''}
            onClick={() => setMode('catcher')}
          >
            <span>⌗</span>
            <b>捕獲機</b>
            <small>魚粉にして売る</small>
          </button>

          <button
            type="button"
            className={mode === 'bait' ? 'is-active' : ''}
            onClick={() => setMode('bait')}
          >
            <span>✦</span>
            <b>誘導餌場</b>
            <small>群れをラインから逸らす</small>
          </button>

          <button
            type="button"
            className={mode === 'erase' ? 'is-active' : ''}
            onClick={() => setMode('erase')}
          >
            <span>×</span>
            <b>消去</b>
            <small>ベルトも設備も外す</small>
          </button>

          <button
            type="button"
            className="factory-run-toggle"
            onClick={() => setRunning((current) => !current)}
          >
            {running ? 'Ⅱ PAUSE' : '▶ RUN'}
          </button>
        </aside>

        <div className="factory-floor-wrap">
          <div className="factory-floor" role="grid" aria-label="パフェ工場">
            {cells.map(({ x, y }) => {
              const tile = state.tiles[keyOf(x, y)];
              const item = itemAt(x, y);
              const fish = fishAt(x, y);
              const scraps = wasteAt(x, y);
              const isSource = x === SOURCE.x && y === SOURCE.y;
              const isMaker = x === MAKER.x && y === MAKER.y;
              const isShipping = x === SHIPPING.x && y === SHIPPING.y;

              return (
                <button
                  key={keyOf(x, y)}
                  type="button"
                  role="gridcell"
                  className={[
                    'factory-cell',
                    tile?.belt ? 'has-belt' : '',
                    tile?.device ? `has-${tile.device}` : '',
                    isSource || isMaker || isShipping ? 'is-fixed' : '',
                  ].join(' ')}
                  onClick={() => handleCell(x, y)}
                  aria-label={`cell ${x + 1},${y + 1}`}
                >
                  {tile?.belt && (
                    <span className="factory-belt" aria-hidden="true">
                      <i />
                      <b>{beltArrow[tile.belt]}</b>
                    </span>
                  )}

                  {isSource && (
                    <span className="factory-building factory-source">
                      <b>原料</b>
                      <small>IN</small>
                    </span>
                  )}
                  {isMaker && (
                    <span className="factory-building factory-maker">
                      <b>🍨</b>
                      <small>PARFAIT</small>
                    </span>
                  )}
                  {isShipping && (
                    <span className="factory-building factory-shipping">
                      <b>出荷</b>
                      <small>OUT</small>
                    </span>
                  )}

                  {tile?.device && (
                    <span className={`factory-device factory-device--${tile.device}`}>
                      {tile.device === 'filter' ? '▥' : tile.device === 'catcher' ? '⌗' : '✦'}
                    </span>
                  )}

                  {item && (
                    <span className={`factory-item factory-item--${item.kind}`}>
                      {item.kind === 'raw' ? '●' : '🍨'}
                    </span>
                  )}

                  {scraps > 0 && (
                    <span className="factory-waste" title="食品くず">
                      ·{scraps > 1 ? scraps : ''}
                    </span>
                  )}

                  {fish > 0 && (
                    <span className="factory-fish" title={`イワシ × ${fish}`}>
                      🐟{fish > 1 ? <sup>{fish}</sup> : null}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="factory-legend">
            <span><i className="legend-dot legend-dot--raw" /> 原料</span>
            <span>· 食品くず</span>
            <span>🐟 イワシ</span>
            <span>🍨 パフェ</span>
          </div>
        </div>

        <aside className="factory-observer">
          <div className="factory-observer__head">
            <small>LIVE LOG</small>
            <b>TICK {state.tick}</b>
          </div>

          <div className="factory-log" aria-live="polite">
            {state.events.length === 0 ? (
              <p>工場を眺めてみよう。イワシは食品くずへ寄っていく。</p>
            ) : (
              [...state.events].reverse().map((event, index) => (
                <div key={`${event.tick}-${index}-${event.kind}`} className={`event-${event.kind}`}>
                  <small>{String(event.tick).padStart(3, '0')}</small>
                  <p>{event.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="factory-observer__hint">
            <b>試してみる</b>
            <p>イワシを全部追い出す？ 捕まえて稼ぐ？ それとも食品くずを食べてもらう？</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
