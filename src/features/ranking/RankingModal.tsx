import { useCallback, useEffect, useRef, useState } from 'react';
import type { RankingPort } from './RankingPort';
import { RankingLoadError, type RankingEntry } from './ranking';
import './RankingModal.css';

type Props = { isOpen: boolean; onClose: () => void; rankingPort: RankingPort; returnFocusRef: React.RefObject<HTMLButtonElement | null> };
type State = { status: 'loading' } | { status: 'success'; entries: RankingEntry[] } | { status: 'error'; message: string };
const formatDate = (value: string) => new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export function RankingModal({ isOpen, onClose, rankingPort, returnFocusRef }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  const load = useCallback(() => {
    const id = ++requestIdRef.current;
    const controller = new AbortController();
    setState({ status: 'loading' });
    void rankingPort.load(controller.signal).then(
      (entries) => id === requestIdRef.current && setState({ status: 'success', entries }),
      (error: unknown) => {
        if (controller.signal.aborted || id !== requestIdRef.current) return;
        setState({ status: 'error', message: error instanceof RankingLoadError ? error.message : 'ランキングの取得に失敗しました。' });
      },
    );
    return () => controller.abort();
  }, [rankingPort]);

  useEffect(() => {
    if (!isOpen) return;
    const cancel = load();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      if (!nodes?.length) return;
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancel(); requestIdRef.current += 1;
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      returnFocusRef.current?.focus();
    };
  }, [isOpen, load, onClose, returnFocusRef]);

  if (!isOpen) return null;
  return <div className="psr-ranking-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div ref={dialogRef} className="psr-ranking-dialog" role="dialog" aria-modal="true" aria-labelledby="ranking-title" aria-describedby="ranking-note">
      <header><div><span>MIDNIGHT DELIVERY RECORDS</span><h2 id="ranking-title">RANKING</h2></div><button ref={closeRef} onClick={onClose} aria-label="ランキングを閉じる">×</button></header>
      <p id="ranking-note">読み取り専用です。旧バージョンの記録が含まれる場合があります。</p>
      <div className="psr-ranking-content" aria-live="polite">
        {state.status === 'loading' && <div className="psr-ranking-status">ランキングを読み込み中…</div>}
        {state.status === 'error' && <div className="psr-ranking-status"><p>{state.message}</p><button onClick={load}>再試行</button></div>}
        {state.status === 'success' && state.entries.length === 0 && <div className="psr-ranking-status">まだランキング記録はありません。</div>}
        {state.status === 'success' && state.entries.length > 0 && <ol className="psr-ranking-list">{state.entries.map((entry) => <li key={`${entry.rank}-${entry.displayName}-${entry.recordedAt}`}><span>#{entry.rank}</span><span><b>{entry.displayName}</b><small>{entry.characterLabel}</small></span><time>{formatDate(entry.recordedAt)}</time><strong>{entry.score.toLocaleString('ja-JP')}</strong></li>)}</ol>}
      </div>
    </div>
  </div>;
}
