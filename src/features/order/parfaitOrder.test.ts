import { describe, expect, it } from 'vitest';
import {
  calculateOrderScore,
  collectOrderIngredient,
  createParfaitOrder,
  getMissingIngredients,
} from './parfaitOrder';

describe('parfaitOrder', () => {
  it('creates an immutable order with three unique ingredients', () => {
    const order = createParfaitOrder(1, null, () => 0);

    expect(order.id).toBe('order-1');
    expect(order.required).toHaveLength(3);
    expect(new Set(order.required).size).toBe(3);
    expect(order.collected).toEqual([]);
    expect(Object.isFrozen(order)).toBe(true);
    expect(Object.isFrozen(order.required)).toBe(true);
  });

  it('does not repeat the same recipe immediately', () => {
    const first = createParfaitOrder(1, null, () => 0);
    const second = createParfaitOrder(2, first, () => 0);

    expect(new Set(second.required)).not.toEqual(new Set(first.required));
  });

  it('collects only required ingredients once and completes on the third ingredient', () => {
    const order = createParfaitOrder(1, null, () => 0);
    const ignored = collectOrderIngredient(order, 'banana');
    const first = collectOrderIngredient(ignored.order, 'strawberry');
    const duplicate = collectOrderIngredient(first.order, 'strawberry');
    const second = collectOrderIngredient(duplicate.order, 'pudding');
    const third = collectOrderIngredient(second.order, 'cream');

    expect(ignored.newlyCollected).toBeNull();
    expect(first.newlyCollected).toBe('strawberry');
    expect(duplicate.newlyCollected).toBeNull();
    expect(second.completed).toBe(false);
    expect(third.completed).toBe(true);
    expect(third.order.collected).toEqual(['strawberry', 'pudding', 'cream']);
    expect(getMissingIngredients(third.order)).toEqual([]);
  });

  it('calculates a floor-normalized combo score', () => {
    expect(calculateOrderScore(3)).toBe(3_000);
    expect(calculateOrderScore(0)).toBe(1_000);
    expect(calculateOrderScore(2.9, 750.9)).toBe(1_500);
  });
});
