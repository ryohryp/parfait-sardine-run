import type { FactoryFloorState } from './factoryFloor';

export type ContractKind = 'ship' | 'cash' | 'capture' | 'recycle' | 'iwashi_range';

export type FactoryContract = Readonly<{
  id: string;
  kind: ContractKind;
  title: string;
  description: string;
  target: number;
  maxTarget?: number;
}>;

export type ContractProgress = Readonly<{
  current: number;
  target: number;
  maxTarget?: number;
  complete: boolean;
  text: string;
}>;

const hash01 = (seed: number, salt: number) => {
  let n = (seed ^ Math.imul(salt + 17, 0x45d9f3b)) >>> 0;
  n ^= n >>> 16;
  n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};

const factories: ReadonlyArray<(seed: number) => FactoryContract> = [
  (seed) => ({
    id: `ship-${seed}`,
    kind: 'ship',
    title: 'パフェを出荷',
    description: 'ラインを止めずにパフェを届ける',
    target: 7 + Math.floor(hash01(seed, 11) * 5),
  }),
  (seed) => ({
    id: `cash-${seed}`,
    kind: 'cash',
    title: '売上をつくる',
    description: '出荷でも魚粉でもOK',
    target: 85 + Math.floor(hash01(seed, 23) * 5) * 10,
  }),
  (seed) => ({
    id: `capture-${seed}`,
    kind: 'capture',
    title: 'イワシを資源化',
    description: '捕獲機で魚粉にする',
    target: 2 + Math.floor(hash01(seed, 37) * 3),
  }),
  (seed) => ({
    id: `recycle-${seed}`,
    kind: 'recycle',
    title: '食品くずを食べてもらう',
    description: 'イワシを生きた廃棄処理に使う',
    target: 5 + Math.floor(hash01(seed, 41) * 5),
  }),
  (seed) => {
    const min = 3 + Math.floor(hash01(seed, 53) * 3);
    return {
      id: `iwashi-${seed}`,
      kind: 'iwashi_range',
      title: 'イワシと共存',
      description: '閉店時に群れを制御する',
      target: min,
      maxTarget: min + 4,
    };
  },
];

export function generateFactoryContracts(seed: number): readonly FactoryContract[] {
  const scored = factories.map((factory, index) => ({
    index,
    score: hash01(seed, 100 + index * 17),
    contract: factory(seed),
  }));

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 3).map((entry) => entry.contract);
}

export function getContractProgress(
  contract: FactoryContract,
  state: FactoryFloorState,
  isClosed = false,
): ContractProgress {
  if (contract.kind === 'ship') {
    return {
      current: state.shipped,
      target: contract.target,
      complete: state.shipped >= contract.target,
      text: `${state.shipped} / ${contract.target}`,
    };
  }

  if (contract.kind === 'cash') {
    const current = Math.max(0, Math.floor(state.cash));
    return {
      current,
      target: contract.target,
      complete: current >= contract.target,
      text: `¥${current} / ¥${contract.target}`,
    };
  }

  if (contract.kind === 'capture') {
    return {
      current: state.captured,
      target: contract.target,
      complete: state.captured >= contract.target,
      text: `${state.captured} / ${contract.target}匹`,
    };
  }

  if (contract.kind === 'recycle') {
    return {
      current: state.recycled,
      target: contract.target,
      complete: state.recycled >= contract.target,
      text: `${state.recycled} / ${contract.target}個`,
    };
  }

  const maxTarget = contract.maxTarget ?? contract.target;
  const inRange = state.iwashi.length >= contract.target && state.iwashi.length <= maxTarget;
  return {
    current: state.iwashi.length,
    target: contract.target,
    maxTarget,
    complete: isClosed && inRange,
    text: `現在 ${state.iwashi.length}匹 / 閉店時 ${contract.target}〜${maxTarget}匹`,
  };
}

export function countCompletedContracts(
  contracts: readonly FactoryContract[],
  state: FactoryFloorState,
  isClosed = false,
): number {
  return contracts.filter((contract) => getContractProgress(contract, state, isClosed).complete).length;
}

export function isShiftCleared(
  contracts: readonly FactoryContract[],
  state: FactoryFloorState,
): boolean {
  return countCompletedContracts(contracts, state, true) >= 2;
}
