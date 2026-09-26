export type FactoryStrategy = 'exclude' | 'harvest' | 'coexist';

export type FactoryEnvironment = Readonly<{
  wasteRichness: number;
  supplyVolatility: number;
  heatPressure: number;
  fishmealDemand: number;
  cleanlinessPremium: number;
}>;

export type FactoryOutcome =
  | 'takeover'
  | 'sterile'
  | 'fishmeal'
  | 'symbiotic'
  | 'managed_bloom'
  | 'recovered'
  | 'mixed';

export type FactoryRunResult = Readonly<{
  seed: number;
  strategy: FactoryStrategy;
  value: number;
  cash: number;
  jam: number;
  iwashi: number;
  waste: number;
  captured: number;
  recycled: number;
  maxIwashi: number;
  collapsed: boolean;
  recoveries: number;
  beneficialIwashi: boolean;
  outcome: FactoryOutcome;
  environment: FactoryEnvironment;
}>;

export type BatchSummary = Readonly<{
  seeds: number;
  wins: Readonly<Record<FactoryStrategy, number>>;
  maxWinnerShare: number;
  outcomes: readonly FactoryOutcome[];
  outcomeCounts: Readonly<Record<string, number>>;
  beneficialIwashiRuns: number;
  collapseRuns: number;
  recoveryEvents: number;
}>;

const STRATEGIES: readonly FactoryStrategy[] = ['exclude', 'harvest', 'coexist'];

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function simulateFactoryEcology(
  seed: number,
  strategy: FactoryStrategy,
  ticks = 160,
): FactoryRunResult {
  const rng = mulberry32(seed);
  const environment: FactoryEnvironment = {
    wasteRichness: 0.65 + rng() * 0.9,
    supplyVolatility: 0.5 + rng(),
    heatPressure: 0.45 + rng() * 1.35,
    fishmealDemand: 0.65 + rng() * 1.1,
    cleanlinessPremium: 0.8 + rng() * 0.45,
  };

  let raw = 14;
  let waste = 3;
  let iwashi = 3.5;
  let jam = 0.06;
  let cash = 0;
  let recycled = 0;
  let captured = 0;
  let maxIwashi = iwashi;
  let collapsed = false;
  let recoveries = 0;
  let wasCollapsed = false;

  for (let tick = 0; tick < ticks; tick += 1) {
    let supply = 6.6 + (rng() - 0.5) * 4.5 * environment.supplyVolatility;
    if (rng() < 0.04 * environment.supplyVolatility) supply *= 0.35;
    raw = Math.max(0, raw + supply);

    let upkeep = 0;
    let throughput = 1;
    let jamShield = 0;
    let salePrice = 4.4;
    let emergencyClear = 0;

    if (strategy === 'exclude') {
      const removed = Math.min(iwashi, 0.45 + iwashi * 0.28);
      iwashi -= removed;
      const disposed = Math.min(waste, 0.6);
      waste -= disposed;
      upkeep = 0.38 + disposed * 0.04;
      throughput = 0.98;
      jamShield = 0.42;
      salePrice = 4.75 * environment.cleanlinessPremium;
      emergencyClear = 0.13;
    } else if (strategy === 'harvest') {
      const bait = Math.min(waste, 0.9);
      waste -= bait * 0.8;
      const harvestable = Math.max(0, iwashi - 0.55);
      const caught = Math.min(harvestable, 0.16 + iwashi * 0.28 + bait * 0.2);
      iwashi -= caught;
      captured += caught;
      cash += caught * (7.8 + 5 * environment.fishmealDemand);
      upkeep = 0.58;
      throughput = 0.95;
      jamShield = 0.43;
      salePrice = 4.4;
      emergencyClear = 0.12;
    } else {
      upkeep = 0.55;
      throughput = 0.92;
      jamShield = 0.45;
      salePrice = 4.15;
      emergencyClear = 0.07;
    }

    cash -= upkeep;

    const capacity = 6.2 * throughput * (1 - Math.min(0.94, jam));
    const processed = Math.min(raw, Math.max(0, capacity));
    raw -= processed;
    cash += processed * salePrice;

    waste +=
      processed * 0.18 * environment.wasteRichness +
      Math.max(0, raw - 16) * 0.012;

    const appetite = 0.095 * (strategy === 'coexist' ? 1.55 : 1);
    const consumed = Math.min(waste, iwashi * appetite);
    waste -= consumed;
    recycled += consumed;
    if (strategy === 'coexist') {
      // Living waste treatment is the structural upside of coexistence:
      // each unit eaten avoids conventional disposal/cleanup cost.
      cash += consumed * 1.3;
    }

    let births =
      Math.max(0, consumed - iwashi * 0.04) *
      0.21 *
      environment.heatPressure;
    if (strategy === 'harvest') births *= 1.12;
    if (rng() < 0.018 * environment.heatPressure) {
      births += iwashi * (0.04 + rng() * 0.07);
    }
    iwashi = Math.max(0, iwashi + births - iwashi * 0.016);

    let pressure =
      iwashi * 0.0065 +
      waste * 0.0016 +
      (rng() < 0.025 ? 0.04 : 0);

    if (strategy === 'coexist') pressure *= 0.55;
    if (strategy === 'harvest') pressure *= 0.6;
    pressure *= 1 - jamShield;

    const decay = 0.074 + (jam > 0.88 ? emergencyClear : 0);
    jam = clamp(jam + pressure - decay, 0, 1.18);

    const nowCollapsed = jam >= 0.88;
    if (wasCollapsed && !nowCollapsed) recoveries += 1;
    collapsed ||= nowCollapsed;
    wasCollapsed = nowCollapsed;
    maxIwashi = Math.max(maxIwashi, iwashi);
  }

  const collapsePenalty = jam >= 0.88 ? 180 : 0;
  const safetyPenalty =
    Math.max(0, iwashi - 3) * (strategy === 'coexist' ? 4.5 : 1);
  const overpopulationPenalty =
    Math.max(0, maxIwashi - 15) * (strategy === 'coexist' ? 3.2 : 0.8);

  const value =
    cash -
    jam * 110 -
    collapsePenalty -
    safetyPenalty -
    overpopulationPenalty +
    recycled * (strategy === 'coexist' ? 0.14 : 0.03);

  const beneficialIwashi =
    captured > 2.5 ||
    (recycled > 25 && iwashi > 0.8 && jam < 0.8);

  let outcome: FactoryOutcome = 'mixed';
  if (jam >= 0.9) outcome = 'takeover';
  else if (iwashi < 0.45 && waste < 8) outcome = 'sterile';
  else if (captured > 2.5 && jam < 0.8) outcome = 'fishmeal';
  else if (recycled > 25 && iwashi >= 0.8 && iwashi <= 14 && jam < 0.72) {
    outcome = 'symbiotic';
  } else if (collapsed && jam < 0.72) outcome = 'recovered';
  else if (maxIwashi > 12 && jam < 0.72) outcome = 'managed_bloom';

  return {
    seed,
    strategy,
    value,
    cash,
    jam,
    iwashi,
    waste,
    captured,
    recycled,
    maxIwashi,
    collapsed,
    recoveries,
    beneficialIwashi,
    outcome,
    environment,
  };
}

export function evaluateFactoryEcologyBatch(seeds = 1000): BatchSummary {
  const wins: Record<FactoryStrategy, number> = {
    exclude: 0,
    harvest: 0,
    coexist: 0,
  };
  const outcomeCounts: Record<string, number> = {};
  let beneficialIwashiRuns = 0;
  let collapseRuns = 0;
  let recoveryEvents = 0;

  for (let seed = 1; seed <= seeds; seed += 1) {
    const runs = STRATEGIES.map((strategy) =>
      simulateFactoryEcology(seed, strategy),
    );
    const winner = runs.reduce((best, current) =>
      current.value > best.value ? current : best,
    );
    wins[winner.strategy] += 1;

    for (const run of runs) {
      outcomeCounts[run.outcome] = (outcomeCounts[run.outcome] ?? 0) + 1;
      if (run.beneficialIwashi) beneficialIwashiRuns += 1;
      if (run.collapsed) collapseRuns += 1;
      recoveryEvents += run.recoveries;
    }
  }

  const maxWinnerShare = Math.max(...Object.values(wins)) / seeds;
  const outcomes = Object.keys(outcomeCounts) as FactoryOutcome[];

  return {
    seeds,
    wins,
    maxWinnerShare,
    outcomes,
    outcomeCounts,
    beneficialIwashiRuns,
    collapseRuns,
    recoveryEvents,
  };
}
