export const INGREDIENT_KINDS = ['strawberry', 'pudding', 'cream', 'banana'] as const;

export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

export type ParfaitOrder = Readonly<{
  id: string;
  number: number;
  required: readonly IngredientKind[];
  collected: readonly IngredientKind[];
}>;

export type OrderProgress = Readonly<{
  completed: boolean;
  newlyCollected: IngredientKind | null;
  order: ParfaitOrder;
}>;

const ORDER_RECIPES: readonly (readonly IngredientKind[])[] = [
  ['strawberry', 'pudding', 'cream'],
  ['strawberry', 'pudding', 'banana'],
  ['strawberry', 'cream', 'banana'],
  ['pudding', 'cream', 'banana'],
];

const normalizeRandomIndex = (randomValue: number, length: number): number => {
  if (!Number.isFinite(randomValue) || length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, Math.floor(randomValue * length)));
};

const hasSameRecipe = (left: readonly IngredientKind[], right: readonly IngredientKind[]): boolean =>
  left.length === right.length && left.every((ingredient) => right.includes(ingredient));

export const createParfaitOrder = (
  number: number,
  previousOrder: ParfaitOrder | null = null,
  random: () => number = Math.random,
): ParfaitOrder => {
  let recipeIndex = normalizeRandomIndex(random(), ORDER_RECIPES.length);
  if (previousOrder && hasSameRecipe(ORDER_RECIPES[recipeIndex], previousOrder.required)) {
    recipeIndex = (recipeIndex + 1) % ORDER_RECIPES.length;
  }

  return Object.freeze({
    id: `order-${Math.max(1, Math.floor(number))}`,
    number: Math.max(1, Math.floor(number)),
    required: Object.freeze([...ORDER_RECIPES[recipeIndex]]),
    collected: Object.freeze([]),
  });
};

export const collectOrderIngredient = (order: ParfaitOrder, ingredient: IngredientKind): OrderProgress => {
  const isRequired = order.required.includes(ingredient);
  const alreadyCollected = order.collected.includes(ingredient);

  if (!isRequired || alreadyCollected) {
    return Object.freeze({
      completed: order.required.every((required) => order.collected.includes(required)),
      newlyCollected: null,
      order,
    });
  }

  const collected = Object.freeze([...order.collected, ingredient]);
  const nextOrder = Object.freeze({ ...order, collected });

  return Object.freeze({
    completed: nextOrder.required.every((required) => collected.includes(required)),
    newlyCollected: ingredient,
    order: nextOrder,
  });
};

export const getMissingIngredients = (order: ParfaitOrder): readonly IngredientKind[] =>
  order.required.filter((ingredient) => !order.collected.includes(ingredient));

export const calculateOrderScore = (combo: number, baseScore = 1_000): number =>
  Math.max(0, Math.floor(baseScore)) * Math.max(1, Math.floor(combo));
