import { describe, expect, it } from 'vitest';
import {
  createNightScenario,
  getRunVerdict,
  resolveNight,
  scoreRun,
  type LocationId,
} from './iwashiIntrusion';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
};

describe('iwashiIntrusion', () => {
  it('creates exactly one culprit and keeps clue data for all three locations', () => {
    const scenario = createNightScenario(1, sequence(0, 0, 0, 0, 0));
    expect(scenario.culprit).toBe('fridge');
    expect(Object.keys(scenario.clues)).toEqual(['fridge', 'drain', 'crate']);
    expect(scenario.clues.fridge.kind).toBe('signal');
    expect(scenario.clues.drain.kind).toBe('noise');
    expect(scenario.clues.crate.kind).toBe('noise');
  });

  it('resolves a trap choice against the actual intrusion point', () => {
    const scenario = createNightScenario(1, sequence(0.4, 0, 0, 0, 0));
    const culprit = scenario.culprit;
    expect(resolveNight(scenario, culprit).correct).toBe(true);

    const wrong = (['fridge', 'drain', 'crate'] as LocationId[]).find((id) => id !== culprit)!;
    expect(resolveNight(scenario, wrong).correct).toBe(false);
  });

  it('rewards later-night catches more without rewarding misses', () => {
    const scenario1 = createNightScenario(1, sequence(0, 0, 0, 0, 0));
    const scenario2 = createNightScenario(2, sequence(0.4, 0, 0, 0, 0));
    const scenario3 = createNightScenario(3, sequence(0.8, 0, 0, 0, 0));
    const results = [
      resolveNight(scenario1, scenario1.culprit),
      resolveNight(scenario2, scenario2.culprit),
      resolveNight(scenario3, 'fridge'),
    ];
    expect(scoreRun(results)).toBeGreaterThanOrEqual(250);
  });

  it('classifies a run by number of successful nights', () => {
    const scenario = createNightScenario(1, sequence(0, 0, 0, 0, 0));
    const ok = resolveNight(scenario, scenario.culprit);
    const ng = resolveNight(scenario, 'drain');

    expect(getRunVerdict([ok, ok, ok])).toBe('perfect');
    expect(getRunVerdict([ok, ok, ng])).toBe('survived');
    expect(getRunVerdict([ok, ng, ng])).toBe('invaded');
  });
});
