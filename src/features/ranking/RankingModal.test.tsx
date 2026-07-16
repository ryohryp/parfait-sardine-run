import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RankingModal } from './RankingModal';

const reactTestEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | undefined;
afterEach(() => { container?.remove(); container = undefined; vi.useRealTimers(); });

describe('RankingModal requests', () => {
  it('aborts its request when closed and restores focus safely', async () => {
    container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const getTopRankings = vi.fn(() => new Promise<never>(() => {}));
    const onClose = vi.fn();
    await act(async () => { root.render(<RankingModal rankingPort={{ getTopRankings }} onClose={onClose} returnFocusRef={{ current: trigger }} />); });
    const signal = getTopRankings.mock.calls[0][0] as AbortSignal;
    await act(async () => { root.unmount(); });
    expect(signal.aborted).toBe(true);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('aborts the in-flight request when its timeout expires', async () => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const getTopRankings = vi.fn(() => new Promise<never>(() => {}));
    const trigger = document.createElement('button');
    document.body.append(trigger);
    await act(async () => { root.render(<RankingModal rankingPort={{ getTopRankings }} onClose={vi.fn()} returnFocusRef={{ current: trigger }} />); });
    const signal = getTopRankings.mock.calls[0][0] as AbortSignal;
    await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
    expect(signal.aborted).toBe(true);
    await act(async () => { root.unmount(); });
    trigger.remove();
  });
});
