import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { RankingEntry } from '../../domain/ranking';
import type { RankingPort } from '../../services/RankingPort';
import './RankingModal.css';

type RankingModalProps = { rankingPort: RankingPort; onClose: () => void; returnFocusRef: RefObject<HTMLButtonElement | null> };
const formatDate = (value: string | null) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ja-JP'); };

export function RankingModal({ rankingPort, onClose, returnFocusRef }: RankingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [entries, setEntries] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    setEntries(null); setError(null);
    rankingPort.getTopRankings(controller.signal).then((next) => { if (!disposed) setEntries(next); }).catch((cause: unknown) => { if (!disposed) setError(controller.signal.aborted ? 'ランキングの取得がタイムアウトしました。' : cause instanceof Error ? cause.message : 'ランキングの取得に失敗しました。'); }).finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [rankingPort, requestVersion]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef.current;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === 'Tab') {
        const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
        event.stopImmediatePropagation();
        if (!elements.length) { event.preventDefault(); return; }
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown, true); returnFocusTarget?.focus(); };
  }, [onClose, returnFocusRef]);
  return <div className="ranking-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-title" aria-describedby="ranking-notice" tabIndex={-1}>
      <header className="ranking-modal__header"><div><span>DELIVERY RECORDS</span><h2 id="ranking-title">ランキング</h2></div><button ref={closeButtonRef} type="button" className="ranking-modal__close" onClick={onClose} aria-label="ランキングを閉じる">×</button></header>
      <p id="ranking-notice" className="ranking-modal__notice">過去の旧ゲーム由来の記録が含まれる場合があります。</p>
      {entries === null && !error && <p className="ranking-modal__state" role="status">ランキングを読み込み中…</p>}
      {error && <div className="ranking-modal__state" role="alert"><p>{error}</p><button type="button" onClick={() => setRequestVersion((value) => value + 1)}>再試行</button></div>}
      {entries?.length === 0 && <p className="ranking-modal__state">まだ記録がありません。</p>}
      {entries && entries.length > 0 && <ol className="ranking-list">{entries.map((entry) => <li key={`${entry.rank}-${entry.displayName}-${entry.recordedAt ?? ''}`}><b>#{entry.rank}</b><span className="ranking-list__name">{entry.displayName}</span><span className="ranking-list__score">{entry.score.toLocaleString('ja-JP')}</span><small>{entry.characterLabel ?? '—'} · {formatDate(entry.recordedAt)}</small></li>)}</ol>}
    </section>
  </div>;
}
