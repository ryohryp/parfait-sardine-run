import { useEffect, useMemo, useRef, useState } from 'react';
import { ParfaitSardineRun } from './ParfaitSardineRun';
import { RankingModal } from '../features/ranking/RankingModal';
import { WordPressRankingAdapter } from '../features/ranking/WordPressRankingAdapter';

type Phase = 'menu' | 'playing' | 'paused' | 'over';

const detectPhase = (root: HTMLElement): Phase => {
  if (root.querySelector('.psr-title-screen')) return 'menu';
  if (root.querySelector('.psr-pause-screen')) return 'paused';
  if (root.querySelector('.psr-result-screen')) return 'over';
  return 'playing';
};

export function AppShell() {
  const gameRootRef = useRef<HTMLDivElement>(null);
  const rankingButtonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [isRankingOpen, setRankingOpen] = useState(false);
  const rankingPort = useMemo(() => new WordPressRankingAdapter(import.meta.env.VITE_PSR_API_BASE_URL), []);

  useEffect(() => {
    const root = gameRootRef.current;
    if (!root) return;
    const update = () => setPhase(detectPhase(root));
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
      <div ref={gameRootRef}><ParfaitSardineRun /></div>
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
