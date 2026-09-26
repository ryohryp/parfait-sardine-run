import { describe, expect, it } from 'vitest';
import {
  PROTOTYPE_PRESETS,
  calculateActionLoad,
  calculateDeliveryResult,
  calculateParfaitStats,
  getDropThreshold,
  shouldDropIngredient,
} from './parfaitPrototype';

describe('parfaitPrototype', () => {
  it('creates clearly different safe and risky builds', () => {
    const safe = calculateParfaitStats(PROTOTYPE_PRESETS.safe);
    const risky = calculateParfaitStats(PROTOTYPE_PRESETS.risky);

    expect(safe.stability).toBeGreaterThan(risky.stability);
    expect(risky.value).toBeGreaterThan(safe.value);
    expect(safe.risk).toBe('SAFE');
    expect(risky.risk).toBe('RISKY');
  });

  it('makes obstacle hits more dangerous than a normal jump', () => {
    const stats = calculateParfaitStats(PROTOTYPE_PRESETS.balanced);
    expect(calculateActionLoad('obstacle', stats, 4)).toBeGreaterThan(
      calculateActionLoad('jump', stats, 4),
    );
  });

  it('drops when wobble reaches the build-specific threshold', () => {
    const stats = calculateParfaitStats(PROTOTYPE_PRESETS.risky);
    const threshold = getDropThreshold(stats);
    expect(shouldDropIngredient(threshold - 1, stats)).toBe(false);
    expect(shouldDropIngredient(threshold, stats)).toBe(true);
  });

  it('reduces reward when toppings are lost', () => {
    const original = PROTOTYPE_PRESETS.risky;
    const perfect = calculateDeliveryResult(original, original);
    const damaged = calculateDeliveryResult(original, original.slice(0, 3));

    expect(perfect.reward).toBeGreaterThan(damaged.reward);
    expect(damaged.droppedCount).toBe(2);
    expect(damaged.successRate).toBeCloseTo(0.6);
  });
});
