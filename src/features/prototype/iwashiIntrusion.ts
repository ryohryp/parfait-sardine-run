export type LocationId = 'fridge' | 'drain' | 'crate';

export type LocationInfo = Readonly<{
  id: LocationId;
  name: string;
  icon: string;
  short: string;
}>;

export const LOCATIONS: Readonly<Record<LocationId, LocationInfo>> = {
  fridge: { id: 'fridge', name: '冷蔵庫', icon: '🧊', short: 'FRIDGE' },
  drain: { id: 'drain', name: '排水口', icon: '🕳️', short: 'DRAIN' },
  crate: { id: 'crate', name: '仕入れ箱', icon: '📦', short: 'CRATE' },
};

type Clue = Readonly<{
  text: string;
  kind: 'signal' | 'noise';
}>;

export type NightScenario = Readonly<{
  night: number;
  culprit: LocationId;
  decoy: LocationId;
  clues: Readonly<Record<LocationId, Clue>>;
}>;

export type NightResult = Readonly<{
  correct: boolean;
  culprit: LocationId;
  trapped: LocationId;
  explanation: string;
}>;

const SIGNALS: Readonly<Record<LocationId, readonly string[]>> = {
  fridge: [
    '奥のトレーだけ妙に濡れている。冷気の中に生臭い匂いが一瞬混じった。',
    '扉の内側に細い水滴の筋。庫内の温度がさっきより2℃高い。',
    '氷受けの下に小さな銀色の欠片。誰かが奥で動いたような音がした。',
  ],
  drain: [
    '金網が少し持ち上がっている。床に逆流したような濡れ跡がある。',
    '排水口の奥から水音。さっき掃除したはずなのに周囲がまた濡れている。',
    '排水口の縁に細かな傷。内側から押されたように金網が歪んでいる。',
  ],
  crate: [
    '箱の底だけ湿っている。麻紐が内側から擦れて毛羽立っている。',
    '未開封のはずの箱から、ごく小さな物音。底面に水染みが広がっている。',
    '伝票は乾いているのに箱の内側だけ湿っている。側面がわずかに膨らんでいる。',
  ],
};

const NOISES: Readonly<Record<LocationId, readonly string[]>> = {
  fridge: [
    '結露が少し多い。昼に何度も開け閉めしたせいかもしれない。',
    '棚の端に水滴。製氷皿からこぼれた跡にも見える。',
    'モーター音が少し大きい。古い冷蔵庫なら普通かもしれない。',
  ],
  drain: [
    '床が湿っている。閉店前のモップ掛けの跡にも見える。',
    '排水口から匂いがする。厨房なら珍しくない程度だ。',
    '金網に小さな汚れ。昼の仕込みで付いた可能性もある。',
  ],
  crate: [
    '箱の角が少し潰れている。配送中の傷かもしれない。',
    '底に薄い染み。冷蔵品の結露にも見える。',
    '中で何かがずれた音。瓶が動いただけかもしれない。',
  ],
};

const locationIds: readonly LocationId[] = ['fridge', 'drain', 'crate'];

const pick = <T>(items: readonly T[], rng: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

export function createNightScenario(night: number, rng: () => number = Math.random): NightScenario {
  const culprit = pick(locationIds, rng);
  const decoyCandidates = locationIds.filter((id) => id !== culprit);
  const decoy = pick(decoyCandidates, rng);

  const clues = Object.fromEntries(
    locationIds.map((id) => {
      if (id === culprit) return [id, { text: pick(SIGNALS[id], rng), kind: 'signal' as const }];
      if (id === decoy) {
        const suspiciousNoise = pick(NOISES[id], rng);
        return [id, { text: suspiciousNoise, kind: 'noise' as const }];
      }
      const quietNoise = pick(NOISES[id], rng);
      return [id, { text: quietNoise, kind: 'noise' as const }];
    }),
  ) as Record<LocationId, Clue>;

  return { night, culprit, decoy, clues };
}

export function resolveNight(scenario: NightScenario, trapped: LocationId): NightResult {
  const correct = trapped === scenario.culprit;
  const culpritName = LOCATIONS[scenario.culprit].name;
  const trappedName = LOCATIONS[trapped].name;

  return {
    correct,
    culprit: scenario.culprit,
    trapped,
    explanation: correct
      ? `${culpritName}を封鎖。痕跡どおり、そこからイワシが現れた。`
      : `${trappedName}は外れ。イワシは${culpritName}から侵入してパフェへ向かった。`,
  };
}

export function scoreRun(results: readonly NightResult[]): number {
  return results.reduce((score, result, index) => score + (result.correct ? 100 + index * 50 : 0), 0);
}

export function getRunVerdict(results: readonly NightResult[]): 'perfect' | 'survived' | 'invaded' {
  const catches = results.filter((result) => result.correct).length;
  if (catches === results.length && results.length > 0) return 'perfect';
  if (catches >= 2) return 'survived';
  return 'invaded';
}
