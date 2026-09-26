export const FLOOR_WIDTH = 8;
export const FLOOR_HEIGHT = 6;

export type Direction = 'up' | 'right' | 'down' | 'left';
export type DeviceType = 'filter' | 'catcher' | 'bait';
export type PlacementTool =
  | 'belt-up'
  | 'belt-right'
  | 'belt-down'
  | 'belt-left'
  | DeviceType
  | 'erase';

export type FloorTile = Readonly<{
  belt?: Direction;
  device?: DeviceType;
}>;

export type FloorItem = Readonly<{
  id: number;
  kind: 'raw' | 'parfait';
  x: number;
  y: number;
}>;

export type IwashiAgent = Readonly<{
  id: number;
  x: number;
  y: number;
  energy: number;
}>;

export type WasteBit = Readonly<{
  id: number;
  x: number;
  y: number;
}>;

export type FactoryFloorEvent = Readonly<{
  tick: number;
  kind: 'ship' | 'jam' | 'capture' | 'recycle' | 'birth' | 'escape';
  message: string;
}>;

export type FactoryFloorState = Readonly<{
  seed: number;
  tick: number;
  nextId: number;
  tiles: Readonly<Record<string, FloorTile>>;
  items: readonly FloorItem[];
  iwashi: readonly IwashiAgent[];
  waste: readonly WasteBit[];
  shipped: number;
  produced: number;
  cash: number;
  captured: number;
  recycled: number;
  jamEvents: number;
  events: readonly FactoryFloorEvent[];
}>;

export type Placement = Readonly<{
  x: number;
  y: number;
  tool: PlacementTool;
}>;

export const SOURCE = { x: 0, y: 2 } as const;
export const MAKER = { x: 3, y: 2 } as const;
export const SHIPPING = { x: 7, y: 2 } as const;

const keyOf = (x: number, y: number) => `${x},${y}`;
const isInside = (x: number, y: number) =>
  x >= 0 && x < FLOOR_WIDTH && y >= 0 && y < FLOOR_HEIGHT;
const isFixed = (x: number, y: number) =>
  (x === SOURCE.x && y === SOURCE.y) ||
  (x === MAKER.x && y === MAKER.y) ||
  (x === SHIPPING.x && y === SHIPPING.y);

const directionDelta: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

const defaultTiles = (): Record<string, FloorTile> => ({
  [keyOf(1, 2)]: { belt: 'right' },
  [keyOf(2, 2)]: { belt: 'right' },
  [keyOf(4, 2)]: { belt: 'right' },
  [keyOf(5, 2)]: { belt: 'right' },
  [keyOf(6, 2)]: { belt: 'right' },
});

const hash01 = (seed: number, tick: number, salt: number) => {
  let n = (seed ^ Math.imul(tick + 1, 0x45d9f3b) ^ Math.imul(salt + 11, 0x27d4eb2d)) >>> 0;
  n ^= n >>> 16;
  n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};

const pushEvent = (
  events: readonly FactoryFloorEvent[],
  event: FactoryFloorEvent,
): readonly FactoryFloorEvent[] => [...events.slice(-7), event];

export function createFactoryFloor(seed = 1): FactoryFloorState {
  return {
    seed,
    tick: 0,
    nextId: 100,
    tiles: defaultTiles(),
    items: [],
    iwashi: [
      { id: 1, x: 1, y: 4, energy: 0 },
      { id: 2, x: 2, y: 4, energy: 0 },
      { id: 3, x: 5, y: 4, energy: 0 },
      { id: 4, x: 6, y: 4, energy: 0 },
      { id: 5, x: 4, y: 5, energy: 0 },
    ],
    waste: [
      { id: 90, x: 4, y: 3 },
      { id: 91, x: 5, y: 3 },
    ],
    shipped: 0,
    produced: 0,
    cash: 0,
    captured: 0,
    recycled: 0,
    jamEvents: 0,
    events: [],
  };
}

export function placeFactoryTool(
  state: FactoryFloorState,
  x: number,
  y: number,
  tool: PlacementTool,
): FactoryFloorState {
  if (!isInside(x, y) || isFixed(x, y)) return state;

  const key = keyOf(x, y);
  const current = state.tiles[key] ?? {};
  let next: FloorTile;

  if (tool === 'erase') {
    next = {};
  } else if (tool.startsWith('belt-')) {
    next = { ...current, belt: tool.slice(5) as Direction };
  } else if (tool === 'filter' || tool === 'catcher' || tool === 'bait') {
    next = { ...current, device: tool };
  } else {
    next = current;
  }

  const tiles = { ...state.tiles };
  if (!next.belt && !next.device) delete tiles[key];
  else tiles[key] = next;

  return { ...state, tiles };
}

const tileAt = (state: FactoryFloorState, x: number, y: number) =>
  state.tiles[keyOf(x, y)];

const manhattan = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

const neighbors = (x: number, y: number) =>
  [
    { x, y },
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ].filter((point) => isInside(point.x, point.y) && !isFixed(point.x, point.y));

const deviceCells = (state: FactoryFloorState, device: DeviceType) =>
  Object.entries(state.tiles)
    .filter(([, tile]) => tile.device === device)
    .map(([key]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });

const nearestDistance = (
  points: readonly { x: number; y: number }[],
  x: number,
  y: number,
  fallback = 20,
) =>
  points.length === 0
    ? fallback
    : Math.min(...points.map((point) => manhattan(x, y, point.x, point.y)));

const countIwashiAt = (
  iwashi: readonly IwashiAgent[],
  x: number,
  y: number,
) => iwashi.filter((fish) => fish.x === x && fish.y === y).length;

const spawnWastePosition = (tick: number) => {
  const spots = [
    { x: 3, y: 1 },
    { x: 3, y: 3 },
    { x: 4, y: 1 },
    { x: 4, y: 3 },
    { x: 2, y: 3 },
  ] as const;
  return spots[tick % spots.length];
};

function moveIwashi(
  state: FactoryFloorState,
  fish: IwashiAgent,
  iwashiSnapshot: readonly IwashiAgent[],
) {
  const bait = deviceCells(state, 'bait');
  const filters = deviceCells(state, 'filter');
  const wasteTargets = state.waste;
  const mates = iwashiSnapshot.filter((other) => other.id !== fish.id);

  const choices = neighbors(fish.x, fish.y);
  let best = choices[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const choice of choices) {
    const wasteDistance = nearestDistance(wasteTargets, choice.x, choice.y, 12);
    const baitDistance = nearestDistance(bait, choice.x, choice.y, 12);
    const filterDistance = nearestDistance(filters, choice.x, choice.y, 12);
    const mateDistance = nearestDistance(mates, choice.x, choice.y, 5);
    const beltPenalty = tileAt(state, choice.x, choice.y)?.belt ? 0.35 : 0;
    const filterPenalty = filterDistance <= 1 ? (2 - filterDistance) * 5.5 : 0;
    const noise = hash01(state.seed, state.tick, fish.id * 13 + choice.x * 3 + choice.y) * 0.8;

    const score =
      wasteDistance * 1.7 +
      baitDistance * 0.8 +
      mateDistance * 0.18 +
      beltPenalty +
      filterPenalty +
      noise;

    if (score < bestScore) {
      bestScore = score;
      best = choice;
    }
  }

  return { ...fish, x: best.x, y: best.y };
}

export function stepFactoryFloor(state: FactoryFloorState): FactoryFloorState {
  let nextId = state.nextId;
  let events = state.events;
  let shipped = state.shipped;
  let produced = state.produced;
  let cash = state.cash;
  let captured = state.captured;
  let recycled = state.recycled;
  let jamEvents = state.jamEvents;
  let waste = [...state.waste];

  const occupied = new Set(state.items.map((item) => keyOf(item.x, item.y)));
  let items = [...state.items];

  if (state.tick % 3 === 0) {
    const target = { x: 1, y: 2 };
    if (tileAt(state, target.x, target.y)?.belt && !occupied.has(keyOf(target.x, target.y))) {
      items.push({ id: nextId++, kind: 'raw', ...target });
    }
  }

  const itemSnapshot = items;
  const movedItems: FloorItem[] = [];

  for (const item of itemSnapshot) {
    const tile = tileAt(state, item.x, item.y);
    if (!tile?.belt) {
      movedItems.push(item);
      continue;
    }

    const fishOnBelt = countIwashiAt(state.iwashi, item.x, item.y);
    const jamChance = Math.min(0.82, fishOnBelt * 0.36);
    if (hash01(state.seed, state.tick, item.id) < jamChance) {
      jamEvents += 1;
      events = pushEvent(events, {
        tick: state.tick,
        kind: 'jam',
        message: 'イワシがベルトに群がり、搬送が止まった。',
      });
      movedItems.push(item);
      continue;
    }

    const [dx, dy] = directionDelta[tile.belt];
    const nx = item.x + dx;
    const ny = item.y + dy;

    if (nx === MAKER.x && ny === MAKER.y && item.kind === 'raw') {
      produced += 1;
      const outputKey = keyOf(4, 2);
      if (tileAt(state, 4, 2)?.belt && !itemSnapshot.some((other) => keyOf(other.x, other.y) === outputKey)) {
        movedItems.push({ id: nextId++, kind: 'parfait', x: 4, y: 2 });
      }
      const spot = spawnWastePosition(state.tick);
      waste.push({ id: nextId++, ...spot });
      continue;
    }

    if (nx === SHIPPING.x && ny === SHIPPING.y && item.kind === 'parfait') {
      shipped += 1;
      cash += 10;
      events = pushEvent(events, {
        tick: state.tick,
        kind: 'ship',
        message: 'パフェを出荷。工場がちゃんと回った。',
      });
      continue;
    }

    if (
      isInside(nx, ny) &&
      !isFixed(nx, ny) &&
      tileAt(state, nx, ny)?.belt &&
      !itemSnapshot.some((other) => other.id !== item.id && other.x === nx && other.y === ny)
    ) {
      movedItems.push({ ...item, x: nx, y: ny });
    } else {
      movedItems.push(item);
    }
  }

  const movedIwashi = state.iwashi.map((fish) =>
    moveIwashi({ ...state, waste }, fish, state.iwashi),
  );

  const filters = deviceCells(state, 'filter');
  const catchers = deviceCells(state, 'catcher');
  let iwashi: IwashiAgent[] = [];

  for (let fish of movedIwashi) {
    const nearFilter = filters.some((cell) => manhattan(cell.x, cell.y, fish.x, fish.y) === 0);
    if (nearFilter) {
      events = pushEvent(events, {
        tick: state.tick,
        kind: 'escape',
        message: 'フィルターがイワシを工場外へ追い出した。',
      });
      continue;
    }

    const caught = catchers.some((cell) => manhattan(cell.x, cell.y, fish.x, fish.y) <= 0);
    if (caught) {
      captured += 1;
      cash += 6;
      events = pushEvent(events, {
        tick: state.tick,
        kind: 'capture',
        message: 'イワシを捕獲して魚粉にした。売上 +6。',
      });
      continue;
    }

    const wasteIndex = waste.findIndex((bit) => bit.x === fish.x && bit.y === fish.y);
    if (wasteIndex >= 0) {
      waste.splice(wasteIndex, 1);
      recycled += 1;
      cash += 1;
      fish = { ...fish, energy: fish.energy + 1 };
      events = pushEvent(events, {
        tick: state.tick,
        kind: 'recycle',
        message: 'イワシが食品くずを食べた。清掃コストを節約。',
      });
    }

    iwashi.push(fish);
  }

  const babies: IwashiAgent[] = [];
  for (const fish of iwashi) {
    if (
      fish.energy >= 2 &&
      iwashi.length + babies.length < 22 &&
      hash01(state.seed, state.tick, fish.id + 991) < 0.16
    ) {
      const spot = neighbors(fish.x, fish.y).find(
        (candidate) => !iwashi.some((other) => other.x === candidate.x && other.y === candidate.y),
      );
      if (spot) {
        babies.push({ id: nextId++, x: spot.x, y: spot.y, energy: 0 });
        events = pushEvent(events, {
          tick: state.tick,
          kind: 'birth',
          message: '食品くずを食べたイワシが増えた。',
        });
      }
    }
  }

  if (babies.length > 0) {
    const parentIds = new Set(
      iwashi.filter((fish) => fish.energy >= 2).map((fish) => fish.id),
    );
    iwashi = iwashi.map((fish) =>
      parentIds.has(fish.id) ? { ...fish, energy: Math.max(0, fish.energy - 1.5) } : fish,
    );
    iwashi.push(...babies);
  }

  return {
    ...state,
    tick: state.tick + 1,
    nextId,
    items: movedItems,
    iwashi,
    waste,
    shipped,
    produced,
    cash,
    captured,
    recycled,
    jamEvents,
    events,
  };
}

export function runFactoryFloor(
  seed: number,
  placements: readonly Placement[],
  ticks = 120,
): FactoryFloorState {
  let state = createFactoryFloor(seed);
  for (const placement of placements) {
    state = placeFactoryTool(state, placement.x, placement.y, placement.tool);
  }
  for (let index = 0; index < ticks; index += 1) {
    state = stepFactoryFloor(state);
  }
  return state;
}
