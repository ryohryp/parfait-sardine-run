import { describe, expect, it } from 'vitest';
import {
  createFactoryFloor,
  placeFactoryTool,
  runFactoryFloor,
  stepFactoryFloor,
  type FactoryFloorState,
} from './factoryFloor';

describe('factoryFloor', () => {
  it('ships parfaits on the default line', () => {
    const result = runFactoryFloor(11, [], 80);
    expect(result.produced).toBeGreaterThan(0);
    expect(result.shipped).toBeGreaterThan(0);
  });

  it('places belts and devices without overwriting the other layer', () => {
    let state = createFactoryFloor(1);
    state = placeFactoryTool(state, 2, 3, 'belt-right');
    state = placeFactoryTool(state, 2, 3, 'bait');
    expect(state.tiles['2,3']).toEqual({ belt: 'right', device: 'bait' });

    state = placeFactoryTool(state, 2, 3, 'erase');
    expect(state.tiles['2,3']).toBeUndefined();
  });

  it('catcher converts an iwashi into fishmeal value', () => {
    let state = createFactoryFloor(2);
    for (const [x, y] of [[1, 4], [0, 4], [2, 4], [1, 3], [1, 5]] as const) {
      state = placeFactoryTool(state, x, y, 'catcher');
    }
    const forced: FactoryFloorState = {
      ...state,
      iwashi: [{ id: 88, x: 1, y: 4, energy: 0 }],
      waste: [],
    };
    const next = stepFactoryFloor(forced);
    expect(next.captured).toBe(1);
    expect(next.cash).toBeGreaterThanOrEqual(6);
    expect(next.iwashi).toHaveLength(0);
  });

  it('keeps raw input queued while the maker output is occupied', () => {
    const state: FactoryFloorState = {
      ...createFactoryFloor(7),
      tick: 1,
      items: [
        { id: 101, kind: 'raw', x: 2, y: 2 },
        { id: 102, kind: 'parfait', x: 4, y: 2 },
      ],
      iwashi: [],
      waste: [],
      produced: 3,
      nextId: 103,
    };

    const next = stepFactoryFloor(state);

    expect(next.produced).toBe(3);
    expect(next.items).toContainEqual({ id: 101, kind: 'raw', x: 2, y: 2 });
    expect(next.items).toContainEqual({ id: 102, kind: 'parfait', x: 5, y: 2 });
    expect(next.waste).toHaveLength(0);
  });

  it('charges reproduction energy only to the fish that spawned', () => {
    const state: FactoryFloorState = {
      ...createFactoryFloor(1),
      tick: 1,
      iwashi: [
        { id: 1, x: 1, y: 4, energy: 2 },
        { id: 2, x: 6, y: 4, energy: 2 },
      ],
      waste: [],
    };

    const next = stepFactoryFloor(state);
    const first = next.iwashi.find((fish) => fish.id === 1);
    const second = next.iwashi.find((fish) => fish.id === 2);

    expect(next.iwashi).toHaveLength(3);
    expect(first?.energy).toBe(2);
    expect(second?.energy).toBe(0.5);
  });

  it('same seed diverges when the player changes ecology tools', () => {
    const exclude = runFactoryFloor(
      44,
      [
        { x: 2, y: 3, tool: 'filter' },
        { x: 5, y: 3, tool: 'filter' },
      ],
      140,
    );

    const harvest = runFactoryFloor(
      44,
      [
        { x: 4, y: 3, tool: 'bait' },
        { x: 5, y: 3, tool: 'catcher' },
      ],
      140,
    );

    const coexist = runFactoryFloor(
      44,
      [
        { x: 2, y: 4, tool: 'bait' },
        { x: 5, y: 4, tool: 'bait' },
      ],
      140,
    );

    const signatures = [exclude, harvest, coexist].map((run) =>
      [run.shipped, run.captured, run.recycled, run.iwashi.length, run.jamEvents].join(':'),
    );

    expect(new Set(signatures).size).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic for identical seed and placements', () => {
    const placements = [
      { x: 4, y: 3, tool: 'bait' as const },
      { x: 5, y: 3, tool: 'catcher' as const },
    ];
    expect(runFactoryFloor(99, placements, 90)).toEqual(
      runFactoryFloor(99, placements, 90),
    );
  });
});
