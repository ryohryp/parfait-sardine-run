import { useEffect, useMemo, useRef, useState } from 'react';
import { ParfaitSardineRunPhase1 } from './ParfaitSardineRunPhase1';
import { RankingModal } from '../features/ranking/RankingModal';
import { WordPressRankingAdapter } from '../features/ranking/WordPressRankingAdapter';
import {
  RUN_COMPLETED_EVENT,
  RUN_STARTED_EVENT,
  completeRun,
  dispatchRunEvent,
  startRun,
  type ActiveRun,
  type GamePhase,
  type RunSnapshot,
} from '../features/run/runLifecycle';

const LATEST_RUN_STORAGE_KEY = 'psr.latestRun.v1';

const detectPhase = (root: HTMLElement): GamePhase => {
  if (root.querySelector('.psr-title-screen')) return 'menu';
  if (root.querySelector('.psr-pause-screen')) return 'paused';
  if (root.querySelector('.psr-result-screen')) return 'over';
  return 'playing';
};

const parseNumber = (value: string | null | undefined): number => {
  const normalized = value?.replace(/[^0-9.-]/g, '') ?? '';
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readCompletedRun = (root: HTMLElement, activeRun: ActiveRun): RunSnapshot => {
  const resultScreen = root.querySelector<HTMLElement>('.psr-result-screen');
  const metrics = resultScreen?.querySelectorAll<HTMLElement>('.psr-result-grid > span b');
  const heading = resultScreen?.querySelector('h2')?.textContent ?? '';

  return completeRun(activeRun, {
    outcome: heading.includes('DELIVERED') ? 'clear' : 'crash',
    score: parseNumber(resultScreen?.querySelector('.psr-result-score')?.textContent),
    sardines: parseNumber(metrics?.item(0)?.textContent),
    distanceMeters: parseNumber(metrics?.item(1)?.textContent),
    bestScore: parseNumber(metrics?.item(2)?.textContent),
  });
};

const persistLatestRun = (snapshot: RunSnapshot): void => {
  try {
    sessionStorage.setItem(LATEST_RUN_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // The snapshot remains available through the event when storage is blocked.
  }
};

export function AppShell() {
  const gameRootRef = useRef<HTMLDivElement>(null);
  const rankingButtonRef = useRef<HTMLButtonElement>(null);
  const previousPhaseRef = useRef<GamePhase>('menu');
  const activeRunRef = useRef<ActiveRun | null>(null);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [isRankingOpen, setRankingOpen] = useState(false);
  const rankingPort = useMemo(() => new WordPressRankingAdapter(import.meta.env.VITE_PSR_API_BASE_URL), []);

  useEffect(() => {
    const root = gameRootRef.current;
    if (!root) return;

    const update = () => {
      const nextPhase = detectPhase(root);
      const previousPhase = previousPhaseRef.current;

      if (nextPhase === 'playing' && (previousPhase === 'menu' || previousPhase === 'over')) {
        const activeRun = startRun();
        activeRunRef.current = activeRun;
        dispatchRunEvent(RUN_STARTED_EVENT, activeRun);
      }

      if (nextPhase === 'over' && previousPhase !== 'over' && activeRunRef.current) {
        const snapshot = readCompletedRun(root, activeRunRef.current);
        activeRunRef.current = null;
        persistLatestRun(snapshot);
        dispatchRunEvent(RUN_COMPLETED_EVENT, snapshot);
      }

      previousPhaseRef.current = nextPhase;
      setPhase(nextPhase);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase === 'playing' && isRankingOpen) setRankingOpen(false);
  }, [isRankingOpen, phase]);

  return (
    <>
      <div ref={gameRootRef}><ParfaitSardineRunPhase1 /></div>
      <button
        ref={rankingButtonRef}
        type="button"
        className="psr-ranking-launch"
        disabled={phase === 'playing'}
        aria-disabled={phase === 'playing'}
        title={phase === 'playing' ? 'プレイ中はランキングを開けません' : 'ランキングを開く'}
        onClick={() => setRankingOpen(true)}
      >
        RANKING
      </button>
      <RankingModal
        isOpen={isRankingOpen}
        onClose={() => setRankingOpen(false)}
        rankingPort={rankingPort}
        returnFocusRef={rankingButtonRef}
      />
    </>
  );
}
