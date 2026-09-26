export type IngredientKind = 'strawberry' | 'pudding' | 'cream' | 'banana';
export type DeliveryAction = 'jump' | 'landing' | 'dash' | 'obstacle';

export type IngredientSpec = Readonly<{
  kind: IngredientKind;
  name: string;
  icon: string;
  value: number;
  weight: number;
  stability: number;
  speed: number;
  jump: number;
}>;

export type ParfaitStats = Readonly<{
  value: number;
  weight: number;
  stability: number;
  speedModifier: number;
  jumpModifier: number;
  risk: 'SAFE' | 'BALANCED' | 'RISKY';
}>;

export const INGREDIENTS: Readonly<Record<IngredientKind, IngredientSpec>> = {
  strawberry: { kind: 'strawberry', name: 'イチゴ', icon: '🍓', value: 190, weight: 1.3, stability: -8, speed: 0, jump: -0.01 },
  pudding: { kind: 'pudding', name: 'プリン', icon: '🍮', value: 100, weight: 2.1, stability: 15, speed: -0.035, jump: -0.025 },
  cream: { kind: 'cream', name: 'クリーム', icon: '☁️', value: 155, weight: 0.7, stability: -11, speed: 0.015, jump: 0.055 },
  banana: { kind: 'banana', name: 'バナナ', icon: '🍌', value: 145, weight: 1.0, stability: -3, speed: 0.065, jump: 0.015 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculateParfaitStats(stack: readonly IngredientKind[]): ParfaitStats {
  const specs = stack.map((kind) => INGREDIENTS[kind]);
  const weight = specs.reduce((sum, item) => sum + item.weight, 0);
  const rawStability =
    72 +
    specs.reduce((sum, item) => sum + item.stability, 0) -
    Math.max(0, stack.length - 2) * 7;
  const stability = clamp(rawStability, 18, 96);
  const value = specs.reduce((sum, item) => sum + item.value, 0) + Math.max(0, stack.length - 2) * 70;
  const speedModifier = clamp(
    1.02 + specs.reduce((sum, item) => sum + item.speed, 0) - weight * 0.012,
    0.78,
    1.2,
  );
  const jumpModifier = clamp(
    1.03 + specs.reduce((sum, item) => sum + item.jump, 0) - weight * 0.008,
    0.8,
    1.18,
  );
  const risk = stability >= 70 ? 'SAFE' : stability >= 48 ? 'BALANCED' : 'RISKY';

  return {
    value: Math.round(value),
    weight: Number(weight.toFixed(1)),
    stability: Math.round(stability),
    speedModifier: Number(speedModifier.toFixed(2)),
    jumpModifier: Number(jumpModifier.toFixed(2)),
    risk,
  };
}

export function calculateActionLoad(
  action: DeliveryAction,
  stats: ParfaitStats,
  stackSize: number,
): number {
  const base: Record<DeliveryAction, number> = {
    jump: 17,
    landing: 24,
    dash: 22,
    obstacle: 44,
  };
  const heightFactor = 1 + Math.max(0, stackSize - 2) * 0.16;
  const weightFactor = 0.78 + stats.weight * 0.09;
  const stabilityFactor = 1.45 - stats.stability / 145;
  return Math.round(base[action] * heightFactor * weightFactor * stabilityFactor);
}

export function getDropThreshold(stats: ParfaitStats): number {
  return Math.round(48 + stats.stability * 0.56);
}

export function shouldDropIngredient(wobble: number, stats: ParfaitStats): boolean {
  return wobble >= getDropThreshold(stats);
}

export function getWobbleDecayPerSecond(stats: ParfaitStats): number {
  return 8 + stats.stability * 0.13;
}

export type DeliveryResult = Readonly<{
  initialValue: number;
  remainingValue: number;
  successRate: number;
  reward: number;
  droppedCount: number;
}>;

export function calculateDeliveryResult(
  original: readonly IngredientKind[],
  remaining: readonly IngredientKind[],
): DeliveryResult {
  const initialValue = calculateParfaitStats(original).value;
  const remainingValue = calculateParfaitStats(remaining).value;
  const successRate = original.length === 0 ? 0 : remaining.length / original.length;
  const completionBonus = successRate === 1 ? 1.25 : 1;
  return {
    initialValue,
    remainingValue,
    successRate,
    reward: Math.round(remainingValue * successRate * completionBonus),
    droppedCount: Math.max(0, original.length - remaining.length),
  };
}

export const PROTOTYPE_PRESETS: Readonly<Record<'safe' | 'balanced' | 'risky', readonly IngredientKind[]>> = {
  safe: ['pudding', 'pudding', 'banana'],
  balanced: ['pudding', 'strawberry', 'banana', 'pudding'],
  risky: ['cream', 'strawberry', 'banana', 'cream', 'strawberry'],
};
