export const stages = [
  { key: 'meadow', name: '草原', bg1: '#9ed6ee', bg2: '#fff7e6', ground: '#7fb10a', enemyMul: 1.00, bgImage: 'meadow.png' },
  { key: 'dunes', name: '砂漠', bg1: '#ffd28a', bg2: '#ffe9c7', ground: '#d2a659', enemyMul: 1.10, bgImage: 'desert.png' },
  { key: 'sky', name: '雪原', bg1: '#c8e7ff', bg2: '#f6fbff', ground: '#b9d3e5', enemyMul: 1.22, bgImage: 'snow.png' },
  { key: 'abyss', name: '宇宙', bg1: '#0b1833', bg2: '#1b2850', ground: '#0b1833', enemyMul: 1.38, bgImage: 'space.png' },
];

export function stageForKey(key) {
  return stages.find(s => s.key === key) || stages[0];
}

// Legacy support - maps old level-based system to new stage keys
export function stageForLevel(lv) {
  if (lv >= 10) return stages[3];
  if (lv >= 7) return stages[2];
  if (lv >= 4) return stages[1];
  return stages[0];
}

export const stageBosses = {
  meadow: {
    key: 'boss-meadow',
    displayName: 'Meadow Monarch',
    icon: '🦌',
    bodyColor: '#4ade80',
    width: 140,
    height: 110,
    hp: 14,
    speed: 2.4,
    targetOffset: 260,
    floatRange: 26,
    floatSpeed: 0.024,
    attackInterval: 2200,
    projectileSpeed: 3.0,
    projectileGravity: 0.08,
    projectileSpread: 0.18,
    volley: 3,
    rewardScore: 150,
    rewardCoins: 9,
    spawnDelay: 6500,
    groundOffset: 28
  },
  dunes: {
    key: 'boss-dunes',
    displayName: 'Dune Typhoon',
    icon: '🦂',
    bodyColor: '#f97316',
    width: 150,
    height: 118,
    hp: 18,
    speed: 2.6,
    targetOffset: 220,
    floatRange: 32,
    floatSpeed: 0.027,
    attackInterval: 2000,
    projectileSpeed: 3.4,
    projectileGravity: 0.10,
    projectileSpread: 0.22,
    volley: 4,
    rewardScore: 180,
    rewardCoins: 12,
    spawnDelay: 7000,
    groundOffset: 32
  },
  sky: {
    key: 'boss-sky',
    displayName: 'Stratos Ranger',
    icon: '🦅',
    bodyColor: '#60a5fa',
    width: 160,
    height: 120,
    hp: 24,
    speed: 2.8,
    targetOffset: 200,
    floatRange: 36,
    floatSpeed: 0.031,
    attackInterval: 1800,
    projectileSpeed: 3.8,
    projectileGravity: 0.11,
    projectileSpread: 0.26,
    volley: 4,
    rewardScore: 220,
    rewardCoins: 14,
    spawnDelay: 7600,
    groundOffset: 36
  },
  abyss: {
    key: 'boss-abyss',
    displayName: 'Abyss Sovereign',
    icon: '🐙',
    bodyColor: '#4338ca',
    width: 176,
    height: 128,
    hp: 32,
    speed: 3.0,
    targetOffset: 180,
    floatRange: 42,
    floatSpeed: 0.034,
    attackInterval: 1600,
    projectileSpeed: 4.2,
    projectileGravity: 0.13,
    projectileSpread: 0.30,
    volley: 5,
    rewardScore: 280,
    rewardCoins: 18,
    spawnDelay: 8200,
    groundOffset: 40
  }
};
