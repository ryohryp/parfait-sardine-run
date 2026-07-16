import { useCallback, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { ParfaitSardineRunPhase } from '../components/ParfaitSardineRun';
import { RankingModal } from '../features/ranking/RankingModal';
import { WordPressRankingAdapter } from '../infrastructure/wordpress/WordPressRankingAdapter';
import './AppShell.css';

type AppShellProps = PropsWithChildren<{ gamePhase: ParfaitSardineRunPhase }>;
export function AppShell({ children, gamePhase }: AppShellProps) {
  const [isRankingOpen, setRankingOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rankingPort = useMemo(() => new WordPressRankingAdapter(import.meta.env.VITE_PSR_API_BASE_URL), []);
  const openRanking = useCallback(() => setRankingOpen(true), []);
  const closeRanking = useCallback(() => setRankingOpen(false), []);
  return <div className="app-shell">{children}<button ref={triggerRef} type="button" className="app-shell__ranking-trigger" disabled={gamePhase === 'playing'} onClick={openRanking}>RANKING</button>{isRankingOpen && <RankingModal rankingPort={rankingPort} onClose={closeRanking} returnFocusRef={triggerRef} />}</div>;
}
