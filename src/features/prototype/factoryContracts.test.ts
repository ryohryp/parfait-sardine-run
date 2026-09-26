import { describe, expect, it } from 'vitest';
import { createFactoryFloor } from './factoryFloor';
import {
  countCompletedContracts,
  generateFactoryContracts,
  getContractProgress,
  isShiftCleared,
  type FactoryContract,
} from './factoryContracts';

describe('factoryContracts', () => {
  it('generates three deterministic, unique contracts per seed', () => {
    const a = generateFactoryContracts(17);
    const b = generateFactoryContracts(17);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((contract) => contract.kind)).size).toBe(3);
  });

  it('evaluates ordinary progress directly from factory state', () => {
    const contract: FactoryContract = {
      id: 'ship-test',
      kind: 'ship',
      title: 'ship',
      description: '',
      target: 5,
    };
    const state = { ...createFactoryFloor(1), shipped: 6 };
    expect(getContractProgress(contract, state).complete).toBe(true);
  });

  it('only locks iwashi-range completion at closing', () => {
    const contract: FactoryContract = {
      id: 'eco-test',
      kind: 'iwashi_range',
      title: 'eco',
      description: '',
      target: 3,
      maxTarget: 8,
    };
    const state = createFactoryFloor(1);
    expect(getContractProgress(contract, state, false).complete).toBe(false);
    expect(getContractProgress(contract, state, true).complete).toBe(true);
  });

  it('clears when at least two of three contracts are complete', () => {
    const contracts: FactoryContract[] = [
      { id: 'a', kind: 'ship', title: '', description: '', target: 1 },
      { id: 'b', kind: 'cash', title: '', description: '', target: 10 },
      { id: 'c', kind: 'capture', title: '', description: '', target: 99 },
    ];
    const state = { ...createFactoryFloor(1), shipped: 1, cash: 10 };
    expect(countCompletedContracts(contracts, state, true)).toBe(2);
    expect(isShiftCleared(contracts, state)).toBe(true);
  });
});
