// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  RUN_COMPLETED_EVENT,
  completeRun,
  dispatchRunEvent,
  startRun,
  type RunSnapshot,
} from './runLifecycle';

describe('runLifecycle', () => {
  it('creates an immutable active run with a stable start time', () => {
    const run = startRun(new Date('2026-07-20T00:00:00.000Z'));

    expect(run.schemaVersion).toBe(1);
    expect(run.runId).toBeTruthy();
    expect(run.startedAt).toBe('2026-07-20T00:00:00.000Z');
    expect(Object.isFrozen(run)).toBe(true);
  });

  it('completes the same run and normalizes result numbers', () => {
    const active = startRun(new Date('2026-07-20T00:00:00.000Z'));
    const snapshot = completeRun(
      active,
      {
        outcome: 'clear',
        score: 1234.9,
        sardines: 5.8,
        distanceMeters: -10,
        bestScore: 2000.2,
      },
      new Date('2026-07-20T00:01:00.000Z'),
    );

    expect(snapshot).toEqual({
      schemaVersion: 1,
      runId: active.runId,
      startedAt: active.startedAt,
      completedAt: '2026-07-20T00:01:00.000Z',
      durationMs: 60_000,
      outcome: 'clear',
      score: 1234,
      sardines: 5,
      distanceMeters: 0,
      bestScore: 2000,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('dispatches a typed browser event containing the snapshot', () => {
    const listener = vi.fn();
    window.addEventListener(RUN_COMPLETED_EVENT, listener);
    const detail = { runId: 'run-1' } as unknown as RunSnapshot;

    dispatchRunEvent(RUN_COMPLETED_EVENT, detail);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent<RunSnapshot>).detail).toBe(detail);
    window.removeEventListener(RUN_COMPLETED_EVENT, listener);
  });
});
