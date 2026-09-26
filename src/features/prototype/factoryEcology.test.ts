import { describe, expect, it } from 'vitest';
import {
  evaluateFactoryEcologyBatch,
  simulateFactoryEcology,
  type FactoryStrategy,
} from './factoryEcology';

describe('factoryEcology', () => {
  it('is deterministic for a seed and strategy', () => {
    const a = simulateFactoryEcology(42, 'harvest');
    const b = simulateFactoryEcology(42, 'harvest');
    expect(a).toEqual(b);
  });

  it('same seed produces meaningfully different states by strategy', () => {
    const strategies: FactoryStrategy[] = ['exclude', 'harvest', 'coexist'];
    const runs = strategies.map((strategy) =>
      simulateFactoryEcology(77, strategy),
    );

    expect(new Set(runs.map((run) => run.value.toFixed(2))).size).toBeGreaterThan(1);
    expect(new Set(runs.map((run) => run.maxIwashi.toFixed(2))).size).toBeGreaterThan(1);
  });

  it('lets iwashi become economically or ecologically useful', () => {
    const useful = Array.from({ length: 80 }, (_, index) => index + 1)
      .flatMap((seed) => [
        simulateFactoryEcology(seed, 'harvest'),
        simulateFactoryEcology(seed, 'coexist'),
      ])
      .some((run) => run.beneficialIwashi);

    expect(useful).toBe(true);
  });

  it('passes the 1000-seed emergence gate', () => {
    const summary = evaluateFactoryEcologyBatch(1000);

    console.log('FACTORY_ECOLOGY_1000', JSON.stringify(summary));

    expect(summary.maxWinnerShare).toBeLessThan(0.8);
    expect(summary.wins.exclude).toBeGreaterThan(0);
    expect(summary.wins.harvest).toBeGreaterThan(0);
    expect(summary.wins.coexist).toBeGreaterThan(0);
    expect(summary.outcomes.length).toBeGreaterThanOrEqual(4);
    expect(summary.beneficialIwashiRuns).toBeGreaterThan(0);
    expect(summary.collapseRuns).toBeGreaterThan(0);
    expect(summary.recoveryEvents).toBeGreaterThan(0);
  });
});
