import { useMemo, useState } from 'react';
import {
  LOCATIONS,
  createNightScenario,
  getRunVerdict,
  resolveNight,
  scoreRun,
  type LocationId,
  type NightResult,
} from '../features/prototype/iwashiIntrusion';
import './IwashiIntrusionPrototype.css';

type Phase = 'investigate' | 'reveal' | 'run-result';

const locationIds: readonly LocationId[] = ['fridge', 'drain', 'crate'];

export function IwashiIntrusionPrototype() {
  const [night, setNight] = useState(1);
  const [scenario, setScenario] = useState(() => createNightScenario(1));
  const [inspected, setInspected] = useState<LocationId[]>([]);
  const [trap, setTrap] = useState<LocationId | null>(null);
  const [reveal, setReveal] = useState<NightResult | null>(null);
  const [results, setResults] = useState<NightResult[]>([]);
  const [phase, setPhase] = useState<Phase>('investigate');

  const catches = results.filter((result) => result.correct).length;
  const observationsLeft = 2 - inspected.length;
  const verdict = useMemo(() => getRunVerdict(results), [results]);

  const inspect = (id: LocationId) => {
    if (phase !== 'investigate' || inspected.includes(id) || inspected.length >= 2) return;
    setInspected((current) => [...current, id]);
  };

  const resolve = () => {
    if (phase !== 'investigate' || !trap || inspected.length === 0) return;
    const next = resolveNight(scenario, trap);
    setReveal(next);
    setResults((current) => [...current, next]);
    setPhase('reveal');
  };

  const continueNight = () => {
    if (night >= 3) {
      setPhase('run-result');
      return;
    }
    const nextNight = night + 1;
    setNight(nextNight);
    setScenario(createNightScenario(nextNight));
    setInspected([]);
    setTrap(null);
    setReveal(null);
    setPhase('investigate');
  };

  const restart = () => {
    setNight(1);
    setScenario(createNightScenario(1));
    setInspected([]);
    setTrap(null);
    setReveal(null);
    setResults([]);
    setPhase('investigate');
  };

  return (
    <main className="iwashi-game">
      <header className="iwashi-header">
        <div>
          <small>PARFAIT IWASHI / NIGHT WATCH</small>
          <h1>今夜、<em>イワシ</em>はどこから来る？</h1>
        </div>
        <div className="iwashi-night">NIGHT {night} / 3</div>
      </header>

      {phase === 'investigate' && (
        <>
          <section className="iwashi-status">
            <div>
              <span>観察できる回数</span>
              <strong>{observationsLeft}</strong>
            </div>
            <p>
              店内を2か所まで調べられる。痕跡には<strong>ノイズ</strong>も混じる。
              最後に1か所だけ封鎖する。
            </p>
          </section>

          <section className="iwashi-shop" aria-label="深夜のパフェ店">
            <div className="iwashi-counter">
              <div className="iwashi-parfait">🍨</div>
              <span>守るべきパフェ</span>
            </div>

            <div className="iwashi-locations">
              {locationIds.map((id) => {
                const location = LOCATIONS[id];
                const seen = inspected.includes(id);
                const selected = trap === id;
                return (
                  <article
                    key={id}
                    className={[
                      'iwashi-location',
                      seen ? 'is-inspected' : '',
                      selected ? 'is-trapped' : '',
                    ].join(' ')}
                  >
                    <div className="iwashi-location__scene">
                      <span className="iwashi-location__icon">{location.icon}</span>
                      <small>{location.short}</small>
                      <h2>{location.name}</h2>
                    </div>

                    <div className="iwashi-location__clue" aria-live="polite">
                      {seen ? (
                        <>
                          <b>観察メモ</b>
                          <p>{scenario.clues[id].text}</p>
                        </>
                      ) : (
                        <p>まだ調べていない。</p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="iwashi-inspect"
                      onClick={() => inspect(id)}
                      disabled={seen || inspected.length >= 2}
                    >
                      {seen ? '調査済み' : '調べる'}
                    </button>

                    <button
                      type="button"
                      className="iwashi-trap"
                      onClick={() => setTrap(id)}
                      disabled={inspected.length === 0}
                    >
                      {selected ? '✓ ここを封鎖' : 'ここを封鎖'}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="iwashi-decision">
            <div>
              <small>YOUR HYPOTHESIS</small>
              <strong>
                {trap ? `今夜は「${LOCATIONS[trap].name}」から来る` : 'まだ侵入口を決めていない'}
              </strong>
            </div>
            <button
              type="button"
              onClick={resolve}
              disabled={!trap || inspected.length === 0}
            >
              夜を進める
            </button>
          </section>
        </>
      )}

      {phase === 'reveal' && reveal && (
        <section className={`iwashi-reveal ${reveal.correct ? 'is-correct' : 'is-wrong'}`}>
          <small>NIGHT {night} RESULT</small>
          <div className="iwashi-reveal__fish">{reveal.correct ? '🪤🐟' : '🐟💨🍨'}</div>
          <h2>{reveal.correct ? '捕まえた。' : '侵入された。'}</h2>
          <p className="iwashi-reveal__explanation">{reveal.explanation}</p>

          <div className="iwashi-answer-grid">
            {locationIds.map((id) => {
              const clue = scenario.clues[id];
              return (
                <div key={id} className={id === scenario.culprit ? 'is-signal' : 'is-noise'}>
                  <span>{LOCATIONS[id].icon} {LOCATIONS[id].name}</span>
                  <b>{id === scenario.culprit ? '本命の痕跡' : 'ノイズ'}</b>
                  <p>{clue.text}</p>
                </div>
              );
            })}
          </div>

          <button type="button" className="iwashi-primary" onClick={continueNight}>
            {night < 3 ? '次の夜へ' : '3夜の結果を見る'}
          </button>
        </section>
      )}

      {phase === 'run-result' && (
        <section className="iwashi-run-result">
          <small>3 NIGHTS COMPLETE</small>
          <h2>
            {verdict === 'perfect'
              ? '店は完全に守られた。'
              : verdict === 'survived'
                ? 'なんとか朝を迎えた。'
                : 'パフェはイワシだらけだ。'}
          </h2>
          <div className="iwashi-final-fish">{verdict === 'perfect' ? '🍨✨' : verdict === 'survived' ? '🍨🐟' : '🐟🐟🍨🐟'}</div>
          <div className="iwashi-score-grid">
            <div><span>CAPTURED</span><b>{catches} / 3</b></div>
            <div><span>SCORE</span><b>{scoreRun(results)}</b></div>
          </div>
          <p>
            {catches === 3
              ? '3夜とも痕跡を読み切った。次はもっと紛らわしい夜でもいける？'
              : 'どのノイズに引っかかったか覚えている？ もう一度なら見抜けるかもしれない。'}
          </p>
          <button type="button" className="iwashi-primary" onClick={restart}>もう3夜やる</button>
        </section>
      )}
    </main>
  );
}
