export type GamePhase = 'menu' | 'playing' | 'paused' | 'over';

export type RunOutcome = 'clear' | 'crash';

export type ActiveRun = Readonly<{
  schemaVersion: 1;
  runId: string;
  startedAt: string;
}>;

export type RunSnapshot = Readonly<{
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  outcome: RunOutcome;
  score: number;
  sardines: number;
  distanceMeters: number;
  bestScore: number;
}>;

export const RUN_STARTED_EVENT = 'psr:run-started';
export const RUN_COMPLETED_EVENT = 'psr:run-completed';

const createRunId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const startRun = (now = new Date()): ActiveRun =>
  Object.freeze({
    schemaVersion: 1,
    runId: createRunId(),
    startedAt: now.toISOString(),
  });

export const completeRun = (
  activeRun: ActiveRun,
  result: Omit<RunSnapshot, 'schemaVersion' | 'runId' | 'startedAt' | 'completedAt' | 'durationMs'>,
  now = new Date(),
): RunSnapshot => {
  const completedAt = now.toISOString();
  const durationMs = Math.max(0, now.getTime() - Date.parse(activeRun.startedAt));

  return Object.freeze({
    schemaVersion: 1,
    runId: activeRun.runId,
    startedAt: activeRun.startedAt,
    completedAt,
    durationMs,
    outcome: result.outcome,
    score: Math.max(0, Math.floor(result.score)),
    sardines: Math.max(0, Math.floor(result.sardines)),
    distanceMeters: Math.max(0, Math.floor(result.distanceMeters)),
    bestScore: Math.max(0, Math.floor(result.bestScore)),
  });
};

export const dispatchRunEvent = <T>(name: string, detail: T): void => {
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
};
