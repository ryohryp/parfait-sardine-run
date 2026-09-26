import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INGREDIENTS,
  PROTOTYPE_PRESETS,
  calculateActionLoad,
  calculateDeliveryResult,
  calculateParfaitStats,
  getDropThreshold,
  getWobbleDecayPerSecond,
  shouldDropIngredient,
  type DeliveryAction,
  type DeliveryResult,
  type IngredientKind,
} from '../features/prototype/parfaitPrototype';
import './BuildDeliverPrototype.css';

type Phase = 'build' | 'deliver' | 'result';

const MAX_STACK = 5;
const COURSE_SECONDS = 24;
const OBSTACLES = [24, 52, 79] as const;

const riskCopy = {
  SAFE: '安定。まだ積める。',
  BALANCED: '価値と安定の中間。',
  RISKY: '高価。でも崩れやすい。',
} as const;

export function BuildDeliverPrototype() {
  const [phase, setPhase] = useState<Phase>('build');
  const [stack, setStack] = useState<IngredientKind[]>([...PROTOTYPE_PRESETS.balanced]);
  const [remaining, setRemaining] = useState<IngredientKind[]>([]);
  const [progress, setProgress] = useState(0);
  const [wobble, setWobble] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COURSE_SECONDS);
  const [airborne, setAirborne] = useState(false);
  const [message, setMessage] = useState('好きなだけ積め。高いほど危ない。');
  const [result, setResult] = useState<DeliveryResult | null>(null);

  const originalRef = useRef<IngredientKind[]>([]);
  const remainingRef = useRef<IngredientKind[]>([]);
  const progressRef = useRef(0);
  const airborneRef = useRef(false);
  const obstacleIndexRef = useRef(0);
  const landingTimerRef = useRef<number | null>(null);

  const buildStats = useMemo(() => calculateParfaitStats(stack), [stack]);
  const currentStats = useMemo(
    () => calculateParfaitStats(phase === 'deliver' ? remaining : stack),
    [phase, remaining, stack],
  );

  const syncRemaining = (next: IngredientKind[]) => {
    remainingRef.current = next;
    setRemaining(next);
  };

  const addIngredient = (kind: IngredientKind) => {
    if (phase !== 'build' || stack.length >= MAX_STACK) return;
    setStack((current) => [...current, kind]);
    setMessage('もう1個いく？ それとも届ける？');
  };

  const removeTop = () => {
    if (phase !== 'build' || stack.length === 0) return;
    setStack((current) => current.slice(0, -1));
  };

  const usePreset = (preset: keyof typeof PROTOTYPE_PRESETS) => {
    if (phase !== 'build') return;
    setStack([...PROTOTYPE_PRESETS[preset]]);
    setMessage(
      preset === 'safe'
        ? 'SAFE: 崩れにくい。報酬は控えめ。'
        : preset === 'risky'
          ? 'RISKY: 高価。荒く運ぶと泣く。'
          : 'BALANCED: まずはここから。',
    );
  };

  const applyLoad = (action: DeliveryAction) => {
    if (phase !== 'deliver') return;
    const current = remainingRef.current;
    if (current.length === 0) return;
    const stats = calculateParfaitStats(current);
    const load = calculateActionLoad(action, stats, current.length);

    setWobble((previous) => {
      const next = previous + load;
      if (shouldDropIngredient(next, stats) && current.length > 1) {
        const dropped = current[current.length - 1];
        const reduced = current.slice(0, -1);
        syncRemaining(reduced);
        setMessage(`${INGREDIENTS[dropped].icon} ${INGREDIENTS[dropped].name} が落ちた！ 欲張りすぎ！`);
        return Math.round(next * 0.38);
      }
      return Math.min(120, next);
    });
  };

  const advanceProgress = (amount: number) => {
    const previous = progressRef.current;
    const next = Math.min(100, previous + amount);
    progressRef.current = next;
    setProgress(next);

    while (
      obstacleIndexRef.current < OBSTACLES.length &&
      previous < OBSTACLES[obstacleIndexRef.current] &&
      next >= OBSTACLES[obstacleIndexRef.current]
    ) {
      if (airborneRef.current) {
        setMessage('NICE JUMP! パフェを守った。');
      } else {
        setMessage('障害物！ パフェが大きく揺れた。');
        applyLoad('obstacle');
      }
      obstacleIndexRef.current += 1;
    }
  };

  const startDelivery = () => {
    if (stack.length < 2) {
      setMessage('最低2段は積んでから届けよう。');
      return;
    }
    originalRef.current = [...stack];
    syncRemaining([...stack]);
    progressRef.current = 0;
    obstacleIndexRef.current = 0;
    airborneRef.current = false;
    setProgress(0);
    setWobble(0);
    setTimeLeft(COURSE_SECONDS);
    setAirborne(false);
    setResult(null);
    setMessage('配達開始。障害物はジャンプ、急ぐならダッシュ。');
    setPhase('deliver');
  };

  const jump = () => {
    if (phase !== 'deliver' || airborneRef.current) return;
    airborneRef.current = true;
    setAirborne(true);
    setMessage('JUMP!');
    applyLoad('jump');

    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
    const stats = calculateParfaitStats(remainingRef.current);
    landingTimerRef.current = window.setTimeout(() => {
      airborneRef.current = false;
      setAirborne(false);
      applyLoad('landing');
      setMessage('着地。揺れを落ち着かせろ。');
    }, Math.round(610 / stats.jumpModifier));
  };

  const dash = () => {
    if (phase !== 'deliver') return;
    advanceProgress(6.5);
    applyLoad('dash');
    setMessage('DASH! 速い。でも揺れる。');
  };

  const finish = () => {
    if (phase !== 'deliver') return;
    const deliveryResult = calculateDeliveryResult(originalRef.current, remainingRef.current);
    setResult(deliveryResult);
    setMessage(
      deliveryResult.droppedCount === 0
        ? 'PERFECT DELIVERY!'
        : `${deliveryResult.droppedCount}個落とした。次はどこまで欲張る？`,
    );
    setPhase('result');
  };

  const retry = () => {
    if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
    setPhase('build');
    setStack([...originalRef.current]);
    setRemaining([]);
    setProgress(0);
    setWobble(0);
    setTimeLeft(COURSE_SECONDS);
    setResult(null);
    setMessage('同じ構成で再挑戦する？ 変える？');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        jump();
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'ShiftLeft') {
        event.preventDefault();
        dash();
      }
      if (event.code === 'Enter' && phase === 'build') startDelivery();
      if (event.code === 'Enter' && phase === 'result') retry();
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (phase !== 'deliver') return;
    const timer = window.setInterval(() => {
      const stats = calculateParfaitStats(remainingRef.current);
      advanceProgress((100 / COURSE_SECONDS) * stats.speedModifier * 0.1);
      setTimeLeft((current) => Math.max(0, current - 0.1));
      setWobble((current) =>
        Math.max(0, current - getWobbleDecayPerSecond(stats) * 0.1),
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'deliver') return;
    if (progress >= 100 || timeLeft <= 0) finish();
  }, [phase, progress, timeLeft]);

  useEffect(
    () => () => {
      if (landingTimerRef.current !== null) window.clearTimeout(landingTimerRef.current);
    },
    [],
  );

  const stackView = (items: readonly IngredientKind[], compact = false) => (
    <div className={compact ? 'psrp-stack psrp-stack--compact' : 'psrp-stack'} aria-label="パフェの積み上げ">
      <div className="psrp-stack__top">
        {[...items].reverse().map((kind, index) => (
          <div
            className="psrp-stack__layer"
            key={`${kind}-${items.length - index}`}
            title={INGREDIENTS[kind].name}
          >
            <span>{INGREDIENTS[kind].icon}</span>
          </div>
        ))}
      </div>
      <div className="psrp-stack__glass">PARFAIT</div>
    </div>
  );

  return (
    <main className="psrp-shell">
      <header className="psrp-header">
        <div>
          <small>PARFAIT SARDINE RUN / CORE PROTOTYPE</small>
          <h1>パフェを作れ。<em>欲張れ。</em>そして、こぼすな。</h1>
        </div>
        <div className="psrp-badge">ISSUE #70</div>
      </header>

      {phase === 'build' && (
        <section className="psrp-stage psrp-build">
          <div className="psrp-main-card">
            <div className="psrp-section-title">
              <span>01 / BUILD</span>
              <strong>どこまで積む？</strong>
            </div>
            <div className="psrp-build-grid">
              <div className="psrp-preview">
                {stackView(stack)}
                <p>{stack.length}/{MAX_STACK} 段</p>
              </div>
              <div className="psrp-ingredients">
                {(Object.keys(INGREDIENTS) as IngredientKind[]).map((kind) => {
                  const item = INGREDIENTS[kind];
                  return (
                    <button
                      type="button"
                      key={kind}
                      onClick={() => addIngredient(kind)}
                      disabled={stack.length >= MAX_STACK}
                    >
                      <span>{item.icon}</span>
                      <b>{item.name}</b>
                      <small>¥{item.value} / 安定 {item.stability > 0 ? '+' : ''}{item.stability}</small>
                    </button>
                  );
                })}
                <button type="button" className="psrp-remove" onClick={removeTop} disabled={stack.length === 0}>
                  ↩ 一番上を戻す
                </button>
              </div>
            </div>

            <div className="psrp-presets" aria-label="テスト用プリセット">
              <span>PLAYTEST PRESETS</span>
              <button type="button" onClick={() => usePreset('safe')}>SAFE</button>
              <button type="button" onClick={() => usePreset('balanced')}>BALANCED</button>
              <button type="button" onClick={() => usePreset('risky')}>RISKY</button>
            </div>
          </div>

          <aside className="psrp-stats-card">
            <div className={`psrp-risk psrp-risk--${buildStats.risk.toLowerCase()}`}>{buildStats.risk}</div>
            <h2>このパフェの性格</h2>
            <dl>
              <div><dt>VALUE</dt><dd>¥{buildStats.value}</dd></div>
              <div><dt>WEIGHT</dt><dd>{buildStats.weight.toFixed(1)}</dd></div>
              <div><dt>STABILITY</dt><dd>{buildStats.stability}</dd></div>
              <div><dt>SPEED</dt><dd>×{buildStats.speedModifier.toFixed(2)}</dd></div>
            </dl>
            <p>{riskCopy[buildStats.risk]}</p>
            <button type="button" className="psrp-primary" onClick={startDelivery} disabled={stack.length < 2}>
              配達する →
            </button>
            <small>Enterでも開始</small>
          </aside>
        </section>
      )}

      {phase === 'deliver' && (
        <section className="psrp-stage psrp-deliver">
          <div className="psrp-delivery-card">
            <div className="psrp-delivery-hud">
              <div><small>TIME</small><strong>{timeLeft.toFixed(1)}</strong></div>
              <div><small>VALUE</small><strong>¥{calculateParfaitStats(remaining).value}</strong></div>
              <div><small>STABILITY</small><strong>{currentStats.stability}</strong></div>
              <div><small>LEFT</small><strong>{remaining.length}/{originalRef.current.length}</strong></div>
            </div>

            <div className="psrp-wobble">
              <div className="psrp-wobble__labels">
                <span>WOBBLE</span>
                <b>{Math.round(wobble)} / {getDropThreshold(currentStats)}</b>
              </div>
              <div className="psrp-wobble__track">
                <i style={{ width: `${Math.min(100, (wobble / getDropThreshold(currentStats)) * 100)}%` }} />
              </div>
            </div>

            <div className="psrp-road">
              <div className="psrp-moon">☾</div>
              {OBSTACLES.map((position) => (
                <div className="psrp-obstacle" key={position} style={{ left: `${position}%` }}>▥</div>
              ))}
              <div
                className={`psrp-runner ${airborne ? 'is-airborne' : ''}`}
                style={{ left: `${Math.min(94, progress)}%` }}
              >
                {stackView(remaining, true)}
                <span className="psrp-runner__body">🏃</span>
              </div>
              <div className="psrp-goal">CAFE<br />GOAL</div>
              <div className="psrp-road-line" />
            </div>

            <div className="psrp-progress">
              <i style={{ width: `${progress}%` }} />
            </div>

            <div className="psrp-controls">
              <button type="button" onClick={jump} disabled={airborne}>
                <span>↑</span><b>JUMP</b><small>障害物を回避</small>
              </button>
              <button type="button" onClick={dash}>
                <span>→</span><b>DASH</b><small>速い・揺れる</small>
              </button>
            </div>
          </div>

          <aside className="psrp-live-card">
            <div className={`psrp-risk psrp-risk--${currentStats.risk.toLowerCase()}`}>{currentStats.risk}</div>
            <h2>今のパフェ</h2>
            {stackView(remaining)}
            <p className="psrp-message">{message}</p>
            <small>Space / ↑ = JUMP　D / → = DASH</small>
          </aside>
        </section>
      )}

      {phase === 'result' && result && (
        <section
          className="psrp-result psrp-result-screen"
          data-score={result.reward}
          data-dropped={result.droppedCount}
          data-success-rate={result.successRate}
        >
          <small>DELIVERY RESULT</small>
          <h2>{result.droppedCount === 0 ? 'PERFECT DELIVERY!' : 'DELIVERED... MOSTLY.'}</h2>
          <div className="psrp-result-reward">¥{result.reward}</div>
          <div className="psrp-result-grid">
            <div><span>START VALUE</span><b>¥{result.initialValue}</b></div>
            <div><span>DROPPED</span><b>{result.droppedCount}</b></div>
            <div><span>SUCCESS</span><b>{Math.round(result.successRate * 100)}%</b></div>
            <div><span>FINAL VALUE</span><b>¥{result.remainingValue}</b></div>
          </div>
          <p>{message}</p>
          <button type="button" className="psrp-primary" onClick={retry}>もう一度作る</button>
          <small>「もっと積めた？」「積みすぎた？」が残れば成功。</small>
        </section>
      )}
    </main>
  );
}
