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
import {
  countCompletedContracts,
  generateFactoryContracts,
  getContractProgress,
  isShiftCleared,
} from '../features/prototype/factoryContracts';
import './FactoryFloorPrototype.css';

type BuildMode = 'belt' | DeviceType | 'erase';
type ShiftPhase = 'briefing' | 'running' | 'result';

const SHIFT_SECONDS = 60;

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
  const [phase, setPhase] = useState<ShiftPhase>('briefing');
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SHIFT_SECONDS);
  const contracts = useMemo(() => generateFactoryContracts(state.seed), [state.seed]);

  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const timer = window.setInterval(() => {
      setState((current) => stepFactoryFloor(current));
    }, 420);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) {
      setPhase('result');
      setPaused(false);
    }
  }, [phase, secondsLeft]);

  const cells = useMemo(
    () =>
      Array.from({ length: FLOOR_HEIGHT }, (_, y) =>
        Array.from({ length: FLOOR_WIDTH }, (_, x) => ({ x, y })),
      ).flat(),
    [],
  );

  const completedLive = countCompletedContracts(contracts, state, false);
  const completedFinal = countCompletedContracts(contracts, state, true);
  const cleared = phase === 'result' && isShiftCleared(contracts, state);

  const newFactory = () => {
    setState((current) => createFactoryFloor(current.seed + 1));
    setSecondsLeft(SHIFT_SECONDS);
    setPhase('briefing');
    setPaused(false);
  };

  const retrySameContracts = () => {
    setState((current) => {
      const fresh = createFactoryFloor(current.seed);
      return { ...fresh, tiles: current.tiles };
    });
    setSecondsLeft(SHIFT_SECONDS);
    setPhase('briefing');
    setPaused(false);
  };

  const startShift = () => {
    setSecondsLeft(SHIFT_SECONDS);
    setPhase('running');
    setPaused(false);
  };

  const handleCell = (x: number, y: number) => {
    if (
      phase === 'result' ||
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
          <h1>工場を回せ。<em>3つの契約から2つ取れ。</em></h1>
          <p>
            1営業60秒。出荷、魚粉、食品くず処理、イワシとの共存。
            どの2つを狙うかは自由。
          </p>
        </div>
        <button type="button" className="factory-reset" onClick={newFactory}>
          NEW FACTORY
        </button>
      </header>

      <section className={`factory-contracts factory-contracts--${phase}`} aria-label="今日の契約">
        <div className="factory-contracts__lead">
          <small>{phase === 'result' ? 'CLOSED' : 'TODAY’S CONTRACTS'}</small>
          <strong>
            {phase === 'briefing'
              ? '3つ中2つ達成で営業成功'
              : phase === 'running'
                ? `残り ${secondsLeft}秒 / ${completedLive}件達成`
                : cleared
                  ? `営業成功 — ${completedFinal} / 3`
                  : `営業失敗 — ${completedFinal} / 3`}
          </strong>
        </div>

        <div className="factory-contract-list">
          {contracts.map((contract) => {
            const progress = getContractProgress(contract, state, phase === 'result');
            const provisionalRange =
              contract.kind === 'iwashi_range' &&
              progress.maxTarget !== undefined &&
              progress.current >= progress.target &&
              progress.current <= progress.maxTarget;

            return (
              <article
                key={contract.id}
                className={[
                  'factory-contract',
                  progress.complete ? 'is-complete' : '',
                  provisionalRange && phase !== 'result' ? 'is-provisional' : '',
                ].join(' ')}
              >
                <div>
                  <span>{progress.complete ? '✓' : provisionalRange ? '◎' : '○'}</span>
                  <div>
                    <b>{contract.title}</b>
                    <small>{contract.description}</small>
                  </div>
                </div>
                <strong>{progress.text}</strong>
              </article>
            );
          })}
        </div>

        {phase === 'briefing' && (
          <button type="button" className="factory-open-button" onClick={startShift}>
            OPEN — 60秒営業開始
          </button>
        )}

        {phase === 'running' && completedLive >= 2 && (
          <div className="factory-clear-zone">✓ クリア圏内。このまま閉店まで守れ。</div>
        )}
      </section>

      <section className="factory-hud" aria-label="工場状況">
        <div><span>出荷</span><b>{state.shipped}</b></div>
        <div><span>売上</span><b>¥{Math.floor(state.cash)}</b></div>
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
            disabled={phase === 'result'}
          >
            <span>↪</span>
            <b>ベルト</b>
            <small>同じ場所を押すと回転</small>
          </button>

          <button
            type="button"
            className={mode === 'filter' ? 'is-active' : ''}
            onClick={() => setMode('filter')}
            disabled={phase === 'result'}
          >
            <span>▥</span>
            <b>フィルター</b>
            <small>イワシを追い出す</small>
          </button>

          <button
            type="button"
            className={mode === 'catcher' ? 'is-active' : ''}
            onClick={() => setMode('catcher')}
            disabled={phase === 'result'}
          >
            <span>⌗</span>
            <b>捕獲機</b>
            <small>魚粉にして売る</small>
          </button>

          <button
            type="button"
            className={mode === 'bait' ? 'is-active' : ''}
            onClick={() => setMode('bait')}
            disabled={phase === 'result'}
          >
            <span>✦</span>
            <b>誘導餌場</b>
            <small>群れをラインから逸らす</small>
          </button>

          <button
            type="button"
            className={mode === 'erase' ? 'is-active' : ''}
            onClick={() => setMode('erase')}
            disabled={phase === 'result'}
          >
            <span>×</span>
            <b>消去</b>
            <small>ベルトも設備も外す</small>
          </button>

          {phase === 'running' && (
            <button
              type="button"
              className="factory-run-toggle"
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? '▶ RUN' : 'Ⅱ PAUSE'}
            </button>
          )}
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
                  disabled={phase === 'result'}
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
              <p>
                {phase === 'briefing'
                  ? '契約を見て、どの2つを狙うか決めよう。営業前でも設備は置ける。'
                  : '工場を眺めてみよう。イワシは食品くずへ寄っていく。'}
              </p>
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
            <b>{phase === 'result' ? '閉店' : '作戦'}</b>
            <p>
              {phase === 'result'
                ? cleared
                  ? '2契約以上達成。別の契約構成でも同じ設計が通用する？'
                  : '未達契約を1つだけ改善すれば届くかもしれない。'
                : '3つ全部を追わなくていい。1つ捨てて、得意な2つを取りにいこう。'}
            </p>
          </div>
        </aside>
      </section>

      {phase === 'result' && (
        <section className={`factory-result ${cleared ? 'is-clear' : 'is-fail'}`}>
          <small>SHIFT RESULT</small>
          <h2>{cleared ? '営業成功。' : '契約未達。'}</h2>
          <p>
            {cleared
              ? `${completedFinal} / 3 契約を達成。別の契約なら、工場の形も変わる。`
              : `${completedFinal} / 3。未達の契約を見て、次の配置を変えよう。`}
          </p>
          <div className="factory-result__actions">
            <button type="button" onClick={retrySameContracts}>同じ契約でもう一度</button>
            <button type="button" onClick={newFactory}>新しい契約へ</button>
          </div>
        </section>
      )}
    </main>
  );
}
